import { parsePaginationParams } from "@/lib/api/pagination";
import { parseSortOrder, type SortOrder } from "@/lib/dashboard/sort-order";

export type DashboardListQuery = {
  page: number;
  pageSize: number;
  sort: string;
  order: SortOrder;
};

/** Normalize Next.js `searchParams` into a single-value URLSearchParams. */
export function searchParamsToURLSearchParams(
  raw: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value.length > 0) {
      sp.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      sp.set(key, value[0]);
    }
  }
  return sp;
}

export function parseListQuery(
  sp: URLSearchParams,
  defaults: { sort: string; order?: SortOrder },
): DashboardListQuery {
  const { page, pageSize } = parsePaginationParams(sp);
  const sort = (sp.get("sort") ?? defaults.sort).trim() || defaults.sort;
  const order = parseSortOrder(sp.get("order") ?? defaults.order);

  return { page, pageSize, sort, order };
}

export {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "@/lib/api/pagination";

export function buildDashboardQueryString(
  base: URLSearchParams,
  patch: Record<string, string | number | undefined | null>,
): string {
  const next = new URLSearchParams(base.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === null || v === "") {
      next.delete(k);
    } else {
      next.set(k, String(v));
    }
  }
  return next.toString();
}

export function dashboardHref(
  pathname: string,
  base: URLSearchParams,
  patch: Record<string, string | number | undefined | null>,
): string {
  const qs = buildDashboardQueryString(base, patch);
  return qs ? `${pathname}?${qs}` : pathname;
}
