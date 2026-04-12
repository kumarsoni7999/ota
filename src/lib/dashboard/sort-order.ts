export type SortOrder = "asc" | "desc";

export function parseSortOrder(value: string | null | undefined): SortOrder {
  return value === "asc" ? "asc" : "desc";
}

export function toggleSortOrder(current: SortOrder): SortOrder {
  return current === "asc" ? "desc" : "asc";
}
