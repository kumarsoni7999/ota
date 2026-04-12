"use client";

import { DashboardPaginationBar } from "@/components/dashboard/DashboardPaginationBar";
import { DashboardSortHeaderLink } from "@/components/dashboard/DashboardSortHeaderLink";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";
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

  const qs = queryString;

  return (
    <div className="w-full min-w-0">
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
                        label="#"
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
                    <th className="w-[8%] px-4 py-3">
                      <DashboardSortHeaderLink
                        pathname={pathname}
                        queryString={qs}
                        column="active"
                        label="Active"
                        activeSort={sort}
                        activeOrder={order}
                      />
                    </th>
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
                      <td>{b.active ? "Yes" : "No"}</td>
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
    </div>
  );
}
