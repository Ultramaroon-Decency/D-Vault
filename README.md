# D-Vault

[![Backend CI](https://github.com/rakshitgarg18/D-Vault/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/rakshitgarg18/D-Vault/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/rakshitgarg18/D-Vault/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/rakshitgarg18/D-Vault/actions/workflows/frontend-ci.yml)
[![Contracts CI](https://github.com/rakshitgarg18/D-Vault/actions/workflows/contracts-ci.yml/badge.svg)](https://github.com/rakshitgarg18/D-Vault/actions/workflows/contracts-ci.yml)

Blockchain-based secure platform for Decentralized Identity (DID), Role-Based Access Control (RBAC), and verifiable digital asset management.

---

## Monorepo Architecture

- **[`backend/`](backend/)**: Node.js & Express REST API built with TypeScript, Prisma ORM, Ethers.js, SIWE (Sign-In with Ethereum), and Google OAuth.
- **[`frontend-web3/`](frontend-web3/)**: **(Active)** Web3 user interface built with Next.js, featuring SIWE wallet authentication, RBAC dashboards, asset management, audit logs, and DID identity views.
- **[`frontend/`](frontend/)**: **(Deprecated)** Early scaffold with Google Sign-In only — not used.
- **[`blockchain/`](blockchain/)**: Hardhat workspace with Solidity smart contracts (RBACManager, DIDRegistry, NFTAsset).
- **[`security/`](security/)**: Centralized hub for DevOps, security audits, secret scanning, QA scripts, and deployment logs.
- **[`docker-compose.yml`](docker-compose.yml)**: Multi-container local orchestration (PostgreSQL 16, Backend API, Frontend, Hardhat Node).

---

## Local Development Quickstart

### 1. Configure Environment Variables

**Backend (`backend/.env`):**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/sih_db?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-in-production
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
BLOCKCHAIN_MOCK=false
# Fill these after running deploy:local
DID_REGISTRY_ADDRESS=0x...
RBAC_CONTRACT_ADDRESS=0x...
NFT_ASSET_ADDRESS=0x...
```

**Frontend (`frontend-web3/.env.local`):**
```env
NEXT_PUBLIC_USE_MOCK_DATA=false
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=demo-project-id
# Fill these after running deploy:local
NEXT_PUBLIC_DID_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_NFT_ADDRESS=0x...
NEXT_PUBLIC_RBAC_ADDRESS=0x...
```

> **Note:** To obtain a WalletConnect Project ID, visit [WalletConnect Cloud](https://cloud.walletconnect.com). For Google Sign-In support, obtain a Client ID from the [Google Cloud Console](https://console.cloud.google.com).

### 2. Start Services
```bash
# Start all services using Docker Compose
docker compose up --build -d

# Important: After the database is up, run Prisma migrations to apply the schema
cd backend
npx prisma migrate dev
```

### 3. Access the applications
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/health
- **PostgreSQL**: localhost:5432
- **Hardhat Node**: http://localhost:8545

For security auditing, secret scanning, and pre-commit checks, refer to [`security/README.md`](security/README.md).
