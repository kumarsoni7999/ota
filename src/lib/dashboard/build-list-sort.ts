import type { SortOrder } from "@/lib/dashboard/sort-order";
import type { Build } from "@/server/models/build.model";

const KEYS = new Set([
  "version",
  "projectId",
  "platform",
  "env",
  "type",
  "buildNumber",
  "createdAt",
  "updatedAt",
  "active",
  "uploadStatus",
]);

export function normalizeBuildSortKey(sort: string): string {
  return KEYS.has(sort) ? sort : "createdAt";
}

export function sortBuilds(
  items: Build[],
  sort: string,
  order: SortOrder,
): Build[] {
  const key = normalizeBuildSortKey(sort);
  const m = order === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    switch (key) {
      case "version":
        return m * a.version.localeCompare(b.version, undefined, { numeric: true });
      case "projectId":
        return m * a.projectId.localeCompare(b.projectId);
      case "platform":
        return m * a.platform.localeCompare(b.platform);
      case "env":
        return m * a.env.localeCompare(b.env);
      case "type":
        return m * a.type.localeCompare(b.type);
      case "buildNumber":
        return m * (a.buildNumber - b.buildNumber);
      case "createdAt":
        return (
          m *
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        );
      case "updatedAt":
        return (
          m *
          (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
        );
      case "active":
        return m * (Number(a.active) - Number(b.active));
      case "uploadStatus":
        return m * a.uploadStatus.localeCompare(b.uploadStatus);
      default:
        return 0;
    }
  });
}
