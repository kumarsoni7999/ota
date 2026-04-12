import { buildMeta, createApiContext } from "@/lib/api/context";
import { apiFailure, apiSuccess } from "@/lib/api/response";
import { isValidSessionClientId } from "@/lib/auth/client-id-format";
import {
  buildSessionClearCookieHeader,
  buildSessionSetCookieHeader,
  createSessionToken,
} from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/auth/normalize";
import type { User } from "@/server/models/user.model";
import { toUserPublic } from "@/server/models/user.model";
import { isValidEmail, isValidMobile } from "@/lib/validation/contact";
import {
  REGISTER_NAME_MAX_LEN,
  REGISTER_NAME_MIN_LEN,
  REGISTER_PASSWORD_MAX_LEN,
  REGISTER_PASSWORD_MIN_LEN,
} from "@/lib/validation/register-fields";
import {
  authenticateWithLogin,
  registerUser,
} from "@/server/services/auth.service";
import {
  clearLoginThrottle,
  getLoginLockState,
  lockoutUserMessage,
  recordLoginFailure,
} from "@/server/services/login-throttle.service";
import { newClientId, userService } from "@/server/services/user.service";

function appendSetCookie(response: Response, cookie: string) {
  response.headers.append("Set-Cookie", cookie);
}

async function userWithPersistedClientId(user: User): Promise<User> {
  if (isValidSessionClientId(user.clientId)) {
    return user;
  }
  const now = new Date().toISOString();
  const next: User = {
    ...user,
    clientId: newClientId(),
    updatedAt: now,
  };
  await userService.save(next);
  return next;
}

export const authController = {
  async register(request: Request) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);

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
    const name = typeof b.name === "string" ? b.name : "";
    const email = typeof b.email === "string" ? b.email : undefined;
    const mobile = typeof b.mobile === "string" ? b.mobile : undefined;
    const password = typeof b.password === "string" ? b.password : "";
    const confirmPassword =
      typeof b.confirmPassword === "string" ? b.confirmPassword : "";

    const nameTrim = name.trim();
    if (!nameTrim) {
      return apiFailure(
        { code: "NAME_REQUIRED", message: "Name is required" },
        meta,
        { status: 400 },
      );
    }
    if (nameTrim.length < REGISTER_NAME_MIN_LEN) {
      return apiFailure(
        {
          code: "NAME_TOO_SHORT",
          message: `Name must be at least ${REGISTER_NAME_MIN_LEN} characters`,
        },
        meta,
        { status: 400 },
      );
    }
    if (nameTrim.length > REGISTER_NAME_MAX_LEN) {
      return apiFailure(
        {
          code: "NAME_TOO_LONG",
          message: `Name must be at most ${REGISTER_NAME_MAX_LEN} characters`,
        },
        meta,
        { status: 400 },
      );
    }
    if (!email?.trim() && !mobile?.trim()) {
      return apiFailure(
        {
          code: "IDENTIFIER_REQUIRED",
          message: "Email or mobile is required",
        },
        meta,
        { status: 400 },
      );
    }

    const emailTrim = email?.trim();
    const mobileTrim = mobile?.trim();
    if (emailTrim && !isValidEmail(emailTrim)) {
      return apiFailure(
        {
          code: "INVALID_EMAIL",
          message: "That email address is not valid. Check spelling and try again.",
        },
        meta,
        { status: 400 },
      );
    }
    if (mobileTrim && !isValidMobile(mobileTrim)) {
      return apiFailure(
        {
          code: "INVALID_MOBILE",
          message:
            "Mobile must be exactly 10 digits. Examples: 9876543210, +91 98765 43210, or 09876543210.",
        },
        meta,
        { status: 400 },
      );
    }

    const emailNorm = emailTrim ? normalizeEmail(emailTrim) : undefined;
    if (emailNorm && (await userService.findByEmail(emailNorm))) {
      return apiFailure(
        {
          code: "EMAIL_IN_USE",
          message:
            "This email already exists. Use a different email or sign in.",
        },
        meta,
        { status: 409 },
      );
    }
    if (mobileTrim && (await userService.findByMobile(mobileTrim))) {
      return apiFailure(
        {
          code: "MOBILE_IN_USE",
          message:
            "This mobile number already exists. Use a different number or sign in.",
        },
        meta,
        { status: 409 },
      );
    }

    if (!password) {
      return apiFailure(
        { code: "PASSWORD_REQUIRED", message: "Password is required" },
        meta,
        { status: 400 },
      );
    }
    if (password.length < REGISTER_PASSWORD_MIN_LEN) {
      return apiFailure(
        {
          code: "PASSWORD_TOO_SHORT",
          message: `Password must be at least ${REGISTER_PASSWORD_MIN_LEN} characters`,
        },
        meta,
        { status: 400 },
      );
    }
    if (password.length > REGISTER_PASSWORD_MAX_LEN) {
      return apiFailure(
        {
          code: "PASSWORD_TOO_LONG",
          message: `Password must be at most ${REGISTER_PASSWORD_MAX_LEN} characters`,
        },
        meta,
        { status: 400 },
      );
    }
    if (password !== confirmPassword) {
      return apiFailure(
        {
          code: "PASSWORD_MISMATCH",
          message:
            "Passwords do not match. Enter the same password in both fields.",
        },
        meta,
        { status: 400 },
      );
    }

    try {
      const user = await registerUser({
        name: nameTrim,
        email: emailTrim || undefined,
        mobile: mobileTrim || undefined,
        password,
      });
      const withCid = await userWithPersistedClientId(user);
      const token = createSessionToken({
        userId: withCid.id,
        role: withCid.role,
        clientId: withCid.clientId,
      });
      const res = apiSuccess({ user: toUserPublic(withCid) }, meta, {
        status: 201,
      });
      appendSetCookie(res, buildSessionSetCookieHeader(token));
      return res;
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "EMAIL_IN_USE") {
          return apiFailure(
            {
              code: "EMAIL_IN_USE",
              message:
                "This email already exists. Use a different email or sign in.",
            },
            meta,
            { status: 409 },
          );
        }
        if (err.message === "MOBILE_IN_USE") {
          return apiFailure(
            {
              code: "MOBILE_IN_USE",
              message:
                "This mobile number already exists. Use a different number or sign in.",
            },
            meta,
            { status: 409 },
          );
        }
      }
      return apiFailure(
        { code: "REGISTER_FAILED", message: "Could not create account" },
        meta,
        { status: 500 },
      );
    }
  },

  async login(request: Request) {
    const ctx = createApiContext(request);
    const meta = buildMeta(ctx);

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
    const login = typeof b.login === "string" ? b.login : "";
    const password = typeof b.password === "string" ? b.password : "";

    if (!login.trim() || !password) {
      return apiFailure(
        {
          code: "INVALID_CREDENTIALS",
          message: "Email or mobile and password are required",
        },
        meta,
        { status: 400 },
      );
    }

    const loginTrim = login.trim();
    if (!loginTrim.includes("@") && !isValidMobile(loginTrim)) {
      return apiFailure(
        {
          code: "INVALID_MOBILE",
          message:
            "Mobile must be exactly 10 digits. Examples: 9876543210, +91 98765 43210, or 09876543210.",
        },
        meta,
        { status: 400 },
      );
    }

    const lock = await getLoginLockState(loginTrim);
    if (lock.blocked && lock.retryAfterSeconds != null) {
      return apiFailure(
        {
          code: "ACCOUNT_LOCKED",
          message: lockoutUserMessage(lock.retryAfterSeconds),
        },
        meta,
        {
          status: 429,
          headers: {
            "Retry-After": String(lock.retryAfterSeconds),
          },
        },
      );
    }

    const user = await authenticateWithLogin(login, password);
    if (!user) {
      const afterFail = await recordLoginFailure(loginTrim);
      if (afterFail.locked && afterFail.retryAfterSeconds != null) {
        return apiFailure(
          {
            code: "ACCOUNT_LOCKED",
            message: lockoutUserMessage(afterFail.retryAfterSeconds),
          },
          meta,
          {
            status: 429,
            headers: {
              "Retry-After": String(afterFail.retryAfterSeconds),
            },
          },
        );
      }
      return apiFailure(
        { code: "INVALID_CREDENTIALS", message: "Invalid login or password" },
        meta,
        { status: 401 },
      );
    }

    await clearLoginThrottle(loginTrim);

    const withCid = await userWithPersistedClientId(user);
    const token = createSessionToken({
      userId: withCid.id,
      role: withCid.role,
      clientId: withCid.clientId,
    });
    const res = apiSuccess({ user: toUserPublic(withCid) }, meta);
    appendSetCookie(res, buildSessionSetCookieHeader(token));
    return res;
  },

  async logout(_request: Request) {
    const ctx = createApiContext(_request);
    const meta = buildMeta(ctx);
    const res = apiSuccess({ ok: true as const }, meta);
    appendSetCookie(res, buildSessionClearCookieHeader());
    return res;
  },
};
