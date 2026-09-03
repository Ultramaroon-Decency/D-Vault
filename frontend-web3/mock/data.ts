import type {
  Identity,
  NFTAsset,
  AuditEvent,
  DIDDocument,
  PlatformStats,
} from "@/types";

// ─── Seeded Addresses ─────────────────────────────────────────────────────────
export const MOCK_ADDRESSES = {
  admin:   "0x1111111111111111111111111111111111A11D" as `0x${string}`,
  manager: "0x2222222222222222222222222222222222Mngr" as `0x${string}`,
  auditor: "0x3333333333333333333333333333333333Aud1" as `0x${string}`,
  user:    "0x4444444444444444444444444444444444U5eR" as `0x${string}`,
  nftContract: "0xDeaDBeef00000000000000000000000000000001" as `0x${string}`,
};

// ─── Seeded Identities ────────────────────────────────────────────────────────
export const MOCK_IDENTITIES: Identity[] = [
  {
    did: `did:ethr:${MOCK_ADDRESSES.admin}`,
    address: MOCK_ADDRESSES.admin,
    controller: MOCK_ADDRESSES.admin,
    role: "ADMIN",
    verified: true,
    createdAtBlock: 100201,
    createdAtTimestamp: Date.parse("2026-08-20T09:00:00Z"),
    createdAtTx: "0xa10c000000000000000000000000000000000000000000000000000000a1",
  },
  {
    did: `did:ethr:${MOCK_ADDRESSES.manager}`,
    address: MOCK_ADDRESSES.manager,
    controller: MOCK_ADDRESSES.manager,
    role: "MANAGER",
    verified: true,
    createdAtBlock: 100205,
    createdAtTimestamp: Date.parse("2026-08-20T09:02:00Z"),
    createdAtTx: "0xb20c000000000000000000000000000000000000000000000000000000b2",
  },
  {
    did: `did:ethr:${MOCK_ADDRESSES.auditor}`,
    address: MOCK_ADDRESSES.auditor,
    controller: MOCK_ADDRESSES.auditor,
    role: "AUDITOR",
    verified: true,
    createdAtBlock: 100206,
    createdAtTimestamp: Date.parse("2026-08-20T09:03:00Z"),
    createdAtTx: "0xc30c000000000000000000000000000000000000000000000000000000c3",
  },
  {
    did: `did:ethr:${MOCK_ADDRESSES.user}`,
    address: MOCK_ADDRESSES.user,
    controller: MOCK_ADDRESSES.user,
    role: "USER",
    verified: true,
    createdAtBlock: 100210,
    createdAtTimestamp: Date.parse("2026-08-20T09:05:00Z"),
    createdAtTx: "0xd40c000000000000000000000000000000000000000000000000000000d4",
  },
];

// ─── Seeded DID Documents (W3C-style) ─────────────────────────────────────────
export const MOCK_DID_DOCUMENTS: Record<string, DIDDocument> = {
  [MOCK_ADDRESSES.admin]: {
    "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/secp256k1-2020/v1"],
    id: `did:ethr:${MOCK_ADDRESSES.admin}`,
    controller: `did:ethr:${MOCK_ADDRESSES.admin}`,
    verificationMethod: [{
      id: `did:ethr:${MOCK_ADDRESSES.admin}#controller`,
      type: "EcdsaSecp256k1RecoveryMethod2020",
      controller: `did:ethr:${MOCK_ADDRESSES.admin}`,
      blockchainAccountId: `eip155:11155111:${MOCK_ADDRESSES.admin}`,
    }],
    authentication: [`did:ethr:${MOCK_ADDRESSES.admin}#controller`],
  },
  [MOCK_ADDRESSES.manager]: {
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: `did:ethr:${MOCK_ADDRESSES.manager}`,
    controller: `did:ethr:${MOCK_ADDRESSES.manager}`,
    verificationMethod: [{
      id: `did:ethr:${MOCK_ADDRESSES.manager}#controller`,
      type: "EcdsaSecp256k1RecoveryMethod2020",
      controller: `did:ethr:${MOCK_ADDRESSES.manager}`,
      blockchainAccountId: `eip155:11155111:${MOCK_ADDRESSES.manager}`,
    }],
    authentication: [`did:ethr:${MOCK_ADDRESSES.manager}#controller`],
  },
  [MOCK_ADDRESSES.auditor]: {
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: `did:ethr:${MOCK_ADDRESSES.auditor}`,
    controller: `did:ethr:${MOCK_ADDRESSES.auditor}`,
    verificationMethod: [{
      id: `did:ethr:${MOCK_ADDRESSES.auditor}#controller`,
      type: "EcdsaSecp256k1RecoveryMethod2020",
      controller: `did:ethr:${MOCK_ADDRESSES.auditor}`,
      blockchainAccountId: `eip155:11155111:${MOCK_ADDRESSES.auditor}`,
    }],
    authentication: [`did:ethr:${MOCK_ADDRESSES.auditor}#controller`],
  },
  [MOCK_ADDRESSES.user]: {
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: `did:ethr:${MOCK_ADDRESSES.user}`,
    controller: `did:ethr:${MOCK_ADDRESSES.user}`,
    verificationMethod: [{
      id: `did:ethr:${MOCK_ADDRESSES.user}#controller`,
      type: "EcdsaSecp256k1RecoveryMethod2020",
      controller: `did:ethr:${MOCK_ADDRESSES.user}`,
      blockchainAccountId: `eip155:11155111:${MOCK_ADDRESSES.user}`,
    }],
    authentication: [`did:ethr:${MOCK_ADDRESSES.user}#controller`],
  },
};

// ─── Seeded NFT Assets ────────────────────────────────────────────────────────
export const MOCK_ASSETS: NFTAsset[] = [
  {
    tokenId: "1",
    name: "Access Credential — Platform Member",
    description: "On-chain verifiable credential granting platform membership. Issued by Admin after identity verification.",
    imageUri: "/mock-assets/credential-001.svg",
    metadataUri: "ipfs://bafybeigd3n8f4k2example0001metadata",
    ownerDid: `did:ethr:${MOCK_ADDRESSES.user}`,
    ownerAddress: MOCK_ADDRESSES.user,
    mintedBy: MOCK_ADDRESSES.manager,
    mintTx: "0xe50c000000000000000000000000000000000000000000000000000000e5",
    mintedAtBlock: 100230,
    mintedAtTimestamp: Date.parse("2026-08-20T09:14:00Z"),
    contractAddress: MOCK_ADDRESSES.nftContract,
    chainId: 11155111,
    attributes: [
      { trait_type: "Credential Type", value: "Platform Access" },
      { trait_type: "Issuer Role", value: "MANAGER" },
      { trait_type: "Verification Level", value: "Level 2" },
    ],
    provenance: [
      {
        type: "MINTED",
        from: null,
        to: MOCK_ADDRESSES.user,
        toDid: `did:ethr:${MOCK_ADDRESSES.user}`,
        txHash: "0xe50c000000000000000000000000000000000000000000000000000000e5",
        block: 100230,
        timestamp: Date.parse("2026-08-20T09:14:00Z"),
      },
    ],
  },
  {
    tokenId: "2",
    name: "Digital Asset Certificate #002",
    description: "Tamper-proof ownership certificate for a digital asset, permanently recorded on the blockchain.",
    imageUri: "/mock-assets/generic-token.svg",
    metadataUri: "ipfs://bafybeigd3n8f4k2example0002metadata",
    ownerDid: `did:ethr:${MOCK_ADDRESSES.user}`,
    ownerAddress: MOCK_ADDRESSES.user,
    mintedBy: MOCK_ADDRESSES.admin,
    mintTx: "0xf60c000000000000000000000000000000000000000000000000000000f6",
    mintedAtBlock: 100245,
    mintedAtTimestamp: Date.parse("2026-08-20T10:02:00Z"),
    contractAddress: MOCK_ADDRESSES.nftContract,
    chainId: 11155111,
    attributes: [
      { trait_type: "Credential Type", value: "Ownership Certificate" },
      { trait_type: "Issuer Role", value: "ADMIN" },
      { trait_type: "Verification Level", value: "Level 3" },
    ],
    provenance: [
      {
        type: "MINTED",
        from: null,
        to: MOCK_ADDRESSES.admin,
        toDid: `did:ethr:${MOCK_ADDRESSES.admin}`,
        txHash: "0xf60c000000000000000000000000000000000000000000000000000000f6",
        block: 100245,
        timestamp: Date.parse("2026-08-20T10:02:00Z"),
      },
      {
        type: "TRANSFERRED",
        from: MOCK_ADDRESSES.admin,
        to: MOCK_ADDRESSES.user,
        toDid: `did:ethr:${MOCK_ADDRESSES.user}`,
        txHash: "0xa80c000000000000000000000000000000000000000000000000000000a8",
        block: 100260,
        timestamp: Date.parse("2026-08-20T10:30:00Z"),
      },
    ],
  },
];

// ─── Seeded Audit Events ──────────────────────────────────────────────────────
export const MOCK_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "evt-1",
    type: "IDENTITY_CREATED",
    actor: MOCK_ADDRESSES.admin,
    actorRole: "ADMIN",
    target: MOCK_ADDRESSES.admin,
    detail: "Admin identity registered on-chain",
    txHash: "0xa10c000000000000000000000000000000000000000000000000000000a1",
    block: 100201,
    timestamp: Date.parse("2026-08-20T09:00:00Z"),
    status: "CONFIRMED",
  },
  {
    id: "evt-2",
    type: "IDENTITY_CREATED",
    actor: MOCK_ADDRESSES.admin,
    actorRole: "ADMIN",
    target: MOCK_ADDRESSES.manager,
    detail: "Manager identity registered on-chain",
    txHash: "0xb20c000000000000000000000000000000000000000000000000000000b2",
    block: 100205,
    timestamp: Date.parse("2026-08-20T09:02:00Z"),
    status: "CONFIRMED",
  },
  {
    id: "evt-3",
    type: "ROLE_ASSIGNED",
    actor: MOCK_ADDRESSES.admin,
    actorRole: "ADMIN",
    target: MOCK_ADDRESSES.manager,
    detail: "Admin assigned MANAGER role to 0x2222...Mngr",
    txHash: "0xcc0c000000000000000000000000000000000000000000000000000000cc",
    block: 100208,
    timestamp: Date.parse("2026-08-20T09:05:00Z"),
    status: "CONFIRMED",
  },
  {
    id: "evt-4",
    type: "IDENTITY_CREATED",
    actor: MOCK_ADDRESSES.admin,
    actorRole: "ADMIN",
    target: MOCK_ADDRESSES.user,
    detail: "User identity registered on-chain",
    txHash: "0xd40c000000000000000000000000000000000000000000000000000000d4",
    block: 100210,
    timestamp: Date.parse("2026-08-20T09:05:30Z"),
    status: "CONFIRMED",
  },
  {
    id: "evt-5",
    type: "ASSET_MINTED",
    actor: MOCK_ADDRESSES.manager,
    actorRole: "MANAGER",
    target: MOCK_ADDRESSES.user,
    tokenId: "1",
    detail: "Manager minted token #1 (Access Credential) to User's DID",
    txHash: "0xe50c000000000000000000000000000000000000000000000000000000e5",
    block: 100230,
    timestamp: Date.parse("2026-08-20T09:14:00Z"),
    status: "CONFIRMED",
  },
  {
    id: "evt-6",
    type: "ASSET_MINTED",
    actor: MOCK_ADDRESSES.admin,
    actorRole: "ADMIN",
    target: MOCK_ADDRESSES.admin,
    tokenId: "2",
    detail: "Admin minted token #2 (Digital Asset Certificate)",
    txHash: "0xf60c000000000000000000000000000000000000000000000000000000f6",
    block: 100245,
    timestamp: Date.parse("2026-08-20T10:02:00Z"),
    status: "CONFIRMED",
  },
  {
    id: "evt-7",
    type: "ASSET_TRANSFERRED",
    actor: MOCK_ADDRESSES.admin,
    actorRole: "ADMIN",
    target: MOCK_ADDRESSES.user,
    tokenId: "2",
    detail: "Token #2 transferred from Admin to User",
    txHash: "0xa80c000000000000000000000000000000000000000000000000000000a8",
    block: 100260,
    timestamp: Date.parse("2026-08-20T10:30:00Z"),
    status: "CONFIRMED",
  },
];

// ─── Platform Stats ───────────────────────────────────────────────────────────
export const MOCK_STATS: PlatformStats = {
  totalIdentities: MOCK_IDENTITIES.length,
  totalAssets: MOCK_ASSETS.length,
  totalAuditEvents: MOCK_AUDIT_EVENTS.length,
  totalRoleAssignments: MOCK_AUDIT_EVENTS.filter((e) => e.type === "ROLE_ASSIGNED").length,
};

// ─── Mock wallet personas (for demo mode) ────────────────────────────────────
export const MOCK_PERSONAS = [
  { label: "Admin",   address: MOCK_ADDRESSES.admin },
  { label: "Manager", address: MOCK_ADDRESSES.manager },
  { label: "Auditor", address: MOCK_ADDRESSES.auditor },
  { label: "User",    address: MOCK_ADDRESSES.user },
];
