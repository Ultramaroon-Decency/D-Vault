import { cn } from "@/lib/utils";
import type { Role } from "@/types";
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/permissions/rolePermissions";

interface RoleBadgeProps {
  role: Role;
  size?: "sm" | "md";
  className?: string;
}

export function RoleBadge({ role, size = "md", className }: RoleBadgeProps) {
  const colors = ROLE_COLORS[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-mono font-medium tracking-wide",
        colors.bg, colors.text, colors.border,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
      {ROLE_LABELS[role]}
    </span>
  );
}
