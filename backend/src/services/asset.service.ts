import { prisma } from '../db/prisma';
import * as ipfsService from './ipfs.service';
import { Errors } from '../middleware/error.middleware';
import { NFTMetadata, MetadataUploadResponse } from '../types';
import { logger } from '../utils/logger';
import { Asset, AssetStatus } from '@prisma/client';

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

  // 1. Upload image file if provided
  if (imageBuffer && imageFilename && imageMimetype) {
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
