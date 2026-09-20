import { prisma } from '../db/prisma';
import * as ipfsService from './ipfs.service';
import { Errors } from '../middleware/error.middleware';
import { NFTMetadata, MetadataUploadResponse } from '../types';
import { logger } from '../utils/logger';
import { Asset, AssetStatus } from '@prisma/client';

// =============================================
// Uploaded file info passed from controller
// =============================================
export interface UploadedFileInfo {
  filename: string;      // UUID-safe filename already on disk (e.g. uuid-name.pdf)
  originalname: string;  // Original filename from the user
  mimetype: string;
}

// =============================================
// Upload NFT metadata to IPFS
// Returns CID for the frontend to use when minting
// Does NOT call the mint function — that's the frontend wallet's job
// =============================================
export const prepareMetadata = async (
  metadata: NFTMetadata,
  fileInfo?: UploadedFileInfo,
): Promise<MetadataUploadResponse> => {
  let imageCID: string | undefined;
  let documentUrl: string | undefined;
  let documentFilename: string | undefined;

  if (fileInfo) {
    if (fileInfo.mimetype.startsWith('image/')) {
      // Images: upload to IPFS (existing behaviour) — read from disk first
      logger.info('[Asset] Uploading image to IPFS', { filename: fileInfo.filename });
      const fs = await import('fs');
      const path = await import('path');
      const { UPLOADS_DIR } = await import('./storage.service');
      const imageBuffer = await fs.promises.readFile(path.join(UPLOADS_DIR, fileInfo.filename));
      imageCID = await ipfsService.uploadFile(imageBuffer, fileInfo.originalname, fileInfo.mimetype);
    } else {
      // Non-image documents: already saved to disk by multer, just record the URL
      logger.info('[Asset] Document saved to local storage', { filename: fileInfo.filename });
      documentUrl = `/uploads/${fileInfo.filename}`;
      documentFilename = fileInfo.originalname;
    }
  }

  // Build ERC-721 compatible metadata JSON
  const nftMetadata: NFTMetadata = {
    name: metadata.name,
    description: metadata.description,
    assetType: metadata.assetType,
    ownerDID: metadata.ownerDID,
    image: imageCID ? ipfsService.toIpfsUri(imageCID) : undefined,
    attributes: [
      { trait_type: 'Asset Type', value: metadata.assetType },
      { trait_type: 'Owner DID', value: metadata.ownerDID ?? '' },
      ...(documentUrl ? [{ trait_type: 'Document URL', value: documentUrl }] : []),
    ],
    ...metadata.attributes && { attributes: metadata.attributes },
  };

  // Upload metadata JSON to IPFS
  logger.info('[Asset] Uploading metadata to IPFS', { name: metadata.name });
  const cid = await ipfsService.uploadMetadata(nftMetadata);
  const ipfsUri = ipfsService.toIpfsUri(cid);

  logger.info('[Asset] Metadata ready for minting', { cid, ipfsUri });

  return {
    cid,
    ipfsUri,
    metadata: nftMetadata,
    metadataUploadStatus: 'uploaded',
    documentUrl,
    documentFilename,
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
