"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Hammer } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AssetMintForm } from "@/components/nft/AssetMintForm";
import { useDemoAuth } from "@/lib/web3/demoAuth";
import { useAllAssets } from "@/hooks/web3/useUserAssets";
import { NFTCard } from "@/components/nft/NFTCard";

export default function AdminMintPage() {
  const router = useRouter();
  const { address, role, isSignedIn } = useDemoAuth();
  const { assets } = useAllAssets();

  useEffect(() => {
    if (!isSignedIn) router.replace("/");
    else if (role !== "ADMIN" && role !== "MANAGER") router.replace("/dashboard");
  }, [isSignedIn, role, router]);

  if (!isSignedIn || !address) return null;
  if (role !== "ADMIN" && role !== "MANAGER") return null;

  // Show the 3 most recently minted assets
  const recent = [...assets].slice(-3).reverse();

  return (
    <AppShell role={role}>
      <div className="animate-slide-up space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300">
            <ArrowLeft className="h-3.5 w-3.5" />
            Admin
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-xs text-slate-400">Mint Asset</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
            <Hammer className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Mint NFT Asset</h1>
            <p className="text-sm text-slate-400">
              Issue ERC-721 tokens directly linked to a recipient's DID
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Form */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-3">
            <AssetMintForm actorAddress={address} />
          </div>

          {/* Info panel */}
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
              <p className="font-semibold text-slate-300">How Minting Works</p>
              <ol className="mt-3 space-y-2 text-slate-500">
                <li className="flex gap-2"><span className="text-cyan-400">1.</span> Fill in asset details and select recipient</li>
                <li className="flex gap-2"><span className="text-cyan-400">2.</span> (Production) Metadata uploaded to IPFS</li>
                <li className="flex gap-2"><span className="text-cyan-400">3.</span> Wallet signs mint transaction</li>
                <li className="flex gap-2"><span className="text-cyan-400">4.</span> Smart contract mints ERC-721 token to recipient address</li>
                <li className="flex gap-2"><span className="text-cyan-400">5.</span> Token linked to recipient's DID in registry</li>
                <li className="flex gap-2"><span className="text-cyan-400">6.</span> Audit event recorded on-chain</li>
              </ol>
            </div>

            {recent.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-400">Recently Minted</p>
                <div className="space-y-3">
                  {recent.map((asset) => (
                    <NFTCard key={asset.tokenId} asset={asset} href={`/assets/${asset.tokenId}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
