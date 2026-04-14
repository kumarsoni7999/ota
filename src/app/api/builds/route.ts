import { buildsController } from "@/server/controllers/builds.controller";
import { projectBuildsChunkController } from "@/server/controllers/project-builds-chunk.controller";
import { projectBuildsUploadController } from "@/server/controllers/project-builds-upload.controller";
import { apiFailure } from "@/lib/api/response";
import { buildMeta, createApiContext } from "@/lib/api/context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return buildsController.get(request);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const phase =
    url.searchParams.get("phase")?.trim().toLowerCase() ??
    url.searchParams.get("step")?.trim().toLowerCase() ??
    "";
  const projectId =
    url.searchParams.get("projectId")?.trim() ??
    url.searchParams.get("id")?.trim() ??
    "";

  if (!projectId) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);
    return apiFailure(
      {
        code: "PROJECT_ID_REQUIRED",
        message:
          'Query "projectId" (or "id") is required for build upload on /api/builds',
      },
      meta,
      { status: 400 },
    );
  }

  if (phase === "init" || phase === "chunk" || phase === "complete") {
    return projectBuildsChunkController.post(request, projectId);
  }

  if (contentType.includes("application/json")) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);
    return apiFailure(
      {
        code: "INVALID_UPLOAD_REQUEST",
        message:
          "JSON body is supported only for chunked init. Use phase=init for JSON, or send multipart/form-data with file for direct upload.",
      },
      meta,
      { status: 400 },
    );
  }

  return projectBuildsUploadController.post(request, projectId);
}
