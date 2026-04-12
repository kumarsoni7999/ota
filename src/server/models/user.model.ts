import type { ISODateString } from "@/server/models/iso-date";
import type { UserRole } from "@/server/models/role.model";

export type User = {
  id: string;
  name: string;
  /** bcrypt hash — never return from public GET APIs */
  password: string;
  profilePhoto: string;
  /** hashed 24-char material — treat as secret; omit from public GET */
  clientId: string;
  /** Optional; normalized lowercase when present */
  email?: string;
  /** Optional; normalized digits/+ when present */
  mobile?: string;
  role: UserRole;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  active: boolean;
};

export type UserPublic = Omit<User, "password" | "clientId">;

export function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    name: user.name,
    profilePhoto: user.profilePhoto,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    active: user.active,
  };
}
