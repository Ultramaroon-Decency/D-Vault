/**
 * Contract addresses and ABIs for the D-Vault smart contracts deployed on Sepolia.
 * Addresses are pulled from NEXT_PUBLIC_* environment variables set in .env.local.
 */

export const CONTRACT_ADDRESSES = {
  nft:         (process.env.NEXT_PUBLIC_NFT_ADDRESS          ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
  rbac:        (process.env.NEXT_PUBLIC_RBAC_ADDRESS         ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
  didRegistry: (process.env.NEXT_PUBLIC_DID_REGISTRY_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
} as const

export const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '11155111')

// ─── NFTAsset ABI (minimal — only what the frontend calls) ────────────────────

export const NFT_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to',          type: 'address' },
      { name: 'metadataURI', type: 'string'  },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '',        type: 'address' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '',        type: 'string'  }],
  },
  {
    name: 'NFTMinted',
    type: 'event',
    inputs: [
      { name: 'tokenId',     type: 'uint256', indexed: true  },
      { name: 'owner',       type: 'address', indexed: true  },
      { name: 'metadataCID', type: 'string',  indexed: false },
    ],
  },
  {
    name: 'pause',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'unpause',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const
