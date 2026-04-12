import { buildMeta, createApiContext } from "@/lib/api/context";
import { paginateArray, parsePaginationParams } from "@/lib/api/pagination";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { toUserPublic } from "@/server/models/user.model";
import { userService } from "@/server/services/user.service";

export const usersController = {
  async get(request: Request) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);

    try {
      const url = new URL(request.url);
      const query = parsePaginationParams(url.searchParams);
      const rows = await userService.listAll();
      const page = paginateArray(rows.map(toUserPublic), query);
      return apiSuccess(page, meta);
    } catch {
      return apiFailure(
        { code: "USERS_LIST_FAILED", message: "Could not load users" },
        meta,
        { status: 500 },
      );
    }
  },
};
