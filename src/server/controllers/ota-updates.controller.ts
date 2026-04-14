import { timingSafeEqual } from "node:crypto";
import { CLIENT_ID_HEADER } from "@/lib/api/client-id-header";
import { buildMeta, createApiContext } from "@/lib/api/context";
import { paginateArray, parsePaginationParams } from "@/lib/api/pagination";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { isValidSessionClientId } from "@/lib/auth/client-id-format";
import { requireApiSessionWithClient } from "@/lib/auth/require-api-session";
import { otaUpdateService } from "@/server/services/ota-update.service";
import { OtaUploadError, otaUploadService } from "@/server/services/ota-upload.service";
import { projectService } from "@/server/services/project.service";
import { userService } from "@/server/services/user.service";

const PROJECT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clientIdsMatch(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(actual, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export const otaUpdatesController = {
  async get(request: Request) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);

    const auth = requireApiSessionWithClient(request, meta);
    if (!auth.ok) {
      return auth.response;
    }

    try {
      const url = new URL(request.url);
      const query = parsePaginationParams(url.searchParams);
      const rows = await otaUpdateService.listForDashboardUser(
        auth.session.sub,
      );
      const page = paginateArray(rows, query);
      return apiSuccess(page, meta);
    } catch {
      return apiFailure(
        { code: "OTA_UPDATES_LIST_FAILED", message: "Could not load OTA updates" },
        meta,
        { status: 500 },
      );
    }
  },

  /**
   * Public upload endpoint for OTA bundles/assets.
   * Requires query `projectId` + `X-Client-Id` matching project owner.
   */
  async post(request: Request) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId")?.trim() ?? "";
    if (!PROJECT_ID_RE.test(projectId)) {
      return apiFailure(
        { code: "INVALID_PROJECT_ID", message: "Invalid project id" },
        meta,
        { status: 400 },
      );
    }

    const headerClientId = request.headers.get(CLIENT_ID_HEADER)?.trim() ?? "";
    if (!isValidSessionClientId(headerClientId)) {
      return apiFailure(
        {
          code: "INVALID_CLIENT_ID",
          message: `Valid ${CLIENT_ID_HEADER} header is required`,
        },
        meta,
        { status: 400 },
      );
    }

    const project = await projectService.findById(projectId);
    if (!project || !project.active) {
      return apiFailure(
        { code: "PROJECT_NOT_FOUND", message: "Project not found" },
        meta,
        { status: 404 },
      );
    }
    const actor = await userService.findById(project.createdBy);
    if (!actor?.active || !clientIdsMatch(actor.clientId, headerClientId)) {
      return apiFailure(
        {
          code: "FORBIDDEN",
          message: "Project id and client id do not match",
        },
        meta,
        { status: 403 },
      );
    }

    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return apiFailure(
        {
          code: "INVALID_CONTENT_TYPE",
          message:
            'Expected multipart/form-data with fields: version, env, platform, bundle (or file/jsBundle), optional assets[]',
        },
        meta,
        { status: 400 },
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return apiFailure(
        {
          code: "INVALID_FORM",
          message:
            "Could not parse multipart form data. Do not set Content-Type manually; let your HTTP client set multipart boundary.",
        },
        meta,
        { status: 400 },
      );
    }

    try {
      const { update, created } = await otaUploadService.saveFromMultipart({
        project,
        userId: actor.id,
        form,
      });
      return apiSuccess({ update, created }, meta, { status: created ? 201 : 200 });
    } catch (err) {
      if (err instanceof OtaUploadError) {
        return apiFailure(
          { code: err.code, message: err.message },
          meta,
          { status: err.httpStatus },
        );
      }
      return apiFailure(
        { code: "OTA_UPLOAD_FAILED", message: "Could not store OTA update" },
        meta,
        { status: 500 },
      );
    }
  },
};
