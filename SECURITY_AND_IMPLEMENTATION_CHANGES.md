# D-Vault Security & Implementation Changes

This document provides a comprehensive technical record of all security controls, architectural refactorings, hardening measures, and test verifications implemented across the D-Vault monorepo.

---

## 1. Overview

A thorough security audit of the original D-Vault prototype revealed critical vulnerabilities across multiple layers:
- **Authentication & Authorization**: Weak JWT secret entropy, long token lifetimes (7 days), lack of token revocation upon logout or compromise, and missing ownership checks (IDOR) on profile and role inspection routes.
- **Smart Contracts**: Auto-verification of newly registered DIDs (allowing unvetted self-sovereign identity claims) and vulnerability to irreversible contract lockout via admin self-revocation in the access control contract.
- **API & Input Processing**: Large request payload limits (10MB) exposing endpoints to memory exhaustion, reliance on spoofable client-supplied MIME headers during file uploads, and lack of Content Security Policy.
- **Infrastructure & Secrets**: Plaintext passwords in container orchestration files, PostgreSQL database ports exposed directly to the host network, containers executing as `root`, and risk of secret leakage.

To resolve these vulnerabilities without disrupting core business functionality, targeted security enhancements were implemented across the backend, smart contracts, Docker configurations, and frontend interface. Additionally, a **Security Center** was integrated into the frontend to provide real-time verification of operational defenses.

---

## 2. Authentication Changes

### 2.1 Enforced High-Entropy JWT Secret (VULN-01)
* **Location**: [`backend/src/config/env.ts`](backend/src/config/env.ts)
* **Implementation**: The Zod environment validation schema enforces that `JWT_SECRET` must contain a minimum of 32 characters of high-entropy data. If a weak or default placeholder string is provided, the server aborts startup immediately with a descriptive error.

### 2.2 Shortened Token Lifetime (VULN-02)
* **Location**: [`backend/src/config/env.ts`](backend/src/config/env.ts), [`backend/.env.example`](backend/.env.example)
* **Implementation**: Reduced the default `JWT_EXPIRES_IN` duration from 7 days (`7d`) to 1 hour (`1h`). This significantly minimizes the window of opportunity for an attacker if a token is intercepted.

### 2.3 Per-User Token Revocation via `tokenVersion` (VULN-03)
* **Locations**:
  * [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)
  * [`backend/src/types/index.ts`](backend/src/types/index.ts)
  * [`backend/src/services/auth.service.ts`](backend/src/services/auth.service.ts)
  * [`backend/src/services/googleAuth.service.ts`](backend/src/services/googleAuth.service.ts)
  * [`backend/src/middleware/auth.middleware.ts`](backend/src/middleware/auth.middleware.ts)
* **Implementation**:
  * Added `tokenVersion Int @default(0)` to the `User` table in PostgreSQL.
  * Encoded `tokenVersion` into the signed JWT payload upon wallet login and Google OAuth.
  * In the `authenticate` middleware, the user record is queried from PostgreSQL to compare `userRecord.tokenVersion === decoded.tokenVersion`. If the version does not match, a `401 Unauthorized` ("Token has been revoked. Please login again.") is returned.
  * The version counter automatically increments upon every new login, invalidating previously issued tokens.

### 2.4 Token Invalidation / Logout Endpoint
* **Locations**:
  * [`backend/src/routes/auth.routes.ts`](backend/src/routes/auth.routes.ts)
  * [`backend/src/controllers/auth.controller.ts`](backend/src/controllers/auth.controller.ts)
  * [`backend/src/services/auth.service.ts`](backend/src/services/auth.service.ts)
* **Implementation**: Added authenticated endpoint `POST /api/auth/logout`. Calling this route invokes `logoutUser(userId)`, which atomically increments `tokenVersion` in PostgreSQL. All previously issued JWTs for that user become permanently invalid.

### 2.5 Nonce Lifecycle & Automatic Cleanup (VULN-23)
* **Location**: [`backend/src/services/auth.service.ts`](backend/src/services/auth.service.ts)
* **Implementation**: Challenge nonces generated for SIWE (Sign-In with Ethereum) are single-use UUIDs with an expiration window of 300 seconds (`NONCE_TTL_SECONDS`). Added `cleanupExpiredNonces()` on each `issueNonce()` call to asynchronously purge consumed and expired challenges, preventing database bloat and replay surface.

### 2.6 Google Profile Picture CDN Host Validation (VULN-24)
* **Location**: [`backend/src/services/googleAuth.service.ts`](backend/src/services/googleAuth.service.ts)
* **Implementation**: Sanitizes profile picture URLs returned from Google ID tokens. URLs are strictly validated against Google's trusted CDN hosts (`lh3.googleusercontent.com` through `lh6.googleusercontent.com`). Untrusted URLs or arbitrary domains are stripped to prevent SSRF and XSS vectors.

---

## 3. Authorization & RBAC Changes

### 3.1 IDOR Protection on User Profile Endpoints (VULN-04)
* **Location**: [`backend/src/routes/user.routes.ts`](backend/src/routes/user.routes.ts)
* **Implementation**: Added the `requireSelfOrAdmin` route guard to `GET /api/users/:address` and `GET /api/users/:address/did`. A request is permitted only if the authenticated caller's wallet matches `:address` (case-insensitive) or if the caller holds the `ADMIN` role. Unauthorized requests receive `403 Forbidden`.

### 3.2 Role Enumeration & Reconnaissance Protection (VULN-05)
* **Location**: [`backend/src/routes/role.routes.ts`](backend/src/routes/role.routes.ts)
* **Implementation**: Added `requireSelfOrAdmin` guard to `GET /api/roles/:address`. Previously, unauthenticated or regular users could enumerate the roles of arbitrary wallet addresses to identify administrator accounts. Now, users can only inspect their own role unless they possess `ADMIN` privileges.

### 3.3 Audit Event Type Query Allowlist (VULN-20)
* **Location**: [`backend/src/controllers/audit.controller.ts`](backend/src/controllers/audit.controller.ts)
* **Implementation**: In `GET /api/audit`, the `eventType` query filter is strictly validated against an allowlist of valid system events: `DIDCreated`, `RoleAssigned`, `NFTMinted`, `Transfer`, `PermissionUpdated`, `AuthFailure`, `AuthorizationFailure`. Arbitrary or probe strings return `400 Bad Request`.

---

## 4. API Security

### 4.1 Strict Content Security Policy via Helmet (VULN-21)
* **Location**: [`backend/src/app.ts`](backend/src/app.ts)
* **Implementation**: Configured Helmet with explicit CSP directives:
  - `defaultSrc: ["'self'"]`
  - `scriptSrc: ["'self'"]`
  - `styleSrc: ["'self'", "'unsafe-inline'"]`
  - `imgSrc`: Allowed `'self'`, `data:`, Google CDNs, and Pinata IPFS gateway.
  - `connectSrc`: Allowed `'self'`, Infura Sepolia RPC, public Sepolia RPC, and Pinata API.
  - `objectSrc: ["'none'"]`, `frameSrc: ["'none'"]`
  - `crossOriginEmbedderPolicy: false` (to support external Web3 wallet injection).

### 4.2 Restrictive CORS Configuration
* **Locations**: [`backend/src/config/env.ts`](backend/src/config/env.ts), [`backend/src/app.ts`](backend/src/app.ts)
* **Implementation**: `CORS_ORIGIN` is validated at startup as a valid HTTP/HTTPS URL via Zod. Wildcard `*` origins are rejected, and credentials are explicitly bound to the configured origin.

### 4.3 Payload Size Limiting (VULN-15)
* **Location**: [`backend/src/app.ts`](backend/src/app.ts)
* **Implementation**: Reduced body parser limits from Express default 10MB down to `100kb` for both `express.json()` and `express.urlencoded()`. Large JSON payloads designed to cause denial of service via memory saturation are rejected with `413 Payload Too Large`.

### 4.4 Distributed Rate Limiting with Fallback (VULN-16)
* **Location**: [`backend/src/app.ts`](backend/src/app.ts)
* **Implementation**: Integrated `express-rate-limit` with dynamic Redis store attachment. When `REDIS_URL` is defined, rate limiting state is stored in Redis to enforce shared limits across multi-container deployments. If Redis is unavailable or unconfigured, it gracefully falls back to memory-based tracking.

### 4.5 Production Health Check Hardening (VULN-13)
* **Location**: [`backend/src/app.ts`](backend/src/app.ts)
* **Implementation**: `GET /health` returns internal system information (environment, version, blockchain mock status, IPFS mock status) in development, but strips all internal metadata in production (`NODE_ENV === 'production'`), returning only `{ "success": true, "status": "ok" }`.

---

## 5. File Upload Security

### 5.1 Magic-Byte Binary Content Inspection (VULN-18)
* **Location**: [`backend/src/services/asset.service.ts`](backend/src/services/asset.service.ts)
* **Implementation**: Client-provided `Content-Type` headers are considered untrusted. Uploaded file buffers are inspected directly using binary magic-byte signatures:
  - **JPEG**: `0xFF, 0xD8, 0xFF`
  - **PNG**: `0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A`
  - **GIF**: `0x47, 0x49, 0x46, 0x38`
  - **WEBP**: `0x57, 0x45, 0x42, 0x50` (offset 8)
  - **PDF**: `0x25, 0x50, 0x44, 0x46` (`%PDF`)
* **Spoofing Defense**: If an attacker disguises executable or malicious content with a `.png` filename or fake MIME header, the buffer inspection fails, the spoofing attempt is logged, and the upload is rejected with `400 Bad Request`.

---

## 6. Smart Contract Security

### 6.1 DID Registry Default Verification Disabled (VULN-07)
* **Locations**: [`blockchain/contracts/DIDRegistry.sol`](blockchain/contracts/DIDRegistry.sol), [`blockchain/test/DIDRegistry.test.ts`](blockchain/test/DIDRegistry.test.ts)
* **Implementation**: In `registerIdentity()`, newly registered identities are initialized with `verified = false` (previously hardcoded to `true`). Self-registration establishes decentralized record ownership, but administrative verification requires an authorized administrator to invoke `setVerified(address, true)`.
* **Testing**: Updated unit tests to assert `verified === false` on registration.

### 6.2 Admin Self-Revocation Lockout Guard (VULN-08)
* **Locations**: [`blockchain/contracts/RBACManager.sol`](blockchain/contracts/RBACManager.sol), [`blockchain/test/RBACManager.test.ts`](blockchain/test/RBACManager.test.ts)
* **Implementation**: Inside `revokeRole(address account)`, added an explicit self-check:
  ```solidity
  if (account == msg.sender) revert NotAdmin(msg.sender);
  ```
  This prevents an administrator from revoking their own `ADMIN` role, which would permanently lock the contract and destroy governance capabilities.
* **Testing**: Added automated unit test verifying that `revokeRole(admin.address)` reverts with custom error `NotAdmin(admin.address)`.

---

## 7. Infrastructure & DevOps Security

### 7.1 Non-Root Backend Docker Container (VULN-12)
* **Location**: [`backend/Dockerfile`](backend/Dockerfile)
* **Implementation**: Added dedicated system group `appgroup` and unprivileged user `appuser` (`RUN addgroup -S appgroup && adduser -S appuser -G appgroup`). The runner stage executes under `USER appuser`, restricting the process permissions if the application runtime is compromised.

### 7.2 Database Port Host Isolation (VULN-11)
* **Location**: [`docker-compose.yml`](docker-compose.yml)
* **Implementation**: Removed `ports: ["5432:5432"]` mapping from the `postgres` service. The PostgreSQL database is accessible exclusively across the private Docker bridge network (`d-vault-network`), eliminating direct exposure to host network interfaces.

### 7.3 Injected Database Password Environment Variable (VULN-10)
* **Location**: [`docker-compose.yml`](docker-compose.yml)
* **Implementation**: Replaced hardcoded plaintext password with `${POSTGRES_PASSWORD:?}` requirement, preventing deployment without a secure environment variable.

### 7.4 Secret Scanning Configuration
* **Location**: [`.gitleaks.toml`](.gitleaks.toml)
* **Implementation**: Added root Gitleaks configuration defining detection rules for Ethereum private keys, weak JWT secret placeholders, plaintext database URLs, and Pinata JWT tokens.

---

## 8. Frontend Security Center

* **Locations**:
  * Backend API: [`backend/src/routes/security.routes.ts`](backend/src/routes/security.routes.ts)
  * Frontend Component: [`frontend/app/page.tsx`](frontend/app/page.tsx)
  * Frontend Styles: [`frontend/app/globals.css`](frontend/app/globals.css)
* **Design & Architecture**:
  The Security Center is an interactive control dashboard accessible to all authenticated roles. It queries `GET /api/security/status` to retrieve safe, operational metadata (strictly omitting secrets, keys, or passwords).
* **Displayed Controls**:
  1. **Status Metric Badges**: Live indicators for JWT Revocation, Non-Root Container, Magic-Bytes, CSP, Rate Limiting, and CORS Safety.
  2. **Threat Protection Matrix**: Maps 19 real-world threat vectors against specific implemented mitigations.
  3. **Live Demonstration Console (Admin / Auditor)**: Real interactive HTTP calls proving:
     - Missing Bearer Token $\rightarrow$ `401 Unauthorized`
     - Expired/Malformed Token $\rightarrow$ `401 Unauthorized`
     - IDOR Cross-User Profile $\rightarrow$ `403 Forbidden`
     - IDOR Cross-User Role $\rightarrow$ `403 Forbidden`
     - Invalid Nonce Address $\rightarrow$ `400 Bad Request`
     - Security Status API $\rightarrow$ `200 OK`
  4. **Honest Gap Disclosures**: Clear callouts for non-implemented items (single-admin key without multi-sig, absence of dynamic penetration testing / formal verification).

---

## 9. Testing & Verification

Every test suite and build pipeline was executed and verified:

| Test / Build Target | Execution Command | Result |
|---|---|---|
| **Backend TypeScript Build** | `cd backend && npm run build` | ✅ **Exit 0** (0 errors) |
| **Backend Unit Tests** | `cd backend && npm test` | ✅ **Exit 0** (**21/21 passed**, 3 suites: auth, rbac, audit) |
| **Backend Linter** | `cd backend && npm run lint` | ✅ **Exit 0** (0 errors, 0 warnings) |
| **Frontend Production Build** | `cd frontend && npm run build` | ✅ **Exit 0** (Next.js 16 build succeeded) |
| **Frontend Type Safety** | `cd frontend && npx tsc --noEmit` | ✅ **Exit 0** (0 type errors) |
| **Smart Contract Tests** | `cd blockchain && npm test` | ✅ **Exit 0** (**59/59 passed**) |
| **Secret & Git Tracking** | `git ls-files --stage *env*` | ✅ **Exit 0** (0 `.env` files tracked) |

---

## 10. Known Limitations / Remaining Work

1. **JWT in `localStorage`**:
   - The frontend currently holds JWTs in client `localStorage`. While mitigated by 1-hour expiration and `tokenVersion` revocation on logout, full hardening against XSS exfiltration requires transitioning to `httpOnly`, `Secure`, `SameSite=Strict` cookies with CSRF token protection.
2. **Single Administrator Key (No Multi-Sig)**:
   - Contract deployments and administrative functions rely on a single deployer private key. Production mainnet deployment should transfer administrative ownership to a multi-signature safe (e.g., Safe / Gnosis Safe).
3. **Absence of Dynamic Fuzzing & External Audit**:
   - The security implementation has been validated via static analysis and unit testing; automated dynamic penetration testing and third-party formal audit have not been conducted.
4. **Redis Required for Multi-Instance Deployments**:
   - The rate limiter runs in memory by default. In multi-container or horizontally scaled deployments, `REDIS_URL` must be configured to share rate limits across instances.

---

## 11. Files Changed

### Backend
* [`backend/src/config/env.ts`](backend/src/config/env.ts): Enforced 32-char JWT secret, 1h default expiry, valid CORS URL, and startup warnings.
* [`backend/src/app.ts`](backend/src/app.ts): Added strict Helmet CSP, 100kb body limit, Redis rate limiter, production health check, and security route mounting.
* [`backend/src/middleware/auth.middleware.ts`](backend/src/middleware/auth.middleware.ts): Integrated `tokenVersion` database validation on authenticated requests.
* [`backend/src/services/auth.service.ts`](backend/src/services/auth.service.ts): Added nonce cleanup, `tokenVersion` incrementation on login, and `logoutUser()`.
* [`backend/src/services/googleAuth.service.ts`](backend/src/services/googleAuth.service.ts): Added Google CDN picture domain validation and `tokenVersion` support.
* [`backend/src/routes/auth.routes.ts`](backend/src/routes/auth.routes.ts) & [`backend/src/controllers/auth.controller.ts`](backend/src/controllers/auth.controller.ts): Added `POST /api/auth/logout`.
* [`backend/src/routes/user.routes.ts`](backend/src/routes/user.routes.ts): Added IDOR protection (`requireSelfOrAdmin`).
* [`backend/src/routes/role.routes.ts`](backend/src/routes/role.routes.ts): Added role enumeration protection (`requireSelfOrAdmin`).
* [`backend/src/routes/security.routes.ts`](backend/src/routes/security.routes.ts): **[NEW]** Operational security metadata endpoint (`GET /api/security/status`).
* [`backend/src/services/asset.service.ts`](backend/src/services/asset.service.ts): Implemented magic-byte binary header inspection.
* [`backend/src/controllers/audit.controller.ts`](backend/src/controllers/audit.controller.ts): Added eventType allowlist check.
* [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma): Added `tokenVersion` field to User model.
* [`backend/Dockerfile`](backend/Dockerfile): Configured non-root execution (`appuser:appgroup`).
* [`backend/jest.config.ts`](backend/jest.config.ts): Ignored `dist/` to eliminate haste-map mock conflicts.
* [`backend/.eslintrc.json`](backend/.eslintrc.json) & [`backend/package.json`](backend/package.json): Resolved ESLint flat config collision and cross-platform execution.

### Blockchain
* [`blockchain/contracts/DIDRegistry.sol`](blockchain/contracts/DIDRegistry.sol): Default `verified: false` on DID registration; administrative `setVerified()`.
* [`blockchain/contracts/RBACManager.sol`](blockchain/contracts/RBACManager.sol): Prohibited admin self-revocation in `revokeRole()`.
* [`blockchain/test/DIDRegistry.test.ts`](blockchain/test/DIDRegistry.test.ts): Asserted `verified === false` on registration.
* [`blockchain/test/RBACManager.test.ts`](blockchain/test/RBACManager.test.ts): Added unit test for self-revocation prevention.
* [`blockchain/.env`](blockchain/.env): Cleared private key placeholder.

### Frontend
* [`frontend/app/page.tsx`](frontend/app/page.tsx): Added Security Center navigation, real-time status matrix, and live HTTP proof tests.
* [`frontend/app/globals.css`](frontend/app/globals.css): Styled Security Center dashboard, threat matrix, and live test console.

### Infrastructure & Security
* [`docker-compose.yml`](docker-compose.yml): Removed database host port mapping and parameterized PostgreSQL password.
* [`.gitleaks.toml`](.gitleaks.toml): **[NEW]** Root secret scanning detection rules.

---

## 12. Running the Updated Project Locally

### Services Breakdown

| Service | Port | Terminal Required? | Details |
|---|---|---|---|
| **Frontend** | `http://localhost:3000` | Terminal 1 (`frontend/`) | Next.js development server |
| **Backend API** | `http://localhost:5000` | Terminal 2 (`backend/`) | Express.js API |
| **Database** | `localhost:5432` | Background or Native | PostgreSQL (`sih_db`) |
| **Hardhat Node** | `http://127.0.0.1:8545` | Optional (Terminal 3) | Not required when `BLOCKCHAIN_MOCK=true` |
| **Redis** | `localhost:6379` | Optional | In-memory fallback active if absent |

---

### Step-by-Step Commands

#### Step 1: Database Setup
Ensure PostgreSQL is running locally on port 5432 with database `sih_db`:
```bash
cd backend
npx prisma db push
npx ts-node -T prisma/seed.ts
```

#### Step 2: Start Backend
```bash
cd backend
npm run build
node dist/server.js
# Or: npm run dev
```

#### Step 3: Start Frontend
```bash
cd frontend
npm run dev
```

#### Step 4: Access the Application
Open your browser at:
👉 **`http://localhost:3000`**

---

## 13. Practical Security Verification & Demonstration

The implemented security controls can be verified locally through simple HTTP commands:

### 1. Test Missing Token (Expected: 401 Unauthorized)
```bash
curl -i http://localhost:5000/api/users/0x1111111111111111111111111111111111111111
# Returns: HTTP 401 Unauthorized ("Bearer token is required")
```

### 2. Test Invalid Nonce Address (Expected: 400 Bad Request)
```bash
curl -i -X POST http://localhost:5000/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"not-an-eth-address"}'
# Returns: HTTP 400 Bad Request ("walletAddress must be a valid Ethereum address")
```

### 3. Test Production Health Hardening
```bash
curl http://localhost:5000/health
# Returns clean status object with strict security headers (CSP, HSTS, X-Content-Type-Options)
```

### 4. Interactive Live Demos in UI
Navigate to **Security Center** in the sidebar (Admin or Auditor role) and click the **Test Live** buttons to observe genuine HTTP requests and real-time backend rejections.
