import { buildMeta, createApiContext } from "@/lib/api/context";
import { apiSuccess } from "@/lib/api/response";
import { healthService } from "@/server/services/health.service";

export const healthController = {
  get(request: Request) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);
    const data = healthService.getStatus();
    return apiSuccess(data, meta);
  },
};
