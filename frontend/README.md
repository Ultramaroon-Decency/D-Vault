# D-Vault Frontend Web Application

The modern, interactive Web3 user interface for the D-Vault platform. Built with Next.js 16 (App Router), Tailwind CSS, Lucide icons, and ethers.js.

---

## Architecture & Views

The frontend application provides role-conditional access across four organizational roles: **Admin**, **Manager**, **Auditor**, and **User**.

### Key Application Views

1. **Landing & Authentication**:
   - Web3 wallet challenge-response signature flow (MetaMask / EIP-1193).
   - Google Sign-In authentication with client ID credential handoff.
   - Demo self-registration mode with role simulation.
2. **Dashboard Overview**:
   - Global activity metrics, proof badges, and quick-action navigation.
3. **Identity Profile**:
   - Decentralized identifier (DID) lookup, controller mapping, and on-chain verification badge.
4. **Asset Registry & Details**:
   - Digital asset inventory, metadata inspect modal, IPFS CID links, and transfer history.
5. **Mint Asset (Admin / Manager)**:
   - Metadata preparation form with client preview and dispatch to backend asset services.
6. **Role Control & Admin Registration (Admin)**:
   - Assign roles on-chain, manage memberships, and review permission delegations.
7. **Audit Ledger (Admin / Auditor / User)**:
   - Verifiable on-chain audit trail showing historical blocks, transactions, and event hashes.
8. **Security Center (All Roles)**:
   - Real-time operational security dashboard consuming `GET /api/security/status`.
   - Displays 8 live metric pills (JWT Revocation, Non-Root, Magic-Bytes, CSP, etc.).
   - Comprehensive **Threat Protection Matrix** covering 19 attack vectors with honest gap disclosures.
   - **Live Security Demonstrations Panel** (Admin/Auditor): Sends real HTTP calls to the backend proving rejections:
     - 401 without Bearer token
     - 401 with expired/malformed token
     - 403 on cross-user IDOR access
     - 403 on role enumeration
     - 400 on malformed input
     - 200 on security status fetch

---

## Environment Configuration

Configure `.env.local` in `frontend/`:

```env
# Backend API Base URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Google OAuth 2.0 Web Client ID
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## Available Scripts

In the `frontend/` directory:

```bash
# Install dependencies
npm install

# Start development server with Turbopack (http://localhost:3000)
npm run dev

# Compile optimized production build
npm run build

# Start production server
npm run start

# Run strict TypeScript typechecking
npx tsc --noEmit
```

---

## Security Center Integration

The frontend Security Center avoids static or mocked claims. It pulls real-time metadata directly from the backend via the authenticated `GET /api/security/status` endpoint:

* **Token Revocation Status**: Validates `tokenVersion` DB check status.
* **CORS & Origin Safety**: Displays the active whitelist without open wildcards.
* **Body Limits & DoS Controls**: Displays active payload thresholds (100kb).
* **Storage Isolation**: Confirms Docker port isolation and IPFS persistence.
* **Honest Limitations**: Transparently identifies single-admin keys and the absence of dynamic fuzzing / formal verification.
