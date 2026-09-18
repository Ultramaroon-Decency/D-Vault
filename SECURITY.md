# Security Policy

## Supported Versions

The following table lists the release branches and components currently receiving security updates for D-Vault:

| Component | Status | Notes |
| :--- | :--- | :--- |
| **Backend API Gateway** | Supported | Monitored via automated CI audits & Gitleaks |
| **Frontend Web3 App** | Supported | Non-custodial Web3 UI with EIP-712 / SIWE |
| **Smart Contracts (EVM)** | In Development | Under internal testnet audit (Sepolia) |

---

## Reporting a Vulnerability

We take the security of our platform and user assets seriously. If you discover a security vulnerability in D-Vault, please responsibly disclose it so we can address it promptly.

### How to Report

1. **Email / Team Contact**: Please submit report details privately to the project security lead at `security@d-vault.internal` (or via GitHub Private Vulnerability Reporting).
2. **Details to Include**:
   - Component affected (`backend/`, `frontend-web3/`, or `contracts/`)
   - Type of vulnerability (e.g., Auth bypass, Replay attack, Injection, Denial of Service)
   - Step-by-step reproduction instructions or proof-of-concept (PoC)
   - Impact assessment

### Response Timeline
- **Initial Acknowledgment**: Within 24 hours.
- **Triage & Assessment**: Within 48 hours.
- **Fix Deployment**: Dependent on severity; critical flaws are prioritized for same-day hotfixes.

> [!NOTE]
> Please **do not** report vulnerabilities through public GitHub issues, discussions, or pull requests until a fix has been coordinated and deployed.

---

## Threat Model & Security Architecture

A detailed attack surface analysis and threat model is maintained in the repository:

- 📖 **Threat Model Documentation**: [security/docs/threat-model.md](security/docs/threat-model.md)
- 🛡️ **DevOps & QA Overview**: [security/README.md](security/README.md)
- 📋 **Pre-Demo Dependency Checklist**: [security/checklists/dependency-audit-checklist.md](security/checklists/dependency-audit-checklist.md)

---

## Developer Security Checklist

When building features for D-Vault, please adhere to the following security guidelines:

### Frontend (Web3 UI)
- **Do not store JWTs in `localStorage`**: This prevents XSS attacks from easily stealing session tokens. (The backend sets `HttpOnly` cookies for this).
- **Sanitize Input**: Always sanitize user-provided data before rendering it in the DOM to prevent XSS.
- **Wallet Connection**: Handle disconnection properly; clear any local state/cache related to the user's wallet.

### Backend (Node.js API)
- **RBAC**: All new protected routes must implement the Role-Based Access Control middleware to prevent Privilege Escalation.
- **Rate Limiting**: Apply rate-limiting to any route that performs resource-intensive tasks or is susceptible to brute-forcing (e.g., login, file uploads).
- **Avoid Secrets in Code**: Never hardcode API keys, Wallet Private Keys, or database URIs. Use environment variables (`process.env`). Our Gitleaks CI action will catch `.env` files pushed by mistake.

### Smart Contracts (Solidity)
- **Checks-Effects-Interactions**: Follow this pattern strictly to avoid Reentrancy attacks.
- **Access Control**: Use OpenZeppelin's `Ownable` or `AccessControl` for sensitive functions (e.g., minting, pausing).
- **Static Analysis**: Pay attention to the Slither CI output on your Pull Requests and resolve any warnings before merging.
