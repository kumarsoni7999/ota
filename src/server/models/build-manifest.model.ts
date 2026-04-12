/**
 * Sidecar JSON written next to the native artifact (e.g. `app.apk`).
 * Aligns with common OTA / Expo-style practice: keep a small machine-readable
 * manifest with version, runtime compatibility hints, and provenance so JS
 * update clients (or custom tooling) can validate before applying an update.
 *
 * References: Expo `runtimeVersion` / update compatibility, EAS Update manifest
 * concepts — https://docs.expo.dev/eas-update/runtime-versions/
 */
export const BUILD_MANIFEST_FILENAME = "build-manifest.json";

export type BuildManifestV1 = {
  schemaVersion: 1;
  buildId: string;
  projectId: string;
  /** Human-friendly label from the upload form (also used as file basename). */
  name: string;
  version: string;
  buildNumber: number;
  env: string;
  platform: string;
  type: string;
  /** Basename of the stored artifact in this directory. */
  artifactFile: string;
  /**
   * Native–JS compatibility key (Expo-style). Optional; clients may require it
   * to match the embedded binary before loading this bundle’s sibling artifact.
   */
  runtimeVersion?: string;
  minSupportedVersion?: string;
  commitHash?: string;
  branch?: string;
  releaseNotes?: string;
  createdAt: string;
  updatedAt: string;
};
