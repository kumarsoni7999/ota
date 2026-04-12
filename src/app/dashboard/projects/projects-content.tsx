import { ProjectsClientView } from "@/components/dashboard/ProjectsClientView";
import {
  parseListQuery,
  searchParamsToURLSearchParams,
} from "@/lib/dashboard/dashboard-list-query";
import {
  normalizeProjectSortKey,
  sortProjectListItems,
} from "@/lib/dashboard/project-list-sort";
import { requireDashboardProfileUser } from "@/lib/auth/dashboard-session";
import { paginateArray } from "@/lib/api/pagination";
import { toProjectListItem } from "@/server/models/project.model";
import { projectService } from "@/server/services/project.service";

export async function DashboardProjectsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireDashboardProfileUser();
  const rawSp = searchParamsToURLSearchParams(await searchParams);
  const qRaw = (rawSp.get("q") ?? "").trim();
  const qLower = qRaw.toLowerCase();

  const listQuery = parseListQuery(rawSp, { sort: "updatedAt" });
  const sortKey = normalizeProjectSortKey(listQuery.sort);

  const allFromDb = (await projectService.listForCreator(profile.id)).map(
    toProjectListItem,
  );
  const hasAnyProjects = allFromDb.length > 0;
  let all = allFromDb;
  if (qLower) {
    all = all.filter((p) => p.name.toLowerCase().includes(qLower));
  }
  all = sortProjectListItems(all, sortKey, listQuery.order);
  const pageData = paginateArray(all, {
    page: listQuery.page,
    pageSize: listQuery.pageSize,
  });

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
    <ProjectsClientView
      initialRows={pageData.items}
      listMeta={{
        pathname: "/dashboard/projects",
        queryString: synced.toString(),
        q: qRaw,
        sort: sortKey,
        order: listQuery.order,
        page: pageData.page,
        pageSize: pageData.pageSize,
        totalPages: pageData.totalPages,
        totalItems: pageData.totalItems,
        hasAnyProjects,
        filteredEmpty: pageData.totalItems === 0 && qRaw.length > 0,
      }}
    />
  );
}
