import { randomBytes, randomUUID } from "node:crypto";
import { buildMeta, createApiContext } from "@/lib/api/context";
import { paginateArray, parsePaginationParams } from "@/lib/api/pagination";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { requireApiSessionWithClient } from "@/lib/auth/require-api-session";
import { toProjectListItem, type Project } from "@/server/models/project.model";
import { projectService } from "@/server/services/project.service";
import { userService } from "@/server/services/user.service";

const NAME_MAX = 30;
const DESC_MAX = 2000;

function newProjectKey(): string {
  return randomBytes(12).toString("hex");
}

/** Matches UUID v4 from `randomUUID()` (project ids). */
const PROJECT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertValidProjectId(id: string) {
  return PROJECT_ID_RE.test(id.trim());
}

export const projectsController = {
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
      const rows = await projectService.listForCreator(auth.session.sub);
      const page = paginateArray(rows.map(toProjectListItem), query);
      return apiSuccess(page, meta);
    } catch {
      return apiFailure(
        { code: "PROJECTS_LIST_FAILED", message: "Could not load projects" },
        meta,
        { status: 500 },
      );
    }
  },

  async post(request: Request) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);

    const auth = requireApiSessionWithClient(request, meta);
    if (!auth.ok) {
      return auth.response;
    }

    const actor = await userService.findById(auth.session.sub);
    if (!actor?.active) {
      return apiFailure(
        { code: "UNAUTHORIZED", message: "Sign in to create a project" },
        meta,
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiFailure(
        { code: "INVALID_JSON", message: "Expected JSON body" },
        meta,
        { status: 400 },
      );
    }

    const b = body as Record<string, unknown>;
    const name = typeof b.name === "string" ? b.name.trim() : "";
    const description =
      typeof b.description === "string" ? b.description.trim() : "";

    if (!name) {
      return apiFailure(
        { code: "NAME_REQUIRED", message: "Project name is required" },
        meta,
        { status: 400 },
      );
    }
    if (name.length > NAME_MAX) {
      return apiFailure(
        {
          code: "NAME_TOO_LONG",
          message: `Name must be at most ${NAME_MAX} characters`,
        },
        meta,
        { status: 400 },
      );
    }
    if (description.length > DESC_MAX) {
      return apiFailure(
        {
          code: "DESCRIPTION_TOO_LONG",
          message: `Description must be at most ${DESC_MAX} characters`,
        },
        meta,
        { status: 400 },
      );
    }
    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      name,
      description,
      icon: "",
      projectKey: newProjectKey(),
      createdBy: actor.id,
      updatedBy: actor.id,
      createdAt: now,
      updatedAt: now,
      active: true,
    };

    try {
      await projectService.create(project);
      return apiSuccess({ project: toProjectListItem(project) }, meta, {
        status: 201,
      });
    } catch {
      return apiFailure(
        { code: "PROJECT_CREATE_FAILED", message: "Could not create project" },
        meta,
        { status: 500 },
      );
    }
  },

  async patchById(request: Request, id: string) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);

    if (!assertValidProjectId(id)) {
      return apiFailure(
        { code: "INVALID_PROJECT_ID", message: "Invalid project id" },
        meta,
        { status: 400 },
      );
    }

    const auth = requireApiSessionWithClient(request, meta);
    if (!auth.ok) {
      return auth.response;
    }

    const actor = await userService.findById(auth.session.sub);
    if (!actor?.active) {
      return apiFailure(
        { code: "UNAUTHORIZED", message: "Sign in to update a project" },
        meta,
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiFailure(
        { code: "INVALID_JSON", message: "Expected JSON body" },
        meta,
        { status: 400 },
      );
    }

    const b = body as Record<string, unknown>;
    if (typeof b.active !== "boolean") {
      return apiFailure(
        { code: "INVALID_BODY", message: "Body must include boolean active" },
        meta,
        { status: 400 },
      );
    }

    const pid = id.trim();
    const project = await projectService.findById(pid);
    if (!project) {
      return apiFailure(
        { code: "PROJECT_NOT_FOUND", message: "Project not found" },
        meta,
        { status: 404 },
      );
    }

    if (project.createdBy !== actor.id) {
      return apiFailure(
        { code: "FORBIDDEN", message: "You can only change your own projects" },
        meta,
        { status: 403 },
      );
    }

    const now = new Date().toISOString();
    const updated: Project = {
      ...project,
      active: b.active,
      updatedAt: now,
      updatedBy: actor.id,
    };

    try {
      await projectService.save(updated);
      return apiSuccess({ project: toProjectListItem(updated) }, meta);
    } catch {
      return apiFailure(
        { code: "PROJECT_UPDATE_FAILED", message: "Could not update project" },
        meta,
        { status: 500 },
      );
    }
  },

  async deleteById(request: Request, id: string) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);

    if (!assertValidProjectId(id)) {
      return apiFailure(
        { code: "INVALID_PROJECT_ID", message: "Invalid project id" },
        meta,
        { status: 400 },
      );
    }

    const auth = requireApiSessionWithClient(request, meta);
    if (!auth.ok) {
      return auth.response;
    }

    const actor = await userService.findById(auth.session.sub);
    if (!actor?.active) {
      return apiFailure(
        { code: "UNAUTHORIZED", message: "Sign in to delete a project" },
        meta,
        { status: 401 },
      );
    }

    const pid = id.trim();
    const project = await projectService.findById(pid);
    if (!project) {
      return apiFailure(
        { code: "PROJECT_NOT_FOUND", message: "Project not found" },
        meta,
        { status: 404 },
      );
    }

    if (project.createdBy !== actor.id) {
      return apiFailure(
        { code: "FORBIDDEN", message: "You can only delete your own projects" },
        meta,
        { status: 403 },
      );
    }

    try {
      await projectService.deletePermanently(project);
      return apiSuccess({ ok: true as const }, meta);
    } catch {
      return apiFailure(
        { code: "PROJECT_DELETE_FAILED", message: "Could not delete project" },
        meta,
        { status: 500 },
      );
    }
  },
};
