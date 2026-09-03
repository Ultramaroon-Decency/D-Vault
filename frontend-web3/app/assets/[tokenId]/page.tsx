"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Coins, ArrowLeft, Hash, Calendar, User,
  FileText, Globe, Tag,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { OwnershipTimeline } from "@/components/nft/OwnershipTimeline";
import { CopyableAddress } from "@/components/ui/CopyableAddress";
import { ExplorerLink } from "@/components/ui/ExplorerLink";
import { LoadingState, EmptyState } from "@/components/ui/States";
import { useDemoAuth } from "@/lib/web3/demoAuth";
import { useAsset } from "@/hooks/web3/useUserAssets";
import { MOCK_MODE } from "@/config/app";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4">
      <dt className="w-36 shrink-0 text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-xs text-slate-300">{children}</dd>
    </div>
  );
}

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tokenId = params.tokenId as string;
  const { role, isSignedIn } = useDemoAuth();
  const { asset, isLoading } = useAsset(tokenId);

  useEffect(() => {
    if (!isSignedIn) router.replace("/");
  }, [isSignedIn, router]);

  if (!isSignedIn) return null;

  if (isLoading)
    return (
      <AppShell role={role}>
        <LoadingState message="Loading asset…" />
      </AppShell>
    );

  if (!asset)
    return (
      <AppShell role={role}>
        <EmptyState
          icon={Coins}
          title="Asset not found"
          description={`Token #${tokenId} does not exist or has not been indexed yet.`}
          action={
            <Link href="/assets" className="text-sm text-cyan-400 hover:underline">
              ← Back to assets
            </Link>
          }
        />
      </AppShell>
    );

  return (
    <AppShell role={role}>
      <div className="animate-slide-up space-y-6">
        {/* Back */}
        <Link
          href="/assets"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to assets
        </Link>

        {/* ── Main grid ── */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left: Token image + attributes */}
          <div className="space-y-4 lg:col-span-2">
            {/* Visual */}
            <div className="flex h-56 items-center justify-center rounded-xl border border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-slate-700 bg-slate-800 font-mono text-3xl font-bold text-cyan-400">
                  #{asset.tokenId}
                </div>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs text-emerald-400">
                  ERC-721
                </span>
              </div>
            </div>

            {/* Attributes */}
            {asset.attributes.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-300">Attributes</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {asset.attributes.map((attr, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-center"
                    >
                      <p className="text-[10px] text-slate-500">{attr.trait_type}</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-200">{attr.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="space-y-4 lg:col-span-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h1 className="text-xl font-bold text-white">{asset.name}</h1>
              <p className="mt-2 text-sm text-slate-400">{asset.description}</p>

              {MOCK_MODE && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[10px] text-amber-400">
                  Demo / Mock Data — not real on-chain verification
                </div>
              )}

              <dl className="mt-4 divide-y divide-slate-800/60">
                <InfoRow label="Token ID">
                  <span className="font-mono text-cyan-400">#{asset.tokenId}</span>
                </InfoRow>
                <InfoRow label="Current Owner">
                  <CopyableAddress address={asset.ownerAddress} truncate={false} />
                </InfoRow>
                <InfoRow label="Owner DID">
                  <span className="break-all font-mono text-[10px] text-slate-400">{asset.ownerDid}</span>
                </InfoRow>
                <InfoRow label="Minted By">
                  <CopyableAddress address={asset.mintedBy} />
                </InfoRow>
                <InfoRow label="Contract">
                  <ExplorerLink type="address" value={asset.contractAddress} />
                </InfoRow>
                <InfoRow label="Network">
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-slate-500" />
                    {asset.chainId === 11155111 ? "Sepolia Testnet" : `Chain ${asset.chainId}`}
                  </span>
                </InfoRow>
                <InfoRow label="Mint Block">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Hash className="h-3.5 w-3.5 text-slate-500" />
                    {asset.mintedAtBlock.toLocaleString()}
                  </span>
                </InfoRow>
                <InfoRow label="Mint Date">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    {new Date(asset.mintedAtTimestamp).toLocaleString()}
                  </span>
                </InfoRow>
                <InfoRow label="Metadata URI">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    <span className="break-all font-mono text-[10px] text-slate-400">
                      {asset.metadataUri}
                    </span>
                  </span>
                </InfoRow>
                <InfoRow label="Mint Tx">
                  <ExplorerLink type="tx" value={asset.mintTx} />
                </InfoRow>
              </dl>
            </div>
          </div>
        </div>

        {/* ── Ownership Timeline ── */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-5 flex items-center gap-2">
            <User className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Ownership History</h2>
            <span className="ml-auto text-xs text-slate-500">
              {asset.provenance.length} event(s)
            </span>
          </div>
          <OwnershipTimeline provenance={asset.provenance} />
        </div>
      </div>
    </AppShell>
  );
}
