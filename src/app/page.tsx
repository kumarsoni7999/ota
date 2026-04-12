import { AuthTabs } from "@/components/auth/AuthTabs";
import { getDashboardUser } from "@/lib/auth/dashboard-session";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const sessionUser = await getDashboardUser();
  if (sessionUser) {
    redirect("/dashboard");
  }

  const initialTab =
    (await searchParams).tab === "register" ? "register" : "signin";

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 font-sans dark:bg-zinc-950">
      <AuthTabs initialTab={initialTab} />
    </div>
  );
}
