type Dir = "asc" | "desc" | null;

export function SortGlyph({ dir }: { dir: Dir }) {
  if (dir === "asc") {
    return (
      <svg
        className="h-3.5 w-3.5 shrink-0 text-zinc-800 dark:text-zinc-200"
        viewBox="0 0 12 12"
        fill="currentColor"
        aria-hidden
      >
        <path d="M6 2 2 8h8L6 2z" />
      </svg>
    );
  }
  if (dir === "desc") {
    return (
      <svg
        className="h-3.5 w-3.5 shrink-0 text-zinc-800 dark:text-zinc-200"
        viewBox="0 0 12 12"
        fill="currentColor"
        aria-hidden
      >
        <path d="M6 10 10 4H2l4 6z" />
      </svg>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 flex-col leading-none text-zinc-400 dark:text-zinc-500"
      aria-hidden
    >
      <svg className="h-2.5 w-2.5 -mb-0.5" viewBox="0 0 8 5" fill="currentColor">
        <path d="M4 0 0 5h8L4 0z" />
      </svg>
      <svg className="h-2.5 w-2.5" viewBox="0 0 8 5" fill="currentColor">
        <path d="M4 5 8 0H0l4 5z" />
      </svg>
    </span>
  );
}
