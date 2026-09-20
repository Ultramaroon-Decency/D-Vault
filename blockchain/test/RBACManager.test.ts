import { expect } from "chai";
import { ethers } from "hardhat";
import { RBACManager } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RBACManager", function () {
  let rbac: RBACManager;
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  // Role constants — must match the contract's keccak256 values
  let ADMIN_ROLE: string;
  let MANAGER_ROLE: string;
  let AUDITOR_ROLE: string;
  let USER_ROLE: string;

  // Role enum values for frontend interface
  const ROLE_ENUM = {
    NONE: 0,
    ADMIN: 1,
    MANAGER: 2,
    AUDITOR: 3,
    USER: 4,
  };

  beforeEach(async function () {
    [admin, user1, user2, user3] = await ethers.getSigners();
    const RBACManager = await ethers.getContractFactory("RBACManager");
    rbac = await RBACManager.deploy();
    await rbac.waitForDeployment();

    // Read the constants from the deployed contract
    ADMIN_ROLE = await rbac.ADMIN_ROLE();
    MANAGER_ROLE = await rbac.MANAGER_ROLE();
    AUDITOR_ROLE = await rbac.AUDITOR_ROLE();
    USER_ROLE = await rbac.USER_ROLE();
  });

  describe("Deployment", function () {
    it("should set deployer as ADMIN", async function () {
      expect(await rbac.getRole(admin.address)).to.equal(ADMIN_ROLE);
      expect(await rbac.roleOf(admin.address)).to.equal(ROLE_ENUM.ADMIN);
      expect(await rbac.isAdmin(admin.address)).to.equal(true);
    });

    it("should set totalRoleAssignments to 1", async function () {
      expect(await rbac.totalRoleAssignments()).to.equal(1);
    });

    it("should emit RoleAssigned event for deployer", async function () {
      // We need to deploy a fresh contract to catch the constructor event
      const RBACManager = await ethers.getContractFactory("RBACManager");
      const freshRbac = await RBACManager.deploy();
      // Constructor events are in the deployment transaction
      const receipt = await freshRbac.deploymentTransaction()!.wait();
      const event = receipt!.logs.find(
        (log) => {
          try {
            const parsed = freshRbac.interface.parseLog({ topics: log.topics as string[], data: log.data });
            return parsed?.name === "RoleAssigned";
          } catch { return false; }
        }
      );
      expect(event).to.not.be.undefined;
    });
  });

  describe("assignRole (bytes32)", function () {
    it("should allow admin to assign MANAGER role", async function () {
      await expect(rbac.connect(admin).assignRole(user1.address, MANAGER_ROLE))
        .to.emit(rbac, "RoleAssigned")
        .withArgs(user1.address, MANAGER_ROLE, admin.address);

      expect(await rbac.getRole(user1.address)).to.equal(MANAGER_ROLE);
      expect(await rbac.roleOf(user1.address)).to.equal(ROLE_ENUM.MANAGER);
    });

    it("should allow admin to assign AUDITOR role", async function () {
      await rbac.connect(admin).assignRole(user1.address, AUDITOR_ROLE);
      expect(await rbac.getRole(user1.address)).to.equal(AUDITOR_ROLE);
      expect(await rbac.roleOf(user1.address)).to.equal(ROLE_ENUM.AUDITOR);
    });

    it("should allow admin to assign USER role", async function () {
      await rbac.connect(admin).assignRole(user1.address, USER_ROLE);
      expect(await rbac.getRole(user1.address)).to.equal(USER_ROLE);
      expect(await rbac.roleOf(user1.address)).to.equal(ROLE_ENUM.USER);
    });

    it("should revert if non-admin tries to assign a role", async function () {
      await expect(rbac.connect(user1).assignRole(user2.address, MANAGER_ROLE))
        .to.be.revertedWithCustomError(rbac, "NotAdmin")
        .withArgs(user1.address);
    });

    it("should revert if assigning to zero address", async function () {
      await expect(rbac.connect(admin).assignRole(ethers.ZeroAddress, MANAGER_ROLE))
        .to.be.revertedWithCustomError(rbac, "ZeroAddress");
    });

    it("should revert for invalid role bytes32", async function () {
      const fakeRole = ethers.keccak256(ethers.toUtf8Bytes("FAKE_ROLE"));
      await expect(rbac.connect(admin).assignRole(user1.address, fakeRole))
        .to.be.revertedWithCustomError(rbac, "InvalidRole")
        .withArgs(fakeRole);
    });

    it("should increment totalRoleAssignments for new assignments", async function () {
      expect(await rbac.totalRoleAssignments()).to.equal(1); // admin from constructor
      await rbac.connect(admin).assignRole(user1.address, MANAGER_ROLE);
      expect(await rbac.totalRoleAssignments()).to.equal(2);
    });

    it("should NOT increment totalRoleAssignments when changing existing role", async function () {
      await rbac.connect(admin).assignRole(user1.address, MANAGER_ROLE);
      expect(await rbac.totalRoleAssignments()).to.equal(2);
      await rbac.connect(admin).assignRole(user1.address, AUDITOR_ROLE);
      expect(await rbac.totalRoleAssignments()).to.equal(2); // unchanged
    });
  });

  describe("assignRoleByEnum (uint8)", function () {
    it("should allow admin to assign role via enum", async function () {
      await rbac.connect(admin).assignRoleByEnum(user1.address, ROLE_ENUM.MANAGER);
      expect(await rbac.roleOf(user1.address)).to.equal(ROLE_ENUM.MANAGER);
      expect(await rbac.getRole(user1.address)).to.equal(MANAGER_ROLE);
    });

    it("should revert for NONE enum (0)", async function () {
      await expect(rbac.connect(admin).assignRoleByEnum(user1.address, ROLE_ENUM.NONE))
        .to.be.reverted;
    });

    it("should revert for out-of-range enum", async function () {
      await expect(rbac.connect(admin).assignRoleByEnum(user1.address, 5))
        .to.be.reverted;
    });
  });

  describe("revokeRole", function () {
    it("should allow admin to revoke a role", async function () {
      await rbac.connect(admin).assignRole(user1.address, MANAGER_ROLE);
      await rbac.connect(admin).revokeRole(user1.address);

      expect(await rbac.getRole(user1.address)).to.equal(ethers.ZeroHash);
      expect(await rbac.roleOf(user1.address)).to.equal(ROLE_ENUM.NONE);
    });

    it("should decrement totalRoleAssignments on revoke", async function () {
      await rbac.connect(admin).assignRole(user1.address, MANAGER_ROLE);
      expect(await rbac.totalRoleAssignments()).to.equal(2);
      await rbac.connect(admin).revokeRole(user1.address);
      expect(await rbac.totalRoleAssignments()).to.equal(1);
    });

    it("should revert if non-admin tries to revoke", async function () {
      await rbac.connect(admin).assignRole(user1.address, MANAGER_ROLE);
      await expect(rbac.connect(user1).revokeRole(user2.address))
        .to.be.revertedWithCustomError(rbac, "NotAdmin");
    });

    it("should revert if admin attempts self-revocation (VULN-08 protection)", async function () {
      await expect(rbac.connect(admin).revokeRole(admin.address))
        .to.be.revertedWithCustomError(rbac, "NotAdmin")
        .withArgs(admin.address);
    });
  });

  describe("canMint", function () {
    it("should return true for ADMIN", async function () {
      expect(await rbac.canMint(admin.address)).to.equal(true);
    });

    it("should return true for MANAGER", async function () {
      await rbac.connect(admin).assignRole(user1.address, MANAGER_ROLE);
      expect(await rbac.canMint(user1.address)).to.equal(true);
    });

    it("should return false for AUDITOR", async function () {
      await rbac.connect(admin).assignRole(user1.address, AUDITOR_ROLE);
      expect(await rbac.canMint(user1.address)).to.equal(false);
    });

    it("should return false for USER", async function () {
      await rbac.connect(admin).assignRole(user1.address, USER_ROLE);
      expect(await rbac.canMint(user1.address)).to.equal(false);
    });

    it("should return false for unregistered address", async function () {
      expect(await rbac.canMint(user1.address)).to.equal(false);
    });
  });

  describe("Role bytes32 constants match backend config", function () {
    it("ADMIN_ROLE should be keccak256('ADMIN_ROLE')", async function () {
      expect(ADMIN_ROLE).to.equal(ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE")));
    });
    it("MANAGER_ROLE should be keccak256('MANAGER_ROLE')", async function () {
      expect(MANAGER_ROLE).to.equal(ethers.keccak256(ethers.toUtf8Bytes("MANAGER_ROLE")));
    });
    it("AUDITOR_ROLE should be keccak256('AUDITOR_ROLE')", async function () {
      expect(AUDITOR_ROLE).to.equal(ethers.keccak256(ethers.toUtf8Bytes("AUDITOR_ROLE")));
    });
    it("USER_ROLE should be keccak256('USER_ROLE')", async function () {
      expect(USER_ROLE).to.equal(ethers.keccak256(ethers.toUtf8Bytes("USER_ROLE")));
    });
  });
});
