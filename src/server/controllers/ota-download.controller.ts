import path from "node:path";
import { readFile } from "node:fs/promises";
import { buildMeta, createApiContext } from "@/lib/api/context";
import { apiFailure } from "@/lib/api/response";
import { parseEnv, parsePlatform } from "@/server/services/build-upload.service";
import { requireOtaPublicProjectAndClient } from "@/server/services/ota-public-auth";
import { otaUpdateService } from "@/server/services/ota-update.service";
import { fromStorageRelative } from "@/server/storage/project-storage";

export const otaDownloadController = {
  async get(request: Request) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId")?.trim() ?? "";
    const version = url.searchParams.get("version")?.trim() ?? "";
    const platformRaw = url.searchParams.get("platform")?.trim() ?? "";
    const envRaw = url.searchParams.get("env")?.trim() ?? "";
    const target = (url.searchParams.get("target") ?? "bundle").trim().toLowerCase();

    if (!version) {
      return apiFailure(
        { code: "VERSION_REQUIRED", message: "Query version is required" },
        meta,
        { status: 400 },
      );
    }

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
      return apiFailure(
        { code: "INVALID_QUERY", message: "Invalid platform or env" },
        meta,
        { status: 400 },
      );
    }

    const update = await otaUpdateService.findByReleaseSlot({
      projectId: project.id,
      env,
      platform,
      version,
    });
    if (!update || !update.active) {
      return apiFailure(
        { code: "OTA_NOT_FOUND", message: "OTA update not found" },
        meta,
        { status: 404 },
      );
    }

    try {
      if (target === "bundle") {
        const abs = fromStorageRelative(update.bundlePath);
        const buf = await readFile(abs);
        return new Response(buf, {
          status: 200,
          headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "private, no-store",
          },
        });
      }

      if (target === "asset") {
        const nameRaw = url.searchParams.get("name") ?? "";
        const name = decodeURIComponent(nameRaw).replace(/\\/g, "/");
        if (!name || name.includes("..")) {
          return apiFailure(
            { code: "INVALID_ASSET_NAME", message: "Invalid asset name" },
            meta,
            { status: 400 },
          );
        }
        const base = fromStorageRelative(update.assetsPath);
        const resolved = path.resolve(base, name);
        if (!resolved.startsWith(path.resolve(base))) {
          return apiFailure(
            { code: "INVALID_ASSET_PATH", message: "Invalid asset path" },
            meta,
            { status: 400 },
          );
        }
        const buf = await readFile(resolved);
        return new Response(buf, {
          status: 200,
          headers: {
            "Content-Type": "application/octet-stream",
            "Cache-Control": "private, no-store",
          },
        });
      }

      return apiFailure(
        { code: "INVALID_TARGET", message: "target must be bundle or asset" },
        meta,
        { status: 400 },
      );
    } catch {
      return apiFailure(
        { code: "FILE_NOT_FOUND", message: "OTA file not found" },
        meta,
        { status: 404 },
      );
    }
  },
};
