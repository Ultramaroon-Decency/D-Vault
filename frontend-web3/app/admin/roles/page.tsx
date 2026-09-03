"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import type { Role } from "@/types";
import { AppShell } from "@/components/layout/AppShell";
import { RoleAssignmentForm } from "@/components/roles/RoleAssignmentForm";
import { useDemoAuth } from "@/lib/web3/demoAuth";
import { useAllIdentities } from "@/hooks/web3/useAuditEvents";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { CopyableAddress } from "@/components/ui/CopyableAddress";
import { VerificationBadge } from "@/components/ui/VerificationBadge";

export default function AdminRolesPage() {
  const router = useRouter();
  const { address, role, isSignedIn } = useDemoAuth();
  const { identities } = useAllIdentities();

  useEffect(() => {
    if (!isSignedIn) router.replace("/");
    else if (role !== "ADMIN") router.replace("/dashboard");
  }, [isSignedIn, role, router]);

  if (!isSignedIn || role !== "ADMIN" || !address) return null;

  return (
    <AppShell role={role}>
      <div className="animate-slide-up space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Admin
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-xs text-slate-400">Role Management</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
            <Lock className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Role Management</h1>
            <p className="text-sm text-slate-400">Assign RBAC roles enforced by smart contracts</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Form */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-3">
            <h2 className="mb-4 text-sm font-semibold text-white">Assign Role</h2>
            <RoleAssignmentForm actorAddress={address} />
          </div>

          {/* Current identities */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold text-white">
              Registered Identities ({identities.length})
            </h2>
            <div className="space-y-2">
              {identities.map((id) => (
                <div
                  key={id.address}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                >
                  <div className="min-w-0">
                    <CopyableAddress address={id.address} />
                    <p className="mt-0.5 truncate font-mono text-[10px] text-slate-600">
                      {id.did}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <RoleBadge role={id.role} size="sm" />
                    <VerificationBadge verified={id.verified} className="text-[10px]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RBAC Matrix */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">RBAC Permission Matrix</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="pb-3 text-left font-semibold text-slate-500">Permission</th>
                  {(["ADMIN", "MANAGER", "AUDITOR", "USER"] as Role[]).map((r) => (
                    <th key={r} className="pb-3 text-center">
                      <RoleBadge role={r} size="sm" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {[
                  ["View Dashboard", true, true, true, true],
                  ["View Identity", true, true, true, true],
                  ["View Assets", true, true, true, true],
                  ["View Audit Trail", true, true, true, false],
                  ["View All Identities", true, false, true, false],
                  ["View All Assets", true, true, true, false],
                  ["Assign Role", true, false, false, false],
                  ["Mint Asset", true, true, false, false],
                  ["Allocate Asset", true, true, false, false],
                  ["Transfer Asset", true, false, false, false],
                  ["Manage Users", true, false, false, false],
                  ["Register Identity", true, false, false, false],
                ].map(([label, ...perms]) => (
                  <tr key={label as string} className="hover:bg-slate-800/30">
                    <td className="py-2.5 pr-4 text-slate-400">{label}</td>
                    {perms.map((has, i) => (
                      <td key={i} className="py-2.5 text-center">
                        {has ? (
                          <span className="text-emerald-400">✓</span>
                        ) : (
                          <span className="text-slate-700">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
