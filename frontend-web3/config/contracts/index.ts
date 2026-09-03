/**
 * Contract addresses and ABI references.
 * Swap NEXT_PUBLIC_* env vars once contracts are deployed.
 * All contract interaction goes through hooks in hooks/web3/contracts/.
 */
import { sepolia } from "wagmi/chains";

export const CONTRACT_ADDRESSES = {
  didRegistry: (process.env.NEXT_PUBLIC_DID_REGISTRY_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  nft: (process.env.NEXT_PUBLIC_NFT_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
  rbac: (process.env.NEXT_PUBLIC_RBAC_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`,
};

export const CONTRACT_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? String(sepolia.id)
);

/**
 * Mock / placeholder ABIs.
 * Replace with actual ABI JSON files from your blockchain teammate.
 * Keep the same function names so hooks don't change.
 */
export const RBAC_ABI = [
  {
    name: "roleOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "assignRole",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "account", type: "address" },
      { name: "role", type: "uint8" },
    ],
    outputs: [],
  },
  {
    name: "RoleAssigned",
    type: "event",
    inputs: [
      { name: "actor", type: "address", indexed: true },
      { name: "target", type: "address", indexed: true },
      { name: "role", type: "uint8", indexed: false },
    ],
  },
] as const;

export const DID_REGISTRY_ABI = [
  {
    name: "getIdentity",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      { name: "did", type: "string" },
      { name: "controller", type: "address" },
      { name: "createdAtBlock", type: "uint256" },
      { name: "verified", type: "bool" },
    ],
  },
  {
    name: "registerIdentity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "did", type: "string" }],
    outputs: [],
  },
] as const;

export const NFT_ABI = [
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
] as const;
