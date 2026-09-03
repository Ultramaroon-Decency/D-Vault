"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield, Users, Lock, Hammer, ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { AuditTable } from "@/components/audit/AuditTable";
import { ContractWarningBanner } from "@/components/ui/DemoModeBanner";
import { useDemoAuth } from "@/lib/web3/demoAuth";
import { usePlatformStats, useAuditEvents } from "@/hooks/web3/useAuditEvents";

const ADMIN_ACTIONS = [
  {
    href: "/admin/users",
    label: "User Management",
    desc: "View and manage registered DID identities",
    icon: Users,
    iconClass: "text-cyan-400",
    border: "border-cyan-500/20",
  },
  {
    href: "/admin/roles",
    label: "Role Assignment",
    desc: "Assign or update on-chain RBAC roles",
    icon: Lock,
    iconClass: "text-amber-400",
    border: "border-amber-500/20",
  },
  {
    href: "/admin/mint",
    label: "Mint NFT Asset",
    desc: "Issue ERC-721 tokens linked to a DID",
    icon: Hammer,
    iconClass: "text-emerald-400",
    border: "border-emerald-500/20",
  },
];

export default function AdminPage() {
  const router = useRouter();
  const { address, role, isSignedIn } = useDemoAuth();
  const stats = usePlatformStats();
  const { events } = useAuditEvents();

  useEffect(() => {
    if (!isSignedIn) router.replace("/");
    else if (role !== "ADMIN") router.replace("/dashboard");
  }, [isSignedIn, role, router]);

  if (!isSignedIn || role !== "ADMIN") return null;

  return (
    <AppShell role={role}>
      <div className="animate-slide-up space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Shield className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-sm text-slate-400">Platform governance and management</p>
          </div>
        </div>

        <ContractWarningBanner />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Users} label="Identities" value={stats.totalIdentities} iconClassName="text-cyan-400" />
          <StatCard icon={Hammer} label="NFT Assets" value={stats.totalAssets} iconClassName="text-violet-400" />
          <StatCard icon={Shield} label="Audit Events" value={stats.totalAuditEvents} iconClassName="text-emerald-400" />
          <StatCard icon={Lock} label="Role Assignments" value={stats.totalRoleAssignments} iconClassName="text-amber-400" />
        </div>

        {/* Quick actions */}
        <div className="grid gap-4 sm:grid-cols-3">
          {ADMIN_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group rounded-xl border bg-slate-900/60 p-5 backdrop-blur-sm transition hover:shadow-lg ${action.border}`}
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${action.border} bg-slate-800`}>
                    <Icon className={`h-5 w-5 ${action.iconClass}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:text-slate-300" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-white">{action.label}</h3>
                <p className="mt-1 text-xs text-slate-500">{action.desc}</p>
              </Link>
            );
          })}
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4 text-xs text-slate-400">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p>
            All administrative actions are submitted as blockchain transactions and confirmed by your
            wallet. Smart contracts enforce role-based authorization — the UI is for convenience
            only. Unauthorized contract calls will be rejected regardless of UI state.
          </p>
        </div>

        {/* Recent audit events */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Audit Events</h2>
            <Link href="/audit" className="text-xs text-cyan-400 hover:underline">
              View all →
            </Link>
          </div>
          <AuditTable events={events.slice(0, 6)} compact />
        </div>
      </div>
    </AppShell>
  );
}
