import type { OtaUpdate } from "@/server/models/ota-update.model";
import {
  readJsonRecord,
  readAllJsonRecords,
  sortByCreatedAtDesc,
  writeJsonRecord,
} from "@/server/services/json-dir.store";
import { projectService } from "@/server/services/project.service";

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
};
