"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Search } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { CopyableAddress } from "@/components/ui/CopyableAddress";
import { ExplorerLink } from "@/components/ui/ExplorerLink";
import { useDemoAuth } from "@/lib/web3/demoAuth";
import { useAllIdentities } from "@/hooks/web3/useAuditEvents";

export default function AdminUsersPage() {
  const router = useRouter();
  const { role, isSignedIn } = useDemoAuth();
  const { identities } = useAllIdentities();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isSignedIn) router.replace("/");
    else if (role !== "ADMIN") router.replace("/dashboard");
  }, [isSignedIn, role, router]);

  if (!isSignedIn || role !== "ADMIN") return null;

  const filtered = identities.filter(
    (id) =>
      !search ||
      id.address.toLowerCase().includes(search.toLowerCase()) ||
      id.did.toLowerCase().includes(search.toLowerCase()) ||
      id.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell role={role}>
      <div className="animate-slide-up space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300">
            <ArrowLeft className="h-3.5 w-3.5" />
            Admin
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-xs text-slate-400">User Management</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
              <Users className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">User Management</h1>
              <p className="text-sm text-slate-400">
                {identities.length} registered identities
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search address, DID, role…"
              className="w-64 rounded-lg border border-slate-700 bg-slate-800/60 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500">
                  Identity / DID
                </th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500">
                  Registered Block
                </th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500">
                  Tx
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((identity) => (
                <tr
                  key={identity.address}
                  className="bg-slate-900/40 transition hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3">
                    <CopyableAddress address={identity.address} />
                    <p className="mt-0.5 truncate font-mono text-[10px] text-slate-600 max-w-xs">
                      {identity.did}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={identity.role} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <VerificationBadge verified={identity.verified} />
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    #{identity.createdAtBlock.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <ExplorerLink type="tx" value={identity.createdAtTx} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No identities match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
