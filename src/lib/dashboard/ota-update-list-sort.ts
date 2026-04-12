import type { SortOrder } from "@/lib/dashboard/sort-order";
import type { OtaUpdate } from "@/server/models/ota-update.model";

const KEYS = new Set([
  "version",
  "projectId",
  "env",
  "createdAt",
  "updatedAt",
  "active",
]);

export function normalizeOtaUpdateSortKey(sort: string): string {
  return KEYS.has(sort) ? sort : "createdAt";
}

export function sortOtaUpdates(
  items: OtaUpdate[],
  sort: string,
  order: SortOrder,
): OtaUpdate[] {
  const key = normalizeOtaUpdateSortKey(sort);
  const m = order === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    switch (key) {
      case "version":
        return m * a.version.localeCompare(b.version, undefined, { numeric: true });
      case "projectId":
        return m * a.projectId.localeCompare(b.projectId);
      case "env":
        return m * a.env.localeCompare(b.env);
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
