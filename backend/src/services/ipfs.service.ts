import { env } from '../config/env';
import { logger } from '../utils/logger';
import { NFTMetadata } from '../types';

// =============================================
// Pinata API types
// =============================================
interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

// =============================================
// IPFS Service
// Abstracted behind an interface so the provider
// can be swapped (Pinata -> Web3.Storage etc.)
// =============================================

const PINATA_BASE = 'https://api.pinata.cloud';

/**
 * Upload a JSON metadata object to IPFS via Pinata.
 * Returns the IPFS CID (Content Identifier).
 */
export const uploadMetadata = async (metadata: NFTMetadata): Promise<string> => {
  if (env.IPFS_MOCK) {
    logger.info('[IPFS MOCK] uploadMetadata called', { name: metadata.name });
    // Return a deterministic fake CID for dev/test
    return `bafybeimock${Buffer.from(metadata.name).toString('hex').slice(0, 32)}`;
  }

  if (!env.PINATA_JWT) {
    throw new Error('PINATA_JWT is not configured');
  }

  const body = JSON.stringify({
    pinataContent: metadata,
    pinataMetadata: {
      name: `${metadata.name}-metadata.json`,
      keyvalues: {
        assetType: metadata.assetType,
        ownerDID: metadata.ownerDID ?? '',
      },
    },
    pinataOptions: { cidVersion: 1 },
  });

  const res = await fetch(`${PINATA_BASE}/pinning/pinJSONToIPFS`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.PINATA_JWT}`,
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error('[IPFS] Pinata metadata upload failed', { status: res.status });
    throw new Error(`Pinata upload failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as PinataResponse;
  logger.info('[IPFS] Metadata uploaded', { cid: data.IpfsHash });
  return data.IpfsHash;
};

/**
 * Upload a file (Buffer) to IPFS via Pinata.
 * Returns the IPFS CID.
 */
export const uploadFile = async (
  fileBuffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<string> => {
  if (env.IPFS_MOCK) {
    logger.info('[IPFS MOCK] uploadFile called', { filename });
    return `bafybeimockfile${Buffer.from(filename).toString('hex').slice(0, 28)}`;
  }

  if (!env.PINATA_JWT) {
    throw new Error('PINATA_JWT is not configured');
  }

  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimetype });
  formData.append('file', blob, filename);
  formData.append(
    'pinataMetadata',
    JSON.stringify({ name: filename }),
  );
  formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

  const res = await fetch(`${PINATA_BASE}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PINATA_JWT}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    logger.error('[IPFS] Pinata file upload failed', { status: res.status });
    throw new Error(`Pinata file upload failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as PinataResponse;
  logger.info('[IPFS] File uploaded', { cid: data.IpfsHash, filename });
  return data.IpfsHash;
};

/**
 * Build the IPFS URI from a CID
 */
export const toIpfsUri = (cid: string): string => `ipfs://${cid}`;

/**
 * Build the HTTP gateway URL from a CID (for frontend display)
 */
export const toGatewayUrl = (cid: string): string =>
  `${env.PINATA_GATEWAY}${cid}`;
