import type { ProvenanceEvent } from "@/types";
import { ExplorerLink } from "@/components/ui/ExplorerLink";
import { CopyableAddress } from "@/components/ui/CopyableAddress";
import { ArrowRight, Plus, Repeat2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_CONFIG = {
  MINTED: { icon: Plus, label: "Minted", color: "text-emerald-400", dotBg: "bg-emerald-400", lineBg: "bg-emerald-500/20" },
  TRANSFERRED: { icon: Repeat2, label: "Transferred", color: "text-blue-400", dotBg: "bg-blue-400", lineBg: "bg-blue-500/20" },
  ALLOCATED: { icon: Tag, label: "Allocated", color: "text-violet-400", dotBg: "bg-violet-400", lineBg: "bg-violet-500/20" },
};

interface OwnershipTimelineProps {
  provenance: ProvenanceEvent[];
}

export function OwnershipTimeline({ provenance }: OwnershipTimelineProps) {
  return (
    <div className="space-y-0">
      {provenance.map((event, i) => {
        const cfg = EVENT_CONFIG[event.type];
        const Icon = cfg.icon;
        const isLast = i === provenance.length - 1;

        return (
          <div key={i} className="relative flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800", cfg.lineBg)}>
                <Icon className={cn("h-4 w-4", cfg.color)} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-slate-800 my-1" />}
            </div>

            {/* Content */}
            <div className={cn("pb-6", isLast && "pb-0")}>
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-semibold", cfg.color)}>{cfg.label}</span>
                <span className="text-xs text-slate-500">
                  {new Date(event.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs">
                {event.from ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <CopyableAddress address={event.from} />
                    <ArrowRight className="h-3 w-3 text-slate-600" />
                    <CopyableAddress address={event.to} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-slate-500">To:</span>
                    <CopyableAddress address={event.to} />
                  </div>
                )}
                {event.toDid && (
                  <p className="mt-1 truncate font-mono text-[10px] text-slate-600">
                    DID: {event.toDid}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-2">
                  <span className="text-slate-500">Block #{event.block.toLocaleString()}</span>
                  <ExplorerLink type="tx" value={event.txHash} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
