import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("═══════════════════════════════════════════════════════");
  console.log("  D-Vault Local Deployment (Hardhat Node)");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Deployer:  ${deployer.address}`);
  console.log(`  Balance:   ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("───────────────────────────────────────────────────────");

  // ---- 1. Deploy RBACManager (no dependencies) ----
  console.log("\n[1/3] Deploying RBACManager...");
  const RBACManager = await ethers.getContractFactory("RBACManager");
  const rbac = await RBACManager.deploy();
  await rbac.waitForDeployment();
  const rbacAddress = await rbac.getAddress();
  console.log(`  ✅ RBACManager deployed at: ${rbacAddress}`);

  // ---- 2. Deploy DIDRegistry (no dependencies) ----
  console.log("\n[2/3] Deploying DIDRegistry...");
  const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
  const did = await DIDRegistry.deploy();
  await did.waitForDeployment();
  const didAddress = await did.getAddress();
  console.log(`  ✅ DIDRegistry deployed at: ${didAddress}`);

  // ---- 3. Deploy NFTAsset (depends on RBACManager) ----
  console.log("\n[3/3] Deploying NFTAsset...");
  const NFTAsset = await ethers.getContractFactory("NFTAsset");
  const nft = await NFTAsset.deploy(rbacAddress);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log(`  ✅ NFTAsset deployed at: ${nftAddress}`);

  // ---- Write deployment addresses to JSON ----
  const deployments = {
    RBAC_CONTRACT_ADDRESS: rbacAddress,
    DID_REGISTRY_ADDRESS: didAddress,
    NFT_ASSET_ADDRESS: nftAddress,
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outputPath = path.join(deploymentsDir, "localhost.json");
  fs.writeFileSync(outputPath, JSON.stringify(deployments, null, 2) + "\n");

  // ---- Summary ----
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`\n  Addresses written to: ${outputPath}`);
  console.log(`\n  # Backend .env`);
  console.log(`  DID_REGISTRY_ADDRESS=${didAddress}`);
  console.log(`  RBAC_CONTRACT_ADDRESS=${rbacAddress}`);
  console.log(`  NFT_ASSET_ADDRESS=${nftAddress}`);
  console.log(`\n  # Frontend .env.local`);
  console.log(`  NEXT_PUBLIC_DID_REGISTRY_ADDRESS=${didAddress}`);
  console.log(`  NEXT_PUBLIC_RBAC_ADDRESS=${rbacAddress}`);
  console.log(`  NEXT_PUBLIC_NFT_ADDRESS=${nftAddress}`);
  console.log("\n═══════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
