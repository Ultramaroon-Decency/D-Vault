import { ethers } from 'ethers';
import { prisma } from '../db/prisma';
import { getProvider } from './provider';
import { getDIDRegistry, getRBACContract, getNFTAssetContract } from './contracts';
import { ROLE_BYTES32 } from '../config/contracts';
import { RoleName, TransactionType } from '@prisma/client';
import { logger, logIndexerError } from '../utils/logger';

// =============================================
// Idempotency key
// =============================================
const makeEventIdentity = (txHash: string, logIndex: number): string =>
  `${txHash.toLowerCase()}_${logIndex}`;

/**
 * Check if an event has already been processed (idempotency guard)
 */
const isProcessed = async (eventIdentity: string): Promise<boolean> => {
  const existing = await prisma.auditEvent.findUnique({
    where: { eventIdentity },
  });
  return !!existing;
};

// =============================================
// Handler: DIDCreated
// =============================================
const handleDIDCreated = async (
  owner: string,
  did: string,
  event: ethers.EventLog,
) => {
  const eventIdentity = makeEventIdentity(event.transactionHash, event.index);
  if (await isProcessed(eventIdentity)) return;

  const ts = event.blockNumber
    ? new Date((await getProvider().getBlock(event.blockNumber))!.timestamp * 1000)
    : new Date();

  // Upsert user with DID
  await prisma.user.upsert({
    where: { walletAddress: owner.toLowerCase() },
    update: { did, updatedAt: new Date() },
    create: { walletAddress: owner.toLowerCase(), did },
  });

  // Record audit event
  await prisma.auditEvent.create({
    data: {
      eventType: 'DIDCreated',
      actorAddress: owner.toLowerCase(),
      txHash: event.transactionHash,
      blockNumber: BigInt(event.blockNumber),
      logIndex: event.index,
      timestamp: ts,
      dataJson: { owner, did },
      eventIdentity,
    },
  });

  logger.info('[Indexer] DIDCreated indexed', { owner, did });
};

// =============================================
// Handler: RoleAssigned
// =============================================
const handleRoleAssigned = async (
  account: string,
  roleBytes32: string,
  assignedBy: string,
  event: ethers.EventLog,
) => {
  const eventIdentity = makeEventIdentity(event.transactionHash, event.index);
  if (await isProcessed(eventIdentity)) return;

  const ts = event.blockNumber
    ? new Date((await getProvider().getBlock(event.blockNumber))!.timestamp * 1000)
    : new Date();

  // Resolve role name from bytes32
  let roleName: RoleName = 'USER';
  for (const [name, hash] of Object.entries(ROLE_BYTES32)) {
    if (roleBytes32.toLowerCase() === hash.toLowerCase()) {
      roleName = name as RoleName;
      break;
    }
  }

  // Upsert user
  const user = await prisma.user.upsert({
    where: { walletAddress: account.toLowerCase() },
    update: { updatedAt: new Date() },
    create: { walletAddress: account.toLowerCase() },
  });

  // Find role record
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (role) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: { assignedBy: assignedBy.toLowerCase(), assignedAt: ts },
      create: { userId: user.id, roleId: role.id, assignedBy: assignedBy.toLowerCase(), assignedAt: ts },
    });
  }

  // Record transaction + audit event
  await prisma.transaction.upsert({
    where: { txHash: event.transactionHash },
    update: {},
    create: {
      txHash: event.transactionHash,
      type: TransactionType.ROLE_ASSIGNED,
      fromAddress: assignedBy.toLowerCase(),
      toAddress: account.toLowerCase(),
      blockNumber: BigInt(event.blockNumber),
      status: 'CONFIRMED',
      timestamp: ts,
    },
  });

  await prisma.auditEvent.create({
    data: {
      eventType: 'RoleAssigned',
      actorAddress: assignedBy.toLowerCase(),
      txHash: event.transactionHash,
      blockNumber: BigInt(event.blockNumber),
      logIndex: event.index,
      timestamp: ts,
      dataJson: { account, role: roleName, assignedBy },
      eventIdentity,
    },
  });

  logger.info('[Indexer] RoleAssigned indexed', { account, role: roleName });
};

// =============================================
// Handler: NFTMinted
// =============================================
const handleNFTMinted = async (
  tokenId: bigint,
  owner: string,
  metadataCID: string,
  event: ethers.EventLog,
) => {
  const eventIdentity = makeEventIdentity(event.transactionHash, event.index);
  if (await isProcessed(eventIdentity)) return;

  const ts = event.blockNumber
    ? new Date((await getProvider().getBlock(event.blockNumber))!.timestamp * 1000)
    : new Date();

  const tokenIdStr = tokenId.toString();

  // Get ownerDID if available
  const user = await prisma.user.findUnique({
    where: { walletAddress: owner.toLowerCase() },
  });

  // Create confirmed asset record
  await prisma.asset.upsert({
    where: { tokenId: tokenIdStr },
    update: {
      ownerAddress: owner.toLowerCase(),
      ownerDID: user?.did ?? null,
      status: 'CONFIRMED',
      mintedAt: ts,
    },
    create: {
      tokenId: tokenIdStr,
      ownerAddress: owner.toLowerCase(),
      ownerDID: user?.did ?? null,
      metadataCID,
      ipfsUri: `ipfs://${metadataCID}`,
      contractAddress: event.address.toLowerCase(),
      status: 'CONFIRMED',
      mintedAt: ts,
    },
  });

  // Transaction record
  await prisma.transaction.upsert({
    where: { txHash: event.transactionHash },
    update: {},
    create: {
      txHash: event.transactionHash,
      type: TransactionType.NFT_MINTED,
      toAddress: owner.toLowerCase(),
      tokenId: tokenIdStr,
      blockNumber: BigInt(event.blockNumber),
      status: 'CONFIRMED',
      timestamp: ts,
    },
  });

  // Audit record
  await prisma.auditEvent.create({
    data: {
      eventType: 'NFTMinted',
      actorAddress: owner.toLowerCase(),
      tokenId: tokenIdStr,
      txHash: event.transactionHash,
      blockNumber: BigInt(event.blockNumber),
      logIndex: event.index,
      timestamp: ts,
      dataJson: { tokenId: tokenIdStr, owner, metadataCID },
      eventIdentity,
    },
  });

  logger.info('[Indexer] NFTMinted indexed', { tokenId: tokenIdStr, owner });
};

// =============================================
// Handler: Transfer (ownership change)
// =============================================
const handleTransfer = async (
  from: string,
  to: string,
  tokenId: bigint,
  event: ethers.EventLog,
) => {
  const eventIdentity = makeEventIdentity(event.transactionHash, event.index);
  if (await isProcessed(eventIdentity)) return;

  // Skip mint transfers (from == address(0))
  if (from === ethers.ZeroAddress) return;

  const ts = event.blockNumber
    ? new Date((await getProvider().getBlock(event.blockNumber))!.timestamp * 1000)
    : new Date();

  const tokenIdStr = tokenId.toString();

  // Get new owner DID
  const newOwner = await prisma.user.findUnique({ where: { walletAddress: to.toLowerCase() } });

  // Update asset owner
  await prisma.asset.updateMany({
    where: { tokenId: tokenIdStr },
    data: {
      ownerAddress: to.toLowerCase(),
      ownerDID: newOwner?.did ?? null,
      status: 'TRANSFERRED',
    },
  });

  // Transaction record
  await prisma.transaction.upsert({
    where: { txHash: event.transactionHash },
    update: {},
    create: {
      txHash: event.transactionHash,
      type: TransactionType.TRANSFER,
      fromAddress: from.toLowerCase(),
      toAddress: to.toLowerCase(),
      tokenId: tokenIdStr,
      blockNumber: BigInt(event.blockNumber),
      status: 'CONFIRMED',
      timestamp: ts,
    },
  });

  // Audit record
  await prisma.auditEvent.create({
    data: {
      eventType: 'Transfer',
      actorAddress: from.toLowerCase(),
      tokenId: tokenIdStr,
      txHash: event.transactionHash,
      blockNumber: BigInt(event.blockNumber),
      logIndex: event.index,
      timestamp: ts,
      dataJson: { from, to, tokenId: tokenIdStr },
      eventIdentity,
    },
  });

  logger.info('[Indexer] Transfer indexed', { from, to, tokenId: tokenIdStr });
};

// =============================================
// Start the event listener
// =============================================
export const startEventListener = async (): Promise<void> => {
  logger.info('[Indexer] Starting blockchain event listener...');

  const didRegistry = getDIDRegistry();
  const rbacContract = getRBACContract();
  const nftAsset = getNFTAssetContract();

  // ---- DIDRegistry ----
  didRegistry.on('DIDCreated', async (owner: string, did: string, event: ethers.EventLog) => {
    try {
      await handleDIDCreated(owner, did, event);
    } catch (err) {
      logIndexerError('DIDCreated handler failed', { error: (err as Error).message });
    }
  });

  // ---- RBAC ----
  rbacContract.on('RoleAssigned', async (account: string, role: string, assignedBy: string, event: ethers.EventLog) => {
    try {
      await handleRoleAssigned(account, role, assignedBy, event);
    } catch (err) {
      logIndexerError('RoleAssigned handler failed', { error: (err as Error).message });
    }
  });

  // ---- NFT ----
  nftAsset.on('NFTMinted', async (tokenId: bigint, owner: string, metadataCID: string, event: ethers.EventLog) => {
    try {
      await handleNFTMinted(tokenId, owner, metadataCID, event);
    } catch (err) {
      logIndexerError('NFTMinted handler failed', { error: (err as Error).message });
    }
  });

  nftAsset.on('Transfer', async (from: string, to: string, tokenId: bigint, event: ethers.EventLog) => {
    try {
      await handleTransfer(from, to, tokenId, event);
    } catch (err) {
      logIndexerError('Transfer handler failed', { error: (err as Error).message });
    }
  });

  logger.info('[Indexer] Listening for: DIDCreated, RoleAssigned, NFTMinted, Transfer');
};

/**
 * Stop all contract event listeners (for graceful shutdown)
 */
export const stopEventListener = async (): Promise<void> => {
  try {
    getDIDRegistry().removeAllListeners();
    getRBACContract().removeAllListeners();
    getNFTAssetContract().removeAllListeners();
    logger.info('[Indexer] Event listeners stopped');
  } catch {
    // ignore errors during shutdown
  }
};
