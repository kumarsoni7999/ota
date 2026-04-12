"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AddProjectModal } from "@/components/dashboard/AddProjectModal";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { CopyProjectIdButton } from "@/components/dashboard/CopyProjectIdButton";
import { DashboardPaginationBar } from "@/components/dashboard/DashboardPaginationBar";
import { DashboardSortHeaderLink } from "@/components/dashboard/DashboardSortHeaderLink";
import { useDashboardClientId } from "@/components/dashboard/DashboardAuthContext";
import { DashboardToast } from "@/components/dashboard/DashboardToast";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";
import { CLIENT_ID_HEADER } from "@/lib/api/client-id-header";
import type { SortOrder } from "@/lib/dashboard/sort-order";
import type { ProjectListItem } from "@/server/models/project.model";

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = {
  success: false;
  error: { code: string; message: string };
};

export type ProjectsListMeta = {
  pathname: string;
  queryString: string;
  q: string;
  sort: string;
  order: SortOrder;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasAnyProjects: boolean;
  filteredEmpty: boolean;
};

type Props = {
  initialRows: ProjectListItem[];
  listMeta: ProjectsListMeta;
};

type ConfirmMode = "activate" | "deactivate" | "delete";

function confirmDescription(
  confirm: { mode: ConfirmMode; project: ProjectListItem } | null,
): string {
  if (!confirm) {
    return "";
  }
  const { mode, project } = confirm;
  if (mode === "delete") {
    return `This will remove "${project.name}" and all files under its storage folder. This cannot be undone.`;
  }
  if (mode === "activate") {
    return `Enable "${project.name}" for builds and updates?`;
  }
  return `Disable "${project.name}"? It will stay in the list but will not be treated as active.`;
}

export function ProjectsClientView({ initialRows, listMeta }: Props) {
  const clientId = useDashboardClientId();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [confirm, setConfirm] = useState<{
    mode: ConfirmMode;
    project: ProjectListItem;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const dismissToast = useCallback(() => setToast(null), []);

  function showToast(kind: "success" | "error", text: string) {
    setToast({ kind, text });
  }

  function apiHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      [CLIENT_ID_HEADER]: clientId,
    };
  }

  async function runPatch(projectId: string, active: boolean) {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: apiHeaders(),
      credentials: "same-origin",
      body: JSON.stringify({ active }),
    });
    const json = (await res.json()) as ApiSuccess<{ project: unknown }> | ApiFailure;
    if (!json.success) {
      showToast("error", json.error.message);
      return false;
    }
    showToast(
      "success",
      active ? "Project activated." : "Project deactivated.",
    );
    router.refresh();
    return true;
  }

  async function runDelete(projectId: string) {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
      headers: { [CLIENT_ID_HEADER]: clientId },
      credentials: "same-origin",
    });
    const json = (await res.json()) as ApiSuccess<{ ok: boolean }> | ApiFailure;
    if (!json.success) {
      showToast("error", json.error.message);
      return false;
    }
    showToast("success", "Project deleted permanently.");
    router.refresh();
    return true;
  }

  async function onConfirmAction() {
    if (!confirm) {
      return;
    }
    setConfirmLoading(true);
    try {
      const { mode, project } = confirm;
      if (mode === "delete") {
        await runDelete(project.id);
      } else if (mode === "activate") {
        await runPatch(project.id, true);
      } else {
        await runPatch(project.id, false);
      }
    } finally {
      setConfirmLoading(false);
      setConfirm(null);
    }
  }

  const {
    pathname,
    queryString,
    q,
    sort,
    order,
    page,
    pageSize,
    totalPages,
    totalItems,
    hasAnyProjects,
    filteredEmpty,
  } = listMeta;

  const qs = queryString;

  return (
    <div className="w-full min-w-0">
      {toast ? (
        <DashboardToast
          message={toast.text}
          kind={toast.kind}
          onDismiss={dismissToast}
        />
      ) : null}

      <div className="min-w-0">
        <div className="flex flex-row items-center justify-between gap-3">
          <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Projects
          </h1>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="brand-cta shrink-0 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm"
          >
            Add project
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          All projects in your OTA workspace.
        </p>
      </div>

      {hasAnyProjects ? (
        <form
          method="GET"
          action={pathname}
          className="mt-4 flex min-w-0 flex-wrap items-end gap-2"
        >
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="order" value={order} />
          <input type="hidden" name="pageSize" value={pageSize} />
          <input type="hidden" name="page" value="1" />
          <label className="flex min-w-[12rem] max-w-md flex-1 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Search by name
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Filter by project name…"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </label>
          <button
            type="submit"
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Search
          </button>
        </form>
      ) : null}

      {!hasAnyProjects ? (
        <ModuleEmptyState variant="projects" />
      ) : filteredEmpty ? (
        <p className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          No projects match your search.{" "}
          <a
            href={pathname}
            className="font-medium text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-400"
          >
            Clear filters
          </a>
        </p>
      ) : (
        <>
          <div className="mt-6 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-0 table-fixed text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                  <tr>
                    <th className="w-[13%] px-3 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="name"
                        label="Name"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="w-[22%] px-3 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="description"
                        label="Description"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="w-[16%] px-3 py-3 font-semibold tracking-wide">
                      Project ID
                    </th>
                    <th className="w-[14%] px-3 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="createdAt"
                        label="Created"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="w-[14%] px-3 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="updatedAt"
                        label="Updated"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="w-[7%] px-3 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="active"
                        label="Active"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="w-[14%] px-3 py-3 text-right font-semibold tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {initialRows.map((p) => (
                    <tr
                      key={p.id}
                      className="text-zinc-800 dark:text-zinc-200 [&>td]:px-3 [&>td]:py-2.5"
                    >
                      <td className="font-medium text-zinc-900 dark:text-zinc-50">
                        {p.name}
                      </td>
                      <td className="min-w-0 truncate text-zinc-600 dark:text-zinc-400">
                        {p.description || "—"}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="min-w-0 truncate font-mono text-xs text-zinc-600 dark:text-zinc-400"
                            title="SHA-256 fingerprint of project id"
                          >
                            {p.idFingerprint}
                          </span>
                          <CopyProjectIdButton projectId={p.id} />
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {new Date(p.createdAt).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {new Date(p.updatedAt).toLocaleString()}
                      </td>
                      <td>{p.active ? "Yes" : "No"}</td>
                      <td className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {p.active ? (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirm({ mode: "deactivate", project: p })
                              }
                              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirm({ mode: "activate", project: p })
                              }
                              className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/60"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setConfirm({ mode: "delete", project: p })
                            }
                            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DashboardPaginationBar
            pathname={pathname}
            queryString={qs}
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalItems={totalItems}
          />
        </>
      )}

      <AddProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          showToast("success", "Project created successfully.");
          router.refresh();
        }}
        onError={(message) => {
          showToast("error", message);
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        confirming={confirmLoading}
        title={
          confirm?.mode === "delete"
            ? "Delete project permanently?"
            : confirm?.mode === "activate"
              ? "Activate project?"
              : "Deactivate project?"
        }
        description={confirmDescription(confirm)}
        confirmLabel={
          confirm?.mode === "delete"
            ? "Delete permanently"
            : confirm?.mode === "activate"
              ? "Activate"
              : "Deactivate"
        }
        variant={confirm?.mode === "delete" ? "danger" : "default"}
        onCancel={() => {
          if (!confirmLoading) {
            setConfirm(null);
          }
        }}
        onConfirm={onConfirmAction}
      />
    </div>
  );
}
