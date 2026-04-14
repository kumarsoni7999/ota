"use client";

import { useState } from "react";
import { DashboardPaginationBar } from "@/components/dashboard/DashboardPaginationBar";
import { DashboardSortHeaderLink } from "@/components/dashboard/DashboardSortHeaderLink";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";
import type { SortOrder } from "@/lib/dashboard/sort-order";
import type { OtaUpdate } from "@/server/models/ota-update.model";

export type UpdatesListMeta = {
  pathname: string;
  queryString: string;
  q: string;
  sort: string;
  order: SortOrder;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasAnyUpdates: boolean;
  filteredEmpty: boolean;
};

type Props = {
  rows: Array<OtaUpdate & { fileSizeBytes?: number }>;
  projectNames: Record<string, string>;
  listMeta: UpdatesListMeta;
};

function uploadStatusLabel(u: OtaUpdate): string {
  if (u.uploadState === "UPLOADING") {
    return "Uploading...";
  }
  if (u.uploadState === "FAILED") {
    return "Failed";
  }
  return "Success";
}

function formatBytes(bytes?: number): string {
  const n = bytes ?? 0;
  if (n <= 0) {
    return "—";
  }
  if (n < 1024) {
    return `${n} B`;
  }
  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function UpdatesClientView({ rows, projectNames, listMeta }: Props) {
  const [selected, setSelected] = useState<(OtaUpdate & { fileSizeBytes?: number }) | null>(null);
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
    hasAnyUpdates,
    filteredEmpty,
  } = listMeta;

  const qs = queryString;

  return (
    <div className="w-full min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        OTA updates
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        OTA update bundles for your projects.
      </p>

      {hasAnyUpdates ? (
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
            Search version / min version / notes
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder="e.g. 1.2.0, min version, release text…"
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

      {!hasAnyUpdates ? (
        <ModuleEmptyState variant="updates" />
      ) : filteredEmpty ? (
        <p className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          No updates match your search.{" "}
          <a
            href={pathname}
            className="font-medium text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-400"
          >
            Clear search
          </a>
        </p>
      ) : (
        <>
          <div className="mt-6 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1180px] table-auto text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="version"
                        label="Version"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="projectId"
                        label="Project"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="env"
                        label="Env"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold tracking-wide">
                      Notes
                    </th>
                    <th className="px-4 py-3 font-semibold tracking-wide">
                      Size
                    </th>
                    <th className="px-4 py-3 font-semibold tracking-wide">
                      Downloads
                    </th>
                    <th className="px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="createdAt"
                        label="Created"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="updatedAt"
                        label="Updated"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="active"
                        label="Active"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold tracking-wide">
                      Upload
                    </th>
                    <th className="px-4 py-3 font-semibold tracking-wide">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {rows.map((u) => (
                    <tr
                      key={u.id}
                      className="text-zinc-800 dark:text-zinc-200 [&>td]:px-4 [&>td]:py-3"
                    >
                      <td className="font-medium text-zinc-900 dark:text-zinc-50">
                        {u.version}
                      </td>
                      <td className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">
                        {projectNames[u.projectId] ?? u.projectId}
                      </td>
                      <td>{u.env}</td>
                      <td className="min-w-0 truncate text-zinc-600 dark:text-zinc-400">
                        {u.metadata?.releaseNotes ?? "—"}
                      </td>
                      <td className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {formatBytes(u.fileSizeBytes)}
                      </td>
                      <td>{u.downloadCount ?? 0}</td>
                      <td className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {new Date(u.createdAt).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {new Date(u.updatedAt).toLocaleString()}
                      </td>
                      <td>{u.active ? "Yes" : "No"}</td>
                      <td
                        className={
                          u.uploadState === "FAILED"
                            ? "text-rose-600 dark:text-rose-400"
                            : u.uploadState === "UPLOADING"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-700 dark:text-emerald-400"
                        }
                        title={u.uploadError ?? ""}
                      >
                        {uploadStatusLabel(u)}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelected(u)}
                          className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          View
                        </button>
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

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                OTA update details
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm text-zinc-700 dark:text-zinc-300 md:grid-cols-2">
              <p><strong>Project:</strong> {projectNames[selected.projectId] ?? selected.projectId}</p>
              <p><strong>Version:</strong> {selected.version}</p>
              <p><strong>Build #:</strong> {selected.buildNumber ?? 1}</p>
              <p><strong>Env:</strong> {selected.env}</p>
              <p><strong>Platform:</strong> {selected.platform}</p>
              <p><strong>Size:</strong> {formatBytes(selected.fileSizeBytes)}</p>
              <p><strong>Downloads:</strong> {selected.downloadCount ?? 0}</p>
              <p><strong>Active:</strong> {selected.active ? "Yes" : "No"}</p>
              <p><strong>Upload:</strong> {uploadStatusLabel(selected)}</p>
              <p><strong>Created:</strong> {new Date(selected.createdAt).toLocaleString()}</p>
              <p><strong>Updated:</strong> {new Date(selected.updatedAt).toLocaleString()}</p>
              <p className="md:col-span-2"><strong>Release notes:</strong> {selected.metadata?.releaseNotes ?? "—"}</p>
              <p><strong>Runtime version:</strong> {selected.metadata?.runtimeVersion ?? "—"}</p>
              <p><strong>Min version:</strong> {selected.metadata?.minVersion ?? "—"}</p>
              <p><strong>Mandatory:</strong> {selected.metadata?.mandatory ? "Yes" : "No"}</p>
              <p className="md:col-span-2"><strong>Upload error:</strong> {selected.uploadError ?? "—"}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
