"use client";

import Link from "next/link";
import { SortGlyph } from "@/components/dashboard/SortGlyph";
import { nextSortHref, sortIndicator } from "@/lib/dashboard/sort-href";
import type { SortOrder } from "@/lib/dashboard/sort-order";

type Props = {
  pathname: string;
  queryString: string;
  column: string;
  label: string;
  activeSort: string;
  activeOrder: SortOrder;
};

export function DashboardSortHeaderLink({
  pathname,
  queryString,
  column,
  label,
  activeSort,
  activeOrder,
}: Props) {
  const href = nextSortHref(pathname, new URLSearchParams(queryString), column);
  const dir = sortIndicator(activeSort, activeOrder, column);

  return (
    <Link
      href={href}
      className="inline-flex max-w-full items-center gap-1 text-left font-semibold uppercase tracking-wide text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      scroll={false}
    >
      <span className="min-w-0 truncate">{label}</span>
      <SortGlyph dir={dir} />
    </Link>
  );
}
