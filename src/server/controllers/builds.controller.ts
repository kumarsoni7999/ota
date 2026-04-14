import { buildMeta, createApiContext } from "@/lib/api/context";
import { paginateArray, parsePaginationParams } from "@/lib/api/pagination";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { requireApiSessionWithClient } from "@/lib/auth/require-api-session";
import type { BuildUploadStatus } from "@/server/models/build.model";
import { buildService } from "@/server/services/build.service";
import { projectService } from "@/server/services/project.service";
import { userService } from "@/server/services/user.service";

const BUILD_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUploadStatusFilter(
  raw: string | null,
): BuildUploadStatus | "all" | null {
  const v = raw?.trim().toLowerCase();
  if (!v || v === "all") {
    return "all";
  }
  if (v === "pending" || v === "success" || v === "failed") {
    return v;
  }
  return null;
}

export const buildsController = {
  async get(request: Request) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);

    const auth = requireApiSessionWithClient(request, meta);
    if (!auth.ok) {
      return auth.response;
    }

    try {
      const url = new URL(request.url);
      const query = parsePaginationParams(url.searchParams);
      const statusFilter = parseUploadStatusFilter(
        url.searchParams.get("uploadStatus") ??
          url.searchParams.get("status"),
      );
      if (statusFilter === null) {
        return apiFailure(
          {
            code: "INVALID_UPLOAD_STATUS",
            message:
              "uploadStatus (or status) must be pending, success, failed, or all",
          },
          meta,
          { status: 400 },
        );
      }
      let rows = await buildService.listForDashboardUser(auth.session.sub);
      if (statusFilter !== "all") {
        rows = rows.filter((b) => b.uploadStatus === statusFilter);
      }
      const page = paginateArray(rows, query);
      return apiSuccess(page, meta);
    } catch {
      return apiFailure(
        { code: "BUILDS_LIST_FAILED", message: "Could not load builds" },
        meta,
        { status: 500 },
      );
    }
  },

  async deleteById(request: Request, id: string) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);

    const buildId = id.trim();
    if (!BUILD_ID_RE.test(buildId)) {
      return apiFailure(
        { code: "INVALID_BUILD_ID", message: "Invalid build id" },
        meta,
        { status: 400 },
      );
    }

    const auth = requireApiSessionWithClient(request, meta);
    if (!auth.ok) {
      return auth.response;
    }

    const actor = await userService.findById(auth.session.sub);
    if (!actor?.active) {
      return apiFailure(
        { code: "UNAUTHORIZED", message: "Sign in to delete a build" },
        meta,
        { status: 401 },
      );
    }

    const build = await buildService.findById(buildId);
    if (!build) {
      return apiFailure(
        { code: "BUILD_NOT_FOUND", message: "Build not found" },
        meta,
        { status: 404 },
      );
    }

    const project = await projectService.findById(build.projectId);
    if (!project) {
      return apiFailure(
        { code: "PROJECT_NOT_FOUND", message: "Project not found" },
        meta,
        { status: 404 },
      );
    }

    if (project.createdBy !== actor.id) {
      return apiFailure(
        { code: "FORBIDDEN", message: "You can only delete your own builds" },
        meta,
        { status: 403 },
      );
    }

    try {
      await buildService.deletePermanently({
        build,
        projectKey: project.projectKey,
      });
      return apiSuccess({ ok: true as const }, meta);
    } catch {
      return apiFailure(
        { code: "BUILD_DELETE_FAILED", message: "Could not delete build" },
        meta,
        { status: 500 },
      );
    }
  },
};
