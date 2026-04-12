import { createHash } from "node:crypto";
import { normalizeEmail } from "@/lib/auth/normalize";
import { canonicalMobile } from "@/lib/validation/contact";
import {
  deleteJsonRecord,
  readJsonRecord,
  writeJsonRecord,
} from "@/server/services/json-dir.store";

const LOGIN_LOCKS_DIR = "login-locks";
const MAX_FAILURES = 3;
const LOCK_MS = 15 * 60 * 1000;

type LoginThrottleRecord = {
  failedAttempts: number;
  lockedUntil: string | null;
};

/** Normalized identifier (lowercase email or canonical mobile digits). */
export function stableLoginKey(loginTrim: string): string {
  const t = loginTrim.trim();
  if (t.includes("@")) {
    return normalizeEmail(t);
  }
  const m = canonicalMobile(t);
  if (!m) {
    throw new Error("stableLoginKey requires a valid email or mobile");
  }
  return m;
}

function recordId(loginKey: string): string {
  return createHash("sha256").update(loginKey, "utf8").digest("hex");
}

async function load(loginKey: string): Promise<LoginThrottleRecord> {
  const id = recordId(loginKey);
  const row = await readJsonRecord<LoginThrottleRecord>(LOGIN_LOCKS_DIR, id);
  return row ?? { failedAttempts: 0, lockedUntil: null };
}

async function save(loginKey: string, rec: LoginThrottleRecord): Promise<void> {
  await writeJsonRecord(LOGIN_LOCKS_DIR, recordId(loginKey), rec);
}

export async function getLoginLockState(loginTrim: string): Promise<{
  blocked: boolean;
  lockedUntil: Date | null;
  retryAfterSeconds: number | null;
}> {
  let loginKey: string;
  try {
    loginKey = stableLoginKey(loginTrim);
  } catch {
    return { blocked: false, lockedUntil: null, retryAfterSeconds: null };
  }

  const rec = await load(loginKey);
  if (!rec.lockedUntil) {
    return { blocked: false, lockedUntil: null, retryAfterSeconds: null };
  }

  const until = new Date(rec.lockedUntil);
  if (until.getTime() <= Date.now()) {
    await deleteJsonRecord(LOGIN_LOCKS_DIR, recordId(loginKey));
    return { blocked: false, lockedUntil: null, retryAfterSeconds: null };
  }

  const retryAfterSeconds = Math.ceil((until.getTime() - Date.now()) / 1000);
  return { blocked: true, lockedUntil: until, retryAfterSeconds };
}

export async function clearLoginThrottle(loginTrim: string): Promise<void> {
  const loginKey = stableLoginKey(loginTrim);
  await deleteJsonRecord(LOGIN_LOCKS_DIR, recordId(loginKey));
}

/**
 * Call after a failed password check. Increments failures; on third failure
 * starts a 15-minute lockout for this login identifier.
 */
export async function recordLoginFailure(loginTrim: string): Promise<{
  locked: boolean;
  lockedUntil: Date | null;
  retryAfterSeconds: number | null;
}> {
  const loginKey = stableLoginKey(loginTrim);
  let rec = await load(loginKey);

  if (rec.lockedUntil) {
    const until = new Date(rec.lockedUntil);
    if (until.getTime() <= Date.now()) {
      rec = { failedAttempts: 0, lockedUntil: null };
    } else {
      const retryAfterSeconds = Math.ceil(
        (until.getTime() - Date.now()) / 1000,
      );
      return { locked: true, lockedUntil: until, retryAfterSeconds };
    }
  }

  rec.failedAttempts += 1;
  if (rec.failedAttempts >= MAX_FAILURES) {
    const lockedUntil = new Date(Date.now() + LOCK_MS);
    rec.lockedUntil = lockedUntil.toISOString();
    await save(loginKey, rec);
    return {
      locked: true,
      lockedUntil,
      retryAfterSeconds: Math.ceil(LOCK_MS / 1000),
    };
  }

  await save(loginKey, rec);
  return { locked: false, lockedUntil: null, retryAfterSeconds: null };
}

export function lockoutUserMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  if (retryAfterSeconds < 60) {
    return "Too many failed sign-in attempts. Try again in about a minute.";
  }
  return `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
