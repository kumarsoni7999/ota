"use client";

import { useRouter } from "next/navigation";
import { dashboardHref } from "@/lib/dashboard/dashboard-list-query";
import { MAX_PAGE_SIZE } from "@/lib/api/pagination";

const OPTIONS = [10, 20, 50, 100].filter((n) => n <= MAX_PAGE_SIZE);

type Props = {
  pathname: string;
  queryString: string;
  pageSize: number;
};

export function DashboardPageSizeSelect({
  pathname,
  queryString,
  pageSize,
}: Props) {
  const router = useRouter();
  const sp = new URLSearchParams(queryString);
  const sizeOptions = [...new Set([...OPTIONS, pageSize])].sort(
    (a, b) => a - b,
  );

  return (
    <select
      aria-label="Items per page"
      className="w-14 shrink-0 rounded border border-zinc-200 bg-white py-0.5 pl-1 pr-5 text-xs font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
      value={String(pageSize)}
      onChange={(e) => {
          const next = Number.parseInt(e.target.value, 10);
          const href = dashboardHref(pathname, sp, {
            pageSize: next,
            page: 1,
          });
          router.push(href);
        }}
      >
        {sizeOptions.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
    </select>
  );
}
