"use client";

import { useMemo } from "react";
import type { Identity, DIDDocument } from "@/types";
import { mockStore } from "@/mock/store";
import { MOCK_MODE } from "@/config/app";

/**
 * Fetches the DID identity and document for a given address.
 * In real mode: reads from DID Registry contract + optional backend resolver.
 */
export function useUserIdentity(address: `0x${string}` | null | undefined): {
  identity: Identity | null;
  didDocument: DIDDocument | null;
  isLoading: boolean;
  error: string | null;
} {
  const identity = useMemo<Identity | null>(() => {
    if (!address) return null;
    if (MOCK_MODE) return mockStore.getIdentity(address);
    // TODO: read from DID Registry contract
    return null;
  }, [address]);

  const didDocument = useMemo<DIDDocument | null>(() => {
    if (!address) return null;
    if (MOCK_MODE) return mockStore.getDIDDocument(address);
    // TODO: resolve from DID resolver API
    return null;
  }, [address]);

  return { identity, didDocument, isLoading: false, error: null };
}
