"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuditEvent, AuditFilters, Identity, Role } from "@/types";
import { mockStore } from "@/mock/store";
import { MOCK_MODE, API_URL } from "@/config/app";
import { getAuthToken } from "@/lib/web3/authStorage";

interface ApiAuditEvent {
  id: string;
  eventType: string;
  actorAddress: string | null;
  tokenId: string | null;
  txHash: string | null;
  blockNumber: string | null;
  timestamp: string | null;
  dataJson: Record<string, unknown> | null;
}

function mapApiEvent(e: ApiAuditEvent): AuditEvent {
  const data = e.dataJson ?? {};
  return {
    id: e.id,
    type: e.eventType,
    actor: e.actorAddress ?? "unknown",
    target: (data.account ?? data.to ?? data.owner ?? e.actorAddress ?? "") as string,
    tokenId: e.tokenId ?? undefined,
    txHash: e.txHash ?? "",
    blockNumber: e.blockNumber ? Number(e.blockNumber) : 0,
    timestamp: e.timestamp ? new Date(e.timestamp).getTime() : Date.now(),
    data,
  } as unknown as AuditEvent;
}

/**
 * Fetch audit events from the backend.
 * Real mode: calls GET /api/audit with optional query params.
 * The backend returns all indexed blockchain events from PostgreSQL.
 */
export function useAuditEvents(filters?: AuditFilters): {
  events: AuditEvent[];
  isLoading: boolean;
} {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (MOCK_MODE) {
      let all = mockStore.listAuditEvents();
      if (filters?.eventType && filters.eventType !== "ALL") {
        all = all.filter((e) => e.type === filters.eventType);
      }
      if (filters?.actor) {
        const q = filters.actor.toLowerCase();
        all = all.filter(
          (e) =>
            e.actor.toLowerCase().includes(q) || e.target.toLowerCase().includes(q)
        );
      }
      if (filters?.tokenId) all = all.filter((e) => e.tokenId === filters.tokenId);
      if (filters?.dateFrom) all = all.filter((e) => e.timestamp >= filters.dateFrom!.getTime());
      if (filters?.dateTo) all = all.filter((e) => e.timestamp <= filters.dateTo!.getTime());
      setEvents(all);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (filters?.eventType && filters.eventType !== "ALL")
        params.set("eventType", filters.eventType);
      if (filters?.actor) params.set("actor", filters.actor);
      if (filters?.tokenId) params.set("tokenId", filters.tokenId);

      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/audit?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const raw: ApiAuditEvent[] = json.events ?? json.data ?? json ?? [];
      let mapped = raw.map(mapApiEvent);

      // Apply client-side date filters (backend may not support them)
      if (filters?.dateFrom) mapped = mapped.filter((e) => e.timestamp >= filters.dateFrom!.getTime());
      if (filters?.dateTo) mapped = mapped.filter((e) => e.timestamp <= filters.dateTo!.getTime());

      setEvents(mapped);
    } catch {
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return { events, isLoading };
}

/**
 * Platform-wide statistics.
 * Real mode: calls GET /api/audit/stats.
 */
export function usePlatformStats() {
  const [stats, setStats] = useState({
    totalIdentities: 0,
    totalAssets: 0,
    totalAuditEvents: 0,
    totalRoleAssignments: 0,
  });

  useEffect(() => {
    if (MOCK_MODE) { setStats(mockStore.getStats()); return; }
    const token = getAuthToken();
    fetch(`${API_URL}/api/audit/stats`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json) => setStats(json))
      .catch(() => { });
  }, []);

  return stats;
}

export interface UserIdentity extends Identity {
  walletAddress: string;
}

/**
 * All registered identities (for admin view).
 * Real mode: calls GET /api/users.
 */
export function useAllIdentities(): {
  identities: UserIdentity[];
  isLoading: boolean;
} {
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (MOCK_MODE) {
      setIdentities(
        mockStore.listIdentities().map((i) => ({
          ...i,
          walletAddress: i.address,
        }))
      );
      return;
    }
    setIsLoading(true);
    const token = getAuthToken();
    fetch(`${API_URL}/api/users`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json) => {
        const rawList: Record<string, unknown>[] = Array.isArray(json?.users)
          ? json.users
          : Array.isArray(json)
            ? json
            : [];
        const mapped: UserIdentity[] = rawList.map((u) => {
          const rawAddr = (u.address ?? u.walletAddress ?? "0x0000000000000000000000000000000000000000") as string;
          const address = (rawAddr.startsWith("0x") ? rawAddr : `0x${rawAddr}`) as `0x${string}`;
          return {
            did: (u.did as string) || `did:ethr:${address}`,
            address,
            walletAddress: (u.walletAddress as string) || address,
            controller: (u.controller as `0x${string}`) || address,
            role: (u.role as Role) || "USER",
            verified: Boolean(u.verified),
            createdAtBlock: Number(u.createdAtBlock) || 0,
            createdAtTimestamp: u.createdAt ? new Date(u.createdAt as string).getTime() : Date.now(),
            createdAtTx: (u.createdAtTx as `0x${string}`) || ("0x" as `0x${string}`),
          };
        });
        setIdentities(mapped);
      })
      .catch(() => setIdentities([]))
      .finally(() => setIsLoading(false));
  }, []);

  return { identities, isLoading };
}
