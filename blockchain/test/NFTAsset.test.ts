import { expect } from "chai";
import { ethers } from "hardhat";
import { NFTAsset, RBACManager } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("NFTAsset", function () {
  let rbac: RBACManager;
  let nft: NFTAsset;
  let admin: SignerWithAddress;
  let manager: SignerWithAddress;
  let auditor: SignerWithAddress;
  let regularUser: SignerWithAddress;
  let recipient: SignerWithAddress;

  const METADATA_URI_1 = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
  const METADATA_URI_2 = "ipfs://bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenure7654";

  let MANAGER_ROLE: string;
  let AUDITOR_ROLE: string;
  let USER_ROLE: string;

  beforeEach(async function () {
    [admin, manager, auditor, regularUser, recipient] = await ethers.getSigners();

    // Deploy RBAC
    const RBACManager = await ethers.getContractFactory("RBACManager");
    rbac = await RBACManager.deploy();
    await rbac.waitForDeployment();

    MANAGER_ROLE = await rbac.MANAGER_ROLE();
    AUDITOR_ROLE = await rbac.AUDITOR_ROLE();
    USER_ROLE = await rbac.USER_ROLE();

    // Assign roles
    await rbac.connect(admin).assignRole(manager.address, MANAGER_ROLE);
    await rbac.connect(admin).assignRole(auditor.address, AUDITOR_ROLE);
    await rbac.connect(admin).assignRole(regularUser.address, USER_ROLE);

    // Deploy NFT with RBAC address
    const NFTAsset = await ethers.getContractFactory("NFTAsset");
    nft = await NFTAsset.deploy(await rbac.getAddress());
    await nft.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the correct name and symbol", async function () {
      expect(await nft.name()).to.equal("D-Vault Asset");
      expect(await nft.symbol()).to.equal("DVAULT");
    });

    it("should set the RBAC contract reference", async function () {
      expect(await nft.rbac()).to.equal(await rbac.getAddress());
    });

    it("should start nextTokenId at 1", async function () {
      expect(await nft.nextTokenId()).to.equal(1);
    });

    it("should revert if deployed with zero address for RBAC", async function () {
      const NFTAsset = await ethers.getContractFactory("NFTAsset");
      await expect(NFTAsset.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(nft, "ZeroAddress");
    });
  });

  describe("Minting", function () {
    it("should allow ADMIN to mint", async function () {
      await expect(nft.connect(admin).mint(recipient.address, METADATA_URI_1))
        .to.emit(nft, "NFTMinted")
        .withArgs(1, recipient.address, METADATA_URI_1);

      expect(await nft.ownerOf(1)).to.equal(recipient.address);
      expect(await nft.tokenURI(1)).to.equal(METADATA_URI_1);
    });

    it("should allow MANAGER to mint", async function () {
      await expect(nft.connect(manager).mint(recipient.address, METADATA_URI_1))
        .to.emit(nft, "NFTMinted")
        .withArgs(1, recipient.address, METADATA_URI_1);

      expect(await nft.ownerOf(1)).to.equal(recipient.address);
    });

    it("should auto-increment token IDs", async function () {
      await nft.connect(admin).mint(recipient.address, METADATA_URI_1);
      await nft.connect(admin).mint(recipient.address, METADATA_URI_2);

      expect(await nft.ownerOf(1)).to.equal(recipient.address);
      expect(await nft.ownerOf(2)).to.equal(recipient.address);
      expect(await nft.nextTokenId()).to.equal(3);
    });

    it("should return the minted tokenId", async function () {
      const tokenId = await nft.connect(admin).mint.staticCall(
        recipient.address, METADATA_URI_1
      );
      expect(tokenId).to.equal(1);
    });

    it("should emit Transfer event (ERC-721 standard)", async function () {
      await expect(nft.connect(admin).mint(recipient.address, METADATA_URI_1))
        .to.emit(nft, "Transfer")
        .withArgs(ethers.ZeroAddress, recipient.address, 1);
    });

    it("should revert if AUDITOR tries to mint", async function () {
      await expect(nft.connect(auditor).mint(recipient.address, METADATA_URI_1))
        .to.be.revertedWithCustomError(nft, "NotAuthorizedToMint")
        .withArgs(auditor.address);
    });

    it("should revert if regular USER tries to mint", async function () {
      await expect(nft.connect(regularUser).mint(recipient.address, METADATA_URI_1))
        .to.be.revertedWithCustomError(nft, "NotAuthorizedToMint")
        .withArgs(regularUser.address);
    });

    it("should revert if unregistered address tries to mint", async function () {
      const [, , , , , random] = await ethers.getSigners();
      await expect(nft.connect(random).mint(recipient.address, METADATA_URI_1))
        .to.be.revertedWithCustomError(nft, "NotAuthorizedToMint");
    });

    it("should revert if minting to zero address", async function () {
      await expect(nft.connect(admin).mint(ethers.ZeroAddress, METADATA_URI_1))
        .to.be.revertedWithCustomError(nft, "ZeroAddress");
    });

    it("should revert if metadata URI is empty", async function () {
      await expect(nft.connect(admin).mint(recipient.address, ""))
        .to.be.revertedWithCustomError(nft, "EmptyMetadataURI");
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await nft.connect(admin).mint(recipient.address, METADATA_URI_1);
    });

    it("should allow owner to transfer", async function () {
      await expect(
        nft.connect(recipient).transferFrom(recipient.address, manager.address, 1)
      )
        .to.emit(nft, "Transfer")
        .withArgs(recipient.address, manager.address, 1);

      expect(await nft.ownerOf(1)).to.equal(manager.address);
    });

    it("should update balanceOf after transfer", async function () {
      expect(await nft.balanceOf(recipient.address)).to.equal(1);
      expect(await nft.balanceOf(manager.address)).to.equal(0);

      await nft.connect(recipient).transferFrom(recipient.address, manager.address, 1);

      expect(await nft.balanceOf(recipient.address)).to.equal(0);
      expect(await nft.balanceOf(manager.address)).to.equal(1);
    });

    it("should revert if non-owner tries to transfer", async function () {
      await expect(
        nft.connect(admin).transferFrom(recipient.address, manager.address, 1)
      ).to.be.reverted;
    });
  });

  describe("Read Functions", function () {
    beforeEach(async function () {
      await nft.connect(admin).mint(recipient.address, METADATA_URI_1);
      await nft.connect(admin).mint(recipient.address, METADATA_URI_2);
    });

    it("should return correct tokenURI", async function () {
      expect(await nft.tokenURI(1)).to.equal(METADATA_URI_1);
      expect(await nft.tokenURI(2)).to.equal(METADATA_URI_2);
    });

    it("should return correct ownerOf", async function () {
      expect(await nft.ownerOf(1)).to.equal(recipient.address);
      expect(await nft.ownerOf(2)).to.equal(recipient.address);
    });

    it("should return correct balanceOf", async function () {
      expect(await nft.balanceOf(recipient.address)).to.equal(2);
      expect(await nft.balanceOf(admin.address)).to.equal(0);
    });

    it("should support ERC721 interface", async function () {
      // ERC721 interface ID = 0x80ac58cd
      expect(await nft.supportsInterface("0x80ac58cd")).to.equal(true);
    });

    it("should support ERC721Enumerable interface", async function () {
      // ERC721Enumerable interface ID = 0x780e9d63
      expect(await nft.supportsInterface("0x780e9d63")).to.equal(true);
    });
  });

  describe("Pause / Circuit-Breaker", function () {
    it("should allow admin to pause and block minting", async function () {
      // Admin pauses the contract
      await expect(nft.connect(admin).pause())
        .to.emit(nft, "Paused")
        .withArgs(admin.address);

      // Minting must revert while paused — admin still has onlyMinter rights
      await expect(nft.connect(admin).mint(recipient.address, METADATA_URI_1))
        .to.be.revertedWithCustomError(nft, "EnforcedPause");
    });

    it("should reject pause() from a non-admin account", async function () {
      // manager has canMint but is NOT an admin
      await expect(nft.connect(manager).pause())
        .to.be.revertedWithCustomError(nft, "NotAuthorizedAdmin")
        .withArgs(manager.address);

      // regularUser is also not an admin
      await expect(nft.connect(regularUser).pause())
        .to.be.revertedWithCustomError(nft, "NotAuthorizedAdmin")
        .withArgs(regularUser.address);
    });

    it("should allow admin to unpause and resume minting", async function () {
      // Pause first
      await nft.connect(admin).pause();

      // Confirm minting is blocked
      await expect(nft.connect(admin).mint(recipient.address, METADATA_URI_1))
        .to.be.revertedWithCustomError(nft, "EnforcedPause");

      // Admin unpauses
      await expect(nft.connect(admin).unpause())
        .to.emit(nft, "Unpaused")
        .withArgs(admin.address);

      // Minting resumes successfully
      await expect(nft.connect(admin).mint(recipient.address, METADATA_URI_1))
        .to.emit(nft, "NFTMinted")
        .withArgs(1, recipient.address, METADATA_URI_1);
    });
  });
});
