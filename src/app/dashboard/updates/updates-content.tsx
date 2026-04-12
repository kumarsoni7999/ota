import { UpdatesClientView } from "@/components/dashboard/UpdatesClientView";
import { paginateArray } from "@/lib/api/pagination";
import {
  parseListQuery,
  searchParamsToURLSearchParams,
} from "@/lib/dashboard/dashboard-list-query";
import { filterOtaUpdatesBySearch } from "@/lib/dashboard/ota-update-list-filter";
import {
  normalizeOtaUpdateSortKey,
  sortOtaUpdates,
} from "@/lib/dashboard/ota-update-list-sort";
import { requireDashboardProfileUser } from "@/lib/auth/dashboard-session";
import { otaUpdateService } from "@/server/services/ota-update.service";
import { projectService } from "@/server/services/project.service";

export async function DashboardUpdatesContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireDashboardProfileUser();
  const rawSp = searchParamsToURLSearchParams(await searchParams);
  const qRaw = (rawSp.get("q") ?? "").trim();

  const listQuery = parseListQuery(rawSp, { sort: "createdAt" });
  const sortKey = normalizeOtaUpdateSortKey(listQuery.sort);

  const [projects, allUpdates] = await Promise.all([
    projectService.listForCreator(profile.id),
    otaUpdateService.listForDashboardUser(profile.id),
  ]);

  const projectNames = Object.fromEntries(
    projects.map((p) => [p.id, p.name] as const),
  );

  const hasAnyUpdates = allUpdates.length > 0;
  let rows = filterOtaUpdatesBySearch(allUpdates, qRaw);
  rows = sortOtaUpdates(rows, sortKey, listQuery.order);
  const pageData = paginateArray(rows, {
    page: listQuery.page,
    pageSize: listQuery.pageSize,
  });

  const filteredEmpty = pageData.totalItems === 0 && qRaw.length > 0 && hasAnyUpdates;

  const synced = new URLSearchParams(rawSp.toString());
  synced.set("page", String(pageData.page));
  synced.set("pageSize", String(pageData.pageSize));
  synced.set("sort", sortKey);
  synced.set("order", listQuery.order);
  if (qRaw) {
    synced.set("q", qRaw);
  } else {
    synced.delete("q");
  }

  return (
    <UpdatesClientView
      rows={pageData.items}
      projectNames={projectNames}
      listMeta={{
        pathname: "/dashboard/updates",
        queryString: synced.toString(),
        q: qRaw,
        sort: sortKey,
        order: listQuery.order,
        page: pageData.page,
        pageSize: pageData.pageSize,
        totalPages: pageData.totalPages,
        totalItems: pageData.totalItems,
        hasAnyUpdates,
        filteredEmpty,
      }}
    />
  );
}
