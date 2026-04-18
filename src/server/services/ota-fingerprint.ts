import type { OtaUpdate } from "@/server/models/ota-update.model";

export function normalizeOtaBuildNumber(u: OtaUpdate): number {
  const n = u.buildNumber;
  if (typeof n === "number" && Number.isInteger(n) && n > 0) {
    return n;
  }
  return 1;
}

/**
 * Stable id for "same OTA payload" comparisons.
 * Uses `createdAt` (not `updatedAt`) so download-count / metadata bumps do not
 * flip the fingerprint and hide or duplicate updates for clients.
 * Example: `1.0.0_24_DEV_2024-10-01T08:30:00.000Z`
 */
export function otaUpdateFingerprint(u: OtaUpdate): string {
  const bn = normalizeOtaBuildNumber(u);
  return `${u.version}_${bn}_${u.env}_${u.createdAt}`;
}
