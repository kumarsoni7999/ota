"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CLIENT_ID_HEADER } from "@/lib/api/client-id-header";
import { useDashboardClientId } from "@/components/dashboard/DashboardAuthContext";

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = {
  success: false;
  error: { code: string; message: string };
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (message: string) => void;
  onError: (message: string) => void;
};

export function AddProjectModal({
  open,
  onClose,
  onCreated,
  onError,
}: Props) {
  const clientId = useDashboardClientId();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setSubmitting(false);
    }
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      onError("Project name is required.");
      return;
    }
    if (trimmedName.length > 30) {
      onError("Name must be at most 30 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [CLIENT_ID_HEADER]: clientId,
        },
        credentials: "same-origin",
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim(),
        }),
      });
      const json = (await res.json()) as
        | ApiSuccess<{ project: unknown }>
        | ApiFailure;
      if (!json.success) {
        onError(json.error.message);
        return;
      }
      onCreated("Project created successfully.");
      onClose();
    } catch {
      onError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={() => {
          if (!submitting) {
            onClose();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-project-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h2
          id="add-project-title"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          New project
        </h2>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder="My mobile app"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="What this project is for…"
              className="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>

          <div className="mt-2 flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="brand-cta rounded-md px-3 py-1.5 text-sm font-medium shadow-sm disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
