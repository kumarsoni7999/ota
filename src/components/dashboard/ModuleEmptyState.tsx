import type { SVGProps } from "react";

function IconBox({ className, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
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
      strokeWidth="1.25"
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
      strokeWidth="1.25"
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

const copy = {
  projects: {
    Icon: IconBox,
    title: "No projects yet",
    description:
      "Create a project to organize builds and OTA updates. Use the Add project button above when you are ready.",
  },
  builds: {
    Icon: IconLayers,
    title: "No builds yet",
    description:
      "Build artifacts will show here after you upload APKs, AABs, or IPAs for your projects.",
  },
  updates: {
    Icon: IconUpdates,
    title: "No OTA updates yet",
    description:
      "Published update bundles appear here once you ship over-the-air releases for a project.",
  },
} as const;

export type ModuleEmptyVariant = keyof typeof copy;

export function ModuleEmptyState({ variant }: { variant: ModuleEmptyVariant }) {
  const { Icon, title, description } = copy[variant];
  return (
    <div
      className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-600 dark:bg-zinc-900/80"
      role="status"
    >
      <div className="mb-6 text-zinc-400 dark:text-zinc-500">
        <Icon className="mx-auto h-24 w-24" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </div>
  );
}
