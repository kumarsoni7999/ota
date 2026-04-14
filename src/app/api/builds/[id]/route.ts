import { buildsController } from "@/server/controllers/builds.controller";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return buildsController.deleteById(request, id);
}
