import { env } from '../config/env';
import { logger, logBlockchainError } from '../utils/logger';
import { getDIDRegistry, getRBACContract, getNFTAssetContract } from '../blockchain/contracts';
import { getTransactionStatus } from '../blockchain/provider';
import { ROLE_BYTES32 } from '../config/contracts';
import { RoleName } from '@prisma/client';

// =============================================
// Mock implementations for BLOCKCHAIN_MOCK mode
// =============================================
const MOCK_RESPONSES = {
  getDID: (address: string) => `did:ethr:sepolia:${address.toLowerCase()}`,
  getRole: (): RoleName => 'USER',
  getTokenURI: (tokenId: string) => `ipfs://bafybeimocktoken${tokenId}`,
  getOwner: (tokenId: string) => `0x${'0'.repeat(40 - tokenId.length)}${tokenId}`,
};

// =============================================
// DID Operations
// =============================================

/**
 * Get the DID for a given wallet address.
 * Falls back to a deterministic DID if not registered.
 */
export const getUserDID = async (address: string): Promise<string | null> => {
  if (env.BLOCKCHAIN_MOCK) {
    return MOCK_RESPONSES.getDID(address);
  }
  try {
    const registry = getDIDRegistry();
    const did: string = await registry.getDID(address);
    return did || null;
  } catch (err) {
    logBlockchainError('getUserDID failed', { address, error: (err as Error).message });
    return null;
  }
};

// =============================================
// RBAC Operations
// =============================================

/**
 * Map on-chain bytes32 role to RoleName enum.
 */
const bytes32ToRoleName = (bytes32: string): RoleName => {
  for (const [name, hash] of Object.entries(ROLE_BYTES32)) {
    if (bytes32.toLowerCase() === hash.toLowerCase()) {
      return name as RoleName;
    }
  }
  return 'USER';
};

/**
 * Get the on-chain role for a wallet address.
 */
export const getUserRole = async (address: string): Promise<RoleName> => {
  if (env.BLOCKCHAIN_MOCK) {
    return MOCK_RESPONSES.getRole();
  }
  try {
    const rbac = getRBACContract();
    const roleBytes32: string = await rbac.getRole(address);
    return bytes32ToRoleName(roleBytes32);
  } catch (err) {
    logBlockchainError('getUserRole failed', { address, error: (err as Error).message });
    return 'USER';
  }
};

// =============================================
// NFT Operations (read-only — NO minting)
// =============================================

/**
 * Get the tokenURI for a given tokenId.
 */
export const getTokenURI = async (tokenId: string): Promise<string | null> => {
  if (env.BLOCKCHAIN_MOCK) {
    return MOCK_RESPONSES.getTokenURI(tokenId);
  }
  try {
    const nft = getNFTAssetContract();
    const uri: string = await nft.tokenURI(BigInt(tokenId));
    return uri;
  } catch (err) {
    logBlockchainError('getTokenURI failed', { tokenId, error: (err as Error).message });
    return null;
  }
};

/**
 * Get the on-chain owner of a given tokenId.
 */
export const getTokenOwner = async (tokenId: string): Promise<string | null> => {
  if (env.BLOCKCHAIN_MOCK) {
    return MOCK_RESPONSES.getOwner(tokenId);
  }
  try {
    const nft = getNFTAssetContract();
    const owner: string = await nft.ownerOf(BigInt(tokenId));
    return owner.toLowerCase();
  } catch (err) {
    logBlockchainError('getTokenOwner failed', { tokenId, error: (err as Error).message });
    return null;
  }
};

/**
 * Get transaction confirmation status.
 */
export const getTxStatus = async (
  txHash: string,
): Promise<{ confirmed: boolean; blockNumber: bigint | null }> => {
  if (env.BLOCKCHAIN_MOCK) {
    return { confirmed: true, blockNumber: BigInt(12345678) };
  }
  return getTransactionStatus(txHash);
};
