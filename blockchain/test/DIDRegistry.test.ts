import { expect } from "chai";
import { ethers } from "hardhat";
import { DIDRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("DIDRegistry", function () {
  let registry: DIDRegistry;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const DID_1 = "did:ethr:sepolia:0x1234567890abcdef1234567890abcdef12345678";
  const DID_2 = "did:ethr:sepolia:0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const didRegistryFactory = await ethers.getContractFactory("DIDRegistry");
    registry = await didRegistryFactory.deploy() as unknown as DIDRegistry;
    await registry.waitForDeployment();
  });

  describe("registerIdentity", function () {
    it("should register a DID for the caller", async function () {
      await expect(registry.connect(user1).registerIdentity(DID_1))
        .to.emit(registry, "DIDCreated")
        .withArgs(user1.address, DID_1);

      const did = await registry.getDID(user1.address);
      expect(did).to.equal(DID_1);
    });

    it("should increment totalIdentities on registration", async function () {
      expect(await registry.totalIdentities()).to.equal(0);
      await registry.connect(user1).registerIdentity(DID_1);
      expect(await registry.totalIdentities()).to.equal(1);
      await registry.connect(user2).registerIdentity(DID_2);
      expect(await registry.totalIdentities()).to.equal(2);
    });

    it("should revert if DID string is empty", async function () {
      await expect(registry.connect(user1).registerIdentity(""))
        .to.be.revertedWithCustomError(registry, "EmptyDID");
    });

    it("should revert if caller already has a registered DID", async function () {
      await registry.connect(user1).registerIdentity(DID_1);
      await expect(registry.connect(user1).registerIdentity(DID_2))
        .to.be.revertedWithCustomError(registry, "AlreadyRegistered")
        .withArgs(user1.address);
    });
  });

  describe("getIdentity", function () {
    it("should return full identity record", async function () {
      const tx = await registry.connect(user1).registerIdentity(DID_1);
      const receipt = await tx.wait();
      const blockNumber = receipt!.blockNumber;

      const [did, controller, createdAtBlock, verified] =
        await registry.getIdentity(user1.address);

      expect(did).to.equal(DID_1);
      expect(controller).to.equal(user1.address);
      expect(createdAtBlock).to.equal(blockNumber);
      // SECURITY FIX (VULN-07): verified is false by default after registration.
      // Admin must call setVerified(address, true) to verify after a real identity check.
      expect(verified).to.equal(false);
    });

    it("should revert for unregistered address", async function () {
      await expect(registry.getIdentity(user1.address))
        .to.be.revertedWithCustomError(registry, "NotRegistered")
        .withArgs(user1.address);
    });
  });

  describe("getDID", function () {
    it("should return the DID string for a registered user", async function () {
      await registry.connect(user1).registerIdentity(DID_1);
      expect(await registry.getDID(user1.address)).to.equal(DID_1);
    });

    it("should return empty string for unregistered user", async function () {
      expect(await registry.getDID(user1.address)).to.equal("");
    });
  });

  describe("hasIdentity", function () {
    it("should return true for registered user", async function () {
      await registry.connect(user1).registerIdentity(DID_1);
      expect(await registry.hasIdentity(user1.address)).to.equal(true);
    });

    it("should return false for unregistered user", async function () {
      expect(await registry.hasIdentity(user1.address)).to.equal(false);
    });
  });
});
