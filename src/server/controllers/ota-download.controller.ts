import path from "node:path";
import { readFile } from "node:fs/promises";
import { buildMeta, createApiContext } from "@/lib/api/context";
import { apiFailure } from "@/lib/api/response";
import type { OtaUpdate } from "@/server/models/ota-update.model";
import { parseEnv, parsePlatform } from "@/server/services/build-upload.service";
import { errMessage, otaApiLogger } from "@/server/services/ota-api-logger";
import { requireOtaPublicProjectAndClient } from "@/server/services/ota-public-auth";
import { otaUpdateService } from "@/server/services/ota-update.service";
import { fromStorageRelative } from "@/server/storage/project-storage";

const OTA_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uploadIsDownloadable(u: OtaUpdate): boolean {
  const stateOk = u.uploadState === undefined || u.uploadState === "SUCCESS";
  return stateOk && u.active;
}

export const otaDownloadController = {
  async get(request: Request) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId")?.trim() ?? "";
    const updateIdRaw = url.searchParams.get("updateId")?.trim() ?? "";
    const version = url.searchParams.get("version")?.trim() ?? "";
    const platformRaw = url.searchParams.get("platform")?.trim() ?? "";
    const envRaw = url.searchParams.get("env")?.trim() ?? "";
    const target = (url.searchParams.get("target") ?? "bundle").trim().toLowerCase();

    if (!updateIdRaw && !version) {
      otaApiLogger.warn("download", "version_or_update_id_required", { projectId });
      return apiFailure(
        {
          code: "VERSION_OR_UPDATE_ID_REQUIRED",
          message: "Query version or updateId is required",
        },
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
      otaApiLogger.warn("download", "invalid_platform_or_env", {
        projectId,
        platform: platformRaw,
        env: envRaw,
      });
      return apiFailure(
        { code: "INVALID_QUERY", message: "Invalid platform or env" },
        meta,
        { status: 400 },
      );
    }

    let update: OtaUpdate;

    if (updateIdRaw) {
      if (!OTA_ID_RE.test(updateIdRaw)) {
        return apiFailure(
          { code: "INVALID_UPDATE_ID", message: "Invalid OTA update id" },
          meta,
          { status: 400 },
        );
      }
      const row = await otaUpdateService.findById(updateIdRaw);
      if (
        !row ||
        row.projectId !== project.id ||
        row.platform !== platform ||
        row.env !== env
      ) {
        otaApiLogger.warn("download", "ota_not_found", {
          projectId,
          updateId: updateIdRaw,
          platform: platformRaw,
          env: envRaw,
        });
        return apiFailure(
          { code: "OTA_NOT_FOUND", message: "OTA update not found" },
          meta,
          { status: 404 },
        );
      }
      if (version && row.version !== version) {
        return apiFailure(
          {
            code: "VERSION_MISMATCH",
            message: "version query does not match this updateId",
          },
          meta,
          { status: 400 },
        );
      }
      if (!uploadIsDownloadable(row)) {
        return apiFailure(
          { code: "OTA_NOT_FOUND", message: "OTA update not found" },
          meta,
          { status: 404 },
        );
      }
      update = row;
    } else {
      const row = await otaUpdateService.findByReleaseSlot({
        projectId: project.id,
        env,
        platform,
        version,
      });
      if (!row || !uploadIsDownloadable(row)) {
        otaApiLogger.warn("download", "ota_not_found", {
          projectId,
          version,
          platform: platformRaw,
          env: envRaw,
        });
        return apiFailure(
          { code: "OTA_NOT_FOUND", message: "OTA update not found" },
          meta,
          { status: 404 },
        );
      }
      update = row;
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
          otaApiLogger.warn("download", "invalid_asset_name", {
            projectId,
            version,
            namePreview: nameRaw.slice(0, 120),
          });
          return apiFailure(
            { code: "INVALID_ASSET_NAME", message: "Invalid asset name" },
            meta,
            { status: 400 },
          );
        }
        const base = fromStorageRelative(update.assetsPath);
        const resolved = path.resolve(base, name);
        if (!resolved.startsWith(path.resolve(base))) {
          otaApiLogger.warn("download", "invalid_asset_path", {
            projectId,
            version,
            namePreview: name.slice(0, 120),
          });
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

      otaApiLogger.warn("download", "invalid_target", { target, projectId, version });
      return apiFailure(
        { code: "INVALID_TARGET", message: "target must be bundle or asset" },
        meta,
        { status: 400 },
      );
    } catch (err) {
      otaApiLogger.error("download", "read_failed", {
        projectId,
        version,
        target,
        error: errMessage(err),
      });
      return apiFailure(
        { code: "FILE_NOT_FOUND", message: "OTA file not found" },
        meta,
        { status: 404 },
      );
    }
  },
};
