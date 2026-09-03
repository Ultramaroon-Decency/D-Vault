"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollText, Search, Filter, Download } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AuditTable, AUDIT_EVENT_TYPES } from "@/components/audit/AuditTable";
import { useDemoAuth } from "@/lib/web3/demoAuth";
import { useAuditEvents } from "@/hooks/web3/useAuditEvents";
import type { AuditFilters, AuditEventType } from "@/types";

export default function AuditPage() {
  const router = useRouter();
  const { role, isSignedIn } = useDemoAuth();
  const [filters, setFilters] = useState<AuditFilters>({ eventType: "ALL" });
  const [actorSearch, setActorSearch] = useState("");
  const { events } = useAuditEvents({
    ...filters,
    actor: actorSearch || undefined,
  });

  useEffect(() => {
    if (!isSignedIn) router.replace("/");
  }, [isSignedIn, router]);

  if (!isSignedIn) return null;

  const handleExport = () => {
    const json = JSON.stringify(events, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell role={role}>
      <div className="animate-slide-up space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-emerald-400" />
              <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Immutable, tamper-proof record of all on-chain operations.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Event type */}
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={filters.eventType ?? "ALL"}
              onChange={(e) =>
                setFilters((f) => ({ ...f, eventType: e.target.value as AuditEventType | "ALL" }))
              }
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
            >
              <option value="ALL">All Events</option>
              {AUDIT_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Actor search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={actorSearch}
              onChange={(e) => setActorSearch(e.target.value)}
              placeholder="Search by address…"
              className="w-52 rounded-lg border border-slate-700 bg-slate-800/60 py-1.5 pl-9 pr-3 text-xs text-slate-300 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <span className="ml-auto text-xs text-slate-500">
            {events.length} events
          </span>
        </div>

        {/* Table */}
        <AuditTable events={events} />
      </div>
    </AppShell>
  );
}
