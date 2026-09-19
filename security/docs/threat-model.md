# Threat Model & Attack Surface Analysis

This document outlines the security architecture, threat model, and attack surface analysis for the **D-Vault (SIH Platform)** backend and Web3 integration. It analyzes the specific threat surfaces present in the codebase and identifies strengths, residual risks, and mitigation strategies.

---

## 1. System Architecture & Trust Boundaries

The system consists of three distinct layers:
1. **Client Interface (`frontend-web3/`)**: Next.js 14 client with RainbowKit and Wagmi wallet connections. Untrusted environment.
2. **Off-Chain API Gateway (`backend/`)**: Node.js/Express service orchestrating authentication, role management, IPFS metadata preparation, and event indexing.
3. **Storage & Settlement**:
   - **PostgreSQL**: Stores user profiles, nonce challenges, roles, asset states, and audit event logs.
   - **IPFS (Pinata)**: Decentralized storage for NFT metadata and document assets.
   - **Ethereum (Sepolia) / Smart Contracts**: Root of trust for DID identity, on-chain RBAC roles, and ERC-721 token ownership.

```
       [ Client Browser (Untrusted) ]
                     │
    (1) Nonce & SIWE │ (3) JWT Bearer + Signed Tx
                     ▼
      [ Express API Gateway (Trust Boundary) ]
          │                  │              │
          ▼                  ▼              ▼
  [ PostgreSQL DB ]   [ Pinata IPFS ]   [ Sepolia EVM ]
```

---

## 2. Attack Surface Analysis

### Surface 1: JWT Handling & Cryptographic Verification

* **Primary Code References**:
  - [`backend/src/middleware/auth.middleware.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/middleware/auth.middleware.ts)
  - [`backend/src/services/auth.service.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/services/auth.service.ts)
  - [`backend/src/config/env.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/config/env.ts)

* **Current Implementation & Strengths**:
  - **Secret Entropy Enforcement**: In [`backend/src/config/env.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/config/env.ts#L16), Zod enforces `JWT_SECRET: z.string().min(16)`. The server process terminates during boot if a weak secret is provided.
  - **Expiration Enforcement**: In [`backend/src/middleware/auth.middleware.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/middleware/auth.middleware.ts#L27), `jwt.verify()` validates the `exp` claim. Expired tokens throw `jwt.TokenExpiredError` and are immediately rejected with HTTP 401.

* **Mitigations Implemented & Verified**:
  - **Algorithm Confusion Risk (RESOLVED)**: `jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })` explicitly pins HS256 in [`backend/src/middleware/auth.middleware.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/middleware/auth.middleware.ts#L27). Tokens signed with `"alg": "none"` or unapproved algorithms (e.g. HS512, RS256) are rejected with HTTP 401.

---

### Surface 2: Nonce Management & Replay Attacks

* **Primary Code References**:
  - [`backend/src/services/auth.service.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/services/auth.service.ts#L33-L131)
  - [`backend/src/routes/auth.routes.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/routes/auth.routes.ts)

* **Current Implementation & Strengths**:
  - **Time-Boxed Lifespan**: Nonces are governed by `NONCE_TTL_SECONDS` (default 300s). `expiresAt: { gt: new Date() }` is strictly enforced in the Prisma query.
  - **Single-Use Invalidation**: Upon issuing a new nonce, prior unconsumed nonces for that address are invalidated (`mockPrisma.nonce.updateMany({ used: true })`). When verified, the nonce is flagged `used: true`.
  - **Atomic Transaction & Race Condition Prevention (RESOLVED)**: Both nonce issuance and signature verification/consumption are wrapped in `db().$transaction(async (tx) => { ... })` in [`backend/src/services/auth.service.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/services/auth.service.ts). This eliminates concurrency windows and race condition replays.

---

### Surface 3: RBAC Enforcement & Trust Boundaries

* **Primary Code References**:
  - [`backend/src/middleware/rbac.middleware.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/middleware/rbac.middleware.ts)
  - [`frontend-web3/components/ui/PermissionGate.tsx`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/frontend-web3/components/ui/PermissionGate.tsx)

* **Current Implementation & Strengths**:
  - **Server-Side Enforcement**: [`backend/src/middleware/rbac.middleware.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/middleware/rbac.middleware.ts) enforces `requireRole('ADMIN')`, `requireRole('MANAGER', 'ADMIN')`, and `requireRole('AUDITOR', 'ADMIN')`. It checks `req.user.role` extracted exclusively from the validated JWT and rejects unauthorized callers with HTTP 403 `FORBIDDEN`.
  - **No Client Trust**: The backend never accepts client-provided role claims in request bodies or query headers for authorization. Roles are resolved during authentication directly from database state (`prisma.userRole`) or smart contract queries.
  - **Frontend UI Isolation**: [`frontend-web3/components/ui/PermissionGate.tsx`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/frontend-web3/components/ui/PermissionGate.tsx#L14) explicitly documents:
    > *"This is purely a UI gate — smart contracts enforce real authorization."*
    Frontend controls simply tailor navigation and form rendering; circumventing them yields an immediate 401 or 403 at the API and smart contract level.

---

### Surface 4: File Upload & IPFS Storage Ingestion

* **Primary Code References**:
  - [`backend/src/routes/asset.routes.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/routes/asset.routes.ts#L10-L33)
  - [`backend/src/controllers/asset.controller.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/controllers/asset.controller.ts#L10-L30)
  - [`backend/src/services/ipfs.service.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/services/ipfs.service.ts)

* **Current Implementation & Strengths**:
  - **Memory Storage & Size Limits**: Multer is configured with `memoryStorage()` and a strict 10MB limit (`limits: { fileSize: 10 * 1024 * 1024 }`), protecting the host from local disk fill attacks.
  - **MIME Allowlist**: Accepts only `image/jpeg`, `image/png`, `image/gif`, `image/webp`, and `application/pdf`.

* **Identified Risks & Recommendations**:
  - **Client-Controlled Content-Type**: `file.mimetype` is provided by the HTTP client. An attacker can upload an executable file disguised with `Content-Type: image/png` or a polyglot PDF containing embedded malware.
  - **Public IPFS Permanence**: Once pinned to IPFS via Pinata, unpinned or malicious data remains accessible via content hash across decentralized gateways.
  - **Recommendation**:
    1. Inspect file magic bytes server-side using libraries like `file-type` to verify actual binary headers before IPFS dispatch.
    2. Add an asynchronous or pre-upload antivirus inspection hook (e.g. ClamAV daemon) in production environments.

---

### Surface 5: Rate Limiting & Denial of Service (DoS)

* **Primary Code References**:
  - [`backend/src/app.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/app.ts#L32-L40)
  - [`backend/src/routes/auth.routes.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/routes/auth.routes.ts#L9-L19)
  - [`backend/src/config/env.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/config/env.ts#L38-L40)

* **Current Implementation & Strengths**:
  - **Global Rate Limiter**: Applied across all API routes via `express-rate-limit` (100 requests per 15-minute window by default).
  - **Auth-Specific Tier**: High-risk authentication routes (`POST /api/auth/nonce` and `POST /api/auth/verify`) are protected by an independent limiter allowing a maximum of 10 attempts per 15 minutes (`AUTH_RATE_LIMIT_MAX: 10`). This protects against nonce flooding and signature brute-forcing.

* **Identified Risks & Recommendations**:
  - **In-Memory State**: In multi-replica or clustered deployments (e.g., across multiple Docker backend containers), memory-based rate limiting allows per-instance counts rather than a global ceiling.
  - **Recommendation**: Attach Redis store (`rate-limit-redis`) in production container deployments to synchronize rate limit counts across replicas.

---

### Surface 5: File Uploads & Magic Byte Content Verification

* **Primary Code References**:
  - [`backend/src/middleware/fileValidation.middleware.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/middleware/fileValidation.middleware.ts)
  - [`backend/src/routes/asset.routes.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/routes/asset.routes.ts)

* **Current Implementation & Strengths**:
  - **Magic Bytes Validation**: While multer performs an initial check on the client-supplied `Content-Type` header, [`backend/src/middleware/fileValidation.middleware.ts`](file:///c:/Users/Rakshit%20Garg/Desktop/New%20folder/D-Vault/backend/src/middleware/fileValidation.middleware.ts) directly inspects the binary buffer headers (magic numbers) for JPEG (`FF D8 FF`), PNG (`89 50 4E 47...`), GIF (`GIF87a`/`GIF89a`), WebP (`RIFF...WEBP`), and PDF (`%PDF-`).
  - **MIME Spoofing Prevention**: Any file disguised with a legitimate extension or fake HTTP header that does not match authentic byte signatures is rejected with HTTP 400.
  - **File Size Ceiling**: A strict 10MB memory limit prevents denial-of-service memory exhaustion.

---

## 3. Summary of Security Controls

| Threat Area | Control Mechanism | Status | Primary File |
| :--- | :--- | :--- | :--- |
| **JWT Secrets** | Zod `.min(16)` schema validation | Verified | `backend/src/config/env.ts` |
| **JWT Expiry & Alg** | `jwt.verify()` + `algorithms: ['HS256']` | Verified | `backend/src/middleware/auth.middleware.ts` |
| **Replay Attacks** | Atomic `db().$transaction` single-use UUID nonces with TTL | Verified | `backend/src/services/auth.service.ts` |
| **Authorization** | Server-side role guard middleware (403) | Verified | `backend/src/middleware/rbac.middleware.ts` |
| **UI Spoofing** | PermissionGate marked UI-only | Documented | `frontend-web3/components/ui/PermissionGate.tsx` |
| **Upload Spoofing** | 10MB memory-limit + binary magic bytes verification | Verified | `backend/src/middleware/fileValidation.middleware.ts` |
| **Brute Force** | Dual-tier IP rate limiting | Verified | `backend/src/routes/auth.routes.ts` |
| **Contracts CI** | Slither static analysis on `blockchain/**` triggers | Verified | `.github/workflows/contracts-ci.yml` |
| **Audit Logging** | Immutable on-chain + indexed events | Verified | `backend/src/controllers/audit.controller.ts` |
