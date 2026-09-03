"use client";

import type { Permission, Role } from "@/types";
import { can } from "@/lib/permissions/rolePermissions";

interface PermissionGateProps {
  role: Role;
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only if the role has the required permission.
 * This is purely a UI gate — smart contracts enforce real authorization.
 */
export function PermissionGate({ role, permission, children, fallback = null }: PermissionGateProps) {
  if (!can(role, permission)) return <>{fallback}</>;
  return <>{children}</>;
}
