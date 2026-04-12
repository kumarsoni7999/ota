"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type SVGProps } from "react";
import type { UserPublic } from "@/server/models/user.model";
import { LogoutConfirmDialog } from "@/components/dashboard/LogoutConfirmDialog";

function IconBox({ className, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...p}
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  );
}

function IconLayers({ className, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...p}
    >
      <path d="m12.83 2.18 8 4.5v9l-8 4.5-8-4.5v-9l8-4.5Z" />
      <path d="M4.83 6.68 12.83 11 20.83 6.68" />
      <path d="m12 11 8.05-4.32" />
      <path d="m12 11v9.5" />
    </svg>
  );
}

function IconUpdates({ className, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...p}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function IconHelp({ className, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...p}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconUser({ className, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...p}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLogOut({ className, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...p}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

const nav = [
  {
    href: "/dashboard/projects",
    label: "Projects",
    Icon: IconBox,
  },
  {
    href: "/dashboard/builds",
    label: "Builds",
    Icon: IconLayers,
  },
  {
    href: "/dashboard/updates",
    label: "Updates",
    Icon: IconUpdates,
  },
  // {
  //   href: "/dashboard/api-docs",
  //   label: "API docs",
  //   Icon: IconHelp,
  // },
  {
    href: "/dashboard/profile",
    label: "Profile",
    Icon: IconUser,
  },
] as const;

function linkClass(active: boolean) {
  const base =
    "inline-flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition";
  if (active) {
    return `${base} bg-gradient-to-br from-[#ff8c42] to-[#f04a23] text-white shadow-sm`;
  }
  return `${base} text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100`;
}

type Props = {
  user: UserPublic;
};

export function DashboardSidebar({ user }: Props) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  async function performLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      window.location.href = "/?tab=signin";
    }
  }

  return (
    <>
      <aside className="sticky top-0 z-20 w-full shrink-0 border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 md:flex md:h-[100dvh] md:min-h-0 md:w-56 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:px-3 md:py-8">
        <div className="mb-6 flex flex-col items-center gap-3 border-b border-zinc-200 pb-6 text-center dark:border-zinc-800">
          <Image
            src="/app-icon.png"
            alt="Sthanave OTA"
            width={72}
            height={72}
            priority
            className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-2xl object-contain shadow-sm"
          />
          <div className="w-full min-w-0 max-w-full px-0.5">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {user.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {user.mobile ?? "—"}
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-1 md:flex-col md:gap-0.5" aria-label="Dashboard">
          {nav.map(({ href, label, Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className={linkClass(active)}>
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            disabled={loggingOut}
            className="inline-flex w-full items-center gap-2 rounded-md border border-red-200 bg-red-50/80 px-2.5 py-1.5 text-left text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
          >
            <IconLogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </nav>
      </aside>

      <LogoutConfirmDialog
        open={logoutOpen}
        confirming={loggingOut}
        onCancel={() => {
          if (!loggingOut) {
            setLogoutOpen(false);
          }
        }}
        onConfirm={async () => {
          await performLogout();
        }}
      />
    </>
  );
}
