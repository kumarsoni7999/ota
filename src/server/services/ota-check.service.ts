import { readdir } from "node:fs/promises";
import path from "node:path";
import type { OtaUpdate } from "@/server/models/ota-update.model";
import {
  normalizeOtaBuildNumber,
  otaUpdateFingerprint,
} from "@/server/services/ota-fingerprint";
import { otaUpdateService } from "@/server/services/ota-update.service";
import { fromStorageRelative } from "@/server/storage/project-storage";

async function walkAssetRelPaths(
  dirAbs: string,
  baseRel = "",
): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dirAbs, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of entries) {
    const rel = baseRel ? `${baseRel}/${e.name}` : e.name;
    const abs = path.join(dirAbs, e.name);
    if (e.isDirectory()) {
      out.push(...(await walkAssetRelPaths(abs, rel)));
    } else {
      out.push(rel.split(path.sep).join("/"));
    }
  }
  return out;
}

/** Payload returned to clients when an OTA differs from `currentFingerprint`. */
export type OtaCheckPublishedUpdate = {
  id: string;
  version: string;
  buildNumber: number;
  env: string;
  updatedAt: string;
  mandatory?: boolean;
  releaseNotes?: string;
  bundleUrl: string;
  assets: { url: string; name: string }[];
};

function publicBaseUrl(request: Request): string {
  const explicit = process.env.OTA_PUBLIC_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  const u = new URL(request.url);
  return `${u.protocol}//${u.host}`;
}

function downloadQuery(u: OtaUpdate): string {
  const q = new URLSearchParams({
    projectId: u.projectId,
    platform: u.platform,
    env: u.env,
    version: u.version,
    updateId: u.id,
  });
  return q.toString();
}

export const otaCheckService = {
  async listAssetRelativePaths(u: OtaUpdate, projectKey: string): Promise<string[]> {
    void projectKey; // kept for backwards compatibility of callsites
    return walkAssetRelPaths(fromStorageRelative(u.assetsPath));
  },

  async buildCheckPayload(params: {
    request: Request;
    update: OtaUpdate;
    projectKey: string;
  }): Promise<{
    fingerprint: string;
    update: OtaCheckPublishedUpdate;
  }> {
    const { request, update, projectKey } = params;
    const base = publicBaseUrl(request);
    const q = downloadQuery(update);
    const bundleUrl = `${base}/api/ota-updates/download?${q}&target=bundle`;
    const rels = await this.listAssetRelativePaths(update, projectKey);
    const assets = rels.map((name) => ({
      url: `${base}/api/ota-updates/download?${q}&target=asset&name=${encodeURIComponent(name)}`,
      name,
    }));
    const fingerprint = otaUpdateFingerprint(update);
    return {
      fingerprint,
      update: {
        id: update.id,
        version: update.version,
        buildNumber: normalizeOtaBuildNumber(update),
        env: update.env,
        updatedAt: update.updatedAt,
        mandatory: update.metadata?.mandatory,
        releaseNotes: update.metadata?.releaseNotes,
        bundleUrl,
        assets,
      },
    };
  },

  async checkForClient(params: {
    request: Request;
    projectId: string;
    platform: OtaUpdate["platform"];
    env: OtaUpdate["env"];
    currentFingerprint: string | undefined;
    projectKey: string;
  }): Promise<{
    updateAvailable: boolean;
    fingerprint: string | null;
    update?: OtaCheckPublishedUpdate;
  }> {
    const latest = await otaUpdateService.findLatestActive({
      projectId: params.projectId,
      platform: params.platform,
      env: params.env,
    });
    if (!latest) {
      return { updateAvailable: false, fingerprint: null };
    }
    const fp = otaUpdateFingerprint(latest);
    const cur = params.currentFingerprint?.trim() ?? "";
    if (cur && cur === fp) {
      return { updateAvailable: false, fingerprint: fp };
    }
    const built = await this.buildCheckPayload({
      request: params.request,
      update: latest,
      projectKey: params.projectKey,
    });
    return {
      updateAvailable: true,
      fingerprint: fp,
      update: built.update,
    };
  },
};
