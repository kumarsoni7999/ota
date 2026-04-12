import { createHash } from "node:crypto";
import type { ISODateString } from "@/server/models/iso-date";

export type Project = {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** hashed 24-char material — omit from public GET APIs */
  projectKey: string;
  createdBy: string;
  updatedBy: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  active: boolean;
};

export type ProjectPublic = Omit<Project, "projectKey">;

/** Public project row with a non-reversible fingerprint of `id` for display (full id stays server-side / copy only). */
export type ProjectListItem = ProjectPublic & {
  idFingerprint: string;
};

/** First 12 hex chars of SHA-256(project id), plus ellipsis (not the raw UUID). */
export function projectPublicIdFingerprint(projectId: string): string {
  const hex = createHash("sha256").update(projectId, "utf8").digest("hex");
  return `${hex.slice(0, 12)}…`;
}

export function toProjectListItem(project: Project): ProjectListItem {
  return {
    ...toProjectPublic(project),
    idFingerprint: projectPublicIdFingerprint(project.id),
  };
}

export function toProjectPublic(project: Project): ProjectPublic {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    icon: project.icon,
    createdBy: project.createdBy,
    updatedBy: project.updatedBy,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    active: project.active,
  };
}
