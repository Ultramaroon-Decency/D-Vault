import { RoleName } from '@prisma/client';

// =============================================
// Authenticated user attached to req.user
// =============================================
export interface AuthenticatedUser {
  userId: string;
  walletAddress: string;
  did: string | null;
  role: RoleName;
  email?: string; // present for Google-authenticated users
}

// =============================================
// Augment Express Request
// =============================================
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// =============================================
// API Response wrappers
// =============================================
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// =============================================
// Auth types
// =============================================
export interface NonceResponse {
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface VerifyRequest {
  walletAddress: string;
  signature: string;
}

export interface AuthToken {
  token: string;
  expiresIn: string;
}

// =============================================
// Asset types
// =============================================
export interface NFTMetadata {
  name: string;
  description: string;
  assetType: string;
  ownerDID?: string;
  image?: string; // IPFS CID or URL
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

export interface MetadataUploadResponse {
  cid: string;
  ipfsUri: string;
  metadata: NFTMetadata;
  metadataUploadStatus: 'uploaded';
  /** URL path for locally stored document, e.g. /uploads/uuid-name.pdf */
  documentUrl?: string;
  /** Original filename the user uploaded */
  documentFilename?: string;
}

// =============================================
// Pagination
// =============================================
export interface PaginationQuery {
  page?: number;
  limit?: number;
}
