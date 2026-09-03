# Frontend & Web3 — Decentralized Identity & Asset Management Platform

This is the **Frontend & Web3 Developer** module from the implementation plan.
It's built so it runs and demos on its own — with mock data standing in for
the smart contracts and backend indexer — and swaps over to the real thing
with changes in exactly one place: `lib/web3/`.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** for styling
- **wagmi + RainbowKit** for wallet connection and contract calls (wired up,
  running in mock mode until real contract addresses/ABIs land)
- **ethers.js** available for any one-off calls RainbowKit/wagmi don't cover

## Why mock mode

Per the plan, this role is meant to work **independently** of the Smart
Contract and Backend engineers, using mocked ABIs and data until theirs are
ready. Every place that will eventually hit a real contract or API is
isolated in `lib/web3/mockContracts.ts` and `lib/web3/config.ts`, behind the
same function signatures the real integration will use. Nothing in the UI
components knows or cares whether the data is mocked.

## Structure

```
app/
  page.tsx              → landing + wallet connect
  dashboard/page.tsx     → role-conditional dashboard (Admin/Manager/Auditor/User)
  identity/page.tsx      → DID profile + owned-NFT gallery with provenance
components/
  WalletButton.tsx        → connect/disconnect, shows truncated address + role
  RoleBadge.tsx            → colored role pill
  MintPanel.tsx            → Admin/Manager: mint NFT to a DID
  AssignRolePanel.tsx      → Admin: assign RBAC role to an address
  AuditTrail.tsx           → Auditor: chronological on-chain event log
  AssetGallery.tsx         → grid of a user's owned NFTs
  IdentityCard.tsx         → DID document summary
lib/
  types.ts                 → shared TypeScript types (Role, DID, Asset, AuditEvent)
  web3/
    config.ts              → wagmi/RainbowKit config, chain setup, mock-mode flag
    mockContracts.ts        → in-memory mock of DID Registry / NFT / RBAC contracts
    useAuth.ts               → SIWE-style sign-in + role resolution hook
    useContracts.ts          → typed hooks (useRoles, useAssets, useAuditLog, useMint, useAssignRole)
```

## Wiring in the real contracts (for the Smart Contract Engineer's ABIs)

1. Drop the compiled ABIs into `lib/web3/abis/`.
2. In `lib/web3/config.ts`, set `MOCK_MODE = false` and fill in
   `CONTRACT_ADDRESSES` (DID Registry, NFT, RBAC) per network.
3. In `lib/web3/useContracts.ts`, each hook already branches on `MOCK_MODE` —
   the real branch calls `useReadContract` / `useWriteContract` from wagmi
   with the ABI + address. No component code changes needed.

## Wiring in the Backend indexer (for the Backend Engineer's API)

`useContracts.ts`'s "real" branch currently reads straight from-chain via
wagmi. Once the indexer/API is up, point `fetchAuditLog` and `fetchAssets`
at the REST/GraphQL endpoints instead of raw RPC calls — same return shape,
so `AuditTrail.tsx` and `AssetGallery.tsx` don't change.

## Running locally

```bash
npm install
npm run dev
```

Runs in mock mode out of the box — no wallet, RPC, or deployed contracts
needed to see every role's dashboard. Use the role switcher on the connect
screen (mock mode only) to preview Admin / Manager / Auditor / User views.

## Manual verification (from the plan's Verification Plan)

The mock data ships pre-seeded to walk the exact staged scenario from the
plan:
1. Sign in as **Admin** → Assign Role panel → grant an address the Manager role.
2. Sign in as **Manager** → Mint Asset panel → mint an NFT to a User's DID.
3. Sign in as **User** → Dashboard shows the new asset; Identity page shows
   its provenance; Auditor view shows all three actions in the audit trail.
