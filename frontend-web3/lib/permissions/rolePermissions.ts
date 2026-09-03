import type { Role, Permission } from "@/types";

/**
 * Central permission registry.
 * UI reads from here — smart contracts remain the FINAL authority.
 * Change this map if the contract role logic changes.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    "VIEW_DASHBOARD",
    "VIEW_IDENTITY",
    "VIEW_ASSETS",
    "VIEW_AUDIT",
    "VIEW_ALL_IDENTITIES",
    "VIEW_ALL_ASSETS",
    "ASSIGN_ROLE",
    "MINT_ASSET",
    "ALLOCATE_ASSET",
    "TRANSFER_ASSET",
    "MANAGE_USERS",
    "REGISTER_IDENTITY",
  ],
  MANAGER: [
    "VIEW_DASHBOARD",
    "VIEW_IDENTITY",
    "VIEW_ASSETS",
    "VIEW_AUDIT",
    "VIEW_ALL_ASSETS",
    "MINT_ASSET",
    "ALLOCATE_ASSET",
  ],
  AUDITOR: [
    "VIEW_DASHBOARD",
    "VIEW_IDENTITY",
    "VIEW_ASSETS",
    "VIEW_AUDIT",
    "VIEW_ALL_IDENTITIES",
    "VIEW_ALL_ASSETS",
  ],
  USER: [
    "VIEW_DASHBOARD",
    "VIEW_IDENTITY",
    "VIEW_ASSETS",
  ],
  NONE: [],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  AUDITOR: "Auditor",
  USER: "User",
  NONE: "No Role",
};

export const ROLE_COLORS: Record<Role, { bg: string; text: string; border: string; dot: string }> = {
  ADMIN:   { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30",  dot: "bg-amber-400" },
  MANAGER: { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/30",    dot: "bg-sky-400" },
  AUDITOR: { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/30", dot: "bg-violet-400" },
  USER:    { bg: "bg-slate-500/10",   text: "text-slate-400",   border: "border-slate-500/30",  dot: "bg-slate-400" },
  NONE:    { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/30",    dot: "bg-red-400" },
};

export const ASSIGNABLE_ROLES: Role[] = ["MANAGER", "AUDITOR", "USER"];
export const ALL_ROLES: Role[] = ["ADMIN", "MANAGER", "AUDITOR", "USER"];
