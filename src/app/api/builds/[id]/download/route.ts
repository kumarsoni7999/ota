import { buildDownloadController } from "@/server/controllers/build-download.controller";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return buildDownloadController.get(request, id);
}
