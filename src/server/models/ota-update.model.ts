import type { BuildEnv } from "@/server/models/build.model";
import type { ISODateString } from "@/server/models/iso-date";

export type OtaUpdateMetadata = {
  mandatory?: boolean;
  minVersion?: string;
  releaseNotes?: string;
};

export type OtaUpdate = {
  id: string;
  projectId: string;
  env: BuildEnv;
  version: string;
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
};
