"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Coins, ScrollText, ShieldCheck,
  Fingerprint, Hammer, Lock, Activity,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { RoleAssignmentForm } from "@/components/roles/RoleAssignmentForm";
import { AssetMintForm } from "@/components/nft/AssetMintForm";
import { AuditTable } from "@/components/audit/AuditTable";
import { EmptyState } from "@/components/ui/States";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { ContractWarningBanner } from "@/components/ui/DemoModeBanner";
import { useDemoAuth } from "@/lib/web3/demoAuth";
import { useUserIdentity } from "@/hooks/web3/useUserIdentity";
import { useUserAssets } from "@/hooks/web3/useUserAssets";
import { usePlatformStats, useAuditEvents } from "@/hooks/web3/useAuditEvents";
import { NFTCard } from "@/components/nft/NFTCard";

export default function DashboardPage() {
  const router = useRouter();
  const { address, role, isSignedIn } = useDemoAuth();
  const { identity } = useUserIdentity(address);
  const { assets } = useUserAssets(address);
  const stats = usePlatformStats();
  const { events } = useAuditEvents();

  useEffect(() => {
    if (!isSignedIn) router.replace("/");
  }, [isSignedIn, router]);

  if (!isSignedIn || !address) return null;

  return (
    <AppShell role={role}>
      <div className="animate-slide-up space-y-8">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">
              Panels below reflect your on-chain role and permissions.
            </p>
          </div>
          <RoleBadge role={role} />
        </div>

        {/* ── Stats ── */}
        <PermissionGate role={role} permission="VIEW_ALL_ASSETS">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={Users}
              label="Registered Identities"
              value={stats.totalIdentities}
              delta="On-chain identities"
              iconClassName="text-cyan-400"
            />
            <StatCard
              icon={Coins}
              label="Total NFT Assets"
              value={stats.totalAssets}
              delta="ERC-721 tokens minted"
              iconClassName="text-violet-400"
            />
            <StatCard
              icon={ScrollText}
              label="Audit Events"
              value={stats.totalAuditEvents}
              delta="Immutable records"
              iconClassName="text-emerald-400"
            />
            <StatCard
              icon={ShieldCheck}
              label="Role Assignments"
              value={stats.totalRoleAssignments}
              delta="RBAC operations"
              iconClassName="text-amber-400"
            />
          </div>
        </PermissionGate>

        {/* ── ADMIN view ── */}
        {role === "ADMIN" && (
          <>
            <ContractWarningBanner />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-white">Assign Role</h2>
                </div>
                <RoleAssignmentForm actorAddress={address} />
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Hammer className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">Mint NFT Asset</h2>
                </div>
                <AssetMintForm actorAddress={address} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-white">Recent Audit Events</h2>
              </div>
              <AuditTable events={events.slice(0, 8)} compact />
            </div>
          </>
        )}

        {/* ── MANAGER view ── */}
        {role === "MANAGER" && (
          <>
            <ContractWarningBanner />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Hammer className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">Mint NFT Asset</h2>
                </div>
                <AssetMintForm actorAddress={address} />
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-slate-400" />
                  <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
                </div>
                <AuditTable events={events.slice(0, 5)} compact />
              </div>
            </div>
          </>
        )}

        {/* ── AUDITOR view ── */}
        {role === "AUDITOR" && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-4 flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Full Audit Trail</h2>
              <span className="ml-auto text-xs text-slate-500">{events.length} events</span>
            </div>
            <AuditTable events={events} />
          </div>
        )}

        {/* ── USER view ── */}
        {role === "USER" && (
          <>
            {/* Identity summary */}
            {identity && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-cyan-400" />
                  <h2 className="text-sm font-semibold text-white">My Identity</h2>
                </div>
                <p className="font-mono text-xs text-slate-400 break-all">{identity.did}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>Block #{identity.createdAtBlock.toLocaleString()}</span>
                  <span>Verified: {identity.verified ? "✓ Yes" : "✗ No"}</span>
                </div>
              </div>
            )}

            {/* My Assets */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Coins className="h-4 w-4 text-violet-400" />
                <h2 className="text-sm font-semibold text-white">My Assets</h2>
                <span className="ml-auto text-xs text-slate-500">{assets.length} token(s)</span>
              </div>
              {assets.length === 0 ? (
                <EmptyState
                  icon={Coins}
                  title="No assets assigned"
                  description="An Admin or Manager must mint and assign an NFT to your DID before assets appear here."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {assets.map((asset) => (
                    <NFTCard
                      key={asset.tokenId}
                      asset={asset}
                      href={`/assets/${asset.tokenId}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── NONE role ── */}
        {role === "NONE" && (
          <EmptyState
            icon={ShieldCheck}
            title="No role assigned"
            description="This wallet address has no registered identity. An Admin needs to register your identity and assign a role before you can access platform features."
          />
        )}
      </div>
    </AppShell>
  );
}
