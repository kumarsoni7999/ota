import { BuildsClientView } from "@/components/dashboard/BuildsClientView";
import { paginateArray } from "@/lib/api/pagination";
import {
  parseListQuery,
  searchParamsToURLSearchParams,
} from "@/lib/dashboard/dashboard-list-query";
import {
  normalizeBuildSortKey,
  sortBuilds,
} from "@/lib/dashboard/build-list-sort";
import { requireDashboardProfileUser } from "@/lib/auth/dashboard-session";
import { buildService } from "@/server/services/build.service";
import { projectService } from "@/server/services/project.service";
import type { BuildPlatform, BuildUploadStatus } from "@/server/models/build.model";
import { storageSizeService } from "@/server/services/storage-size.service";

function isBuildPlatform(v: string): v is BuildPlatform {
  return v === "android" || v === "ios";
}

function isUploadStatus(v: string): v is BuildUploadStatus {
  return v === "pending" || v === "success" || v === "failed";
}

export async function DashboardBuildsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireDashboardProfileUser();
  const rawSp = searchParamsToURLSearchParams(await searchParams);
  const projectFilter = rawSp.get("projectId")?.trim() ?? "";
  const platformRaw = rawSp.get("platform")?.trim() ?? "";
  const platformFilter = isBuildPlatform(platformRaw) ? platformRaw : "";
  const statusRaw = rawSp.get("uploadStatus")?.trim() ?? "";
  const uploadStatusFilter = isUploadStatus(statusRaw) ? statusRaw : "";

  const listQuery = parseListQuery(rawSp, { sort: "createdAt" });
  const sortKey = normalizeBuildSortKey(listQuery.sort);

  const [projects, allBuilds] = await Promise.all([
    projectService.listForCreator(profile.id),
    buildService.listForDashboardUser(profile.id),
  ]);

  const projectNames = Object.fromEntries(
    projects.map((p) => [p.id, p.name] as const),
  );
  const projectOptions = projects.map((p) => ({ id: p.id, name: p.name }));

  const hasAnyBuilds = allBuilds.length > 0;
  let rows = allBuilds;
  if (projectFilter) {
    rows = rows.filter((b) => b.projectId === projectFilter);
  }
  if (platformFilter) {
    rows = rows.filter((b) => b.platform === platformFilter);
  }
  if (uploadStatusFilter) {
    rows = rows.filter((b) => b.uploadStatus === uploadStatusFilter);
  }
  rows = sortBuilds(rows, sortKey, listQuery.order);
  const pageData = paginateArray(rows, {
    page: listQuery.page,
    pageSize: listQuery.pageSize,
  });
  const rowsWithSize = await Promise.all(
    pageData.items.map(async (b) => ({
      ...b,
      fileSizeBytes: await storageSizeService.fileSizeFromStorageRef(b.filePath),
    })),
  );

  const filteredEmpty =
    pageData.totalItems === 0 &&
    hasAnyBuilds &&
    (projectFilter.length > 0 ||
      platformFilter.length > 0 ||
      uploadStatusFilter.length > 0);

  const synced = new URLSearchParams(rawSp.toString());
  synced.set("page", String(pageData.page));
  synced.set("pageSize", String(pageData.pageSize));
  synced.set("sort", sortKey);
  synced.set("order", listQuery.order);
  if (projectFilter) {
    synced.set("projectId", projectFilter);
  } else {
    synced.delete("projectId");
  }
  if (platformFilter) {
    synced.set("platform", platformFilter);
  } else {
    synced.delete("platform");
  }
  if (uploadStatusFilter) {
    synced.set("uploadStatus", uploadStatusFilter);
  } else {
    synced.delete("uploadStatus");
  }

  return (
    <BuildsClientView
      rows={rowsWithSize}
      projectNames={projectNames}
      projectOptions={projectOptions}
      listMeta={{
        pathname: "/dashboard/builds",
        queryString: synced.toString(),
        sort: sortKey,
        order: listQuery.order,
        page: pageData.page,
        pageSize: pageData.pageSize,
        totalPages: pageData.totalPages,
        totalItems: pageData.totalItems,
        hasAnyBuilds,
        filteredEmpty,
        projectFilter,
        platformFilter,
        uploadStatusFilter,
      }}
    />
  );
}
