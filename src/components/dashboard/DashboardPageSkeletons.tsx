function PulseBlock({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700 ${className}`}
    />
  );
}

export function ProjectsPageSkeleton() {
  return (
    <div className="w-full min-w-0 animate-pulse">
      <div className="flex flex-row items-center justify-between gap-3">
        <PulseBlock className="h-8 w-40" />
        <PulseBlock className="h-8 w-28" />
      </div>
      <PulseBlock className="mt-2 h-4 w-72 max-w-full" />
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <PulseBlock className="h-11 w-full rounded-none bg-zinc-100 dark:bg-zinc-800" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 border-t border-zinc-200 p-4 dark:border-zinc-800"
          >
            <PulseBlock className="h-4 w-[14%]" />
            <PulseBlock className="h-4 flex-1" />
            <PulseBlock className="h-4 w-[22%]" />
            <PulseBlock className="h-4 w-32" />
            <PulseBlock className="h-4 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BuildsPageSkeleton() {
  return (
    <div className="w-full min-w-0 animate-pulse">
      <PulseBlock className="h-8 w-32" />
      <PulseBlock className="mt-2 h-4 w-64 max-w-full" />
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <PulseBlock className="h-11 w-full rounded-none bg-zinc-100 dark:bg-zinc-800" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800"
          >
            <PulseBlock className="h-4 w-16" />
            <PulseBlock className="h-4 w-24" />
            <PulseBlock className="h-4 w-12" />
            <PulseBlock className="h-4 w-14" />
            <PulseBlock className="h-4 w-12" />
            <PulseBlock className="h-4 w-8" />
            <PulseBlock className="h-4 flex-1" />
            <PulseBlock className="h-4 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function UpdatesPageSkeleton() {
  return (
    <div className="w-full min-w-0 animate-pulse">
      <PulseBlock className="h-8 w-44" />
      <PulseBlock className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <PulseBlock className="h-11 w-full rounded-none bg-zinc-100 dark:bg-zinc-800" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800"
          >
            <PulseBlock className="h-4 w-16" />
            <PulseBlock className="h-4 w-28" />
            <PulseBlock className="h-4 w-12" />
            <PulseBlock className="h-4 flex-1" />
            <PulseBlock className="h-4 w-36" />
            <PulseBlock className="h-4 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="w-full min-w-0 animate-pulse">
      <PulseBlock className="h-8 w-36" />
      <PulseBlock className="mt-2 h-4 w-96 max-w-full" />
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
        <div className="h-24 w-24 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        <PulseBlock className="h-12 w-full max-w-md sm:flex-1" />
      </div>
      <div className="mt-8 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex justify-between gap-4 border-b border-zinc-100 py-4 last:border-0 dark:border-zinc-800"
          >
            <PulseBlock className="h-4 w-28" />
            <PulseBlock className="h-4 w-48 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
