import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { getExplorerUrl } from "@/config/chains";
import { CONTRACT_CHAIN_ID } from "@/config/contracts";

interface ExplorerLinkProps {
  type: "tx" | "address" | "token";
  value: string;
  className?: string;
  chainId?: number;
  children?: React.ReactNode;
}

export function ExplorerLink({
  type,
  value,
  className,
  chainId = CONTRACT_CHAIN_ID,
  children,
}: ExplorerLinkProps) {
  const url = getExplorerUrl(chainId, type, value);
  const label = children ?? `${value.slice(0, 8)}…${value.slice(-6)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 font-mono text-xs text-cyan-400 transition hover:text-cyan-300 hover:underline",
        className
      )}
    >
      {label}
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}
