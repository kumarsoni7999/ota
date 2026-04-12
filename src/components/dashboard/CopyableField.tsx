"use client";

import { useState } from "react";

function CopyIcon({ className }: { className?: string }) {
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
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

type Props = {
  label: string;
  value: string;
};

export function CopyableField({ label, value }: Props) {
  const [copied, setCopied] = useState(false);
  const canCopy = value.length > 0 && value !== "—";

  async function copy() {
    if (!canCopy) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="flex min-w-0 items-center gap-2 sm:max-w-[70%] sm:justify-end">
        <span className="min-w-0 break-all text-right text-sm text-zinc-900 dark:text-zinc-100">
          {value}
        </span>
        {canCopy ? (
          <button
            type="button"
            onClick={() => void copy()}
            className="shrink-0 rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label={`Copy ${label}`}
          >
            {copied ? (
              <CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </dd>
    </div>
  );
}
