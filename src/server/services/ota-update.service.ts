import type { OtaUpdate } from "@/server/models/ota-update.model";
import {
  readAllJsonRecords,
  sortByCreatedAtDesc,
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
};
