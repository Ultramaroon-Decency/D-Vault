import type { NFTAsset } from "@/types";
import { CopyableAddress } from "@/components/ui/CopyableAddress";
import { ExplorerLink } from "@/components/ui/ExplorerLink";
import { Hash, Calendar, User, Link2 } from "lucide-react";

interface NFTCardProps {
  asset: NFTAsset;
  onClick?: () => void;
  href?: string;
}

export function NFTCard({ asset, onClick, href }: NFTCardProps) {
  const Wrapper = href ? "a" : "div";

  return (
    <Wrapper
      href={href}
      onClick={onClick}
      className={[
        "group flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm transition",
        href || onClick ? "cursor-pointer hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5" : "",
      ].join(" ")}
    >
      {/* Image / Token Badge */}
      <div className="relative flex h-40 items-center justify-center border-b border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-700 bg-slate-800 font-mono text-2xl font-bold text-cyan-400">
          #{asset.tokenId}
        </div>
        <div className="absolute right-3 top-3">
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            ERC-721
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white transition">
            {asset.name}
          </h3>
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{asset.description}</p>
        </div>

        <div className="mt-auto space-y-1.5 border-t border-slate-800 pt-3">
          <div className="flex items-center gap-2 text-xs">
            <User className="h-3 w-3 shrink-0 text-slate-600" />
            <span className="text-slate-500">Owner</span>
            <CopyableAddress address={asset.ownerAddress} className="ml-auto" />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Hash className="h-3 w-3 shrink-0 text-slate-600" />
            <span className="text-slate-500">Minted</span>
            <span className="ml-auto font-mono text-slate-400">
              Block #{asset.mintedAtBlock.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Calendar className="h-3 w-3 shrink-0 text-slate-600" />
            <span className="text-slate-500">Date</span>
            <span className="ml-auto text-slate-400">
              {new Date(asset.mintedAtTimestamp).toLocaleDateString()}
            </span>
          </div>
        </div>

        {(href || onClick) && (
          <span className="mt-1 flex items-center gap-1 text-xs font-medium text-cyan-400 opacity-0 transition group-hover:opacity-100">
            <Link2 className="h-3 w-3" />
            View details
          </span>
        )}
      </div>
    </Wrapper>
  );
}
