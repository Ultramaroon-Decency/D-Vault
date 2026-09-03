"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MOCK_MODE, MOCK_PERSONAS } from "@/lib/web3/demoAuth";
import { useDemoAuth } from "@/lib/web3/demoAuth";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { CopyableAddress } from "@/components/ui/CopyableAddress";
import { LogOut, Zap } from "lucide-react";

export function WalletConnectButton() {
  const { address, role, connectMock, disconnect, isSignedIn } = useDemoAuth();

  if (!MOCK_MODE) {
    return <ConnectButton showBalance={false} />;
  }

  if (isSignedIn && address) {
    return (
      <div className="flex items-center gap-2">
        <RoleBadge role={role} size="sm" />
        <CopyableAddress address={address} />
        <button
          onClick={disconnect}
          title="Disconnect"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-400 transition hover:border-red-500/50 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-slate-500 sm:inline">Demo as:</span>
      {MOCK_PERSONAS.map((p) => (
        <button
          key={p.address}
          onClick={() => connectMock(p.address)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-300"
        >
          <Zap className="h-3 w-3" />
          {p.label}
        </button>
      ))}
    </div>
  );
}
