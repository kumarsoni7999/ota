import type { ISODateString } from "@/server/models/iso-date";

export type BuildEnv = "DEV" | "QA" | "STAGE" | "PROD";
export type BuildArtifactType = "apk" | "aab" | "ipa";
export type BuildPlatform = "android" | "ios";

/** Chunked upload lifecycle; legacy rows default to `success`. */
export type BuildUploadStatus = "pending" | "success" | "failed";

export type BuildMetadata = {
  /** Logical name from upload (basename stem); shown in dashboards / manifest. */
  displayName?: string;
  /** Expo-style native–JS compatibility key for OTA workflows. */
  runtimeVersion?: string;
  commitHash?: string;
  branch?: string;
  releaseNotes?: string;
  minSupportedVersion?: string;
};

export type Build = {
  id: string;
  projectId: string;
  env: BuildEnv;
  version: string;
  buildNumber: number;
  type: BuildArtifactType;
  platform: BuildPlatform;
  /**
   * POSIX path relative to `storage/`.
   * While `uploadStatus` is `pending`, points at `.placeholder` under
   * `builds/.pending/<buildId>/` until `complete` assembles the artifact.
   */
  filePath: string;
  metadata: BuildMetadata;
  createdBy: string;
  updatedBy: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  active: boolean;
  uploadStatus: BuildUploadStatus;
  /** Chunked upload: declared total size (bytes). */
  uploadExpectedBytes?: number;
  uploadExpectedChunks?: number;
  /** Chunked upload: bytes received so far (sum of chunk bodies). */
  uploadReceivedBytes?: number;
  /** Incremented whenever the build download endpoint is hit. */
  downloadCount?: number;
};
