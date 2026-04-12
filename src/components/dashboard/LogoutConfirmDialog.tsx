"use client";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  confirming: boolean;
};

export function LogoutConfirmDialog({
  open,
  onCancel,
  onConfirm,
  confirming,
}: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-desc"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h2
          id="logout-dialog-title"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Sign out?
        </h2>
        <p
          id="logout-dialog-desc"
          className="mt-2 text-sm text-zinc-600 dark:text-zinc-400"
        >
          You will need to sign in again to use the dashboard.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void Promise.resolve(onConfirm());
            }}
            disabled={confirming}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {confirming ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </div>
  );
}
