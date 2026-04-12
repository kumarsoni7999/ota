import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfilePageSkeleton } from "@/components/dashboard/DashboardPageSkeletons";
import { DashboardProfileContent } from "./profile-content";

export const metadata: Metadata = {
  title: "Profile — Dashboard",
};

export default function DashboardProfilePage() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <DashboardProfileContent />
    </Suspense>
  );
}
