import path from "node:path";

/**
 * Root for persisted files (`data/`, `uploads/`, `storage/`).
 * In Docker or systemd, set `OTA_DATA_DIR` to a mounted volume so data survives restarts and matches a stable path.
 * Defaults to `process.cwd()` (same as local `npm run dev`).
 */
export function getDataRoot(): string {
  const raw = process.env.OTA_DATA_DIR?.trim();
  if (raw) {
    return path.resolve(raw);
  }
  return process.cwd();
}
