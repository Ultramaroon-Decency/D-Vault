# D-Vault — Local Stack Restart Guide
### (For demo day or after any laptop restart)

---

## What's Running and Where

| Service | URL | How it was started |
|---|---|---|
| **PostgreSQL 16** | `localhost:5432` | Windows Service (auto-starts on boot) |
| **Hardhat Node** | `http://127.0.0.1:8545` | Terminal 1 — `npm run node` in `blockchain/` |
| **Backend API** | `http://localhost:5000` | Terminal 2 — `npm run dev` in `backend/` |
| **Frontend** | `http://localhost:3000` | Terminal 3 — `npm run dev` in `frontend-web3/` |

---

## ⚠️ IMPORTANT: Hardhat is ephemeral!

Every time you restart the Hardhat node, it creates a **brand new chain** with **new contract addresses**.
You MUST re-run `npm run deploy:local` after every Hardhat restart and update the `.env` files with the new addresses.

PostgreSQL data **persists** across restarts (it's a real service, not in-memory).

---

## Restart Sequence (run in this exact order)

### Step 1 — Verify PostgreSQL is running (it should auto-start on Windows boot)
Open PowerShell and check:
```powershell
Get-Service postgresql-x64-16
```
If Status shows `Running` — you're good. If `Stopped`, start it:
```powershell
Start-Service postgresql-x64-16
```

### Step 2 — Start Hardhat Node (Terminal 1 — keep this open the whole session)
```bash
cd "C:\Users\Rakshit Garg\Desktop\New folder\D-Vault\blockchain"
npm run node
```
Leave this terminal open. You'll see 20 accounts printed — that means it's ready.

### Step 3 — Deploy contracts to the fresh Hardhat chain (Terminal 2, while Terminal 1 is still running)
```bash
cd "C:\Users\Rakshit Garg\Desktop\New folder\D-Vault\blockchain"
npm run deploy:local
```
This prints 3 contract addresses AND writes them to `blockchain/deployments/localhost.json`.

### Step 4 — Update .env files with the new addresses
Open `backend/.env` and update these 3 lines with the addresses from Step 3:
```
DID_REGISTRY_ADDRESS=0x<new address>
RBAC_CONTRACT_ADDRESS=0x<new address>
NFT_ASSET_ADDRESS=0x<new address>
```

Open `frontend-web3/.env.local` and update these 3 lines:
```
NEXT_PUBLIC_DID_REGISTRY_ADDRESS=0x<new address>
NEXT_PUBLIC_RBAC_ADDRESS=0x<new address>
NEXT_PUBLIC_NFT_ADDRESS=0x<new address>
```

> **Tip**: The addresses from a fresh Hardhat node are always deterministic in the same order:
> - Contract 1 (RBACManager): `0x5FbDB2315678afecb367f032d93F642f64180aa3`
> - Contract 2 (DIDRegistry): `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
> - Contract 3 (NFTAsset): `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
>
> These are **always the same** on a fresh `npm run node` because Hardhat is deterministic.
> So you can skip Step 4 if these haven't changed — just verify they match!

### Step 5 — Start Backend (Terminal 3)
```bash
cd "C:\Users\Rakshit Garg\Desktop\New folder\D-Vault\backend"
npm run dev
```
Wait for: `🚀 SIH Backend running on port 5000`
Verify: Open browser → `http://localhost:5000/health` → should return `{"success":true,"status":"ok"}`

### Step 6 — Start Frontend (Terminal 4)
```bash
cd "C:\Users\Rakshit Garg\Desktop\New folder\D-Vault\frontend-web3"
npm run dev
```
Wait for: `✓ Ready in Xs`
Open browser → `http://localhost:3000`

---

## Quick Health Check (run after everything is up)
```powershell
# In any terminal — verifies backend is alive
Invoke-RestMethod http://localhost:5000/health
```
Expected: `success: True, status: ok`

---

## First Time Only (already done — don't repeat)
- PostgreSQL install: done
- `npx prisma migrate dev` in `backend/`: done (DB schema already applied)
- These don't need to be repeated unless you wipe the database.

---

## If something goes wrong

**Backend crashes immediately?**
- Check `backend/.env` has the right `DATABASE_URL` (password = `password`)
- Make sure PostgreSQL service is running (Step 1)

**Frontend shows "cannot connect to backend"?**
- Make sure backend is running on port 5000
- Check `frontend-web3/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:5000`

**Wallet connect / contract errors?**
- Hardhat was probably restarted — redo Steps 3 & 4 to redeploy contracts and update addresses

**Port already in use?**
```powershell
# Find and kill whatever is on port 5000
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```
