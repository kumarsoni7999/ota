import { buildMeta, createApiContext } from "@/lib/api/context";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { OtaUploadError } from "@/server/services/ota-upload.service";
import { otaChunkUploadService } from "@/server/services/ota-chunk-upload.service";
import { requireOtaPublicProjectAndClient } from "@/server/services/ota-public-auth";

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

/**
 * Chunked OTA JS bundle upload (public): POST with query `phase=init|chunk|complete`.
 * Same auth as POST /api/ota-updates — `X-Client-Id` + project owner.
 * - init: JSON body (see otaChunkUploadService.parseInitBody)
 * - chunk: query uploadId, chunkIndex (or index); body = raw chunk bytes
 * - complete: query uploadId; no body
 */
export const projectOtaChunkController = {
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

    const auth = await requireOtaPublicProjectAndClient(request, projectId);
    if (!auth.ok) {
      return auth.response;
    }
    const { meta, project, actor } = auth;
    const userId = actor.id;

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
        const body = otaChunkUploadService.parseInitBody(json);
        const { update } = await otaChunkUploadService.init({
          project,
          userId,
          body,
        });
        return apiSuccess({ id: update.id, update }, meta, { status: 201 });
      }

      const uploadId =
        url.searchParams.get("uploadId")?.trim() ??
        url.searchParams.get("buildId")?.trim() ??
        "";
      if (!uploadId) {
        return apiFailure(
          {
            code: "UPLOAD_ID_REQUIRED",
            message:
              "Query uploadId is required for phase=chunk and phase=complete",
          },
          meta,
          { status: 400 },
        );
      }

      if (phase === "complete") {
        const { update } = await otaChunkUploadService.complete({
          project,
          userId,
          uploadId,
        });
        return apiSuccess({ id: update.id, update }, meta);
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

      const { update } = await otaChunkUploadService.writeChunk({
        project,
        userId,
        uploadId,
        chunkIndex,
        body: buf,
      });
      return apiSuccess({ id: update.id, update }, meta);
    } catch (err) {
      if (err instanceof OtaUploadError) {
        return apiFailure(
          { code: err.code, message: err.message },
          meta,
          { status: err.httpStatus },
        );
      }
      return apiFailure(
        {
          code: "CHUNKED_OTA_UPLOAD_FAILED",
          message: "Chunked OTA upload failed",
        },
        meta,
        { status: 500 },
      );
    }
  },
};
