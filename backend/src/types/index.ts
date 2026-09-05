import { RoleName } from '@prisma/client';
import { Request } from 'express';

// =============================================
// Authenticated user attached to req.user
// =============================================
export interface AuthenticatedUser {
  userId: string;
  walletAddress: string;
  did: string | null;
  role: RoleName;
}

// =============================================
// Augment Express Request
// =============================================
declare global {
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
}

// =============================================
// Pagination
// =============================================
export interface PaginationQuery {
  page?: number;
  limit?: number;
}
