import type { OtaUpdate } from "@/server/models/ota-update.model";

function haystack(u: OtaUpdate): string {
  const parts = [
    u.version,
    u.projectId,
    u.metadata?.minVersion ?? "",
    u.metadata?.releaseNotes ?? "",
    u.id.replace(/-/g, ""),
  ];
  return parts.join(" ").toLowerCase();
}

/** Match version string, project id, minVersion, release notes (version “code” style terms). */
export function filterOtaUpdatesBySearch(
  items: OtaUpdate[],
  raw: string,
): OtaUpdate[] {
  const q = raw.trim().toLowerCase();
  if (!q) {
    return items;
  }
  return items.filter((u) => haystack(u).includes(q));
}
