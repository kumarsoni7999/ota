export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginationQuery = {
  page: number;
  pageSize: number;
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export function parsePaginationParams(
  searchParams: URLSearchParams,
): PaginationQuery {
  const pageRaw = searchParams.get("page");
  const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);

  const sizeRaw =
    searchParams.get("pageSize") ??
    searchParams.get("limit") ??
    String(DEFAULT_PAGE_SIZE);
  const requested = Number.parseInt(sizeRaw, 10) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requested));

  return { page, pageSize };
}

export function paginateArray<T>(
  sortedItems: T[],
  query: PaginationQuery,
): PaginatedResult<T> {
  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * query.pageSize;
  const items = sortedItems.slice(start, start + query.pageSize);

  return {
    items,
    page,
    pageSize: query.pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
