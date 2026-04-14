import path from "node:path";
import { readFile } from "node:fs/promises";
import { buildMeta, createApiContext } from "@/lib/api/context";
import { apiFailure } from "@/lib/api/response";
import { requireApiSessionWithClient } from "@/lib/auth/require-api-session";
import { buildService } from "@/server/services/build.service";
import { projectService } from "@/server/services/project.service";
import { fromStorageRelative } from "@/server/storage/project-storage";

const BUILD_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function contentTypeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".apk":
      return "application/vnd.android.package-archive";
    case ".aab":
      return "application/octet-stream";
    case ".ipa":
      return "application/octet-stream";
    default:
      return "application/octet-stream";
  }
}

export const buildDownloadController = {
  async get(request: Request, buildId: string) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);

    const auth = requireApiSessionWithClient(request, meta);
    if (!auth.ok) {
      return auth.response;
    }

    const id = buildId.trim();
    if (!BUILD_ID_RE.test(id)) {
      return apiFailure(
        { code: "INVALID_BUILD_ID", message: "Invalid build id" },
        meta,
        { status: 400 },
      );
    }

    const build = await buildService.findById(id);
    if (!build || build.uploadStatus !== "success") {
      return apiFailure(
        { code: "BUILD_NOT_FOUND", message: "Build not found" },
        meta,
        { status: 404 },
      );
    }

    const project = await projectService.findById(build.projectId);
    if (!project || project.createdBy !== auth.session.sub) {
      return apiFailure(
        { code: "BUILD_NOT_FOUND", message: "Build not found" },
        meta,
        { status: 404 },
      );
    }

    try {
      const absPath = fromStorageRelative(build.filePath);
      const file = await readFile(absPath);
      const fileName = path.basename(build.filePath);
      return new Response(file, {
        status: 200,
        headers: {
          "Content-Type": contentTypeForExt(path.extname(fileName)),
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      return apiFailure(
        { code: "FILE_NOT_FOUND", message: "Build file not found on disk" },
        meta,
        { status: 404 },
      );
    }
  },
};
