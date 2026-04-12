import { getDashboardUser } from "@/lib/auth/dashboard-session";
import { redirect } from "next/navigation";

export default async function LoginRedirectPage() {
  if (await getDashboardUser()) {
    redirect("/dashboard");
  }
  redirect("/?tab=signin");
}
