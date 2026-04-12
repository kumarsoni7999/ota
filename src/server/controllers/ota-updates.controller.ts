import { buildMeta, createApiContext } from "@/lib/api/context";
import { paginateArray, parsePaginationParams } from "@/lib/api/pagination";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { requireApiSessionWithClient } from "@/lib/auth/require-api-session";
import { otaUpdateService } from "@/server/services/ota-update.service";

export const otaUpdatesController = {
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
      const rows = await otaUpdateService.listForDashboardUser(
        auth.session.sub,
      );
      const page = paginateArray(rows, query);
      return apiSuccess(page, meta);
    } catch {
      return apiFailure(
        { code: "OTA_UPDATES_LIST_FAILED", message: "Could not load OTA updates" },
        meta,
        { status: 500 },
      );
    }
  },
};
