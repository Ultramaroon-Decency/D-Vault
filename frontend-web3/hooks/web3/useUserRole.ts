"use client";

import { useMemo } from "react";
import type { Role } from "@/types";
import { mockStore } from "@/mock/store";
import { MOCK_MODE } from "@/config/app";

/**
 * Read the on-chain role for a given address.
 * In real mode: calls rbacContract.roleOf(address) via wagmi.
 */
export function useUserRole(address: `0x${string}` | null | undefined): {
  role: Role;
  isLoading: boolean;
} {
  const role = useMemo<Role>(() => {
    if (!address) return "NONE";
    if (MOCK_MODE) return mockStore.getRole(address);
    // TODO: useReadContract({ address: CONTRACT_ADDRESSES.rbac, abi: RBAC_ABI, functionName: "roleOf", args: [address] })
    return "NONE";
  }, [address]);

  return { role, isLoading: false };
}
