/**
 * Mock blockchain state store.
 * Simulates DID Registry + RBAC + NFT contracts in memory.
 * Swap functions here for real wagmi/viem calls when contracts are ready.
 */
import type { Identity, NFTAsset, AuditEvent, Role, DIDDocument } from "@/types";
import {
  MOCK_IDENTITIES,
  MOCK_ASSETS,
  MOCK_AUDIT_EVENTS,
  MOCK_DID_DOCUMENTS,
  MOCK_ADDRESSES,
} from "@/mock/data";

// Mutable in-memory state
let identities = [...MOCK_IDENTITIES];
let assets = [...MOCK_ASSETS];
let auditEvents = [...MOCK_AUDIT_EVENTS];
let nextTokenId = 3;
let eventCounter = auditEvents.length + 1;

function fakeTxHash(): `0x${string}` {
  const rand = Math.random().toString(16).slice(2).padEnd(62, "0");
  return `0x${rand}` as `0x${string}`;
}

export const mockStore = {
  // ── Identity / DID ──────────────────────────────────────────────────────────
  getIdentity(address: `0x${string}`): Identity | null {
    return identities.find((i) => i.address.toLowerCase() === address.toLowerCase()) ?? null;
  },
  getDIDDocument(address: `0x${string}`): DIDDocument | null {
    const key = Object.keys(MOCK_DID_DOCUMENTS).find(
      (k) => k.toLowerCase() === address.toLowerCase()
    );
    return key ? MOCK_DID_DOCUMENTS[key] : null;
  },
  listIdentities(): Identity[] {
    return [...identities];
  },
  registerIdentity(address: `0x${string}`, did?: string): Identity {
    const existing = this.getIdentity(address);
    if (existing) return existing;
    const txHash = fakeTxHash();
    const identity: Identity = {
      did: did ?? `did:ethr:${address}`,
      address,
      controller: address,
      role: "NONE",
      verified: false,
      createdAtBlock: 100300 + eventCounter,
      createdAtTimestamp: Date.now(),
      createdAtTx: txHash,
    };
    identities.push(identity);
    auditEvents.unshift({
      id: `evt-${eventCounter++}`,
      type: "IDENTITY_CREATED",
      actor: address,
      actorRole: "NONE",
      target: address,
      detail: `Identity registered for ${address}`,
      txHash,
      block: identity.createdAtBlock,
      timestamp: Date.now(),
      status: "CONFIRMED",
    });
    return identity;
  },

  // ── RBAC ────────────────────────────────────────────────────────────────────
  getRole(address: `0x${string}`): Role {
    return this.getIdentity(address)?.role ?? "NONE";
  },
  assignRole(actor: `0x${string}`, target: `0x${string}`, role: Role): AuditEvent {
    const identity = identities.find((i) => i.address.toLowerCase() === target.toLowerCase());
    if (identity) {
      identity.role = role;
      identity.verified = true;
    }
    const txHash = fakeTxHash();
    const evt: AuditEvent = {
      id: `evt-${eventCounter++}`,
      type: "ROLE_ASSIGNED",
      actor,
      actorRole: this.getRole(actor),
      target,
      detail: `Role ${role} assigned to ${target}`,
      txHash,
      block: 100300 + eventCounter,
      timestamp: Date.now(),
      status: "CONFIRMED",
    };
    auditEvents.unshift(evt);
    return evt;
  },

  // ── NFT ─────────────────────────────────────────────────────────────────────
  listAllAssets(): NFTAsset[] {
    return [...assets];
  },
  listAssetsForOwner(address: `0x${string}`): NFTAsset[] {
    return assets.filter((a) => a.ownerAddress.toLowerCase() === address.toLowerCase());
  },
  getAsset(tokenId: string): NFTAsset | null {
    return assets.find((a) => a.tokenId === tokenId) ?? null;
  },
  mintAsset(
    actor: `0x${string}`,
    toDid: string,
    toAddress: `0x${string}`,
    name: string,
    description: string,
    metadataUri: string
  ): NFTAsset {
    const tokenId = String(nextTokenId++);
    const txHash = fakeTxHash();
    const block = 100300 + eventCounter;
    const now = Date.now();
    const asset: NFTAsset = {
      tokenId,
      name,
      description,
      imageUri: "/mock-assets/generic-token.svg",
      metadataUri: metadataUri || `ipfs://pending-${now}`,
      ownerDid: toDid,
      ownerAddress: toAddress,
      mintedBy: actor,
      mintTx: txHash,
      mintedAtBlock: block,
      mintedAtTimestamp: now,
      contractAddress: MOCK_ADDRESSES.nftContract,
      chainId: 11155111,
      attributes: [{ trait_type: "Issuer Role", value: this.getRole(actor) }],
      provenance: [{
        type: "MINTED",
        from: null,
        to: toAddress,
        toDid,
        txHash,
        block,
        timestamp: now,
      }],
    };
    assets.push(asset);
    auditEvents.unshift({
      id: `evt-${eventCounter++}`,
      type: "ASSET_MINTED",
      actor,
      actorRole: this.getRole(actor),
      target: toAddress,
      tokenId,
      detail: `Minted "${name}" (#${tokenId}) to ${toDid}`,
      txHash,
      block,
      timestamp: now,
      status: "CONFIRMED",
    });
    return asset;
  },
  transferAsset(
    actor: `0x${string}`,
    tokenId: string,
    toAddress: `0x${string}`,
    toDid: string
  ): void {
    const asset = assets.find((a) => a.tokenId === tokenId);
    if (!asset) return;
    const txHash = fakeTxHash();
    const block = 100300 + eventCounter;
    const now = Date.now();
    const from = asset.ownerAddress;
    asset.ownerAddress = toAddress;
    asset.ownerDid = toDid;
    asset.provenance.push({
      type: "TRANSFERRED",
      from,
      to: toAddress,
      toDid,
      txHash,
      block,
      timestamp: now,
    });
    auditEvents.unshift({
      id: `evt-${eventCounter++}`,
      type: "ASSET_TRANSFERRED",
      actor,
      actorRole: this.getRole(actor),
      target: toAddress,
      tokenId,
      detail: `Token #${tokenId} transferred from ${from} to ${toAddress}`,
      txHash,
      block,
      timestamp: now,
      status: "CONFIRMED",
    });
  },

  // ── Audit ────────────────────────────────────────────────────────────────────
  listAuditEvents(): AuditEvent[] {
    return [...auditEvents].sort((a, b) => b.timestamp - a.timestamp);
  },

  // ── Stats ────────────────────────────────────────────────────────────────────
  getStats() {
    return {
      totalIdentities: identities.length,
      totalAssets: assets.length,
      totalAuditEvents: auditEvents.length,
      totalRoleAssignments: auditEvents.filter((e) => e.type === "ROLE_ASSIGNED").length,
    };
  },
};
