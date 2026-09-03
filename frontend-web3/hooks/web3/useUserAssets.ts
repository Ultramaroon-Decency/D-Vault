"use client";

import { useMemo } from "react";
import type { NFTAsset } from "@/types";
import { mockStore } from "@/mock/store";
import { MOCK_MODE } from "@/config/app";

export function useUserAssets(address: `0x${string}` | null | undefined): {
  assets: NFTAsset[];
  isLoading: boolean;
  error: string | null;
} {
  const assets = useMemo<NFTAsset[]>(() => {
    if (!address) return [];
    if (MOCK_MODE) return mockStore.listAssetsForOwner(address);
    // TODO: wagmi balanceOf + tokenURI reads
    return [];
  }, [address]);

  return { assets, isLoading: false, error: null };
}

export function useAllAssets(): {
  assets: NFTAsset[];
  isLoading: boolean;
} {
  const assets = useMemo<NFTAsset[]>(() => {
    if (MOCK_MODE) return mockStore.listAllAssets();
    return [];
  }, []);

  return { assets, isLoading: false };
}

export function useAsset(tokenId: string | null | undefined): {
  asset: NFTAsset | null;
  isLoading: boolean;
} {
  const asset = useMemo<NFTAsset | null>(() => {
    if (!tokenId) return null;
    if (MOCK_MODE) return mockStore.getAsset(tokenId);
    return null;
  }, [tokenId]);

  return { asset, isLoading: false };
}
