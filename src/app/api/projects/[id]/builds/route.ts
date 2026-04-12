import { projectBuildsUploadController } from "@/server/controllers/project-builds-upload.controller";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return projectBuildsUploadController.post(request, id);
}
