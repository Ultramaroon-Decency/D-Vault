# D-Vault Backend API Service

REST API service for the D-Vault decentralized identity, role-based access control, and verifiable digital asset management platform. Built with Express.js, TypeScript, Prisma ORM, and Ethers.js.

---

## Tech Stack & Dependencies

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js 18+ (Node 20+ recommended) | JavaScript/TypeScript execution environment |
| **Framework** | Express.js 4.19 + TypeScript 5.5 | HTTP routing and middleware pipeline |
| **Database** | PostgreSQL 16+ via Prisma ORM 5.14 | Relational data persistence with parameterized queries |
| **Auth & Crypto** | Ethers.js v6, jsonwebtoken, UUID v4 | ECDSA signature verification, SIWE challenge generation, JWT issuance |
| **OAuth** | google-auth-library 11.0 | Server-side Google ID token cryptographic verification |
| **Security** | Helmet 7.1, express-rate-limit 7.3, CORS | Content Security Policy, rate limiting, and CORS validation |
| **File Upload** | Multer 2.0 (memory storage) + Magic-Byte Engine | Binary inspection (JPEG, PNG, GIF, WEBP, PDF) before IPFS pinning |
| **IPFS / Web3** | Pinata REST API + Sepolia Contract Bindings | Decentralized metadata pinning and blockchain event indexing |
| **Testing** | Jest 29.7 + Supertest 7.0 + ts-jest | Unit and integration test suites (**21/21 passed**) |

---

## Architecture & Security Controls

1. **JWT Expiry & Invalidation**:
   - Secrets must contain at least 32 characters of high-entropy data (enforced via Zod schema at startup).
   - Tokens default to a short 1-hour expiration (`1h`).
   - Every user record contains a `tokenVersion` counter. Whenever a user logs out (`POST /api/auth/logout`) or logs in, the version is incremented. The `authenticate` middleware compares the token claim against PostgreSQL; stale tokens are immediately rejected with `401 Unauthorized`.
2. **Access Control (IDOR & Role Reconnaissance)**:
   - `GET /api/users/:address` and `GET /api/users/:address/did` verify the caller is requesting their own address or has `ADMIN` role.
   - `GET /api/roles/:address` prevents unauthenticated or cross-user reconnaissance of administrative accounts.
3. **API Defenses & Headers**:
   - **Helmet CSP**: Restrictive policy (`default-src 'self'`, `object-src 'none'`, `frame-src 'none'`, explicit wallet RPC & Pinata connect origins).
   - **Payload Limit**: `express.json` and `express.urlencoded` restricted to `100kb` to thwart body-overflow DoS.
   - **Rate Limiting**: Multi-tier limits (100 req / 15 min globally; 10 req / 15 min for auth endpoints), with Redis backing when `REDIS_URL` is set and in-memory fallback.
   - **Health Endpoint**: `GET /health` strips environment and mock details when running in `production`.
4. **Magic-Byte Binary Inspection**:
   - File uploads in `POST /api/assets/metadata` inspect actual binary headers (magic numbers) to verify valid image or PDF content rather than blindly trusting the client `Content-Type` header. Spoofing attempts are logged and rejected.

---

## Environment Variables Configuration

Create a `.env` file in `backend/` (modeled after `.env.example`):

```env
# ---- Server Configuration ----
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# ---- Database ----
# In Docker mode, this uses postgres:5432. In native mode, localhost:5432.
DATABASE_URL="postgresql://postgres:D-Vault_dev_only_change_in_prod@localhost:5432/sih_db?schema=public"

# ---- JWT Authentication ----
# Minimum 32 characters required by env validation
JWT_SECRET=d3v3lopm3nt_s3cr3t_k3y_32chars_REPLACE_THIS_NOW
JWT_EXPIRES_IN=1h
NONCE_TTL_SECONDS=300

# ---- Blockchain (Sepolia) ----
BLOCKCHAIN_MOCK=true
CHAIN_ID=11155111
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
DID_REGISTRY_ADDRESS=0x0000000000000000000000000000000000000000
RBAC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
NFT_ASSET_ADDRESS=0x0000000000000000000000000000000000000000

# ---- IPFS / Pinata ----
IPFS_MOCK=true
PINATA_JWT=your-pinata-jwt-token
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/

# ---- Rate Limiting ----
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10
# REDIS_URL=redis://localhost:6379   # Optional: falls back to in-memory

# ---- Google OAuth & Whitelists ----
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
ADMIN_EMAILS=admin@dvault.internal
MANAGER_EMAILS=manager@dvault.internal
```

---

## API Reference

### 1. Authentication
* **`POST /api/auth/nonce`**
  * *Access*: Public (Rate limited: 10/15min)
  * *Body*: `{ "walletAddress": "0x..." }`
  * *Response*: `{ "success": true, "data": { "nonce": "...", "message": "...", "expiresAt": "..." } }`
* **`POST /api/auth/verify`**
  * *Access*: Public (Rate limited: 10/15min)
  * *Body*: `{ "walletAddress": "0x...", "signature": "0x..." }`
  * *Response*: `{ "success": true, "data": { "token": "...", "expiresIn": "1h" } }`
* **`POST /api/auth/google/verify`**
  * *Access*: Public (Rate limited: 10/15min)
  * *Body*: `{ "idToken": "..." }`
  * *Response*: `{ "success": true, "data": { "token": "...", "user": { ... } } }`
* **`GET /api/auth/me`**
  * *Access*: Authenticated (Bearer JWT)
  * *Response*: Current authenticated user profile and active role
* **`POST /api/auth/logout`**
  * *Access*: Authenticated (Bearer JWT)
  * *Action*: Increments `tokenVersion` in PostgreSQL, invalidating all issued tokens for this user
  * *Response*: `{ "success": true, "data": { "message": "Logged out successfully. All tokens invalidated." } }`

### 2. User & Identity Management
* **`GET /api/users/:address`**
  * *Access*: Authenticated (Requester must be `:address` OR have `ADMIN` role)
  * *Response*: User record with linked DID, display name, and auth provider
* **`GET /api/users/:address/did`**
  * *Access*: Authenticated (Self or Admin)
  * *Response*: Decentralized identifier string

### 3. Role Control (RBAC)
* **`POST /api/roles/assign`**
  * *Access*: `ADMIN` role only
  * *Body*: `{ "walletAddress": "0x...", "role": "MANAGER" | "AUDITOR" | "USER" }`
* **`GET /api/roles/:address`**
  * *Access*: Authenticated (Self or Admin)
  * *Response*: Effective assigned role for the specified address

### 4. Assets & Metadata
* **`POST /api/assets/metadata`**
  * *Access*: `MANAGER` or `ADMIN`
  * *Form-Data*: `name`, `description`, `assetType`, `ownerDID`, `file` (optional binary; verified by magic bytes)
  * *Response*: IPFS CID, gateway URI, and metadata object
* **`GET /api/assets`**
  * *Access*: Authenticated
  * *Query*: `?page=1&limit=20&ownerAddress=0x...`
* **`GET /api/assets/:tokenId`** & **`GET /api/assets/:tokenId/history`**
  * *Access*: Authenticated

### 5. Audit & Security Status
* **`GET /api/audit`**
  * *Access*: `AUDITOR` or `ADMIN`
  * *Query*: `?page=1&limit=20&eventType=NFTMinted&actorAddress=0x...`
  * *Validation*: `eventType` validated against `VALID_EVENT_TYPES` allowlist
* **`GET /api/security/status`**
  * *Access*: Authenticated (All roles)
  * *Response*: Real-time operational security configuration (no secrets exposed), consumed by the frontend Security Center
* **`GET /health`**
  * *Access*: Public
  * *Response*: `{ "success": true, "status": "ok" }` (environment details omitted in production)

---

## Development & Testing Commands

```bash
# Install dependencies
npm install

# Build TypeScript to dist/
npm run build

# Run unit and integration tests (21/21 passing)
npm test

# Run ESLint validation (0 errors, 0 warnings)
npm run lint

# Synchronize database schema
npx prisma db push

# Seed initial roles (ADMIN, MANAGER, AUDITOR, USER)
npm run prisma:seed

# Start development server
npm run dev
# Or execute compiled bundle:
npm run start
```
