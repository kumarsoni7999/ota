import { timingSafeEqual } from "node:crypto";
import { CLIENT_ID_HEADER } from "@/lib/api/client-id-header";
import { buildMeta, createApiContext } from "@/lib/api/context";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { isValidSessionClientId } from "@/lib/auth/client-id-format";
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
      userId: string;
      project: Project;
    }
  | { ok: false; response: Response };

function clientIdsMatch(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(actual, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

async function loadChunkedUploadContext(
  request: Request,
  projectId: string,
): Promise<ChunkedContext> {
  const ctx = createApiContext(request);
  const meta = buildMeta(ctx);

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

  const headerClientId = request.headers.get(CLIENT_ID_HEADER)?.trim() ?? "";
  if (!isValidSessionClientId(headerClientId)) {
    return {
      ok: false,
      response: apiFailure(
        {
          code: "INVALID_CLIENT_ID",
          message: `Valid ${CLIENT_ID_HEADER} header is required`,
        },
        meta,
        { status: 400 },
      ),
    };
  }

  const project = await projectService.findById(pid);
  if (!project || !project.active) {
    return {
      ok: false,
      response: apiFailure(
        { code: "PROJECT_NOT_FOUND", message: "Project not found" },
        meta,
        { status: 404 },
      ),
    };
  }
  const actor = await userService.findById(project.createdBy);
  if (!actor?.active || !clientIdsMatch(actor.clientId, headerClientId)) {
    return {
      ok: false,
      response: apiFailure(
        {
          code: "FORBIDDEN",
          message: "Project id and client id do not match",
        },
        meta,
        { status: 403 },
      ),
    };
  }

  return { ok: true, meta, userId: actor.id, project };
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
    const { meta, userId, project } = loaded;

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
          userId,
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
          userId,
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
        userId,
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
