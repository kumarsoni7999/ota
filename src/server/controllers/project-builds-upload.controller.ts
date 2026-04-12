import { buildMeta, createApiContext } from "@/lib/api/context";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { requireApiSessionWithClient } from "@/lib/auth/require-api-session";
import {
  BuildUploadError,
  buildUploadService,
} from "@/server/services/build-upload.service";
import { projectService } from "@/server/services/project.service";
import { userService } from "@/server/services/user.service";

const PROJECT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const projectBuildsUploadController = {
  /**
   * `multipart/form-data` upload for a native build artifact.
   * Required fields: `name`, `version`, `env`, `platform`, `type`, and a file
   * in `file`, `buildFile`, or `build`.
   */
  async post(request: Request, projectId: string) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);

    const auth = requireApiSessionWithClient(request, meta);
    if (!auth.ok) {
      return auth.response;
    }

    const pid = projectId.trim();
    if (!PROJECT_ID_RE.test(pid)) {
      return apiFailure(
        { code: "INVALID_PROJECT_ID", message: "Invalid project id" },
        meta,
        { status: 400 },
      );
    }

    const actor = await userService.findById(auth.session.sub);
    if (!actor?.active) {
      return apiFailure(
        { code: "UNAUTHORIZED", message: "Sign in to upload a build" },
        meta,
        { status: 401 },
      );
    }

    const project = await projectService.findById(pid);
    if (!project || project.createdBy !== actor.id) {
      return apiFailure(
        { code: "PROJECT_NOT_FOUND", message: "Project not found" },
        meta,
        { status: 404 },
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return apiFailure(
        {
          code: "INVALID_FORM",
          message: "Could not parse multipart form data",
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
