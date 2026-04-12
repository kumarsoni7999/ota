import { buildMeta, createApiContext } from "@/lib/api/context";
import { paginateArray, parsePaginationParams } from "@/lib/api/pagination";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { requireApiSessionWithClient } from "@/lib/auth/require-api-session";
import type { BuildUploadStatus } from "@/server/models/build.model";
import { buildService } from "@/server/services/build.service";

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
};
