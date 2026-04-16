import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { finished, pipeline } from "node:stream/promises";
import type { BuildManifestV1 } from "@/server/models/build-manifest.model";
import { BUILD_MANIFEST_FILENAME } from "@/server/models/build-manifest.model";
import type { Build, BuildMetadata } from "@/server/models/build.model";
import type { Project } from "@/server/models/project.model";
import { buildService } from "@/server/services/build.service";
import {
  BuildUploadError,
  extForArtifactType,
  maxUploadBytes,
  parseEnv,
  parsePlatform,
  parseType,
  sanitizeArtifactBase,
} from "@/server/services/build-upload.service";
import {
  buildArtifactAbsolutePath,
  buildFileStorageRef,
  buildPendingPlaceholderAbs,
  buildPendingPlaceholderStorageRef,
  buildPendingUploadDirAbs,
  buildVersionDir,
} from "@/server/storage/project-storage";

const MAX_CHUNKS = 50_000;
const MIN_CHUNKS = 1;

function partFileName(index: number): string {
  return `part-${String(index).padStart(5, "0")}`;
}

function optionalJsonString(
  b: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = b[key];
  if (typeof v !== "string") {
    return undefined;
  }
  const t = v.trim();
  return t.length ? t : undefined;
}

function mergeMetadataFromInit(
  prev: BuildMetadata | undefined,
  name: string,
  body: Record<string, unknown>,
): BuildMetadata {
  const runtimeVersion = optionalJsonString(body, "runtimeVersion");
  const commitHash = optionalJsonString(body, "commitHash");
  const branch = optionalJsonString(body, "branch");
  const releaseNotes = optionalJsonString(body, "releaseNotes");
  const minSupportedVersion = optionalJsonString(body, "minSupportedVersion");

  const metadata: BuildMetadata = { ...(prev ?? {}), displayName: name };
  if (runtimeVersion !== undefined) {
    metadata.runtimeVersion = runtimeVersion;
  }
  if (commitHash !== undefined) {
    metadata.commitHash = commitHash;
  }
  if (branch !== undefined) {
    metadata.branch = branch;
  }
  if (releaseNotes !== undefined) {
    metadata.releaseNotes = releaseNotes;
  }
  if (minSupportedVersion !== undefined) {
    metadata.minSupportedVersion = minSupportedVersion;
  }
  return metadata;
}

export type ChunkInitBody = {
  name: string;
  version: string;
  /** Omit to assign the next build number for this version + platform + env + type. */
  buildNumber?: number;
  env: string;
  platform: string;
  type: string;
  totalSize: number;
  totalChunks: number;
  runtimeVersion?: string;
  commitHash?: string;
  branch?: string;
  releaseNotes?: string;
  minSupportedVersion?: string;
};

export const buildChunkUploadService = {
  parseInitBody(body: unknown): ChunkInitBody {
    if (!body || typeof body !== "object") {
      throw new BuildUploadError("INVALID_JSON", "Expected JSON object body");
    }
    const b = body as Record<string, unknown>;
    const name = optionalJsonString(b, "name");
    const version = optionalJsonString(b, "version");
    const env = optionalJsonString(b, "env");
    const platform = optionalJsonString(b, "platform");
    const type = optionalJsonString(b, "type");
    if (!name || !version || !env || !platform || !type) {
      throw new BuildUploadError(
        "FIELD_REQUIRED",
        "name, version, env, platform, and type are required",
      );
    }
    const totalSize = b.totalSize;
    const totalChunks = b.totalChunks;
    if (typeof totalSize !== "number" || !Number.isFinite(totalSize) || totalSize < 1) {
      throw new BuildUploadError(
        "INVALID_TOTAL_SIZE",
        "totalSize must be a positive number (bytes)",
      );
    }
    if (
      typeof totalChunks !== "number" ||
      !Number.isInteger(totalChunks) ||
      totalChunks < MIN_CHUNKS ||
      totalChunks > MAX_CHUNKS
    ) {
      throw new BuildUploadError(
        "INVALID_TOTAL_CHUNKS",
        `totalChunks must be an integer between ${MIN_CHUNKS} and ${MAX_CHUNKS}`,
      );
    }
    const limit = maxUploadBytes();
    if (totalSize > limit) {
      throw new BuildUploadError(
        "FILE_TOO_LARGE",
        `totalSize exceeds limit of ${limit} bytes`,
        413,
      );
    }
    const buildNumberRaw = b.buildNumber;
    if (buildNumberRaw !== undefined && buildNumberRaw !== null) {
      if (
        typeof buildNumberRaw !== "number" ||
        !Number.isInteger(buildNumberRaw) ||
        buildNumberRaw < 1
      ) {
        throw new BuildUploadError(
          "INVALID_BUILD_NUMBER",
          "buildNumber must be a positive integer when provided",
        );
      }
    }
    return {
      name,
      version,
      buildNumber:
        typeof buildNumberRaw === "number" ? buildNumberRaw : undefined,
      env,
      platform,
      type,
      totalSize,
      totalChunks,
      runtimeVersion: optionalJsonString(b, "runtimeVersion"),
      commitHash: optionalJsonString(b, "commitHash"),
      branch: optionalJsonString(b, "branch"),
      releaseNotes: optionalJsonString(b, "releaseNotes"),
      minSupportedVersion: optionalJsonString(b, "minSupportedVersion"),
    };
  },

  async init(params: {
    project: Project;
    userId: string;
    body: ChunkInitBody;
  }): Promise<{ build: Build }> {
    const { project, userId, body } = params;

    if (!project.active) {
      throw new BuildUploadError(
        "PROJECT_INACTIVE",
        "Cannot upload builds to an inactive project",
        403,
      );
    }

    const name = body.name;
    const versionTrim = body.version.trim();
    const env = parseEnv(body.env);
    const platform = parsePlatform(body.platform);
    const type = parseType(body.type);

    const nextBuildNumber = await buildService.nextBuildNumberForReleaseSlot({
      projectId: project.id,
      env,
      platform,
      version: versionTrim,
      type,
    });
    const buildNumber = body.buildNumber ?? nextBuildNumber;

    const now = new Date().toISOString();
    const id = randomUUID();
    const metadata = mergeMetadataFromInit(
      undefined,
      name,
      body as unknown as Record<string, unknown>,
    );
    const build: Build = {
      id,
      projectId: project.id,
      env,
      version: versionTrim,
      buildNumber,
      type,
      platform,
      filePath: buildPendingPlaceholderStorageRef(project.projectKey, id),
      metadata,
      createdBy: userId,
      updatedBy: userId,
      createdAt: now,
      updatedAt: now,
      active: true,
      uploadStatus: "pending",
      uploadExpectedBytes: body.totalSize,
      uploadExpectedChunks: body.totalChunks,
      uploadReceivedBytes: 0,
    };

    const pendingDir = buildPendingUploadDirAbs(project.projectKey, build.id);
    await rm(pendingDir, { recursive: true, force: true });
    await mkdir(pendingDir, { recursive: true });
    await writeFile(buildPendingPlaceholderAbs(project.projectKey, build.id), "");
    await buildService.save(build);
    return { build };
  },

  async writeChunk(params: {
    project: Project;
    userId: string;
    buildId: string;
    chunkIndex: number;
    body: Buffer;
  }): Promise<{ build: Build }> {
    const { project, userId, buildId, chunkIndex, body } = params;
    const build = await buildService.findById(buildId);
    if (!build || build.projectId !== project.id) {
      throw new BuildUploadError("BUILD_NOT_FOUND", "Build not found", 404);
    }
    if (build.createdBy !== userId) {
      throw new BuildUploadError("FORBIDDEN", "Not allowed to upload to this build", 403);
    }
    if (build.uploadStatus !== "pending") {
      throw new BuildUploadError(
        "INVALID_STATE",
        "Build is not accepting chunks (not pending)",
        409,
      );
    }
    const total = build.uploadExpectedChunks;
    const expected = build.uploadExpectedBytes;
    if (total == null || expected == null) {
      throw new BuildUploadError("INVALID_STATE", "Build has no chunk plan", 409);
    }
    if (chunkIndex < 0 || chunkIndex >= total) {
      throw new BuildUploadError(
        "INVALID_CHUNK_INDEX",
        `chunkIndex must be in [0, ${total - 1}]`,
      );
    }
    if (body.length === 0) {
      throw new BuildUploadError("EMPTY_CHUNK", "Chunk body must not be empty");
    }

    const pendingDir = buildPendingUploadDirAbs(project.projectKey, build.id);
    const partAbs = path.join(pendingDir, partFileName(chunkIndex));
    let prevLen = 0;
    try {
      prevLen = (await stat(partAbs)).size;
    } catch {
      prevLen = 0;
    }
    await writeFile(partAbs, body);

    const received =
      (build.uploadReceivedBytes ?? 0) - prevLen + body.length;
    const now = new Date().toISOString();
    const next: Build = {
      ...build,
      uploadReceivedBytes: received,
      updatedAt: now,
      updatedBy: userId,
    };
    await buildService.save(next);
    return { build: next };
  },

  async complete(params: {
    project: Project;
    userId: string;
    buildId: string;
  }): Promise<{ build: Build }> {
    const { project, userId, buildId } = params;
    const build = await buildService.findById(buildId);
    if (!build || build.projectId !== project.id) {
      throw new BuildUploadError("BUILD_NOT_FOUND", "Build not found", 404);
    }
    if (build.createdBy !== userId) {
      throw new BuildUploadError("FORBIDDEN", "Not allowed to complete this build", 403);
    }
    if (build.uploadStatus !== "pending") {
      throw new BuildUploadError(
        "INVALID_STATE",
        "Build is not pending completion",
        409,
      );
    }
    const totalChunks = build.uploadExpectedChunks;
    const expectedBytes = build.uploadExpectedBytes;
    if (totalChunks == null || expectedBytes == null) {
      throw new BuildUploadError("INVALID_STATE", "Build has no chunk plan", 409);
    }

    const pendingDir = buildPendingUploadDirAbs(project.projectKey, build.id);
    let sum = 0;
    for (let i = 0; i < totalChunks; i++) {
      const p = path.join(pendingDir, partFileName(i));
      try {
        const st = await stat(p);
        sum += st.size;
      } catch {
        throw new BuildUploadError(
          "MISSING_CHUNK",
          `Missing or incomplete chunk index ${i}`,
          400,
        );
      }
    }
    if (sum !== expectedBytes) {
      const failed: Build = {
        ...build,
        uploadStatus: "failed",
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };
      await buildService.save(failed);
      throw new BuildUploadError(
        "SIZE_MISMATCH",
        `Expected ${expectedBytes} bytes from chunks, got ${sum}`,
        400,
      );
    }

    const displayName = build.metadata.displayName ?? "artifact";
    const base = sanitizeArtifactBase(displayName);
    const artifactFilename = `${base}${extForArtifactType(build.type)}`;
    const storageVersion = `${build.version}__${build.id}`;
    const versionDir = buildVersionDir(
      project.projectKey,
      build.platform,
      build.env,
      storageVersion,
    );
    await mkdir(versionDir, { recursive: true });
    const artifactAbs = buildArtifactAbsolutePath(
      project.projectKey,
      build.platform,
      build.env,
      storageVersion,
      artifactFilename,
    );

    const ws = createWriteStream(artifactAbs);
    try {
      for (let i = 0; i < totalChunks; i++) {
        const partPath = path.join(pendingDir, partFileName(i));
        await pipeline(createReadStream(partPath), ws, { end: false });
      }
      ws.end();
      await finished(ws);
    } catch (e) {
      ws.destroy();
      try {
        await unlink(artifactAbs);
      } catch {
        /* ignore */
      }
      const failed: Build = {
        ...build,
        uploadStatus: "failed",
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };
      await buildService.save(failed);
      throw e;
    }

    const filePath = buildFileStorageRef(
      project.projectKey,
      build.platform,
      build.env,
      storageVersion,
      artifactFilename,
    );

    const now = new Date().toISOString();
    const manifest: BuildManifestV1 = {
      schemaVersion: 1,
      buildId: build.id,
      projectId: project.id,
      name: displayName,
      version: build.version,
      buildNumber: build.buildNumber,
      env: build.env,
      platform: build.platform,
      type: build.type,
      artifactFile: artifactFilename,
      runtimeVersion: build.metadata.runtimeVersion,
      minSupportedVersion: build.metadata.minSupportedVersion,
      commitHash: build.metadata.commitHash,
      branch: build.metadata.branch,
      releaseNotes: build.metadata.releaseNotes,
      createdAt: build.createdAt,
      updatedAt: now,
    };
    const manifestAbs = path.join(versionDir, BUILD_MANIFEST_FILENAME);
    await writeFile(
      manifestAbs,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );

    await rm(pendingDir, { recursive: true, force: true });

    const done: Build = {
      ...build,
      filePath,
      uploadStatus: "success",
      uploadExpectedBytes: undefined,
      uploadExpectedChunks: undefined,
      uploadReceivedBytes: undefined,
      updatedAt: now,
      updatedBy: userId,
    };
    await buildService.save(done);
    return { build: done };
  },
};
