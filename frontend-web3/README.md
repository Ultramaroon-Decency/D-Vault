# [DEPRECATED] Frontend & Web3 Legacy Prototype

> ⚠️ **NOTICE: THIS MODULE IS DEPRECATED**  
> The active, production frontend for the D-Vault platform is located in **[`frontend/`](../frontend/)**.  
> This directory is preserved strictly as a historical reference for early prototyping and mock contracts.  
> Please refer to **[`frontend/README.md`](../frontend/README.md)** for current architecture, scripts, and local development instructions.

---

## Original Module Overview (Archived)

This was the initial **Frontend & Web3 Developer** prototype from the early implementation plan. It was structured to run with in-memory mock data standing in for the smart contracts and backend indexer.

### Stack (Legacy)
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- wagmi + RainbowKit
- ethers.js

### Archived File Structure
```
app/
  page.tsx              → legacy landing + wallet connect
  dashboard/page.tsx     → role-conditional dashboard
  identity/page.tsx      → DID profile + owned-NFT gallery
components/
  WalletButton.tsx       → connect/disconnect button
  RoleBadge.tsx          → role pill
  MintPanel.tsx          → mint NFT panel
  AssignRolePanel.tsx    → role assignment panel
  AuditTrail.tsx         → event log viewer
lib/
  types.ts               → legacy types
  web3/
    config.ts            → legacy wagmi/RainbowKit configuration
    mockContracts.ts     → in-memory mock of DID Registry / NFT / RBAC
```

For all current development, please use **[`frontend/`](../frontend/)**.
