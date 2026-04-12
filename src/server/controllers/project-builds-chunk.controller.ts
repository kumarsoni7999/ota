import { buildMeta, createApiContext } from "@/lib/api/context";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { requireApiSessionWithClient } from "@/lib/auth/require-api-session";
import { buildChunkUploadService } from "@/server/services/build-chunk-upload.service";
import { BuildUploadError } from "@/server/services/build-upload.service";
import type { Project } from "@/server/models/project.model";
import { projectService } from "@/server/services/project.service";
import { userService } from "@/server/services/user.service";

const PROJECT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Phase = "init" | "chunk" | "complete";

function parsePhase(url: URL): Phase | null {
  const raw = (
    url.searchParams.get("phase") ??
    url.searchParams.get("step") ??
    ""
  )
    .trim()
    .toLowerCase();
  if (raw === "init" || raw === "chunk" || raw === "complete") {
    return raw;
  }
  return null;
}

type ChunkedContext =
  | {
      ok: true;
      meta: ReturnType<typeof buildMeta>;
      actor: NonNullable<Awaited<ReturnType<typeof userService.findById>>>;
      project: Project;
    }
  | { ok: false; response: Response };

async function loadChunkedUploadContext(
  request: Request,
  projectId: string,
): Promise<ChunkedContext> {
  const ctx = createApiContext(request);
  const meta = buildMeta(ctx);

  const auth = requireApiSessionWithClient(request, meta);
  if (!auth.ok) {
    return { ok: false, response: auth.response };
  }

  const actor = await userService.findById(auth.session.sub);
  if (!actor?.active) {
    return {
      ok: false,
      response: apiFailure(
        { code: "UNAUTHORIZED", message: "Sign in to upload" },
        meta,
        { status: 401 },
      ),
    };
  }

  const pid = projectId.trim();
  if (!PROJECT_ID_RE.test(pid)) {
    return {
      ok: false,
      response: apiFailure(
        { code: "INVALID_PROJECT_ID", message: "Invalid project id" },
        meta,
        { status: 400 },
      ),
    };
  }

  const project = await projectService.findById(pid);
  if (!project || project.createdBy !== actor.id) {
    return {
      ok: false,
      response: apiFailure(
        { code: "PROJECT_NOT_FOUND", message: "Project not found" },
        meta,
        { status: 404 },
      ),
    };
  }

  return { ok: true, meta, actor, project };
}

/**
 * Single entry for chunked build upload: POST with query `phase=init|chunk|complete`.
 * - init: JSON body (see buildChunkUploadService.parseInitBody)
 * - chunk: query buildId, chunkIndex (or index); body = raw chunk bytes
 * - complete: query buildId; no body
 */
export const projectBuildsChunkController = {
  async post(request: Request, projectId: string) {
    const url = new URL(request.url);
    const phase = parsePhase(url);
    if (!phase) {
      const ctx = createApiContext(request);
      const meta = buildMeta(ctx);
      return apiFailure(
        {
          code: "INVALID_PHASE",
          message:
            'Query "phase" (or "step") must be init, chunk, or complete',
        },
        meta,
        { status: 400 },
      );
    }

    const loaded = await loadChunkedUploadContext(request, projectId);
    if (!loaded.ok) {
      return loaded.response;
    }
    const { meta, actor, project } = loaded;

    try {
      if (phase === "init") {
        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return apiFailure(
            { code: "INVALID_JSON", message: "Expected JSON body" },
            meta,
            { status: 400 },
          );
        }
        const body = buildChunkUploadService.parseInitBody(json);
        const { build } = await buildChunkUploadService.init({
          project,
          userId: actor.id,
          body,
        });
        return apiSuccess({ build }, meta, { status: 201 });
      }

      const buildId = url.searchParams.get("buildId")?.trim() ?? "";
      if (!buildId) {
        return apiFailure(
          {
            code: "BUILD_ID_REQUIRED",
            message: "Query buildId is required for phase=chunk and phase=complete",
          },
          meta,
          { status: 400 },
        );
      }

      if (phase === "complete") {
        const { build } = await buildChunkUploadService.complete({
          project,
          userId: actor.id,
          buildId,
        });
        return apiSuccess({ build }, meta);
      }

      const raw =
        url.searchParams.get("chunkIndex") ?? url.searchParams.get("index");
      const chunkIndex = Number.parseInt(raw ?? "", 10);
      if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
        return apiFailure(
          {
            code: "INVALID_CHUNK_INDEX",
            message:
              "Query chunkIndex (or index) must be a non-negative integer",
          },
          meta,
          { status: 400 },
        );
      }

      let buf: Buffer;
      try {
        buf = Buffer.from(await request.arrayBuffer());
      } catch {
        return apiFailure(
          { code: "INVALID_BODY", message: "Could not read chunk body" },
          meta,
          { status: 400 },
        );
      }

      const { build } = await buildChunkUploadService.writeChunk({
        project,
        userId: actor.id,
        buildId,
        chunkIndex,
        body: buf,
      });
      return apiSuccess({ build }, meta);
    } catch (err) {
      if (err instanceof BuildUploadError) {
        return apiFailure(
          { code: err.code, message: err.message },
          meta,
          { status: err.httpStatus },
        );
      }
      return apiFailure(
        {
          code: "CHUNKED_UPLOAD_FAILED",
          message: "Chunked build upload failed",
        },
        meta,
        { status: 500 },
      );
    }
  },
};
