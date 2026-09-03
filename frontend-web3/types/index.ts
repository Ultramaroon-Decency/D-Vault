// ─── Roles & Permissions ──────────────────────────────────────────────────────

export type Role = "ADMIN" | "MANAGER" | "AUDITOR" | "USER" | "NONE";

export type Permission =
  | "VIEW_DASHBOARD"
  | "VIEW_IDENTITY"
  | "VIEW_ASSETS"
  | "VIEW_AUDIT"
  | "VIEW_ALL_IDENTITIES"
  | "VIEW_ALL_ASSETS"
  | "ASSIGN_ROLE"
  | "MINT_ASSET"
  | "ALLOCATE_ASSET"
  | "TRANSFER_ASSET"
  | "MANAGE_USERS"
  | "REGISTER_IDENTITY";

// ─── Identity / DID ───────────────────────────────────────────────────────────

/**
 * Abstracted identity document.
 * The exact DID standard (W3C DID vs. custom registry) is configurable at the
 * contract / API layer. This type is intentionally framework-agnostic.
 */
export interface Identity {
  did: string;                    // e.g. did:ethr:0xabc…
  address: `0x${string}`;
  controller: `0x${string}`;
  role: Role;
  verified: boolean;
  createdAtBlock: number;
  createdAtTimestamp: number;     // Unix ms
  createdAtTx: `0x${string}`;
}

// Raw DID document returned from resolver (W3C-style)
export interface DIDDocument {
  "@context": string[];
  id: string;
  verificationMethod: DIDVerificationMethod[];
  authentication: string[];
  controller: string;
}

export interface DIDVerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyHex?: string;
  blockchainAccountId?: string;
}

// ─── NFT / Digital Asset ──────────────────────────────────────────────────────

export interface NFTAsset {
  tokenId: string;
  name: string;
  description: string;
  imageUri: string;
  metadataUri: string;            // ipfs:// or https://
  ownerDid: string;
  ownerAddress: `0x${string}`;
  mintedBy: `0x${string}`;
  mintTx: `0x${string}`;
  mintedAtBlock: number;
  mintedAtTimestamp: number;
  contractAddress: `0x${string}`;
  chainId: number;
  attributes: NFTAttribute[];
  provenance: ProvenanceEvent[];
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
}

export interface ProvenanceEvent {
  type: "MINTED" | "TRANSFERRED" | "ALLOCATED";
  from: `0x${string}` | null;
  to: `0x${string}`;
  toDid?: string;
  txHash: `0x${string}`;
  block: number;
  timestamp: number;
}

// ─── Audit Trail ──────────────────────────────────────────────────────────────

export type AuditEventType =
  | "IDENTITY_CREATED"
  | "ROLE_ASSIGNED"
  | "ROLE_REVOKED"
  | "ASSET_MINTED"
  | "ASSET_ALLOCATED"
  | "ASSET_TRANSFERRED"
  | "PERMISSION_UPDATED"
  | "CREDENTIAL_ISSUED";

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  actor: `0x${string}`;
  actorRole: Role;
  target: `0x${string}`;
  tokenId?: string;
  detail: string;
  txHash: `0x${string}`;
  block: number;
  timestamp: number;
  status: "CONFIRMED" | "PENDING" | "FAILED";
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export type TxStatus = "idle" | "confirm" | "pending" | "confirmed" | "failed" | "rejected";

export interface TxState {
  status: TxStatus;
  txHash?: `0x${string}`;
  error?: string;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface PlatformStats {
  totalIdentities: number;
  totalAssets: number;
  totalAuditEvents: number;
  totalRoleAssignments: number;
}

// ─── API Abstractions ─────────────────────────────────────────────────────────

export interface GetIdentityResult {
  identity: Identity | null;
  didDocument: DIDDocument | null;
  isLoading: boolean;
  error: string | null;
}

export interface GetAssetsResult {
  assets: NFTAsset[];
  isLoading: boolean;
  error: string | null;
}

export interface GetAuditResult {
  events: AuditEvent[];
  isLoading: boolean;
  error: string | null;
}

// ─── Forms ────────────────────────────────────────────────────────────────────

export interface AssignRoleFormData {
  targetAddress: `0x${string}`;
  role: Role;
}

export interface MintAssetFormData {
  name: string;
  description: string;
  recipientAddress: `0x${string}`;
  recipientDid: string;
  metadataUri?: string;
  imageFile?: File;
}

export interface AuditFilters {
  eventType?: AuditEventType | "ALL";
  actor?: string;
  tokenId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
