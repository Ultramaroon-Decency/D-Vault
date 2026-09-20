# D-Vault Smart Contracts

Smart contracts for decentralized identity registration, on-chain role-based access control (RBAC), and digital asset provenance. Built with Solidity `^0.8.27`, Hardhat, and OpenZeppelin Contracts.

---

## Contract Overview

### 1. `DIDRegistry.sol`
* **Purpose**: Self-sovereign identity registry mapping wallet addresses to Decentralized Identifiers (DIDs).
* **Security Control (VULN-07)**: Newly registered identities are set to `verified = false` by default. Self-registration does not confer automatic verified status; an administrator or governance mechanism must explicitly invoke `setVerified(account, true)` after real-world identity validation.
* **Key Functions**:
  * `registerIdentity(string did)`: Claims a unique DID for `msg.sender`.
  * `setVerified(address account, bool verified)`: Admin-only function to update verification status.
  * `getIdentity(address account)`: Returns `(did, controller, createdAtBlock, verified)`.
  * `getDID(address account)`: Returns the DID string.

### 2. `RBACManager.sol`
* **Purpose**: On-chain access control authority defining roles: `ADMIN`, `MANAGER`, `AUDITOR`, and `USER`.
* **Security Control (VULN-08)**: Admin self-revocation protection (`if (account == msg.sender) revert NotAdmin(msg.sender)`). Prevents the deployer/admin from accidentally revoking their own permissions and bricking the contract.
* **Dual Interface**:
  * Backend interface: Uses `bytes32` role hashes matching `keccak256("ROLE_NAME")`.
  * Frontend interface: Uses `uint8` enum (`NONE=0`, `ADMIN=1`, `MANAGER=2`, `AUDITOR=3`, `USER=4`).
* **Key Functions**:
  * `assignRole(address account, bytes32 role)` / `assignRoleByEnum(address account, uint8 roleEnum)`: Admin-only assignment.
  * `revokeRole(address account)`: Admin-only revocation with self-revocation guard.
  * `canMint(address account)`: Returns `true` only for accounts with `ADMIN` or `MANAGER` role.
  * `isAdmin(address account)`: Returns `true` if account holds `ADMIN_ROLE`.

### 3. `NFTAsset.sol`
* **Purpose**: ERC-721 token representing verified digital assets with immutable on-chain provenance.
* **Integrations**: Integrates OpenZeppelin's `ERC721Enumerable` and references `RBACManager` for authorization.
* **Access Rules**: Only addresses authorized by `RBACManager.canMint()` can invoke `mintAsset()`.

---

## Environment Variables

Configured in `blockchain/.env` (optional for local testing):

```env
# Sepolia Testnet RPC URL (optional - only needed for testnet deployment)
SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Deployer private key (leave empty for local tests)
DEPLOYER_PRIVATE_KEY=

# Gas reporter toggle
REPORT_GAS=false
```

---

## Testing & Execution

All tests execute against the ephemeral local Hardhat network without requiring live network access or real private keys:

```bash
# Install dependencies
npm install

# Compile contracts and generate TypeChain bindings
npm run compile

# Run complete automated test suite (59/59 passing)
npm test

# Launch a local standalone Hardhat JSON-RPC node on http://127.0.0.1:8545
npm run node

# Deploy contracts to local network (with local node running)
npm run deploy:local

# Deploy contracts to Sepolia testnet
npm run deploy:sepolia
```

---

## Verified Test Coverage

```
  DIDRegistry: 10 passing
  NFTAsset: 23 passing
  RBACManager: 26 passing (including VULN-08 self-revocation prevention)
  ---------------------------------
  Total: 59 passing (100% pass rate)
```
