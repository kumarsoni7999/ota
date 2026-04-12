import { dashboardHref } from "@/lib/dashboard/dashboard-list-query";
import { parseSortOrder, toggleSortOrder, type SortOrder } from "@/lib/dashboard/sort-order";

const DATE_SORT_KEYS = new Set(["createdAt", "updatedAt"]);

/**
 * Next URL when activating or toggling sort on `column`.
 * Date columns default to `desc` when first selected; others default to `asc`.
 */
export function nextSortHref(
  pathname: string,
  sp: URLSearchParams,
  column: string,
): string {
  const curSort = sp.get("sort") ?? "";
  const curOrder = parseSortOrder(sp.get("order"));
  let order: SortOrder;
  if (curSort === column) {
    order = toggleSortOrder(curOrder);
  } else {
    order = DATE_SORT_KEYS.has(column) ? "desc" : "asc";
  }
  return dashboardHref(pathname, sp, { sort: column, order, page: 1 });
}

export function sortIndicator(
  activeSort: string,
  activeOrder: SortOrder,
  column: string,
): "asc" | "desc" | null {
  if (activeSort !== column) {
    return null;
  }
  return activeOrder;
}
