import type { Metadata } from "next";
import { Suspense } from "react";
import { UpdatesPageSkeleton } from "@/components/dashboard/DashboardPageSkeletons";
import { DashboardUpdatesContent } from "./updates-content";

export const metadata: Metadata = {
  title: "Updates — Dashboard",
};

export default async function DashboardUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<UpdatesPageSkeleton />}>
      <DashboardUpdatesContent searchParams={searchParams} />
    </Suspense>
  );
}
