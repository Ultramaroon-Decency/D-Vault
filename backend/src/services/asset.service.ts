import { prisma } from '../db/prisma';
import * as ipfsService from './ipfs.service';
import { Errors } from '../middleware/error.middleware';
import { NFTMetadata, MetadataUploadResponse } from '../types';
import { logger } from '../utils/logger';
import { Asset, AssetStatus } from '@prisma/client';

// =============================================
// SECURITY: Magic-byte file validation (VULN-18)
// Trusting only the client-provided Content-Type header is insufficient.
// We inspect the actual file content (magic bytes) to verify the real type.
// =============================================
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

/**
 * Magic byte signatures for allowed file types.
 * These are the first bytes of every valid file — impossible to fake from server side.
 */
const MAGIC_SIGNATURES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: 'image/jpeg',       bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',        bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { mime: 'image/gif',        bytes: [0x47, 0x49, 0x46, 0x38] },           // GIF8
  { mime: 'image/webp',       bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }, // WEBP at byte 8
  { mime: 'application/pdf',  bytes: [0x25, 0x50, 0x44, 0x46] },           // %PDF
];

function detectMimeFromMagicBytes(buffer: Buffer): string | null {
  for (const sig of MAGIC_SIGNATURES) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) continue;
    const match = sig.bytes.every((byte, i) => buffer[offset + i] === byte);
    if (match) return sig.mime;
  }
  return null;
}

async function validateFileByMagicBytes(buffer: Buffer, originalMime: string): Promise<void> {
  const detected = detectMimeFromMagicBytes(buffer);

  if (!detected) {
    logger.warn('[Asset] File rejected: unrecognized magic bytes', { claimedMime: originalMime });
    throw Errors.badRequest('Cannot determine file type from content. Only images and PDFs are allowed.');
  }

  if (!ALLOWED_MIME_TYPES.includes(detected)) {
    logger.warn('[Asset] File rejected: magic bytes indicate disallowed type', {
      detectedMime: detected,
      claimedMime: originalMime,
    });
    throw Errors.badRequest(
      `File content type "${detected}" is not allowed. Only JPEG, PNG, GIF, WEBP, PDF are permitted.`,
    );
  }

  // SECURITY: Log MIME spoofing attempts (attacker claims wrong type)
  if (detected !== originalMime) {
    logger.warn('[Asset] MIME type mismatch — possible spoofing attempt', {
      detectedMime: detected,
      claimedMime: originalMime,
    });
    // Still allow if detected type is permitted — spoof logged, upload continues
  }
}

// =============================================
// Upload NFT metadata to IPFS
// Returns CID for the frontend to use when minting
// Does NOT call the mint function — that's the frontend wallet's job
// =============================================
export const prepareMetadata = async (
  metadata: NFTMetadata,
  imageBuffer?: Buffer,
  imageFilename?: string,
  imageMimetype?: string,
): Promise<MetadataUploadResponse> => {
  let imageCID: string | undefined;

  // 1. Upload image file if provided — with magic-byte validation
  if (imageBuffer && imageFilename && imageMimetype) {
    // SECURITY: Validate actual file content before upload (VULN-18)
    await validateFileByMagicBytes(imageBuffer, imageMimetype);

    logger.info('[Asset] Uploading image to IPFS', { filename: imageFilename });
    imageCID = await ipfsService.uploadFile(imageBuffer, imageFilename, imageMimetype);
  }

  // 2. Build ERC-721 compatible metadata JSON
  const nftMetadata: NFTMetadata = {
    name: metadata.name,
    description: metadata.description,
    assetType: metadata.assetType,
    ownerDID: metadata.ownerDID,
    image: imageCID ? ipfsService.toIpfsUri(imageCID) : undefined,
    attributes: [
      { trait_type: 'Asset Type', value: metadata.assetType },
      { trait_type: 'Owner DID', value: metadata.ownerDID ?? '' },
    ],
    ...metadata.attributes && { attributes: metadata.attributes },
  };

  // 3. Upload metadata JSON to IPFS
  logger.info('[Asset] Uploading metadata to IPFS', { name: metadata.name });
  const cid = await ipfsService.uploadMetadata(nftMetadata);
  const ipfsUri = ipfsService.toIpfsUri(cid);

  logger.info('[Asset] Metadata ready for minting', { cid, ipfsUri });

  return {
    cid,
    ipfsUri,
    metadata: nftMetadata,
    metadataUploadStatus: 'uploaded',
  };
};

// =============================================
// Get a paginated list of confirmed assets
// =============================================
export const listAssets = async (
  page = 1,
  limit = 20,
  ownerAddress?: string,
): Promise<{ assets: Asset[]; total: number }> => {
  const where = {
    status: 'CONFIRMED' as AssetStatus,
    ...(ownerAddress && { ownerAddress: ownerAddress.toLowerCase() }),
  };

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { mintedAt: 'desc' },
    }),
    prisma.asset.count({ where }),
  ]);

  return { assets, total };
};

// =============================================
// Get a single asset by tokenId
// =============================================
export const getAssetByTokenId = async (tokenId: string): Promise<Asset> => {
  const asset = await prisma.asset.findUnique({
    where: { tokenId },
  });

  if (!asset) throw Errors.notFound(`Asset with tokenId ${tokenId} not found`);
  return asset;
};

// =============================================
// Get asset provenance (history from audit_events)
// =============================================
export const getAssetHistory = async (tokenId: string) => {
  const history = await prisma.auditEvent.findMany({
    where: { tokenId },
    orderBy: { blockNumber: 'asc' },
    select: {
      eventType: true,
      actorAddress: true,
      txHash: true,
      blockNumber: true,
      timestamp: true,
      dataJson: true,
    },
  });
  return history;
};
