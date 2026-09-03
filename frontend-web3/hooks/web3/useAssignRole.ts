"use client";

import { useCallback, useState } from "react";
import type { TxState, Role } from "@/types";
import { mockStore } from "@/mock/store";
import { MOCK_MODE } from "@/config/app";

/**
 * Assigns a role to a target address.
 * In real mode: calls rbacContract.assignRole(target, role) via wagmi writeContract.
 * Smart contract enforces authorization — only Admins can assign.
 */
export function useAssignRole() {
  const [txState, setTxState] = useState<TxState>({ status: "idle" });

  const assign = useCallback(
    async (actor: `0x${string}`, target: `0x${string}`, role: Role): Promise<void> => {
      setTxState({ status: "confirm" });
      try {
        // Simulate wallet confirmation delay
        await new Promise((r) => setTimeout(r, 600));
        setTxState({ status: "pending" });
        await new Promise((r) => setTimeout(r, 1200));

        if (MOCK_MODE) {
          const evt = mockStore.assignRole(actor, target, role);
          setTxState({ status: "confirmed", txHash: evt.txHash });
        } else {
          // TODO: const { writeContractAsync } = useWriteContract();
          // const hash = await writeContractAsync({ address, abi: RBAC_ABI, functionName: "assignRole", args: [target, roleIndex] });
          // await waitForTransactionReceipt(config, { hash });
          // setTxState({ status: "confirmed", txHash: hash });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Transaction failed";
        const isRejected = msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("denied");
        setTxState({ status: isRejected ? "rejected" : "failed", error: msg });
      }
    },
    []
  );

  const reset = useCallback(() => setTxState({ status: "idle" }), []);

  return { assign, txState, reset };
}
