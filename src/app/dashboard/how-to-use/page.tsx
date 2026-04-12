import { redirect } from "next/navigation";

export default function DashboardHowToUseRedirectPage() {
  redirect("/dashboard/api-docs");
}
