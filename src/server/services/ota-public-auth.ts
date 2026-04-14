import { timingSafeEqual } from "node:crypto";
import { CLIENT_ID_HEADER } from "@/lib/api/client-id-header";
import { buildMeta, createApiContext } from "@/lib/api/context";
import { apiFailure } from "@/lib/api/response";
import { isValidSessionClientId } from "@/lib/auth/client-id-format";
import type { Project } from "@/server/models/project.model";
import type { User } from "@/server/models/user.model";
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

export type OtaPublicAuthOk = {
  ok: true;
  meta: ReturnType<typeof buildMeta>;
  project: Project;
  actor: User;
};

export type OtaPublicAuthFail = {
  ok: false;
  response: ReturnType<typeof apiFailure>;
};

export async function requireOtaPublicProjectAndClient(
  request: Request,
  projectIdRaw: string,
): Promise<OtaPublicAuthOk | OtaPublicAuthFail> {
  const ctx = createApiContext(request);
  const meta = buildMeta(ctx);
  const projectId = projectIdRaw.trim();
  if (!PROJECT_ID_RE.test(projectId)) {
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
  const project = await projectService.findById(projectId);
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
  return { ok: true, meta, project, actor };
}
