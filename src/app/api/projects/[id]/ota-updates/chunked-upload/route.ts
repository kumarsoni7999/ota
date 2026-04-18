import { projectOtaChunkController } from "@/server/controllers/project-ota-chunk.controller";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return projectOtaChunkController.post(request, id);
}
