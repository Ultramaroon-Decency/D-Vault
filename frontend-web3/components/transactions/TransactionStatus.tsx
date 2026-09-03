"use client";

import { CheckCircle2, Clock, Loader2, AlertCircle, XCircle, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TxState } from "@/types";
import { ExplorerLink } from "@/components/ui/ExplorerLink";

interface TransactionStatusProps {
  state: TxState;
  className?: string;
}

const STATUS_CONFIG = {
  idle: null,
  confirm: {
    icon: Wallet,
    iconClass: "text-cyan-400 animate-pulse",
    label: "Waiting for wallet confirmation…",
    description: "Please approve the transaction in your wallet.",
    containerClass: "border-cyan-500/30 bg-cyan-500/5",
  },
  pending: {
    icon: Loader2,
    iconClass: "text-blue-400 animate-spin",
    label: "Transaction pending…",
    description: "Waiting for blockchain confirmation. This may take a moment.",
    containerClass: "border-blue-500/30 bg-blue-500/5",
  },
  confirmed: {
    icon: CheckCircle2,
    iconClass: "text-emerald-400",
    label: "Transaction confirmed",
    description: "The operation was successfully recorded on-chain.",
    containerClass: "border-emerald-500/30 bg-emerald-500/5",
  },
  failed: {
    icon: XCircle,
    iconClass: "text-red-400",
    label: "Transaction failed",
    description: "The transaction was reverted by the smart contract.",
    containerClass: "border-red-500/30 bg-red-500/5",
  },
  rejected: {
    icon: AlertCircle,
    iconClass: "text-amber-400",
    label: "Transaction rejected",
    description: "You cancelled the transaction in your wallet.",
    containerClass: "border-amber-500/30 bg-amber-500/5",
  },
} as const;

export function TransactionStatus({ state, className }: TransactionStatusProps) {
  if (state.status === "idle") return null;
  const config = STATUS_CONFIG[state.status];
  if (!config) return null;

  const { icon: Icon, iconClass, label, description, containerClass } = config;

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-4", containerClass, className)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconClass)} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {state.error ?? description}
        </p>
        {state.txHash && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">Tx:</span>
            <ExplorerLink type="tx" value={state.txHash} />
          </div>
        )}
      </div>
    </div>
  );
}
