"use client";

import Link from "next/link";
import { DashboardPageSizeSelect } from "@/components/dashboard/DashboardPageSizeSelect";
import { dashboardHref } from "@/lib/dashboard/dashboard-list-query";

type Props = {
  pathname: string;
  queryString: string;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
};

export function DashboardPaginationBar({
  pathname,
  queryString,
  page,
  pageSize,
  totalPages,
  totalItems,
}: Props) {
  const sp = new URLSearchParams(queryString);
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 text-sm text-zinc-600 dark:text-zinc-400">
      <p className="min-w-0">
        Page <span className="font-medium text-zinc-900 dark:text-zinc-100">{page}</span>{" "}
        of <span className="font-medium text-zinc-900 dark:text-zinc-100">{totalPages}</span>
        <span className="mx-1.5 text-zinc-400">·</span>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{totalItems}</span>{" "}
        total
      </p>
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        <DashboardPageSizeSelect
          pathname={pathname}
          queryString={queryString}
          pageSize={pageSize}
        />
        <div className="flex shrink-0 items-center gap-2">
          {page > 1 ? (
            <Link
              href={dashboardHref(pathname, sp, { page: page - 1 })}
              className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              scroll={false}
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-md border border-transparent px-3 py-1.5 text-zinc-400 dark:text-zinc-600">
              Previous
            </span>
          )}
          {page < totalPages ? (
            <Link
              href={dashboardHref(pathname, sp, { page: page + 1 })}
              className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              scroll={false}
            >
              Next
            </Link>
          ) : (
            <span className="rounded-md border border-transparent px-3 py-1.5 text-zinc-400 dark:text-zinc-600">
              Next
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
