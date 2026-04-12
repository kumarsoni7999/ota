import { CopyableField } from "@/components/dashboard/CopyableField";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { requireDashboardProfileUser } from "@/lib/auth/dashboard-session";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}

export async function DashboardProfileContent() {
  const user = await requireDashboardProfileUser();

  return (
    <div className="w-full min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Profile
      </h1>
      <p className="mt-1 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
        Your account details. Password is never shown. Use copy buttons for
        values you paste into clients or scripts.
      </p>

      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <UserAvatar
          name={user.name}
          profilePhoto={user.profilePhoto}
          className="h-24 w-24 text-lg"
          size={96}
        />
        <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{user.name}</h1>
        {user.email && <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>}
        </div>
      </div>

      <dl className="mt-8 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
        <Row label="Name" value={user.name} />
        <CopyableField label="Client ID" value={user.clientId} />
        <CopyableField label="Email" value={user.email ?? "—"} />
        <CopyableField label="Mobile" value={user.mobile ?? "—"} />
        <Row label="Role" value={user.role} />
        <Row
          label="Member since"
          value={new Date(user.createdAt).toLocaleString()}
        />
        <Row
          label="Last updated"
          value={new Date(user.updatedAt).toLocaleString()}
        />
        <Row label="Account active" value={user.active ? "Yes" : "No"} />
      </dl>
    </div>
  );
}
