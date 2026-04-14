import { timingSafeEqual } from "node:crypto";
import { CLIENT_ID_HEADER } from "@/lib/api/client-id-header";
import { buildMeta, createApiContext } from "@/lib/api/context";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { isValidSessionClientId } from "@/lib/auth/client-id-format";
import {
  BuildUploadError,
  buildUploadService,
} from "@/server/services/build-upload.service";
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

export const projectBuildsUploadController = {
  /**
   * `multipart/form-data` upload for a native build artifact.
   * Required fields: `name`, `version`, `env`, `platform`, `type`, and a file
   * in `file`, `buildFile`, or `build`.
   */
  async post(request: Request, projectId: string) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

    const pid = projectId.trim();
    if (!PROJECT_ID_RE.test(pid)) {
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

    const project = await projectService.findById(pid);
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

    if (!contentType.includes("multipart/form-data")) {
      return apiFailure(
        {
          code: "INVALID_CONTENT_TYPE",
          message:
            "Expected multipart/form-data with file field (file/buildFile/build). For chunked JSON init use phase=init.",
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
      const { build, created } = await buildUploadService.saveFromMultipart({
        project,
        userId: actor.id,
        form,
      });
      return apiSuccess(
        {
          build,
          created,
          manifestFile: "build-manifest.json",
        },
        meta,
        { status: created ? 201 : 200 },
      );
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
          code: "BUILD_UPLOAD_FAILED",
          message: "Could not store build",
        },
        meta,
        { status: 500 },
      );
    }
  },
};
