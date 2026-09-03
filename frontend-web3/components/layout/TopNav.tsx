"use client";

import { Network } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { MOCK_MODE } from "@/config/app";

interface TopNavProps {
  title?: string;
  onMenuClick?: () => void;
}

export function TopNav({ title, onMenuClick }: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur-xl sm:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="mr-3 flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-400 transition hover:text-slate-200 lg:hidden"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {title && (
        <h1 className="mr-auto text-sm font-semibold text-slate-200 lg:hidden">{title}</h1>
      )}

      <div className="ml-auto flex items-center gap-3">
        {/* Network indicator */}
        <div className="hidden items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1.5 sm:flex">
          <Network className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-slate-300">
            {MOCK_MODE ? "Demo" : "Sepolia"}
          </span>
          <span className={cn("h-1.5 w-1.5 rounded-full", MOCK_MODE ? "bg-amber-400" : "bg-emerald-400")} />
        </div>

        <WalletConnectButton />
      </div>
    </header>
  );
}
