import type { Build, BuildUploadStatus } from "@/server/models/build.model";
import {
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
   * Same logical release slot: one artifact per project/env/platform/type/version.
   */
  async findByReleaseSlot(input: {
    projectId: string;
    env: Build["env"];
    version: string;
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
          b.platform === input.platform &&
          b.type === input.type,
      ) ?? null
    );
  },

  async save(build: Build): Promise<void> {
    await writeJsonRecord("builds", build.id, build);
  },
};
