"use client";

import { useCallback, useState } from "react";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { useDashboardClientId } from "@/components/dashboard/DashboardAuthContext";
import { DashboardPaginationBar } from "@/components/dashboard/DashboardPaginationBar";
import { DashboardSortHeaderLink } from "@/components/dashboard/DashboardSortHeaderLink";
import { DashboardToast } from "@/components/dashboard/DashboardToast";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";
import { CLIENT_ID_HEADER } from "@/lib/api/client-id-header";
import { dashboardHref } from "@/lib/dashboard/dashboard-list-query";
import type { SortOrder } from "@/lib/dashboard/sort-order";
import type {
  Build,
  BuildPlatform,
  BuildUploadStatus,
} from "@/server/models/build.model";
import { useRouter } from "next/navigation";

export type ProjectOption = { id: string; name: string };

export type BuildsListMeta = {
  pathname: string;
  queryString: string;
  sort: string;
  order: SortOrder;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasAnyBuilds: boolean;
  filteredEmpty: boolean;
  projectFilter: string;
  platformFilter: string;
  uploadStatusFilter: string;
};

type Props = {
  rows: Build[];
  projectNames: Record<string, string>;
  projectOptions: ProjectOption[];
  listMeta: BuildsListMeta;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: { code: string; message: string } };

function uploadStatusBadgeClass(s: BuildUploadStatus): string {
  switch (s) {
    case "pending":
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";
    case "failed":
      return "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100";
    default:
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100";
  }
}

function BuildsFilterBar({
  pathname,
  queryString,
  projectFilter,
  platformFilter,
  uploadStatusFilter,
  projectOptions,
}: {
  pathname: string;
  queryString: string;
  projectFilter: string;
  platformFilter: string;
  uploadStatusFilter: string;
  projectOptions: ProjectOption[];
}) {
  const router = useRouter();
  const sp = new URLSearchParams(queryString);

  function push(patch: Record<string, string | number | null | undefined>) {
    router.push(dashboardHref(pathname, sp, patch));
  }

  return (
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Project
        <select
          className="min-w-[10rem] rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          value={projectFilter}
          onChange={(e) => {
            const v = e.target.value;
            push({
              projectId: v || null,
              page: 1,
            });
          }}
        >
          <option value="">All projects</option>
          {projectOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Platform
        <select
          className="min-w-[8rem] rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          value={platformFilter}
          onChange={(e) => {
            const v = e.target.value as BuildPlatform | "";
            push({
              platform: v || null,
              page: 1,
            });
          }}
        >
          <option value="">All platforms</option>
          <option value="android">Android</option>
          <option value="ios">iOS</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Upload status
        <select
          className="min-w-[10rem] rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          value={uploadStatusFilter}
          onChange={(e) => {
            const v = e.target.value as BuildUploadStatus | "";
            push({
              uploadStatus: v || null,
              page: 1,
            });
          }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </label>
    </div>
  );
}

export function BuildsClientView({
  rows,
  projectNames,
  projectOptions,
  listMeta,
}: Props) {
  const clientId = useDashboardClientId();
  const {
    pathname,
    queryString,
    sort,
    order,
    page,
    pageSize,
    totalPages,
    totalItems,
    hasAnyBuilds,
    filteredEmpty,
    projectFilter,
    platformFilter,
    uploadStatusFilter,
  } = listMeta;
  const router = useRouter();
  const [toast, setToast] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Build | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const dismissToast = useCallback(() => setToast(null), []);

  const qs = queryString;

  async function runDelete(buildId: string) {
    const res = await fetch(`/api/builds/${buildId}`, {
      method: "DELETE",
      headers: { [CLIENT_ID_HEADER]: clientId },
      credentials: "same-origin",
    });
    const json = (await res.json()) as ApiSuccess<{ ok: boolean }> | ApiFailure;
    if (!json.success) {
      setToast({ kind: "error", text: json.error.message });
      return false;
    }
    setToast({ kind: "success", text: "Build deleted permanently." });
    router.refresh();
    return true;
  }

  async function onConfirmDelete() {
    if (!confirmDelete) {
      return;
    }
    setDeleteLoading(true);
    try {
      await runDelete(confirmDelete.id);
    } finally {
      setDeleteLoading(false);
      setConfirmDelete(null);
    }
  }

  return (
    <div className="w-full min-w-0">
      {toast ? (
        <DashboardToast
          message={toast.text}
          kind={toast.kind}
          onDismiss={dismissToast}
        />
      ) : null}

      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Builds
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Build artifacts for your projects.
      </p>

      {hasAnyBuilds ? (
        <div className="mt-2">
          <BuildsFilterBar
            pathname={pathname}
            queryString={qs}
            projectFilter={projectFilter}
            platformFilter={platformFilter}
            uploadStatusFilter={uploadStatusFilter}
            projectOptions={projectOptions}
          />
        </div>
      ) : null}

      {!hasAnyBuilds ? (
        <ModuleEmptyState variant="builds" />
      ) : filteredEmpty ? (
        <p className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          No builds match the selected filters.{" "}
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
                    <th className="w-[10%] px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="version"
                        label="Version"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="w-[16%] px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="projectId"
                        label="Project"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="w-[8%] px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="env"
                        label="Env"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="w-[10%] px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="platform"
                        label="Platform"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="w-[8%] px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="type"
                        label="Type"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="w-[10%] px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="uploadStatus"
                        label="Status"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="w-[6%] px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="buildNumber"
                        label="Build #"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="w-[14%] px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="createdAt"
                        label="Created"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="w-[14%] px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="updatedAt"
                        label="Updated"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="w-[10%] px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {rows.map((b) => (
                    <tr
                      key={b.id}
                      className="text-zinc-800 dark:text-zinc-200 [&>td]:px-4 [&>td]:py-3"
                    >
                      <td className="font-medium text-zinc-900 dark:text-zinc-50">
                        {b.version}
                      </td>
                      <td className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">
                        {projectNames[b.projectId] ?? b.projectId}
                      </td>
                      <td>{b.env}</td>
                      <td>{b.platform}</td>
                      <td>{b.type}</td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${uploadStatusBadgeClass(b.uploadStatus)}`}
                        >
                          {b.uploadStatus}
                        </span>
                      </td>
                      <td>{b.buildNumber}</td>
                      <td className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {new Date(b.updatedAt).toLocaleString()}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {b.uploadStatus === "success" ? (
                            <a
                              href={`/api/builds/${b.id}/download`}
                              title="Download artifact"
                              aria-label="Download build artifact"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                                aria-hidden="true"
                              >
                                <path d="M12 3v12" />
                                <path d="m7 10 5 5 5-5" />
                                <path d="M5 21h14" />
                              </svg>
                            </a>
                          ) : (
                            <span className="inline-flex h-8 w-8 items-center justify-center text-xs text-zinc-400">
                              -
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(b)}
                            title="Delete build permanently"
                            aria-label="Delete build permanently"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
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
      <ConfirmDialog
        open={confirmDelete !== null}
        confirming={deleteLoading}
        title="Delete build permanently?"
        description={
          confirmDelete
            ? `This will permanently remove ${confirmDelete.version} (build #${confirmDelete.buildNumber}) and its stored artifact file. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete permanently"
        variant="danger"
        onCancel={() => {
          if (!deleteLoading) {
            setConfirmDelete(null);
          }
        }}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
