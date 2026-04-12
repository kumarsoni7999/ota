import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-constants";
import { verifySessionToken } from "@/lib/auth/session";
import type { User, UserPublic } from "@/server/models/user.model";
import { toUserPublic } from "@/server/models/user.model";
import { userService } from "@/server/services/user.service";

/** Full user row for the signed-in account profile (password excluded). */
export type DashboardProfileUser = Omit<User, "password">;

export const getDashboardUser = cache(async (): Promise<UserPublic | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  const payload = verifySessionToken(token);
  if (!payload) {
    return null;
  }
  const user = await userService.findById(payload.sub);
  if (!user || !user.active) {
    return null;
  }
  return toUserPublic(user);
});

export async function requireDashboardUser(): Promise<UserPublic> {
  const user = await getDashboardUser();
  if (!user) {
    redirect("/?tab=signin");
  }
  return user;
}

export const getDashboardProfileUser = cache(
  async (): Promise<DashboardProfileUser | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }
    const payload = verifySessionToken(token);
    if (!payload) {
      return null;
    }
    const user = await userService.findById(payload.sub);
    if (!user || !user.active) {
      return null;
    }
    return {
      id: user.id,
      name: user.name,
      profilePhoto: user.profilePhoto,
      clientId: user.clientId,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      active: user.active,
    };
  },
);

export async function requireDashboardProfileUser(): Promise<DashboardProfileUser> {
  const user = await getDashboardProfileUser();
  if (!user) {
    redirect("/?tab=signin");
  }
  return user;
}

export function profileToUserPublic(p: DashboardProfileUser): UserPublic {
  return {
    id: p.id,
    name: p.name,
    profilePhoto: p.profilePhoto,
    email: p.email,
    mobile: p.mobile,
    role: p.role,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    active: p.active,
  };
}
