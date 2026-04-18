import type { BuildEnv, BuildPlatform } from "@/server/models/build.model";
import type { ISODateString } from "@/server/models/iso-date";

export type OtaUpdateMetadata = {
  mandatory?: boolean;
  minVersion?: string;
  runtimeVersion?: string;
  releaseNotes?: string;
};

export type OtaUploadState = "UPLOADING" | "SUCCESS" | "FAILED";

export type OtaUpdate = {
  id: string;
  projectId: string;
  env: BuildEnv;
  platform: BuildPlatform;
  version: string;
  /** OTA package build number (not native app build); included in fingerprint. */
  buildNumber?: number;
  /** POSIX path relative to `storage/` (see `otaBundleStorageRef`). */
  bundlePath: string;
  /** POSIX path relative to `storage/` — typically the `assets/` directory beside the bundle. */
  assetsPath: string;
  metadata: OtaUpdateMetadata;
  createdBy: string;
  updatedBy: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  active: boolean;
  uploadState?: OtaUploadState;
  uploadError?: string;
  downloadCount?: number;
  /** Chunked bundle upload (pending only). */
  uploadExpectedBytes?: number;
  uploadExpectedChunks?: number;
  uploadReceivedBytes?: number;
};
