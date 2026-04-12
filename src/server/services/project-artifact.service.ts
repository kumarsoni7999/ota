import { mkdir, writeFile } from "node:fs/promises";
import type { BuildEnv, BuildPlatform } from "@/server/models/build.model";
import {
  buildArtifactAbsolutePath,
  buildVersionDir,
  otaAssetsAbsoluteDir,
  otaBundleAbsolutePath,
  otaVersionDir,
} from "@/server/storage/project-storage";

/**
 * Ensures versioned directories exist and writes binaries into the canonical tree:
 * `storage/projects/<projectKey>/builds/<platform>/<env>/<version>/<fileName>`
 */
export async function writeBuildArtifact(params: {
  projectKey: string;
  platform: BuildPlatform;
  env: BuildEnv;
  version: string;
  fileName: string;
  data: Buffer;
}): Promise<{ absolutePath: string }> {
  const dir = buildVersionDir(
    params.projectKey,
    params.platform,
    params.env,
    params.version,
  );

  await mkdir(dir, { recursive: true });
  const absolutePath = buildArtifactAbsolutePath(
    params.projectKey,
    params.platform,
    params.env,
    params.version,
    params.fileName,
  );
  await writeFile(absolutePath, params.data);
  return { absolutePath };
}

/**
 * Writes `index.bundle` under
 * `storage/projects/<projectKey>/updates/<platform>/<env>/<version>/`
 * and ensures `assets/` exists alongside the bundle.
 */
export async function writeOtaBundleLayout(params: {
  projectKey: string;
  platform: BuildPlatform;
  env: BuildEnv;
  version: string;
  bundle: Buffer;
}): Promise<{ bundleAbsolutePath: string; assetsAbsoluteDir: string }> {
  const versionDir = otaVersionDir(
    params.projectKey,
    params.platform,
    params.env,
    params.version,
  );
  await mkdir(versionDir, { recursive: true });

  const assetsDir = otaAssetsAbsoluteDir(
    params.projectKey,
    params.platform,
    params.env,
    params.version,
  );
  await mkdir(assetsDir, { recursive: true });

  const bundleAbsolutePath = otaBundleAbsolutePath(
    params.projectKey,
    params.platform,
    params.env,
    params.version,
  );
  await writeFile(bundleAbsolutePath, params.bundle);

  return { bundleAbsolutePath, assetsAbsoluteDir: assetsDir };
}
