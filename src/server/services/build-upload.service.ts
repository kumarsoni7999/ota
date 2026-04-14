import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BuildManifestV1 } from "@/server/models/build-manifest.model";
import { BUILD_MANIFEST_FILENAME } from "@/server/models/build-manifest.model";
import type {
  Build,
  BuildArtifactType,
  BuildEnv,
  BuildMetadata,
  BuildPlatform,
} from "@/server/models/build.model";
import type { Project } from "@/server/models/project.model";
import { buildService } from "@/server/services/build.service";
import {
  buildArtifactAbsolutePath,
  buildFileStorageRef,
  buildVersionDir,
  fromStorageRelative,
} from "@/server/storage/project-storage";

const DEFAULT_MAX_BYTES = 500 * 1024 * 1024;

export function maxUploadBytes(): number {
  const raw = process.env.MAX_UPLOAD_BYTES?.trim();
  if (!raw) {
    return DEFAULT_MAX_BYTES;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

export class BuildUploadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 400,
  ) {
    super(message);
    this.name = "BuildUploadError";
  }
}

function requireString(form: FormData, key: string): string {
  const v = form.get(key);
  if (typeof v !== "string") {
    throw new BuildUploadError(
      "FIELD_REQUIRED",
      `Missing or invalid form field "${key}"`,
    );
  }
  const t = v.trim();
  if (!t) {
    throw new BuildUploadError(
      "FIELD_REQUIRED",
      `Form field "${key}" must not be empty`,
    );
  }
  return t;
}

function optionalString(form: FormData, key: string): string | undefined {
  const v = form.get(key);
  if (typeof v !== "string") {
    return undefined;
  }
  const t = v.trim();
  return t.length ? t : undefined;
}

export function parseEnv(raw: string): BuildEnv {
  const u = raw.trim().toUpperCase();
  if (u === "DEV" || u === "QA" || u === "STAGE" || u === "PROD") {
    return u as BuildEnv;
  }
  throw new BuildUploadError(
    "INVALID_ENV",
    "env must be one of: DEV, QA, STAGE, PROD",
  );
}

export function parsePlatform(raw: string): BuildPlatform {
  const l = raw.trim().toLowerCase();
  if (l === "android" || l === "ios") {
    return l;
  }
  throw new BuildUploadError(
    "INVALID_PLATFORM",
    "platform must be android or ios",
  );
}

export function parseType(raw: string): BuildArtifactType {
  const l = raw.trim().toLowerCase();
  if (l === "apk" || l === "aab" || l === "ipa") {
    return l;
  }
  throw new BuildUploadError(
    "INVALID_TYPE",
    "type must be apk, aab, or ipa",
  );
}

export function extForArtifactType(t: BuildArtifactType): string {
  switch (t) {
    case "apk":
      return ".apk";
    case "aab":
      return ".aab";
    case "ipa":
      return ".ipa";
    default:
      return ".bin";
  }
}

/** Safe basename stem for stored artifact (no path chars). */
export function sanitizeArtifactBase(name: string): string {
  const s = name.trim().replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "");
  if (!s) {
    throw new BuildUploadError(
      "INVALID_NAME",
      "name must contain at least one letter, digit, dot, underscore, or hyphen",
    );
  }
  return s.slice(0, 120);
}

function pickFormFile(form: FormData): File {
  const keys = ["file", "buildFile", "build"] as const;
  for (const k of keys) {
    const v = form.get(k);
    if (v instanceof File && v.size > 0) {
      return v;
    }
  }
  throw new BuildUploadError(
    "FILE_REQUIRED",
    'Expected a non-empty file in form field "file", "buildFile", or "build"',
  );
}

function parseBuildNumber(form: FormData): number {
  const raw = optionalString(form, "buildNumber");
  if (!raw) {
    throw new BuildUploadError(
      "FIELD_REQUIRED",
      'Missing required form field "buildNumber"',
    );
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new BuildUploadError(
      "INVALID_BUILD_NUMBER",
      "buildNumber must be a positive integer",
    );
  }
  return n;
}

async function safeUnlinkStorageRelative(relPosix: string): Promise<void> {
  try {
    await unlink(fromStorageRelative(relPosix));
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw e;
    }
  }
}

export const buildUploadService = {
  /**
   * Writes the native artifact under `storage/projects/<key>/builds/.../<version>/`
   * plus `build-manifest.json` (OTA-style metadata for tooling / JS update flows).
   * Upserts when the same project/env/platform/type/version/buildNumber exists.
   */
  async saveFromMultipart(params: {
    project: Project;
    userId: string;
    form: FormData;
  }): Promise<{ build: Build; created: boolean }> {
    const { project, userId, form } = params;

    if (!project.active) {
      throw new BuildUploadError(
        "PROJECT_INACTIVE",
        "Cannot upload builds to an inactive project",
        403,
      );
    }

    const name = requireString(form, "name");
    const version = requireString(form, "version");
    const buildNumber = parseBuildNumber(form);
    const env = parseEnv(requireString(form, "env"));
    const platform = parsePlatform(requireString(form, "platform"));
    const type = parseType(requireString(form, "type"));

    const file = pickFormFile(form);
    const limit = maxUploadBytes();
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      throw new BuildUploadError("FILE_EMPTY", "Build file is empty");
    }
    if (buffer.length > limit) {
      throw new BuildUploadError(
        "FILE_TOO_LARGE",
        `Build file exceeds limit of ${limit} bytes`,
        413,
      );
    }

    const base = sanitizeArtifactBase(name);
    const artifactFilename = `${base}${extForArtifactType(type)}`;
    const versionTrim = version.trim();

    const dirAbs = buildVersionDir(
      project.projectKey,
      platform,
      env,
      versionTrim,
    );
    await mkdir(dirAbs, { recursive: true });

    const artifactAbs = buildArtifactAbsolutePath(
      project.projectKey,
      platform,
      env,
      versionTrim,
      artifactFilename,
    );

    const newFilePath = buildFileStorageRef(
      project.projectKey,
      platform,
      env,
      versionTrim,
      artifactFilename,
    );

    const existing = await buildService.findByReleaseSlot({
      projectId: project.id,
      env,
      version: versionTrim,
      buildNumber,
      platform,
      type,
    });

    if (existing && existing.filePath !== newFilePath) {
      await safeUnlinkStorageRelative(existing.filePath);
    }

    await writeFile(artifactAbs, buffer);
    const filePath = newFilePath;

    const now = new Date().toISOString();
    const commitHash = optionalString(form, "commitHash");
    const branch = optionalString(form, "branch");
    const releaseNotes = optionalString(form, "releaseNotes");
    const minSupportedVersion = optionalString(form, "minSupportedVersion");
    const runtimeVersion = optionalString(form, "runtimeVersion");

    const metadata: BuildMetadata = {
      ...(existing?.metadata ?? {}),
      displayName: name,
    };
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

    let build: Build;
    let created: boolean;

    if (existing) {
      created = false;
      build = {
        ...existing,
        version: versionTrim,
        buildNumber,
        filePath,
        metadata,
        updatedAt: now,
        updatedBy: userId,
        active: true,
        uploadStatus: "success",
        uploadExpectedBytes: undefined,
        uploadExpectedChunks: undefined,
        uploadReceivedBytes: undefined,
      };
    } else {
      created = true;
      build = {
        id: randomUUID(),
        projectId: project.id,
        env,
        version: versionTrim,
        buildNumber,
        type,
        platform,
        filePath,
        metadata,
        createdBy: userId,
        updatedBy: userId,
        createdAt: now,
        updatedAt: now,
        active: true,
        uploadStatus: "success",
      };
    }

    const manifest: BuildManifestV1 = {
      schemaVersion: 1,
      buildId: build.id,
      projectId: project.id,
      name,
      version: versionTrim,
      buildNumber: build.buildNumber,
      env,
      platform,
      type,
      artifactFile: artifactFilename,
      runtimeVersion: metadata.runtimeVersion,
      minSupportedVersion: metadata.minSupportedVersion,
      commitHash: metadata.commitHash,
      branch: metadata.branch,
      releaseNotes: metadata.releaseNotes,
      createdAt: build.createdAt,
      updatedAt: now,
    };

    const manifestAbs = path.join(
      buildVersionDir(project.projectKey, platform, env, versionTrim),
      BUILD_MANIFEST_FILENAME,
    );
    await writeFile(
      manifestAbs,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );

    await buildService.save(build);
    return { build, created };
  },
};
