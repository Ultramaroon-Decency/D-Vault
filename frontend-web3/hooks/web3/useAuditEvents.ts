"use client";

import { useMemo } from "react";
import type { AuditEvent, AuditFilters } from "@/types";
import { mockStore } from "@/mock/store";
import { MOCK_MODE } from "@/config/app";

export function useAuditEvents(filters?: AuditFilters): {
  events: AuditEvent[];
  isLoading: boolean;
} {
  const events = useMemo<AuditEvent[]>(() => {
    if (!MOCK_MODE) return [];
    let all = mockStore.listAuditEvents();
    if (filters?.eventType && filters.eventType !== "ALL") {
      all = all.filter((e) => e.type === filters.eventType);
    }
    if (filters?.actor) {
      const q = filters.actor.toLowerCase();
      all = all.filter(
        (e) => e.actor.toLowerCase().includes(q) || e.target.toLowerCase().includes(q)
      );
    }
    if (filters?.tokenId) {
      all = all.filter((e) => e.tokenId === filters.tokenId);
    }
    if (filters?.dateFrom) {
      all = all.filter((e) => e.timestamp >= filters.dateFrom!.getTime());
    }
    if (filters?.dateTo) {
      all = all.filter((e) => e.timestamp <= filters.dateTo!.getTime());
    }
    return all;
  }, [filters]);

  return { events, isLoading: false };
}

export function usePlatformStats() {
  const stats = useMemo(() => {
    if (MOCK_MODE) return mockStore.getStats();
    return { totalIdentities: 0, totalAssets: 0, totalAuditEvents: 0, totalRoleAssignments: 0 };
  }, []);
  return stats;
}

export function useAllIdentities() {
  const identities = useMemo(() => {
    if (MOCK_MODE) return mockStore.listIdentities();
    return [];
  }, []);
  return { identities, isLoading: false };
}
