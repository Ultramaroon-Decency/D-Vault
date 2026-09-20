# D-Vault

[![Backend CI](https://github.com/rakshitgarg18/D-Vault/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/rakshitgarg18/D-Vault/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/rakshitgarg18/D-Vault/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/rakshitgarg18/D-Vault/actions/workflows/frontend-ci.yml)
[![Contracts CI](https://github.com/rakshitgarg18/D-Vault/actions/workflows/contracts-ci.yml/badge.svg)](https://github.com/rakshitgarg18/D-Vault/actions/workflows/contracts-ci.yml)

**Blockchain-Based Secure Platform for Decentralized Identity (DID), Role-Based Access Control (RBAC), and Verifiable Digital Asset Management.**

---

## Monorepo Architecture

- **[`backend/`](backend/)**: REST API service built with Express.js, TypeScript, and Prisma ORM. Handles SIWE-inspired challenge-response wallet authentication, Google OAuth 2.0 token verification, token revocation via database `tokenVersion`, role assignment, metadata preparation with magic-byte file validation, audit logging, and the live Security Status API.
- **[`frontend/`](frontend/)**: **(Active)** Production Next.js 16 Web3 user interface featuring wallet connectivity, self-registration, role switcher (Admin, Manager, Auditor, User), digital asset registry, on-chain minting, and an interactive **Security Center** dashboard.
- **[`blockchain/`](blockchain/)**: Ethereum smart contracts written in Solidity `^0.8.27` managed with Hardhat. Includes `DIDRegistry.sol` (decentralized identity mapping), `RBACManager.sol` (role control with admin self-revocation protection), and `NFTAsset.sol` (ERC-721 digital asset ownership).
- **[`security/`](security/)**: DevOps guidelines, threat modeling specifications, vulnerability remediation documentation, and Gitleaks scanning configuration.
- **[`frontend-web3/`](frontend-web3/)**: *(Deprecated)* Legacy frontend prototype kept for reference.
- **[`docker-compose.yml`](docker-compose.yml)**: Hardened multi-container environment with non-root backend execution, Redis rate-limiting store, and internal database network isolation.

---

## Key Security Features

1. **Token Revocation (`tokenVersion`)**: Database-tracked token versioning increments on logout (`POST /api/auth/logout`) and new login, immediately revoking stale or stolen JWTs.
2. **Short-Lived JWTs & High Entropy**: JWT expiration reduced to 1 hour (`1h`) and signing secret enforced to $\ge 32$ characters of random entropy via Zod validation.
3. **IDOR & Role Reconnaissance Protection**: Strict server-side `requireSelfOrAdmin` guards on `GET /api/users/:address` and `GET /api/roles/:address`.
4. **Content Security Policy & Strict Headers**: Helmet configured with restrictive CSP directives, isolating allowed frame, script, object, and connect origins.
5. **Magic-Byte Binary Inspection**: File uploads inspect binary header magic bytes (JPEG, PNG, GIF, WEBP, PDF) rather than trusting client-provided `Content-Type` headers.
6. **Payload Size Capping**: Request bodies strictly capped at `100kb` to prevent memory-exhaustion DoS attacks.
7. **Smart Contract Safeguards**:
   - `DIDRegistry.sol`: Newly registered DIDs default to `verified = false`, preventing identity spoofing without administrative verification.
   - `RBACManager.sol`: Admin self-revocation is explicitly prohibited, preventing permanent contract lockout.
8. **Interactive Security Center**: Real-time frontend dashboard at `/` (Security Center tab) showing live backend defenses, threat matrix, and live HTTP proof actions.

---

## Local Development Quickstart

D-Vault supports both **native development mode** (using local Node.js and embedded PostgreSQL) and **containerized Docker mode**.

### Prerequisites
- Node.js `18.0.0+` (Node 20+ recommended)
- npm `9+`
- (Optional) Docker and Docker Compose

---

### Option A: Native Local Run (Recommended for Dev & Demo)

#### 1. Configure Environment Files

**Backend (`backend/.env`):**
```env
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
DATABASE_URL="postgresql://postgres:D-Vault_dev_only_change_in_prod@localhost:5432/sih_db?schema=public"
JWT_SECRET=d3v3lopm3nt_s3cr3t_k3y_32chars_REPLACE_THIS_NOW
JWT_EXPIRES_IN=1h
NONCE_TTL_SECONDS=300
BLOCKCHAIN_MOCK=true
IPFS_MOCK=true
ADMIN_EMAILS=admin@dvault.internal
MANAGER_EMAILS=manager@dvault.internal
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

#### 2. Install Dependencies & Build
```bash
# Backend
cd backend
npm install
npm run build

# Frontend
cd ../frontend
npm install
npm run build

# Blockchain (Smart Contracts)
cd ../blockchain
npm install
npm test
```

#### 3. Start the Database & Seed Roles
If running PostgreSQL natively or via embedded-postgres on port 5432:
```bash
cd backend
npx prisma db push
npx ts-node -T prisma/seed.ts
```

#### 4. Launch Services
Open separate terminals:

* **Terminal 1 (Backend API):**
  ```bash
  cd backend
  node dist/server.js
  # Or: npm run dev
  # Running at http://localhost:5000
  ```

* **Terminal 2 (Frontend UI):**
  ```bash
  cd frontend
  npm run dev
  # Running at http://localhost:3000
  ```

* **Terminal 3 (Optional: Hardhat Local Node):**
  ```bash
  cd blockchain
  npm run node
  # Running at http://127.0.0.1:8545
  ```

---

### Option B: Docker Compose

For containerized deployment:
```bash
POSTGRES_PASSWORD=your_secure_db_password docker compose up --build
```

*Note: In Docker mode, PostgreSQL port `5432` is kept on the internal bridge network for security and is not mapped to the host.*

---

## Service Endpoints & Verification

| Service | Local URL | Description |
|---|---|---|
| **Frontend Web App** | `http://localhost:3000` | DataVault UI, Wallet Connect, Asset Management, Security Center |
| **Backend Health** | `http://localhost:5000/health` | Health check endpoint (strips debug info in production) |
| **Security Status API** | `http://localhost:5000/api/security/status` | Operational security control metadata (JWT authenticated) |
| **Local Ethereum Node** | `http://127.0.0.1:8545` | Hardhat standalone node (when running local chain) |

---

## Test Suites & Validation

All automated test suites are operational and verified:

```bash
# Run backend tests (21/21 passing)
cd backend && npm test

# Run backend linter (0 errors, 0 warnings)
cd backend && npm run lint

# Run smart contract tests (59/59 passing)
cd blockchain && npm test

# Verify frontend type safety (0 errors)
cd frontend && npx tsc --noEmit

# Run frontend production build
cd frontend && npm run build
```

---

## Documentation Directory

- **[Detailed Security & Implementation Changes](SECURITY_AND_IMPLEMENTATION_CHANGES.md)**: Full audit trail of every security fix, architecture change, and demonstration guide.
- **[Backend Documentation](backend/README.md)**: API route specification, auth architecture, and controller reference.
- **[Frontend Documentation](frontend/README.md)**: UI components, theme tokens, Security Center architecture, and state management.
- **[Blockchain Documentation](blockchain/README.md)**: Smart contract specifications, deployment scripts, and Hardhat test configurations.
- **[Security & DevOps](security/README.md)**: Threat modeling, CI/CD pipelines, secret scanning, and hardening checklists.
