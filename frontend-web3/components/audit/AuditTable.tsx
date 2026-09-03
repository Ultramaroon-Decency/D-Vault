"use client";

import { Fragment, useState } from "react";
import type { AuditEvent, AuditEventType } from "@/types";
import { ExplorerLink } from "@/components/ui/ExplorerLink";
import { CopyableAddress } from "@/components/ui/CopyableAddress";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { cn } from "@/lib/utils";

const EVENT_STYLES: Record<AuditEventType, { label: string; dot: string; text: string; bg: string }> = {
  IDENTITY_CREATED:  { label: "Identity Created",   dot: "bg-sky-400",    text: "text-sky-400",    bg: "bg-sky-400/10" },
  ROLE_ASSIGNED:     { label: "Role Assigned",       dot: "bg-amber-400",  text: "text-amber-400",  bg: "bg-amber-400/10" },
  ROLE_REVOKED:      { label: "Role Revoked",        dot: "bg-red-400",    text: "text-red-400",    bg: "bg-red-400/10" },
  ASSET_MINTED:      { label: "Asset Minted",        dot: "bg-emerald-400",text: "text-emerald-400",bg: "bg-emerald-400/10" },
  ASSET_ALLOCATED:   { label: "Asset Allocated",     dot: "bg-violet-400", text: "text-violet-400", bg: "bg-violet-400/10" },
  ASSET_TRANSFERRED: { label: "Asset Transferred",   dot: "bg-blue-400",   text: "text-blue-400",   bg: "bg-blue-400/10" },
  PERMISSION_UPDATED:{ label: "Permission Updated",  dot: "bg-orange-400", text: "text-orange-400", bg: "bg-orange-400/10" },
  CREDENTIAL_ISSUED: { label: "Credential Issued",   dot: "bg-pink-400",   text: "text-pink-400",   bg: "bg-pink-400/10" },
};

export const AUDIT_EVENT_TYPES: AuditEventType[] = [
  "IDENTITY_CREATED", "ROLE_ASSIGNED", "ROLE_REVOKED",
  "ASSET_MINTED", "ASSET_ALLOCATED", "ASSET_TRANSFERRED",
  "PERMISSION_UPDATED", "CREDENTIAL_ISSUED",
];

interface AuditTableProps {
  events: AuditEvent[];
  compact?: boolean;
}

export function AuditTable({ events, compact = false }: AuditTableProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (events.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        No audit events found.
      </div>
    );
  }

  const colSpan = compact ? 4 : 6;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80">
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500">Event</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500">Actor</th>
              {!compact && <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500">Target</th>}
              {!compact && <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500">Token</th>}
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500">Timestamp</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-500">Tx Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {events.map((event) => {
              const style = EVENT_STYLES[event.type];
              const isExpanded = expanded === event.id;

              return (
                <Fragment key={event.id}>
                  <tr
                    onClick={() => setExpanded(isExpanded ? null : event.id)}
                    className="cursor-pointer bg-slate-900/40 transition hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5", style.bg)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                        <span className={style.text}>{style.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <CopyableAddress address={event.actor} />
                        <RoleBadge role={event.actorRole} size="sm" />
                      </div>
                    </td>
                    {!compact && (
                      <td className="px-4 py-3">
                        <CopyableAddress address={event.target} />
                      </td>
                    )}
                    {!compact && (
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {event.tokenId ? `#${event.tokenId}` : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(event.timestamp).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ExplorerLink type="tx" value={event.txHash} />
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-slate-950/60">
                      <td colSpan={colSpan} className="px-4 py-3">
                        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                          <p className="text-slate-300">{event.detail}</p>
                          <div className="mt-2 flex flex-wrap gap-4 text-slate-500">
                            <span>Block #{event.block.toLocaleString()}</span>
                            <ExplorerLink type="tx" value={event.txHash} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
