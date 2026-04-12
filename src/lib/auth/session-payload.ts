import type { UserRole } from "@/server/models/role.model";

export type SessionPayload = {
  sub: string;
  role: UserRole;
  exp: number;
  /** Public client id (24-char hex), same as `User.clientId` */
  cid: string;
};
