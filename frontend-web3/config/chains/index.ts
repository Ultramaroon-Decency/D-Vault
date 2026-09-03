import { sepolia, hardhat, polygonAmoy } from "wagmi/chains";

/**
 * Supported chains. Add or remove as needed.
 * The "primary" chain is where the contracts are deployed.
 * Adjust NEXT_PUBLIC_CHAIN_ID to point to the right one.
 */
export const SUPPORTED_CHAINS = [sepolia, polygonAmoy, hardhat] as const;

export const PRIMARY_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? String(sepolia.id)
);

export const CHAIN_EXPLORER: Record<number, string> = {
  [sepolia.id]:     "https://sepolia.etherscan.io",
  [polygonAmoy.id]: "https://amoy.polygonscan.com",
  [hardhat.id]:     "http://localhost:8545",
};

export function getExplorerUrl(chainId: number, type: "tx" | "address" | "token", value: string): string {
  const base = CHAIN_EXPLORER[chainId] ?? "https://sepolia.etherscan.io";
  return `${base}/${type}/${value}`;
}
