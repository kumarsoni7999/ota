import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BuildEnv, BuildPlatform } from "@/server/models/build.model";
import type { OtaUpdate, OtaUpdateMetadata } from "@/server/models/ota-update.model";
import type { Project } from "@/server/models/project.model";
import { parseEnv, parsePlatform } from "@/server/services/build-upload.service";
import { otaUpdateService } from "@/server/services/ota-update.service";
import {
  otaAssetsAbsoluteDir,
  otaAssetsStorageRef,
  otaBundleAbsolutePath,
  otaBundleStorageRef,
  otaVersionDir,
} from "@/server/storage/project-storage";

const DEFAULT_MAX_OTA_BUNDLE_BYTES = 200 * 1024 * 1024;
const DEFAULT_MAX_OTA_ASSET_BYTES = 50 * 1024 * 1024;

export class OtaUploadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 400,
  ) {
    super(message);
    this.name = "OtaUploadError";
  }
}

function maxOtaBundleBytes(): number {
  const raw = process.env.MAX_OTA_BUNDLE_BYTES?.trim();
  if (!raw) {
    return DEFAULT_MAX_OTA_BUNDLE_BYTES;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_OTA_BUNDLE_BYTES;
}

function maxOtaAssetBytes(): number {
  const raw = process.env.MAX_OTA_ASSET_BYTES?.trim();
  if (!raw) {
    return DEFAULT_MAX_OTA_ASSET_BYTES;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_OTA_ASSET_BYTES;
}

function requireString(form: FormData, key: string): string {
  const v = form.get(key);
  if (typeof v !== "string") {
    throw new OtaUploadError(
      "FIELD_REQUIRED",
      `Missing or invalid form field "${key}"`,
    );
  }
  const t = v.trim();
  if (!t) {
    throw new OtaUploadError("FIELD_REQUIRED", `Form field "${key}" must not be empty`);
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

function parseMandatory(form: FormData): boolean | undefined {
  const raw = optionalString(form, "mandatory");
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

function parseVersion(form: FormData): string {
  return requireString(form, "version");
}

function parseBuildNumber(form: FormData, fallback: number): number {
  const raw = optionalString(form, "buildNumber");
  if (!raw) {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new OtaUploadError(
      "INVALID_BUILD_NUMBER",
      "buildNumber must be a positive integer",
    );
  }
  return n;
}

function parseBundleFile(form: FormData): File {
  const keys = ["bundle", "file", "jsBundle"] as const;
  for (const key of keys) {
    const v = form.get(key);
    if (v instanceof File && v.size > 0) {
      return v;
    }
  }
  throw new OtaUploadError(
    "BUNDLE_REQUIRED",
    'Expected a non-empty bundle file in "bundle", "file", or "jsBundle"',
  );
}

function assetFiles(form: FormData): File[] {
  const vals = form.getAll("assets");
  return vals.filter((v): v is File => v instanceof File && v.size > 0);
}

function safeAssetFileName(index: number, rawName: string): string {
  const base = path.basename(rawName || `asset-${index}`);
  const safe = base.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "");
  return safe ? `${String(index).padStart(4, "0")}-${safe}` : `asset-${index}`;
}

async function writeAssets(assetsDir: string, files: File[]): Promise<void> {
  await mkdir(assetsDir, { recursive: true });
  const assetLimit = maxOtaAssetBytes();
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (f.size > assetLimit) {
      throw new OtaUploadError(
        "ASSET_TOO_LARGE",
        `Asset "${f.name}" exceeds ${assetLimit} bytes`,
        413,
      );
    }
    const out = path.join(assetsDir, safeAssetFileName(i, f.name));
    await writeFile(out, Buffer.from(await f.arrayBuffer()));
  }
}

function parsePlatformValue(form: FormData): BuildPlatform {
  return parsePlatform(requireString(form, "platform"));
}

function parseEnvValue(form: FormData): BuildEnv {
  return parseEnv(requireString(form, "env"));
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

export const otaUploadService = {
  async saveFromMultipart(params: {
    project: Project;
    userId: string;
    form: FormData;
  }): Promise<{ update: OtaUpdate; created: boolean }> {
    const { project, userId, form } = params;
    if (!project.active) {
      throw new OtaUploadError(
        "PROJECT_INACTIVE",
        "Cannot upload OTA updates to an inactive project",
        403,
      );
    }

    const version = parseVersion(form);
    const env = parseEnvValue(form);
    const platform = parsePlatformValue(form);
    const bundle = parseBundleFile(form);
    const runtimeVersion = optionalString(form, "runtimeVersion");
    const minVersion = optionalString(form, "minVersion");
    const releaseNotes = optionalString(form, "releaseNotes");
    const mandatory = parseMandatory(form);
    const assets = assetFiles(form);

    const bundleLimit = maxOtaBundleBytes();
    if (bundle.size > bundleLimit) {
      throw new OtaUploadError(
        "BUNDLE_TOO_LARGE",
        `Bundle exceeds ${bundleLimit} bytes`,
        413,
      );
    }

    const nextBuildNumber = await nextBuildNumberForSlot({
      projectId: project.id,
      env,
      platform,
      version,
    });
    const buildNumber = parseBuildNumber(form, nextBuildNumber);

    const now = new Date().toISOString();
    const id = randomUUID();

    const metadata: OtaUpdateMetadata = {};
    if (mandatory !== undefined) {
      metadata.mandatory = mandatory;
    }
    if (minVersion !== undefined) {
      metadata.minVersion = minVersion;
    }
    if (runtimeVersion !== undefined) {
      metadata.runtimeVersion = runtimeVersion;
    }
    if (releaseNotes !== undefined) {
      metadata.releaseNotes = releaseNotes;
    }

    // Keep each publish in isolated storage so previous OTA entries remain intact.
    const storageVersion = `${version}__b${buildNumber}`;
    const uploadingEntry: OtaUpdate = {
      id,
      projectId: project.id,
      env,
      platform,
      version,
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
    };

    await otaUpdateService.save(uploadingEntry);

    try {
      const versionDir = otaVersionDir(project.projectKey, platform, env, storageVersion);
      await rm(versionDir, { recursive: true, force: true });
      await mkdir(versionDir, { recursive: true });

      const bundleAbs = otaBundleAbsolutePath(project.projectKey, platform, env, storageVersion);
      await writeFile(bundleAbs, Buffer.from(await bundle.arrayBuffer()));
      const assetsDir = otaAssetsAbsoluteDir(project.projectKey, platform, env, storageVersion);
      await writeAssets(assetsDir, assets);

      const next: OtaUpdate = {
        ...uploadingEntry,
        active: true,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
        uploadState: "SUCCESS",
        uploadError: undefined,
      };
      await otaUpdateService.save(next);
      return { update: next, created: true };
    } catch (err) {
      const failed: OtaUpdate = {
        ...uploadingEntry,
        active: false,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
        uploadState: "FAILED",
        uploadError: err instanceof Error ? err.message : String(err),
      };
      await otaUpdateService.save(failed);
      throw err;
    }
  },
};
