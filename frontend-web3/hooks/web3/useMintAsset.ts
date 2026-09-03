"use client";

import { useCallback, useState } from "react";
import type { TxState, NFTAsset } from "@/types";
import { mockStore } from "@/mock/store";
import { MOCK_MODE } from "@/config/app";

export interface MintParams {
  actor: `0x${string}`;
  recipientAddress: `0x${string}`;
  recipientDid: string;
  name: string;
  description: string;
  metadataUri?: string;
}

/**
 * Mints an NFT asset.
 * In real mode: uploads metadata to IPFS/backend, then calls nftContract.mint(to, uri).
 * Smart contract enforces who can mint (Admin / Manager).
 */
export function useMintAsset() {
  const [txState, setTxState] = useState<TxState>({ status: "idle" });
  const [mintedAsset, setMintedAsset] = useState<NFTAsset | null>(null);

  const mint = useCallback(async (params: MintParams): Promise<void> => {
    setTxState({ status: "confirm" });
    try {
      await new Promise((r) => setTimeout(r, 600));
      setTxState({ status: "pending" });
      await new Promise((r) => setTimeout(r, 1500));

      if (MOCK_MODE) {
        const asset = mockStore.mintAsset(
          params.actor,
          params.recipientDid,
          params.recipientAddress,
          params.name,
          params.description,
          params.metadataUri ?? `ipfs://pending-${Date.now()}`
        );
        setMintedAsset(asset);
        setTxState({ status: "confirmed", txHash: asset.mintTx });
      } else {
        // TODO: const uri = await uploadMetadata(params);
        // const hash = await writeContractAsync({ ..., functionName: "mint", args: [params.recipientAddress, uri] });
        // setTxState({ status: "confirmed", txHash: hash });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      const isRejected = msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("denied");
      setTxState({ status: isRejected ? "rejected" : "failed", error: msg });
    }
  }, []);

  const reset = useCallback(() => {
    setTxState({ status: "idle" });
    setMintedAsset(null);
  }, []);

  return { mint, txState, mintedAsset, reset };
}

export interface TransferParams {
  actor: `0x${string}`;
  tokenId: string;
  toAddress: `0x${string}`;
  toDid: string;
}

export function useTransferAsset() {
  const [txState, setTxState] = useState<TxState>({ status: "idle" });

  const transfer = useCallback(async (params: TransferParams): Promise<void> => {
    setTxState({ status: "confirm" });
    try {
      await new Promise((r) => setTimeout(r, 600));
      setTxState({ status: "pending" });
      await new Promise((r) => setTimeout(r, 1200));

      if (MOCK_MODE) {
        mockStore.transferAsset(params.actor, params.tokenId, params.toAddress, params.toDid);
        setTxState({ status: "confirmed" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transaction failed";
      setTxState({ status: "failed", error: msg });
    }
  }, []);

  const reset = useCallback(() => setTxState({ status: "idle" }), []);
  return { transfer, txState, reset };
}
