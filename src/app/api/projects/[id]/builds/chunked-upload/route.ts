import { projectBuildsChunkController } from "@/server/controllers/project-builds-chunk.controller";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return projectBuildsChunkController.post(request, id);
}
