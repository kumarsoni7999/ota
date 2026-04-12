import type { Metadata } from "next";
import { Suspense } from "react";
import { BuildsPageSkeleton } from "@/components/dashboard/DashboardPageSkeletons";
import { DashboardBuildsContent } from "./builds-content";

export const metadata: Metadata = {
  title: "Builds — Dashboard",
};

export default async function DashboardBuildsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<BuildsPageSkeleton />}>
      <DashboardBuildsContent searchParams={searchParams} />
    </Suspense>
  );
}
