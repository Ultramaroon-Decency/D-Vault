"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyableAddressProps {
  address: string;
  truncate?: boolean;
  className?: string;
}

export function CopyableAddress({ address, truncate = true, className }: CopyableAddressProps) {
  const [copied, setCopied] = useState(false);

  const display = truncate
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title={address}
      className={cn(
        "group inline-flex items-center gap-1.5 font-mono text-xs text-slate-300 transition hover:text-white",
        className
      )}
    >
      <span>{display}</span>
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3 text-slate-500 transition group-hover:text-slate-300" />
      )}
    </button>
  );
}
