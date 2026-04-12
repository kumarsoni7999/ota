import { randomBytes, randomUUID } from "node:crypto";
import type { User } from "@/server/models/user.model";
import { parseUserRole } from "@/server/models/role.model";
import {
  readAllJsonRecords,
  sortByCreatedAtDesc,
  writeJsonRecord,
} from "@/server/services/json-dir.store";
import { normalizeEmail } from "@/lib/auth/normalize";
import { canonicalMobile } from "@/lib/validation/contact";

function coerceUser(raw: unknown): User {
  const u = raw as Partial<User> & Record<string, unknown>;
  if (typeof u.id !== "string" || typeof u.name !== "string") {
    throw new Error("Invalid user record");
  }
  if (typeof u.password !== "string") {
    throw new Error("Invalid user record: missing password");
  }
  return {
    id: u.id,
    name: u.name,
    password: u.password,
    profilePhoto: typeof u.profilePhoto === "string" ? u.profilePhoto : "",
    clientId: typeof u.clientId === "string" ? u.clientId : "",
    email: typeof u.email === "string" ? u.email : undefined,
    mobile: typeof u.mobile === "string" ? u.mobile : undefined,
    role: parseUserRole(u.role),
    createdAt:
      typeof u.createdAt === "string"
        ? u.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof u.updatedAt === "string"
        ? u.updatedAt
        : new Date().toISOString(),
    active: typeof u.active === "boolean" ? u.active : true,
  };
}

async function listAllUsers(): Promise<User[]> {
  const rows = await readAllJsonRecords<unknown>("users");
  return sortByCreatedAtDesc(rows.map(coerceUser));
}

export const userService = {
  listAll: listAllUsers,

  async create(user: User): Promise<void> {
    await writeJsonRecord("users", user.id, user);
  },

  async save(user: User): Promise<void> {
    await writeJsonRecord("users", user.id, user);
  },

  async findByEmail(email: string): Promise<User | null> {
    const normalized = normalizeEmail(email);
    const users = await listAllUsers();
    return (
      users.find((u) => u.email && normalizeEmail(u.email) === normalized) ??
      null
    );
  },

  async findByMobile(mobile: string): Promise<User | null> {
    const key = canonicalMobile(mobile);
    if (!key) {
      return null;
    }
    const users = await listAllUsers();
    for (const u of users) {
      if (!u.mobile) {
        continue;
      }
      const stored = canonicalMobile(u.mobile);
      if (stored === key) {
        return u;
      }
    }
    return null;
  },

  async findById(id: string): Promise<User | null> {
    const users = await listAllUsers();
    return users.find((u) => u.id === id) ?? null;
  },

  async isEmailAvailable(email: string): Promise<boolean> {
    return (await this.findByEmail(email)) === null;
  },

  async isMobileAvailable(mobile: string): Promise<boolean> {
    return (await this.findByMobile(mobile)) === null;
  },
};

export function newClientId(): string {
  return randomBytes(12).toString("hex");
}

export function newUserId(): string {
  return randomUUID();
}
