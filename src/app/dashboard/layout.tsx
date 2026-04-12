import type { Metadata } from "next";
import { DashboardAuthProvider } from "@/components/dashboard/DashboardAuthContext";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import {
  profileToUserPublic,
  requireDashboardProfileUser,
} from "@/lib/auth/dashboard-session";

export const metadata: Metadata = {
  title: "Dashboard — Sthanave OTA",
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await requireDashboardProfileUser();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 font-sans dark:bg-zinc-950 md:flex-row md:items-start">
      <DashboardSidebar user={profileToUserPublic(profile)} />
      <main className="w-full min-w-0 flex-1 overflow-x-auto p-6 md:p-8">
        <DashboardAuthProvider clientId={profile.clientId}>
          {children}
        </DashboardAuthProvider>
      </main>
    </div>
  );
}
