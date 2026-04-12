import { mkdir, rm } from "node:fs/promises";
import type { Project } from "@/server/models/project.model";
import { projectRoot } from "@/server/storage/project-storage";
import {
  deleteJsonRecord,
  readAllJsonRecords,
  readJsonRecord,
  sortByCreatedAtDesc,
  writeJsonRecord,
} from "@/server/services/json-dir.store";

export const projectService = {
  async listAll(): Promise<Project[]> {
    const rows = await readAllJsonRecords<Project>("projects");
    return sortByCreatedAtDesc(rows);
  },

  async listForCreator(userId: string): Promise<Project[]> {
    const rows = await this.listAll();
    return rows.filter((p) => p.createdBy === userId);
  },

  async findById(id: string): Promise<Project | null> {
    return readJsonRecord<Project>("projects", id);
  },

  async create(project: Project): Promise<void> {
    await mkdir(projectRoot(project.projectKey), { recursive: true });
    await writeJsonRecord("projects", project.id, project);
  },

  async save(project: Project): Promise<void> {
    await writeJsonRecord("projects", project.id, project);
  },

  /** Removes JSON record and storage directory for the project key. */
  async deletePermanently(project: Project): Promise<void> {
    await rm(projectRoot(project.projectKey), { recursive: true, force: true });
    await deleteJsonRecord("projects", project.id);
  },
};
