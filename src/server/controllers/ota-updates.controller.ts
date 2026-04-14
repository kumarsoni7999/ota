import { buildMeta, createApiContext } from "@/lib/api/context";
import { paginateArray, parsePaginationParams } from "@/lib/api/pagination";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { requireApiSessionWithClient } from "@/lib/auth/require-api-session";
import { parseEnv, parsePlatform } from "@/server/services/build-upload.service";
import { errMessage, otaApiLogger } from "@/server/services/ota-api-logger";
import { otaCheckService } from "@/server/services/ota-check.service";
import { otaUpdateService } from "@/server/services/ota-update.service";
import { requireOtaPublicProjectAndClient } from "@/server/services/ota-public-auth";
import { OtaUploadError, otaUploadService } from "@/server/services/ota-upload.service";

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
    } catch (err) {
      otaApiLogger.error("updates-list", "list_failed", { error: errMessage(err) });
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
    const auth = await requireOtaPublicProjectAndClient(request, projectId);
    if (!auth.ok) {
      return auth.response;
    }
    const { project, actor } = auth;

    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("multipart/form-data")) {
      otaApiLogger.warn("upload", "invalid_content_type", {
        projectId,
        contentType: contentType.slice(0, 80),
      });
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
    } catch (err) {
      otaApiLogger.warn("upload", "invalid_form_parse", {
        projectId,
        error: errMessage(err),
      });
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
        otaApiLogger.warn("upload", "upload_validation_failed", {
          projectId,
          code: err.code,
          httpStatus: err.httpStatus,
        });
        return apiFailure(
          { code: err.code, message: err.message },
          meta,
          { status: err.httpStatus },
        );
      }
      otaApiLogger.error("upload", "upload_unexpected_error", {
        projectId,
        error: errMessage(err),
      });
      return apiFailure(
        { code: "OTA_UPLOAD_FAILED", message: "Could not store OTA update" },
        meta,
        { status: 500 },
      );
    }
  },

  /**
   * Public check endpoint: compares `currentFingerprint` to latest active OTA
   * fingerprint `{version}_{buildNumber}_{env}_{updatedAt}`.
   */
  async postCheck(request: Request) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);

    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      otaApiLogger.warn("check", "invalid_json", { error: errMessage(err) });
      return apiFailure(
        { code: "INVALID_JSON", message: "Expected JSON body" },
        meta,
        { status: 400 },
      );
    }
    const b = body as Record<string, unknown>;
    const projectId = typeof b.projectId === "string" ? b.projectId.trim() : "";
    const platformRaw = typeof b.platform === "string" ? b.platform.trim() : "";
    const envRaw = typeof b.env === "string" ? b.env.trim() : "";
    const currentFingerprint =
      typeof b.currentFingerprint === "string"
        ? b.currentFingerprint.trim()
        : undefined;

    const auth = await requireOtaPublicProjectAndClient(request, projectId);
    if (!auth.ok) {
      return auth.response;
    }
    const { project } = auth;

    let platform;
    let env;
    try {
      platform = parsePlatform(platformRaw);
      env = parseEnv(envRaw);
    } catch {
      otaApiLogger.warn("check", "invalid_platform_or_env", {
        platform: platformRaw,
        env: envRaw,
      });
      return apiFailure(
        { code: "INVALID_BODY", message: "Invalid platform or env" },
        meta,
        { status: 400 },
      );
    }

    try {
      const data = await otaCheckService.checkForClient({
        request,
        projectId: project.id,
        platform,
        env,
        currentFingerprint:
          currentFingerprint && currentFingerprint.length > 0
            ? currentFingerprint
            : undefined,
        projectKey: project.projectKey,
      });
      return apiSuccess(data, meta);
    } catch (err) {
      otaApiLogger.error("check", "check_failed", {
        projectId: project.id,
        platform: platformRaw,
        env: envRaw,
        error: errMessage(err),
      });
      return apiFailure(
        { code: "OTA_CHECK_FAILED", message: "Could not check for updates" },
        meta,
        { status: 500 },
      );
    }
  },
};
