import { env } from '../config/env';

export const CONTRACT_CONFIG = {
  DID_REGISTRY: {
    address: env.DID_REGISTRY_ADDRESS,
    abiPath: '../abis/DIDRegistry.json',
  },
  RBAC_CONTRACT: {
    address: env.RBAC_CONTRACT_ADDRESS,
    abiPath: '../abis/RBACContract.json',
  },
  NFT_ASSET: {
    address: env.NFT_ASSET_ADDRESS,
    abiPath: '../abis/NFTAsset.json',
  },
} as const;

/**
 * On-chain role identifiers (bytes32 constants from the RBAC contract).
 * Update these to match the actual keccak256 hashes used by the smart contract.
 * e.g., ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"))
 */
export const ROLE_BYTES32 = {
  ADMIN: '0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42',
  MANAGER: '0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0813f4f0ac994e5da3a81a7',
  AUDITOR: '0x9cf85f95575c3af1e116e3d37fd41e7f36a8a489ad1ae7f4f07c7d40aad0a7ae',
  USER: '0x2db9fd3d099848027c2383d0a083396f6c41510d7acfd92adc99b6cffcf31e96',
} as const;

export type OnChainRole = keyof typeof ROLE_BYTES32;
