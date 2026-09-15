export type Role = 'Admin' | 'Manager' | 'Auditor' | 'User'
export type ActivityType =
  | 'Identity created'
  | 'NFT minted'
  | 'Role assigned'
  | 'Ownership transferred'
  | 'Asset updated'
  | 'Asset revoked'
  | 'Identity deactivated'

export type Asset = {
  id: string
  name: string
  collection: string
  tokenId: string
  standard: 'ERC-721' | 'ERC-1155'
  status: 'Verified' | 'Pending' | 'Revoked'
  color: string
  owner: string
  description?: string
  provenance: { action: string; detail: string; time: string; hash: string }[]
}

export type AuditEntry = {
  type: ActivityType
  actor: string
  target: string
  time: string
  hash: string
  tone: string
}

export type Member = {
  address: string
  name: string
  memberRole: Role
  status: 'Active' | 'Inactive'
}

export const currentIdentity = {
  did: 'did:ethr:0x71C7...9a42',
  address: '0x71C7 4e8A 92d1 6F0c 8c21 9a42',
  created: '08 Mar 2026',
  key: 'secp256k1 · 0x03b7...1d90',
  network: 'Ethereum Sepolia',
}

export const initialAssets: Asset[] = [
  {
    id: 'asset-01',
    name: 'Aegis Pass / Genesis',
    collection: 'Aegis Credentials',
    tokenId: '#000184',
    standard: 'ERC-721',
    status: 'Verified',
    color: 'mint',
    owner: '0x71C7...9a42',
    description: 'Genesis pass granting core protocol access and verifiable operator privileges.',
    provenance: [
      { action: 'Current owner', detail: 'DID ownership verified', time: 'Today · 09:42', hash: '0x91ab...c20f' },
      { action: 'Transferred', detail: 'From 0x9ac2...8d14', time: '21 Mar 2026', hash: '0x75fd...21bc' },
      { action: 'Minted', detail: 'By 0x4df1...aa08', time: '17 Mar 2026', hash: '0x1e44...09d2' },
    ],
  },
  {
    id: 'asset-02',
    name: 'Orbital Relay',
    collection: 'Protocol Objects',
    tokenId: '#004812',
    standard: 'ERC-1155',
    status: 'Verified',
    color: 'amber',
    owner: '0x71C7...9a42',
    description: 'Decentralized message relay authorization token for distributed mesh nodes.',
    provenance: [
      { action: 'Current owner', detail: 'DID ownership verified', time: 'Today · 09:41', hash: '0x0c8e...ae12' },
      { action: 'Minted', detail: 'By 0x4df1...aa08', time: '11 Mar 2026', hash: '0x8a10...31fe' },
    ],
  },
  {
    id: 'asset-03',
    name: 'Vault Key / Level 03',
    collection: 'Aegis Credentials',
    tokenId: '#000071',
    standard: 'ERC-721',
    status: 'Verified',
    color: 'blue',
    owner: '0x71C7...9a42',
    description: 'Hardware security enclave authorization key with level 3 cryptographic credentials.',
    provenance: [
      { action: 'Current owner', detail: 'DID ownership verified', time: 'Yesterday · 16:20', hash: '0x4f19...b02d' },
      { action: 'Minted', detail: 'By 0x4df1...aa08', time: '02 Mar 2026', hash: '0x2bfa...11c0' },
    ],
  },
  {
    id: 'asset-04',
    name: 'Field Credential',
    collection: 'Operator Keys',
    tokenId: '#010208',
    standard: 'ERC-1155',
    status: 'Pending',
    color: 'coral',
    owner: '0x71C7...9a42',
    description: 'Field inspection clearance credential for designated infrastructure auditors.',
    provenance: [
      { action: 'Current owner', detail: 'Awaiting block confirmation', time: 'Today · 09:38', hash: '0xac11...f8e0' },
      { action: 'Minted', detail: 'By 0x4df1...aa08', time: 'Today · 09:38', hash: '0xac11...f8e0' },
    ],
  },
]

export const assets: Asset[] = initialAssets

export const initialAuditEntries: AuditEntry[] = [
  { type: 'NFT minted', actor: 'did:ethr:0x4df1...aa08', target: 'Orbital Relay · #004812', time: '2 min ago', hash: '0x8a10...31fe', tone: 'amber' },
  { type: 'Ownership transferred', actor: 'did:ethr:0x9ac2...8d14', target: 'Aegis Pass / Genesis', time: '24 min ago', hash: '0x75fd...21bc', tone: 'mint' },
  { type: 'Role assigned', actor: 'did:ethr:0x4df1...aa08', target: 'Manager → 0x4df1...aa08', time: '1 hr ago', hash: '0x3b10...fa42', tone: 'blue' },
  { type: 'Identity created', actor: 'did:ethr:0x71c7...9a42', target: 'New sovereign identity', time: '3 hr ago', hash: '0x91ab...c20f', tone: 'mint' },
  { type: 'NFT minted', actor: 'did:ethr:0x4df1...aa08', target: 'Field Credential · #010208', time: '5 hr ago', hash: '0xac11...f8e0', tone: 'amber' },
]

export const auditEntries = initialAuditEntries

export const initialMembers: Member[] = [
  { address: '0x4df1...aa08', name: 'Protocol operator', memberRole: 'Manager', status: 'Active' },
  { address: '0x9ac2...8d14', name: 'Security review', memberRole: 'Auditor', status: 'Active' },
  { address: '0x71C7...9a42', name: 'Sovereign operator', memberRole: 'User', status: 'Active' },
  { address: '0xA18e...c102', name: 'Treasury control', memberRole: 'User', status: 'Active' },
]

export const stats = [
  { label: 'Identities', value: '12,840', delta: '+8.2%' },
  { label: 'Assets minted', value: '48,291', delta: '+14.6%' },
  { label: 'Verified proofs', value: '99.98%', delta: '+0.04%' },
  { label: 'Audit events', value: '186.4K', delta: '+22.1%' },
]

export const roleMeta: Record<Role, { description: string; color: string }> = {
  Admin: { description: 'Protocol governance', color: 'mint' },
  Manager: { description: 'Asset operations', color: 'amber' },
  Auditor: { description: 'Read-only verification', color: 'blue' },
  User: { description: 'Personal identity', color: 'coral' },
}

export const truncate = (value: string) => (value.length > 17 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value)

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
