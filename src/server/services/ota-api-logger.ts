/**
 * Structured logs for OTA HTTP handlers (upload, check, download).
 * Search logs for prefix `[ota-api]`.
 */

function safeMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) {
    return "";
  }
  try {
    return JSON.stringify(meta);
  } catch {
    return "";
  }
}

export const otaApiLogger = {
  error(scope: string, message: string, meta?: Record<string, unknown>) {
    const tail = safeMeta(meta);
    if (tail) {
      console.error(`[ota-api][${scope}] ${message}`, tail);
    } else {
      console.error(`[ota-api][${scope}] ${message}`);
    }
  },

  warn(scope: string, message: string, meta?: Record<string, unknown>) {
    const tail = safeMeta(meta);
    if (tail) {
      console.warn(`[ota-api][${scope}] ${message}`, tail);
    } else {
      console.warn(`[ota-api][${scope}] ${message}`);
    }
  },
};

export function errMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
