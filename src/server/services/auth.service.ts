import bcrypt from "bcryptjs";
import type { User } from "@/server/models/user.model";
import { normalizeEmail } from "@/lib/auth/normalize";
import { canonicalMobile } from "@/lib/validation/contact";
import { newClientId, newUserId, userService } from "@/server/services/user.service";

const BCRYPT_ROUNDS = 10;

export type RegisterInput = {
  name: string;
  email?: string;
  mobile?: string;
  password: string;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function registerUser(input: RegisterInput): Promise<User> {
  const name = input.name.trim();
  const emailRaw = input.email?.trim();
  const mobileRaw = input.mobile?.trim();

  const email = emailRaw ? normalizeEmail(emailRaw) : undefined;
  const mobile = mobileRaw ? canonicalMobile(mobileRaw)! : undefined;

  if (!email && !mobile) {
    throw new Error("IDENTIFIER_REQUIRED");
  }
  if (email && (await userService.findByEmail(email))) {
    throw new Error("EMAIL_IN_USE");
  }
  if (mobile && (await userService.findByMobile(mobile))) {
    throw new Error("MOBILE_IN_USE");
  }

  const now = new Date().toISOString();
  const user: User = {
    id: newUserId(),
    name,
    password: await hashPassword(input.password),
    profilePhoto: "",
    clientId: newClientId(),
    email,
    mobile,
    role: "user",
    createdAt: now,
    updatedAt: now,
    active: true,
  };

  await userService.create(user);
  return user;
}

export async function authenticateWithLogin(
  login: string,
  password: string,
): Promise<User | null> {
  const trimmed = login.trim();
  if (!trimmed || !password) {
    return null;
  }

  const user = trimmed.includes("@")
    ? await userService.findByEmail(trimmed)
    : await userService.findByMobile(trimmed);

  if (!user || !user.active) {
    return null;
  }

  const ok = await verifyPassword(password, user.password);
  return ok ? user : null;
}
