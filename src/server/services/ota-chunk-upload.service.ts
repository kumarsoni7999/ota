import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { finished, pipeline } from "node:stream/promises";
import type { BuildEnv, BuildPlatform } from "@/server/models/build.model";
import type { OtaUpdate, OtaUpdateMetadata } from "@/server/models/ota-update.model";
import type { Project } from "@/server/models/project.model";
import { parseEnv, parsePlatform } from "@/server/services/build-upload.service";
import { OtaUploadError } from "@/server/services/ota-upload.service";
import { otaUpdateService } from "@/server/services/ota-update.service";
import {
  otaAssetsAbsoluteDir,
  otaAssetsStorageRef,
  otaBundleAbsolutePath,
  otaBundleStorageRef,
  otaPendingUploadDirAbs,
  otaVersionDir,
} from "@/server/storage/project-storage";

const MAX_CHUNKS = 50_000;
const MIN_CHUNKS = 1;
const DEFAULT_MAX_OTA_BUNDLE_BYTES = 200 * 1024 * 1024;

function maxOtaBundleBytes(): number {
  const raw = process.env.MAX_OTA_BUNDLE_BYTES?.trim();
  if (!raw) {
    return DEFAULT_MAX_OTA_BUNDLE_BYTES;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_OTA_BUNDLE_BYTES;
}

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

function parseMandatoryField(b: Record<string, unknown>): boolean | undefined {
  if (b.mandatory === undefined || b.mandatory === null) {
    return undefined;
  }
  if (typeof b.mandatory === "boolean") {
    return b.mandatory;
  }
  const raw = optionalJsonString(b, "mandatory");
  if (!raw) {
    return undefined;
  }
  const v = raw.toLowerCase();
  if (v === "true" || v === "1") {
    return true;
  }
  if (v === "false" || v === "0") {
    return false;
  }
  throw new OtaUploadError(
    "INVALID_MANDATORY",
    'mandatory must be boolean-like: "true"/"false" (or 1/0)',
  );
}

async function nextBuildNumberForSlot(input: {
  projectId: string;
  env: BuildEnv;
  platform: BuildPlatform;
  version: string;
}): Promise<number> {
  const rows = await otaUpdateService.listAll();
  let max = 0;
  for (const u of rows) {
    if (
      u.projectId === input.projectId &&
      u.env === input.env &&
      u.platform === input.platform &&
      u.version === input.version
    ) {
      const n = typeof u.buildNumber === "number" ? u.buildNumber : 0;
      if (n > max) {
        max = n;
      }
    }
  }
  return max + 1;
}

export type OtaChunkInitBody = {
  version: string;
  env: string;
  platform: string;
  totalSize: number;
  totalChunks: number;
  buildNumber?: number;
  runtimeVersion?: string;
  minVersion?: string;
  releaseNotes?: string;
  mandatory?: boolean;
};

export const otaChunkUploadService = {
  parseInitBody(body: unknown): OtaChunkInitBody {
    if (!body || typeof body !== "object") {
      throw new OtaUploadError("INVALID_JSON", "Expected JSON object body");
    }
    const b = body as Record<string, unknown>;
    const version = optionalJsonString(b, "version");
    const env = optionalJsonString(b, "env");
    const platform = optionalJsonString(b, "platform");
    if (!version || !env || !platform) {
      throw new OtaUploadError(
        "FIELD_REQUIRED",
        "version, env, and platform are required",
      );
    }
    const totalSize = b.totalSize;
    const totalChunks = b.totalChunks;
    if (typeof totalSize !== "number" || !Number.isFinite(totalSize) || totalSize < 1) {
      throw new OtaUploadError(
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
      throw new OtaUploadError(
        "INVALID_TOTAL_CHUNKS",
        `totalChunks must be an integer between ${MIN_CHUNKS} and ${MAX_CHUNKS}`,
      );
    }
    const limit = maxOtaBundleBytes();
    if (totalSize > limit) {
      throw new OtaUploadError(
        "BUNDLE_TOO_LARGE",
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
        throw new OtaUploadError(
          "INVALID_BUILD_NUMBER",
          "buildNumber must be a positive integer when provided",
        );
      }
    }
    const mandatory = parseMandatoryField(b);
    return {
      version,
      env,
      platform,
      totalSize,
      totalChunks,
      buildNumber:
        typeof buildNumberRaw === "number" ? buildNumberRaw : undefined,
      runtimeVersion: optionalJsonString(b, "runtimeVersion"),
      minVersion: optionalJsonString(b, "minVersion"),
      releaseNotes: optionalJsonString(b, "releaseNotes"),
      mandatory,
    };
  },

  async init(params: {
    project: Project;
    userId: string;
    body: OtaChunkInitBody;
  }): Promise<{ update: OtaUpdate }> {
    const { project, userId, body } = params;

    if (!project.active) {
      throw new OtaUploadError(
        "PROJECT_INACTIVE",
        "Cannot upload OTA updates to an inactive project",
        403,
      );
    }

    const env = parseEnv(body.env);
    const platform = parsePlatform(body.platform);
    const versionTrim = body.version.trim();

    const nextBuildNumber = await nextBuildNumberForSlot({
      projectId: project.id,
      env,
      platform,
      version: versionTrim,
    });
    const buildNumber = body.buildNumber ?? nextBuildNumber;

    const now = new Date().toISOString();
    const id = randomUUID();

    const metadata: OtaUpdateMetadata = {};
    if (body.mandatory !== undefined) {
      metadata.mandatory = body.mandatory;
    }
    if (body.minVersion !== undefined) {
      metadata.minVersion = body.minVersion;
    }
    if (body.runtimeVersion !== undefined) {
      metadata.runtimeVersion = body.runtimeVersion;
    }
    if (body.releaseNotes !== undefined) {
      metadata.releaseNotes = body.releaseNotes;
    }

    const storageVersion = `${versionTrim}__${id}`;
    const uploadingEntry: OtaUpdate = {
      id,
      projectId: project.id,
      env,
      platform,
      version: versionTrim,
      buildNumber,
      bundlePath: otaBundleStorageRef(project.projectKey, platform, env, storageVersion),
      assetsPath: otaAssetsStorageRef(project.projectKey, platform, env, storageVersion),
      metadata,
      createdBy: userId,
      updatedBy: userId,
      createdAt: now,
      updatedAt: now,
      active: false,
      uploadState: "UPLOADING",
      uploadError: undefined,
      uploadExpectedBytes: body.totalSize,
      uploadExpectedChunks: body.totalChunks,
      uploadReceivedBytes: 0,
    };

    const pendingDir = otaPendingUploadDirAbs(project.projectKey, id);
    await rm(pendingDir, { recursive: true, force: true });
    await mkdir(pendingDir, { recursive: true });

    await otaUpdateService.save(uploadingEntry);
    return { update: uploadingEntry };
  },

  async writeChunk(params: {
    project: Project;
    userId: string;
    uploadId: string;
    chunkIndex: number;
    body: Buffer;
  }): Promise<{ update: OtaUpdate }> {
    const { project, userId, uploadId, chunkIndex, body } = params;
    const update = await otaUpdateService.findById(uploadId);
    if (!update || update.projectId !== project.id) {
      throw new OtaUploadError("OTA_NOT_FOUND", "OTA upload not found", 404);
    }
    if (update.createdBy !== userId) {
      throw new OtaUploadError("FORBIDDEN", "Not allowed to upload to this OTA update", 403);
    }
    if (update.uploadState !== "UPLOADING") {
      throw new OtaUploadError(
        "INVALID_STATE",
        "OTA update is not accepting chunks (not uploading)",
        409,
      );
    }
    const total = update.uploadExpectedChunks;
    const expected = update.uploadExpectedBytes;
    if (total == null || expected == null) {
      throw new OtaUploadError("INVALID_STATE", "OTA update has no chunk plan", 409);
    }
    if (chunkIndex < 0 || chunkIndex >= total) {
      throw new OtaUploadError(
        "INVALID_CHUNK_INDEX",
        `chunkIndex must be in [0, ${total - 1}]`,
      );
    }
    if (body.length === 0) {
      throw new OtaUploadError("EMPTY_CHUNK", "Chunk body must not be empty");
    }

    const pendingDir = otaPendingUploadDirAbs(project.projectKey, update.id);
    const partAbs = path.join(pendingDir, partFileName(chunkIndex));
    let prevLen = 0;
    try {
      prevLen = (await stat(partAbs)).size;
    } catch {
      prevLen = 0;
    }
    await writeFile(partAbs, body);

    const received =
      (update.uploadReceivedBytes ?? 0) - prevLen + body.length;
    const now = new Date().toISOString();
    const next: OtaUpdate = {
      ...update,
      uploadReceivedBytes: received,
      updatedAt: now,
      updatedBy: userId,
    };
    await otaUpdateService.save(next);
    return { update: next };
  },

  async complete(params: {
    project: Project;
    userId: string;
    uploadId: string;
  }): Promise<{ update: OtaUpdate }> {
    const { project, userId, uploadId } = params;
    const update = await otaUpdateService.findById(uploadId);
    if (!update || update.projectId !== project.id) {
      throw new OtaUploadError("OTA_NOT_FOUND", "OTA upload not found", 404);
    }
    if (update.createdBy !== userId) {
      throw new OtaUploadError("FORBIDDEN", "Not allowed to complete this OTA upload", 403);
    }
    if (update.uploadState !== "UPLOADING") {
      throw new OtaUploadError(
        "INVALID_STATE",
        "OTA update is not pending completion",
        409,
      );
    }
    const totalChunks = update.uploadExpectedChunks;
    const expectedBytes = update.uploadExpectedBytes;
    if (totalChunks == null || expectedBytes == null) {
      throw new OtaUploadError("INVALID_STATE", "OTA update has no chunk plan", 409);
    }

    const pendingDir = otaPendingUploadDirAbs(project.projectKey, update.id);
    let sum = 0;
    for (let i = 0; i < totalChunks; i++) {
      const p = path.join(pendingDir, partFileName(i));
      try {
        const st = await stat(p);
        sum += st.size;
      } catch {
        throw new OtaUploadError(
          "MISSING_CHUNK",
          `Missing or incomplete chunk index ${i}`,
          400,
        );
      }
    }
    if (sum !== expectedBytes) {
      const failed: OtaUpdate = {
        ...update,
        uploadState: "FAILED",
        uploadError: `Expected ${expectedBytes} bytes from chunks, got ${sum}`,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };
      await otaUpdateService.save(failed);
      throw new OtaUploadError(
        "SIZE_MISMATCH",
        `Expected ${expectedBytes} bytes from chunks, got ${sum}`,
        400,
      );
    }

    const storageVersion = `${update.version}__${update.id}`;
    const versionDir = otaVersionDir(
      project.projectKey,
      update.platform,
      update.env,
      storageVersion,
    );
    await mkdir(versionDir, { recursive: true });
    const bundleAbs = otaBundleAbsolutePath(
      project.projectKey,
      update.platform,
      update.env,
      storageVersion,
    );
    const assetsDir = otaAssetsAbsoluteDir(
      project.projectKey,
      update.platform,
      update.env,
      storageVersion,
    );
    await mkdir(assetsDir, { recursive: true });

    const ws = createWriteStream(bundleAbs);
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
        await unlink(bundleAbs);
      } catch {
        /* ignore */
      }
      const failed: OtaUpdate = {
        ...update,
        uploadState: "FAILED",
        uploadError: e instanceof Error ? e.message : String(e),
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };
      await otaUpdateService.save(failed);
      throw e;
    }

    await rm(pendingDir, { recursive: true, force: true });

    const now = new Date().toISOString();
    const done: OtaUpdate = {
      ...update,
      active: true,
      uploadState: "SUCCESS",
      uploadError: undefined,
      uploadExpectedBytes: undefined,
      uploadExpectedChunks: undefined,
      uploadReceivedBytes: undefined,
      updatedAt: now,
      updatedBy: userId,
    };
    await otaUpdateService.save(done);
    return { update: done };
  },
};
