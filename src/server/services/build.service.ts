import { rm, unlink } from "node:fs/promises";
import path from "node:path";
import { BUILD_MANIFEST_FILENAME } from "@/server/models/build-manifest.model";
import type { Build, BuildUploadStatus } from "@/server/models/build.model";
import {
  buildPendingUploadDirAbs,
  fromStorageRelative,
} from "@/server/storage/project-storage";
import {
  deleteJsonRecord,
  readAllJsonRecords,
  readJsonRecord,
  sortByCreatedAtDesc,
  writeJsonRecord,
} from "@/server/services/json-dir.store";
import { projectService } from "@/server/services/project.service";

export function normalizeBuildRow(raw: Build): Build {
  const uploadStatus: BuildUploadStatus = raw.uploadStatus ?? "success";
  return {
    ...raw,
    uploadStatus,
    uploadExpectedBytes: raw.uploadExpectedBytes,
    uploadExpectedChunks: raw.uploadExpectedChunks,
    uploadReceivedBytes:
      raw.uploadReceivedBytes ??
      (uploadStatus === "pending" ? 0 : undefined),
    downloadCount: raw.downloadCount ?? 0,
  };
}

export const buildService = {
  async listAll(): Promise<Build[]> {
    const rows = await readAllJsonRecords<Build>("builds");
    return sortByCreatedAtDesc(rows.map(normalizeBuildRow));
  },

  /** Builds whose `projectId` belongs to a project created by `userId`. */
  async listForDashboardUser(userId: string): Promise<Build[]> {
    const projects = await projectService.listForCreator(userId);
    const ids = new Set(projects.map((p) => p.id));
    const rows = await readAllJsonRecords<Build>("builds");
    return sortByCreatedAtDesc(
      rows.map(normalizeBuildRow).filter((b) => ids.has(b.projectId)),
    );
  },

  async findById(id: string): Promise<Build | null> {
    const row = await readJsonRecord<Build>("builds", id);
    return row ? normalizeBuildRow(row) : null;
  },

  /**
   * Same logical release slot: one artifact per
   * project/env/platform/type/version/buildNumber.
   */
  async findByReleaseSlot(input: {
    projectId: string;
    env: Build["env"];
    version: string;
    buildNumber: number;
    platform: Build["platform"];
    type: Build["type"];
  }): Promise<Build | null> {
    const rows = await this.listAll();
    const v = input.version.trim();
    return (
      rows.find(
        (b) =>
          b.projectId === input.projectId &&
          b.env === input.env &&
          b.version === v &&
          b.buildNumber === input.buildNumber &&
          b.platform === input.platform &&
          b.type === input.type,
      ) ?? null
    );
  },

  async save(build: Build): Promise<void> {
    await writeJsonRecord("builds", build.id, build);
  },

  async incrementDownloadCountById(id: string): Promise<Build | null> {
    const row = await this.findById(id);
    if (!row) {
      return null;
    }
    const next: Build = {
      ...row,
      downloadCount: (row.downloadCount ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    await this.save(next);
    return next;
  },

  async deletePermanently(params: {
    build: Build;
    projectKey: string;
  }): Promise<void> {
    const { build, projectKey } = params;

    await rm(buildPendingUploadDirAbs(projectKey, build.id), {
      recursive: true,
      force: true,
    });

    try {
      await unlink(fromStorageRelative(build.filePath));
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw e;
      }
    }

    try {
      await unlink(
        path.join(
          path.dirname(fromStorageRelative(build.filePath)),
          BUILD_MANIFEST_FILENAME,
        ),
      );
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw e;
      }
    }

    await deleteJsonRecord("builds", build.id);
  },
};
