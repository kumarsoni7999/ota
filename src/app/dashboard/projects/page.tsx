import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectsPageSkeleton } from "@/components/dashboard/DashboardPageSkeletons";
import { DashboardProjectsContent } from "./projects-content";

export const metadata: Metadata = {
  title: "Projects — Dashboard",
};

export default async function DashboardProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<ProjectsPageSkeleton />}>
      <DashboardProjectsContent searchParams={searchParams} />
    </Suspense>
  );
}
