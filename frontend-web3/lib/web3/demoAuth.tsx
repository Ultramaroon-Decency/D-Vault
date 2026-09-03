"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "@/types";
import { mockStore } from "@/mock/store";
import { MOCK_MODE } from "@/config/app";
import { MOCK_PERSONAS } from "@/mock/data";

interface DemoAuthState {
  address: `0x${string}` | null;
  role: Role;
  isSignedIn: boolean;
  connectMock: (address: `0x${string}`) => void;
  disconnect: () => void;
}

const DemoAuthContext = createContext<DemoAuthState | null>(null);

/** Provides mock wallet state when MOCK_MODE = true */
export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);

  const connectMock = useCallback((addr: `0x${string}`) => setAddress(addr), []);
  const disconnect = useCallback(() => setAddress(null), []);

  const role = useMemo<Role>(() => {
    if (!address) return "NONE";
    return mockStore.getRole(address);
  }, [address]);

  const value: DemoAuthState = {
    address,
    role,
    isSignedIn: Boolean(address),
    connectMock,
    disconnect,
  };

  return <DemoAuthContext.Provider value={value}>{children}</DemoAuthContext.Provider>;
}

export function useDemoAuth(): DemoAuthState {
  const ctx = useContext(DemoAuthContext);
  if (!ctx) throw new Error("useDemoAuth must be inside DemoAuthProvider");
  return ctx;
}

export { MOCK_PERSONAS, MOCK_MODE };
