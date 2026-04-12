import type { SortOrder } from "@/lib/dashboard/sort-order";
import type { ProjectListItem } from "@/server/models/project.model";

const KEYS = new Set([
  "name",
  "description",
  "createdAt",
  "updatedAt",
  "active",
]);

export function normalizeProjectSortKey(sort: string): string {
  return KEYS.has(sort) ? sort : "updatedAt";
}

export function sortProjectListItems(
  items: ProjectListItem[],
  sort: string,
  order: SortOrder,
): ProjectListItem[] {
  const key = normalizeProjectSortKey(sort);
  const m = order === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    switch (key) {
      case "name":
        return m * a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      case "description":
        return (
          m *
          (a.description || "").localeCompare(b.description || "", undefined, {
            sensitivity: "base",
          })
        );
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
      default:
        return 0;
    }
  });
}
