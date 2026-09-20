# DevOps, Security, and QA Artifacts

Centralized repository for DevOps standards, threat models, security audits, secret scanning, and Quality Assurance (QA) assets across the D-Vault project.

---

## Directory Organization & References

- **CI/CD Workflows**: Central automation pipelines reside in [`.github/workflows/`](../.github/workflows/).
- **Containerization**: Hardened multi-container configurations reside in [`docker-compose.yml`](../docker-compose.yml) and [`backend/Dockerfile`](../backend/Dockerfile).
- **Core Security Documentation**:
  - 📖 [Threat Model & Attack Surface Analysis](docs/threat-model.md)
  - 📋 [Smart Contract Security Checklist](checklists/smart-contract-security-checklist.md)
  - 📋 [Dependency Audit Checklist](checklists/dependency-audit-checklist.md)
  - 📋 [Backend Deployment Checklist](checklists/backend-deployment-checklist.md)
  - 📜 [Comprehensive Security Implementation Report](../SECURITY_AND_IMPLEMENTATION_CHANGES.md)

---

## Implemented Security Controls

### 1. Authentication & Session Defense
* **High-Entropy JWT Secrets**: Zod schema in `backend/src/config/env.ts` enforces $\ge 32$ characters of random entropy on startup.
* **Token Lifetime Minimization**: Short default token lifetime of 1 hour (`1h`).
* **Active Token Revocation**: User model in PostgreSQL tracks `tokenVersion`. On logout (`POST /api/auth/logout`) and new login, `tokenVersion` increments; requests with stale tokens are rejected.
* **Nonce Invalidation**: Single-use UUID challenges with automatic cleanup of expired and consumed nonces.
* **Google CDN Sanitization**: OAuth picture URLs are strictly validated to official Google CDN hostnames (`lh3-lh6.googleusercontent.com`).

### 2. Authorization & Data Access
* **IDOR Protection**: `GET /api/users/:address` and `GET /api/users/:address/did` enforce `requireSelfOrAdmin`. Cross-user inspection is forbidden for non-admins.
* **Role Enumeration Defense**: `GET /api/roles/:address` enforces `requireSelfOrAdmin` to prevent administrative reconnaissance.
* **Audit Event Filtering**: `GET /api/audit` strictly allowlists acceptable `eventType` parameters (`DIDCreated`, `RoleAssigned`, `NFTMinted`, `Transfer`, etc.).

### 3. API & Infrastructure Hardening
* **Strict Content Security Policy**: Helmet configured with explicit CSP directives restricting script execution, style sources, frame ancestors, and RPC connection origins.
* **Request Body Capping**: Express body parsers capped at `100kb` to prevent memory-exhaustion DoS.
* **Layered Rate Limiting**: Multi-tier limits with Redis store integration and graceful in-memory fallback.
* **Binary Magic-Byte Inspection**: File uploads inspect binary header signatures (JPEG, PNG, GIF, WEBP, PDF) rather than trusting client-provided `Content-Type` headers.
* **Non-Root Container**: Backend container executes under dedicated unprivileged `appuser:appgroup`.
* **PostgreSQL Isolation**: Host port mapping (`5432:5432`) is removed from `docker-compose.yml`, restricting database connectivity to the internal Docker network.

### 4. Smart Contract Defenses (`blockchain/contracts/`)
* **DID Registry Safeguard (VULN-07)**: New identities register with `verified = false`. Verification requires administrative validation via `setVerified()`.
* **Admin Self-Revocation Guard (VULN-08)**: `RBACManager.sol` explicitly reverts if an administrator attempts to revoke their own role, preventing contract lockout.

---

## Secret Scanning & Pre-Commit Protection

We utilize **Gitleaks** to prevent secret leakage:

### Configuration
- Root configuration: [`.gitleaks.toml`](../.gitleaks.toml)
- Secondary configuration: [`security/scripts/gitleaks-config.toml`](scripts/gitleaks-config.toml)
- Shell scan script: [`security/scripts/scan-secrets.sh`](scripts/scan-secrets.sh)

### Running Secret Scans Locally
```bash
# Run gitleaks against repository history and uncommitted changes
gitleaks detect --config=.gitleaks.toml --verbose
```

---

## Verified Audit & Test Status

All security tests and build verifications have been executed and verified:

| Component | Target / Test Suite | Verified Status |
|---|---|---|
| **Backend Unit Tests** | 3 suites (`auth`, `rbac`, `audit`) | ✅ **21/21 passed** |
| **Backend Lint** | ESLint across `src/**/*.ts` | ✅ **0 errors, 0 warnings** |
| **Backend Compilation** | TypeScript (`tsc`) | ✅ **0 compiler errors** |
| **Frontend Production Build** | Next.js 16 (Turbopack) | ✅ **Compiled successfully** |
| **Frontend Type Safety** | `tsc --noEmit` | ✅ **0 type errors** |
| **Smart Contract Tests** | 3 suites (`DIDRegistry`, `NFTAsset`, `RBACManager`) | ✅ **59/59 passed** |
| **Secret Tracking** | Git index tracking check | ✅ **No `.env` files tracked** |
