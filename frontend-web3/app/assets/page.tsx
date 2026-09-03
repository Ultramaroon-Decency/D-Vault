"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Search, Filter } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { NFTCard } from "@/components/nft/NFTCard";
import { EmptyState } from "@/components/ui/States";
import { PermissionGate } from "@/components/ui/PermissionGate";
import { useDemoAuth } from "@/lib/web3/demoAuth";
import { useUserAssets, useAllAssets } from "@/hooks/web3/useUserAssets";

export default function AssetsPage() {
  const router = useRouter();
  const { address, role, isSignedIn } = useDemoAuth();
  const { assets: myAssets } = useUserAssets(address);
  const { assets: allAssets } = useAllAssets();
  const [search, setSearch] = useState("");
  const [viewAll, setViewAll] = useState(false);

  useEffect(() => {
    if (!isSignedIn) router.replace("/");
  }, [isSignedIn, router]);

  if (!isSignedIn) return null;

  const canViewAll = role === "ADMIN" || role === "MANAGER" || role === "AUDITOR";
  const displayAssets = (canViewAll && viewAll ? allAssets : myAssets).filter(
    (a) =>
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.tokenId.includes(search) ||
      a.ownerAddress.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell role={role}>
      <div className="animate-slide-up space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-violet-400" />
              <h1 className="text-2xl font-bold text-white">
                {canViewAll && viewAll ? "All Assets" : "My Assets"}
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              ERC-721 NFTs with verifiable ownership and provenance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle view for privileged roles */}
            <PermissionGate role={role} permission="VIEW_ALL_ASSETS">
              <div className="flex rounded-lg border border-slate-700 bg-slate-800/60 p-0.5">
                <button
                  onClick={() => setViewAll(false)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${!viewAll ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  My Assets
                </button>
                <button
                  onClick={() => setViewAll(true)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${viewAll ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  All Assets
                </button>
              </div>
            </PermissionGate>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, token ID, address…"
                className="w-64 rounded-lg border border-slate-700 bg-slate-800/60 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Gallery */}
        {displayAssets.length === 0 ? (
          <EmptyState
            icon={Coins}
            title={search ? "No assets match your search" : "No assets found"}
            description={
              search
                ? "Try a different search term."
                : "Assets assigned to your identity will appear here."
            }
          />
        ) : (
          <>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5" />
              {displayAssets.length} asset(s) shown
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayAssets.map((asset) => (
                <NFTCard key={asset.tokenId} asset={asset} href={`/assets/${asset.tokenId}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
