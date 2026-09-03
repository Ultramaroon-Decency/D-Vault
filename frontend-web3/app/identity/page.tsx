"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, Coins, Key } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { IdentityCard } from "@/components/identity/IdentityCard";
import { NFTCard } from "@/components/nft/NFTCard";
import { EmptyState, LoadingState } from "@/components/ui/States";
import { useDemoAuth } from "@/lib/web3/demoAuth";
import { useUserIdentity } from "@/hooks/web3/useUserIdentity";
import { useUserAssets } from "@/hooks/web3/useUserAssets";

export default function IdentityPage() {
  const router = useRouter();
  const { address, role, isSignedIn } = useDemoAuth();
  const { identity, didDocument, isLoading } = useUserIdentity(address);
  const { assets } = useUserAssets(address);

  useEffect(() => {
    if (!isSignedIn) router.replace("/");
  }, [isSignedIn, router]);

  if (!isSignedIn) return null;
  if (isLoading) return <AppShell role={role}><LoadingState message="Resolving identity…" /></AppShell>;

  return (
    <AppShell role={role}>
      <div className="animate-slide-up space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">My Identity</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Your decentralized identifier and cryptographically-linked digital assets.
          </p>
        </div>

        {/* Identity card */}
        {identity ? (
          <IdentityCard identity={identity} didDocument={didDocument} />
        ) : (
          <EmptyState
            icon={Key}
            title="No identity registered"
            description="Your wallet address is not yet registered in the DID Registry. Contact an Admin to get your identity created on-chain."
          />
        )}

        {/* DID Document raw section */}
        {didDocument && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Key className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-white">Verification Methods</h2>
            </div>
            <div className="space-y-3">
              {didDocument.verificationMethod.map((vm, i) => (
                <div key={i} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
                  <p className="font-mono text-cyan-400">{vm.id}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-slate-400">
                    <div>
                      <span className="text-slate-600">Type: </span>
                      {vm.type}
                    </div>
                    {vm.blockchainAccountId && (
                      <div className="col-span-2">
                        <span className="text-slate-600">Account: </span>
                        <span className="font-mono">{vm.blockchainAccountId}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Owned Assets */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Coins className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Linked Assets</h2>
            <span className="ml-auto text-xs text-slate-500">{assets.length} NFT(s)</span>
          </div>
          {assets.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="No assets linked"
              description="NFT assets assigned to your DID will appear here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((asset) => (
                <NFTCard key={asset.tokenId} asset={asset} href={`/assets/${asset.tokenId}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
