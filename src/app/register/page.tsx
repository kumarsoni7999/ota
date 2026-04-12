import { getDashboardUser } from "@/lib/auth/dashboard-session";
import { redirect } from "next/navigation";

export default async function RegisterRedirectPage() {
  if (await getDashboardUser()) {
    redirect("/dashboard");
  }
  redirect("/?tab=register");
}
