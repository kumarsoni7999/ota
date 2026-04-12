import path from "node:path";
import type { BuildEnv, BuildPlatform } from "@/server/models/build.model";

/**
 * On-disk layout (example):
 *
 * storage/projects/<projectKey>/
 *   builds/
 *     android/
 *       dev/1.0.0/app.apk
 *       prod/1.0.0/app.aab
 *     ios/
 *       prod/1.0.0/app.ipa
 *   updates/
 *     android/
 *       dev/1.0.1/index.bundle
 *       dev/1.0.1/assets/...
 *     prod/1.0.2/index.bundle
 */

export const OTA_BUNDLE_FILENAME = "index.bundle";
export const OTA_ASSETS_DIRNAME = "assets";

export function storageRoot(): string {
  return path.join(process.cwd(), "storage");
}

export function projectsStorageRoot(): string {
  return path.join(storageRoot(), "projects");
}

export function envFolder(env: BuildEnv): "dev" | "qa" | "stage" | "prod" {
  switch (env) {
    case "DEV":
      return "dev";
    case "QA":
      return "qa";
    case "STAGE":
      return "stage";
    case "PROD":
      return "prod";
  }
}

export function platformFolder(platform: BuildPlatform): BuildPlatform {
  return platform;
}

function assertSafeSegment(segment: string, label: string) {
  const s = segment.trim();
  if (!s) {
    throw new Error(`Invalid ${label}: empty`);
  }
  if (s.includes("..") || s.includes("/") || s.includes("\\")) {
    throw new Error(`Invalid ${label}: must not contain path separators`);
  }
}

export function projectRoot(projectKey: string): string {
  assertSafeSegment(projectKey, "projectKey");
  return path.join(projectsStorageRoot(), projectKey);
}

export function buildsBaseDir(projectKey: string): string {
  return path.join(projectRoot(projectKey), "builds");
}

/** Temp directory for chunked build uploads before assembly. */
export function buildPendingUploadDirAbs(projectKey: string, buildId: string): string {
  assertSafeSegment(buildId, "buildId");
  return path.join(buildsBaseDir(projectKey), ".pending", buildId);
}

export function buildPendingPlaceholderAbs(
  projectKey: string,
  buildId: string,
): string {
  return path.join(buildPendingUploadDirAbs(projectKey, buildId), ".placeholder");
}

export function buildPendingPlaceholderStorageRef(
  projectKey: string,
  buildId: string,
): string {
  return toStorageRelative(buildPendingPlaceholderAbs(projectKey, buildId));
}

export function buildEnvDir(
  projectKey: string,
  platform: BuildPlatform,
  env: BuildEnv,
): string {
  return path.join(
    buildsBaseDir(projectKey),
    platformFolder(platform),
    envFolder(env),
  );
}

export function buildVersionDir(
  projectKey: string,
  platform: BuildPlatform,
  env: BuildEnv,
  version: string,
): string {
  assertSafeSegment(version, "version");
  return path.join(buildEnvDir(projectKey, platform, env), version);
}

export function buildArtifactAbsolutePath(
  projectKey: string,
  platform: BuildPlatform,
  env: BuildEnv,
  version: string,
  fileName: string,
): string {
  assertSafeSegment(fileName, "fileName");
  return path.join(buildVersionDir(projectKey, platform, env, version), fileName);
}

export function updatesBaseDir(projectKey: string): string {
  return path.join(projectRoot(projectKey), "updates");
}

export function updateEnvDir(
  projectKey: string,
  platform: BuildPlatform,
  env: BuildEnv,
): string {
  return path.join(
    updatesBaseDir(projectKey),
    platformFolder(platform),
    envFolder(env),
  );
}

export function otaVersionDir(
  projectKey: string,
  platform: BuildPlatform,
  env: BuildEnv,
  version: string,
): string {
  assertSafeSegment(version, "version");
  return path.join(updateEnvDir(projectKey, platform, env), version);
}

export function otaBundleAbsolutePath(
  projectKey: string,
  platform: BuildPlatform,
  env: BuildEnv,
  version: string,
): string {
  return path.join(otaVersionDir(projectKey, platform, env, version), OTA_BUNDLE_FILENAME);
}

export function otaAssetsAbsoluteDir(
  projectKey: string,
  platform: BuildPlatform,
  env: BuildEnv,
  version: string,
): string {
  return path.join(otaVersionDir(projectKey, platform, env, version), OTA_ASSETS_DIRNAME);
}

/**
 * Path relative to `storage/` (POSIX, no leading slash), e.g.
 * `projects/<projectKey>/builds/android/dev/1.0.0/app.apk`
 */
export function toStorageRelative(absolutePath: string): string {
  const rel = path.relative(storageRoot(), absolutePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Path is outside storage root");
  }
  return rel.split(path.sep).join("/");
}

export function fromStorageRelative(relativePosix: string): string {
  const normalized = relativePosix.split("\\").join("/");
  if (normalized.startsWith("/") || normalized.includes("..")) {
    throw new Error("Invalid storage-relative path");
  }
  return path.join(storageRoot(), ...normalized.split("/"));
}

/** Relative POSIX paths suitable for `Build.filePath` / DB fields. */
export function buildFileStorageRef(
  projectKey: string,
  platform: BuildPlatform,
  env: BuildEnv,
  version: string,
  fileName: string,
): string {
  return toStorageRelative(
    buildArtifactAbsolutePath(projectKey, platform, env, version, fileName),
  );
}

export function otaBundleStorageRef(
  projectKey: string,
  platform: BuildPlatform,
  env: BuildEnv,
  version: string,
): string {
  return toStorageRelative(
    otaBundleAbsolutePath(projectKey, platform, env, version),
  );
}

export function otaAssetsStorageRef(
  projectKey: string,
  platform: BuildPlatform,
  env: BuildEnv,
  version: string,
): string {
  return toStorageRelative(
    otaAssetsAbsoluteDir(projectKey, platform, env, version),
  );
}
