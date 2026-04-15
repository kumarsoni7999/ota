import { otaUpdatesController } from "@/server/controllers/ota-updates.controller";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return otaUpdatesController.uploadForProject(request, id);
}
