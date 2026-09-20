// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title RBACManager
 * @notice Role-Based Access Control for D-Vault.
 *         Manages role assignments on-chain. The deployer is automatically
 *         granted the ADMIN role. Only ADMINs can assign or revoke roles.
 *
 * @dev Dual interface to satisfy both frontend (uint8 enum) and backend (bytes32 hash):
 *      - Backend: getRole(address) → bytes32, assignRole(address, bytes32)
 *      - Frontend: roleOf(address) → uint8, assignRole(address, uint8)
 *
 *      Role bytes32 constants match the pre-computed keccak256 hashes in
 *      backend/src/config/contracts.ts.
 */
contract RBACManager {

    // ─── Role Constants (bytes32) ─────────────────────────────────────────────
    // These MUST match the backend's ROLE_BYTES32 config.

    bytes32 public constant ADMIN_ROLE   = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant USER_ROLE    = keccak256("USER_ROLE");

    // ─── Role Enum (uint8 — for frontend) ─────────────────────────────────────

    enum RoleEnum {
        NONE,       // 0
        ADMIN,      // 1
        MANAGER,    // 2
        AUDITOR,    // 3
        USER        // 4
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @notice Maps wallet address → role (bytes32)
    mapping(address => bytes32) private _roles;

    /// @notice Total number of role assignments
    uint256 public totalRoleAssignments;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when a role is assigned or changed.
    event RoleAssigned(
        address indexed account,
        bytes32 indexed role,
        address indexed assignedBy
    );

    /// @notice Emitted when permissions are updated (role changed or revoked).
    event PermissionUpdated(
        address indexed account,
        bytes32 indexed role
    );

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotAdmin(address caller);
    error InvalidRole(bytes32 role);
    error ZeroAddress();
    error RoleAlreadySet(address account, bytes32 role);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        if (_roles[msg.sender] != ADMIN_ROLE) revert NotAdmin(msg.sender);
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @notice Deployer is automatically granted ADMIN role.
     */
    constructor() {
        _roles[msg.sender] = ADMIN_ROLE;
        totalRoleAssignments = 1;

        emit RoleAssigned(msg.sender, ADMIN_ROLE, msg.sender);
    }

    // ─── Write Functions ──────────────────────────────────────────────────────

    /**
     * @notice Assign a role to an account using bytes32 role hash.
     *         Used by the backend's event system.
     * @param account The wallet address to assign the role to.
     * @param role    The bytes32 role hash (ADMIN_ROLE, MANAGER_ROLE, etc.)
     */
    function assignRole(address account, bytes32 role) external onlyAdmin {
        _assignRole(account, role);
    }

    /**
     * @notice Assign a role to an account using uint8 enum.
     *         Used by the frontend's `useAssignRole` hook.
     * @param account  The wallet address to assign the role to.
     * @param roleEnum The role as a uint8 enum value (0-4).
     */
    function assignRoleByEnum(address account, uint8 roleEnum) external onlyAdmin {
        bytes32 role = _enumToBytes32(RoleEnum(roleEnum));
        _assignRole(account, role);
    }

    /**
     * @notice Revoke a role from an account (set to NONE / zero bytes).
     * @param account The wallet address to revoke the role from.
     *
     * SECURITY FIX (VULN-08): Admin cannot revoke their own role.
     * This prevents the sole admin from permanently bricking the contract
     * with no recovery path.
     */
    function revokeRole(address account) external onlyAdmin {
        if (account == address(0)) revert ZeroAddress();
        // SECURITY: Prevent admin self-revocation which would permanently lock the contract
        if (account == msg.sender) revert NotAdmin(msg.sender);

        bytes32 previousRole = _roles[account];
        _roles[account] = bytes32(0);

        emit PermissionUpdated(account, bytes32(0));
        emit RoleAssigned(account, bytes32(0), msg.sender);

        // Only decrement if they actually had a role
        if (previousRole != bytes32(0) && totalRoleAssignments > 0) {
            totalRoleAssignments--;
        }
    }

    // ─── Read Functions ───────────────────────────────────────────────────────

    /**
     * @notice Get the role of an account as bytes32 hash.
     *         Used by the backend's `blockchain.service.ts → getUserRole()`.
     * @param account The wallet address to look up.
     * @return The bytes32 role hash.
     */
    function getRole(address account) external view returns (bytes32) {
        return _roles[account];
    }

    /**
     * @notice Get the role of an account as uint8 enum.
     *         Used by the frontend's `useUserRole` hook.
     * @param account The wallet address to look up.
     * @return The role as a uint8 (0=NONE, 1=ADMIN, 2=MANAGER, 3=AUDITOR, 4=USER).
     */
    function roleOf(address account) external view returns (uint8) {
        return uint8(_bytes32ToEnum(_roles[account]));
    }

    /**
     * @notice Check if an account has the ADMIN role.
     * @param account The wallet address to check.
     * @return True if the account is an admin.
     */
    function isAdmin(address account) external view returns (bool) {
        return _roles[account] == ADMIN_ROLE;
    }

    /**
     * @notice Check if an account can mint NFTs (ADMIN or MANAGER).
     * @param account The wallet address to check.
     * @return True if the account can mint.
     */
    function canMint(address account) external view returns (bool) {
        return _roles[account] == ADMIN_ROLE || _roles[account] == MANAGER_ROLE;
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────────

    function _assignRole(address account, bytes32 role) internal {
        if (account == address(0)) revert ZeroAddress();
        if (!_isValidRole(role)) revert InvalidRole(role);

        bool isNewAssignment = _roles[account] == bytes32(0);
        _roles[account] = role;

        if (isNewAssignment) {
            totalRoleAssignments++;
        }

        emit RoleAssigned(account, role, msg.sender);
        emit PermissionUpdated(account, role);
    }

    function _isValidRole(bytes32 role) internal pure returns (bool) {
        return role == ADMIN_ROLE
            || role == MANAGER_ROLE
            || role == AUDITOR_ROLE
            || role == USER_ROLE;
    }

    function _enumToBytes32(RoleEnum role) internal pure returns (bytes32) {
        if (role == RoleEnum.ADMIN)   return ADMIN_ROLE;
        if (role == RoleEnum.MANAGER) return MANAGER_ROLE;
        if (role == RoleEnum.AUDITOR) return AUDITOR_ROLE;
        if (role == RoleEnum.USER)    return USER_ROLE;
        revert InvalidRole(bytes32(uint256(role)));
    }

    function _bytes32ToEnum(bytes32 role) internal pure returns (RoleEnum) {
        if (role == ADMIN_ROLE)   return RoleEnum.ADMIN;
        if (role == MANAGER_ROLE) return RoleEnum.MANAGER;
        if (role == AUDITOR_ROLE) return RoleEnum.AUDITOR;
        if (role == USER_ROLE)    return RoleEnum.USER;
        return RoleEnum.NONE;
    }
}
