"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, User, FolderOpen, ScrollText,
  Users, Shield, Hammer, ChevronRight, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";
import { can } from "@/lib/permissions/rolePermissions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: Parameters<typeof can>[1];
  adminOnly?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "VIEW_DASHBOARD" },
  { href: "/identity", label: "My Identity", icon: User, permission: "VIEW_IDENTITY" },
  { href: "/assets", label: "My Assets", icon: FolderOpen, permission: "VIEW_ASSETS" },
  { href: "/audit", label: "Audit Trail", icon: ScrollText, permission: "VIEW_AUDIT" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: Shield },
  { href: "/admin/users", label: "User Management", icon: Users, permission: "MANAGE_USERS" },
  { href: "/admin/roles", label: "Role Management", icon: Lock, permission: "ASSIGN_ROLE" },
  { href: "/admin/mint", label: "Mint Asset", icon: Hammer, permission: "MINT_ASSET" },
];

interface SidebarProps {
  role: Role;
  onNavigate?: () => void;
}

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {active && <ChevronRight className="h-3.5 w-3.5" />}
    </Link>
  );
}

export function Sidebar({ role, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = role === "ADMIN";
  const showAdmin = isAdmin || role === "MANAGER";

  const visiblePrimary = PRIMARY_NAV.filter((item) =>
    item.permission ? can(role, item.permission) : true
  );
  const visibleAdmin = ADMIN_NAV.filter((item) =>
    item.permission ? can(role, item.permission) : true
  );

  return (
    <aside className="flex h-full w-60 flex-col border-r border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-white">DID Platform</p>
          <p className="text-[10px] text-slate-500">Decentralized Identity</p>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {visiblePrimary.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname === item.href}
              onClick={onNavigate}
            />
          ))}
        </div>

        {/* Admin section */}
        {showAdmin && visibleAdmin.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Administration
            </p>
            <div className="space-y-1">
              {visibleAdmin.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={pathname === item.href || pathname.startsWith(item.href + "/")}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 px-4 py-3">
        <p className="text-[10px] text-slate-600">
          Smart contracts enforce all authorization.
        </p>
      </div>
    </aside>
  );
}
