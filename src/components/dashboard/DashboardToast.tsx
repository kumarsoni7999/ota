"use client";

import { useEffect } from "react";

type Props = {
  message: string;
  kind: "success" | "error";
  onDismiss: () => void;
};

export function DashboardToast({ message, kind, onDismiss }: Props) {
  useEffect(() => {
    const t = window.setTimeout(() => {
      onDismiss();
    }, 5500);
    return () => window.clearTimeout(t);
  }, [message, kind, onDismiss]);

  return (
    <div
      role="alert"
      className={`fixed top-4 right-4 z-[200] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${
        kind === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/90 dark:text-emerald-100"
          : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/90 dark:text-red-100"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 leading-snug">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
