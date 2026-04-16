import { rm } from "node:fs/promises";
import path from "node:path";
import type { OtaUpdate } from "@/server/models/ota-update.model";
import {
  deleteJsonRecord,
  readJsonRecord,
  readAllJsonRecords,
  sortByCreatedAtDesc,
  writeJsonRecord,
} from "@/server/services/json-dir.store";
import { projectService } from "@/server/services/project.service";
import { fromStorageRelative } from "@/server/storage/project-storage";

export const otaUpdateService = {
  async listAll(): Promise<OtaUpdate[]> {
    const rows = await readAllJsonRecords<OtaUpdate>("ota-updates");
    return sortByCreatedAtDesc(rows);
  },

  async listForDashboardUser(userId: string): Promise<OtaUpdate[]> {
    const projects = await projectService.listForCreator(userId);
    const ids = new Set(projects.map((p) => p.id));
    const rows = await readAllJsonRecords<OtaUpdate>("ota-updates");
    return sortByCreatedAtDesc(rows.filter((u) => ids.has(u.projectId)));
  },

  async findById(id: string): Promise<OtaUpdate | null> {
    return readJsonRecord<OtaUpdate>("ota-updates", id);
  },

  async findByReleaseSlot(input: {
    projectId: string;
    env: OtaUpdate["env"];
    platform: OtaUpdate["platform"];
    version: string;
  }): Promise<OtaUpdate | null> {
    const rows = await this.listAll();
    const version = input.version.trim();
    return (
      rows.find(
        (u) =>
          u.projectId === input.projectId &&
          u.env === input.env &&
          u.platform === input.platform &&
          u.version === version,
      ) ?? null
    );
  },

  async save(update: OtaUpdate): Promise<void> {
    await writeJsonRecord("ota-updates", update.id, update);
  },

  async incrementDownloadCountById(id: string): Promise<OtaUpdate | null> {
    const row = await this.findById(id);
    if (!row) {
      return null;
    }
    const next: OtaUpdate = {
      ...row,
      downloadCount: (row.downloadCount ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    await this.save(next);
    return next;
  },

  async deletePermanently(update: OtaUpdate): Promise<void> {
    // Bundle path points to ".../<version>/index.bundle"; delete that whole version dir.
    await rm(path.dirname(fromStorageRelative(update.bundlePath)), {
      recursive: true,
      force: true,
    });
    await deleteJsonRecord("ota-updates", update.id);
  },

  /** Latest active OTA row for a project + platform + channel (env). */
  async findLatestActive(input: {
    projectId: string;
    platform: OtaUpdate["platform"];
    env: OtaUpdate["env"];
  }): Promise<OtaUpdate | null> {
    const rows = await this.listAll();
    const matching = rows.filter(
      (u) =>
        u.projectId === input.projectId &&
        u.platform === input.platform &&
        u.env === input.env &&
        u.active !== false,
    );
    if (matching.length === 0) {
      return null;
    }
    // "Latest" should mean most recently created update (ties by updatedAt).
    matching.sort((a, b) => {
      const c = b.createdAt.localeCompare(a.createdAt);
      return c !== 0 ? c : b.updatedAt.localeCompare(a.updatedAt);
    });
    return matching[0] ?? null;
  },
};
