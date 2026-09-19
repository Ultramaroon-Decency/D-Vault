// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title NFTAsset
 * @notice ERC-721 NFT contract for D-Vault digital asset ownership.
 *         Only authorized users (Admin or Manager, verified via the RBAC contract)
 *         can mint new NFTs. Each NFT stores an IPFS metadata CID on-chain.
 *
 * @dev Inherits OpenZeppelin's ERC721, ERC721URIStorage, ERC721Enumerable, and Pausable.
 *      - Minting is gated by a call to the external RBAC contract's `canMint()`.
 *      - Emits a custom `NFTMinted` event alongside the standard ERC-721 `Transfer`.
 *      - Auto-incrementing token IDs starting from 1.
 *      - Emergency pause/unpause is gated by `isAdmin()` on the RBAC contract.
 */

/// @notice Interface for the RBAC contract's authorization checks.
interface IRBACManager {
    function canMint(address account) external view returns (bool);
    function isAdmin(address account) external view returns (bool);
}

contract NFTAsset is ERC721, ERC721URIStorage, ERC721Enumerable, Pausable {

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @notice Reference to the RBAC contract for authorization checks
    IRBACManager public immutable rbac;

    /// @notice Auto-incrementing counter for token IDs (starts at 1)
    uint256 private _nextTokenId;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when a new NFT is minted.
    ///         Backend event listener subscribes to this alongside ERC-721 Transfer.
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string  metadataCID
    );

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotAuthorizedToMint(address caller);
    error NotAuthorizedAdmin(address caller);
    error EmptyMetadataURI();
    error ZeroAddress();

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyMinter() {
        if (!rbac.canMint(msg.sender)) revert NotAuthorizedToMint(msg.sender);
        _;
    }

    modifier onlyAdmin() {
        if (!rbac.isAdmin(msg.sender)) revert NotAuthorizedAdmin(msg.sender);
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @notice Initialize the NFT contract with a reference to the RBAC contract.
     * @param rbacAddress The deployed address of the RBACManager contract.
     */
    constructor(address rbacAddress) ERC721("D-Vault Asset", "DVAULT") {
        if (rbacAddress == address(0)) revert ZeroAddress();
        rbac = IRBACManager(rbacAddress);
        _nextTokenId = 1; // Start token IDs at 1
    }

    // ─── Emergency Pause ──────────────────────────────────────────────────────

    /// @notice Pause the contract. Only callable by an RBAC admin.
    function pause() external onlyAdmin {
        _pause();
    }

    /// @notice Unpause the contract. Only callable by an RBAC admin.
    function unpause() external onlyAdmin {
        _unpause();
    }

    // ─── Minting ──────────────────────────────────────────────────────────────

    /**
     * @notice Mint a new NFT to the specified address with the given metadata URI.
     *         Only callable by users with ADMIN or MANAGER role (checked via RBAC).
     *         Reverts if the contract is paused.
     *
     *         Used by the frontend's `useMintAsset` hook:
     *         `mint(to, metadataURI) → tokenId`
     *
     * @param to          The address to mint the NFT to.
     * @param metadataURI The IPFS URI of the NFT metadata (e.g. "ipfs://bafy...")
     * @return tokenId    The ID of the newly minted token.
     */
    function mint(address to, string calldata metadataURI) external onlyMinter whenNotPaused returns (uint256) {
        if (to == address(0)) revert ZeroAddress();
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit NFTMinted(tokenId, to, metadataURI);

        return tokenId;
    }

    // ─── View Helpers ─────────────────────────────────────────────────────────

    /**
     * @notice Get the next token ID that will be minted.
     * @return The next token ID.
     */
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    // ─── Required Overrides (Solidity multiple inheritance) ────────────────────

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
