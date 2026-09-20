'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowUpRight, BadgeCheck, BarChart3, Bell, BookOpen, Check, ChevronDown, CircleHelp, Copy, File, FileText, Fingerprint, GitBranch, Globe2, KeyRound, LayoutDashboard, Loader2, Menu, Network, Paperclip, Plus, Search, Settings2, ShieldCheck, Sparkles, Upload, UserPlus, UserRound, Users, Wallet, X, Zap } from 'lucide-react'
import { assets, auditEntries, currentIdentity, roleMeta, stats, type Asset, type Role, truncate } from '@/lib/mock-data'

// ─── Constants ────────────────────────────────────────────────────────────────

const SEPOLIA_EXPLORER = 'https://sepolia.etherscan.io'
const SEPOLIA_CHAIN_ID = '0xaa36a7' // 11155111 in hex

const nav = [
  { id: 'overview',       label: 'Overview',         icon: LayoutDashboard, roles: ['Admin', 'Manager', 'Auditor', 'User'] },
  { id: 'identity',       label: 'Identity',          icon: Fingerprint,     roles: ['Admin', 'Manager', 'Auditor', 'User'] },
  { id: 'assets',         label: 'Asset registry',    icon: GitBranch,       roles: ['Admin', 'Manager', 'Auditor', 'User'] },
  { id: 'mint',           label: 'Mint asset',        icon: Plus,            roles: ['Admin', 'Manager'] },
  { id: 'roles',          label: 'Role control',      icon: Users,           roles: ['Admin'] },
  { id: 'register-user',  label: 'Register user',     icon: UserPlus,        roles: ['Admin', 'Manager'] },
  { id: 'register-admin', label: 'Register admin',    icon: ShieldCheck,     roles: ['Admin'] },
  { id: 'audit',          label: 'Audit ledger',      icon: BookOpen,        roles: ['Admin', 'Auditor'] },
]

// ─── Small reusable components ────────────────────────────────────────────────

function Logo() { return <div className="logo-mark" aria-label="Ledger home"><span>∿</span><span>∿</span><span>∿</span></div> }
function RoleBadge({ role }: { role: Role }) { return <span className={`role-badge role-${role.toLowerCase()}`}><span className="role-dot" />{role}</span> }
function ProofPill({ children = 'Verified on-chain' }: { children?: React.ReactNode }) { return <span className="proof-pill"><BadgeCheck size={13} />{children}</span> }
function Hash({ children }: { children: string }) { return <span className="hash">{children}</span> }
function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) { return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action}</div> }
function StatStrip() { return <div className="stat-strip">{stats.map((stat) => <div className="stat-item" key={stat.label}><span className="stat-label">{stat.label}</span><strong>{stat.value}</strong><span className="stat-delta">↗ {stat.delta}</span></div>)}</div> }

// ─── Block explorer helpers ────────────────────────────────────────────────────

function openTxInExplorer(hash: string) {
  // Expand truncated hash if needed (for demo, open search)
  const fullHash = hash.includes('...') ? undefined : hash
  const url = fullHash
    ? `${SEPOLIA_EXPLORER}/tx/${fullHash}`
    : `${SEPOLIA_EXPLORER}/search?f=0&q=${hash.replace(/\.\.\./g, '')}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function openAddressInExplorer(address: string) {
  window.open(`${SEPOLIA_EXPLORER}/address/${address.replace(/\s/g, '')}`, '_blank', 'noopener,noreferrer')
}

// ─── Auth state ───────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ''

type AuthMethod = 'wallet' | 'google'
type AuthState =
  | { connected: false }
  | { connected: true; address: string; shortAddress: string; email?: string; name?: string; picture?: string; authMethod: AuthMethod; role: string }

function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ connected: false })
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  // ── MetaMask wallet connect ────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    setError(null)
    setConnecting(true)
    try {
      const eth = (window as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
      if (!eth) {
        setError('MetaMask not detected. Please install the MetaMask extension.')
        setConnecting(false)
        return
      }
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA_CHAIN_ID }] }).catch(() => {})
      const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[]
      const address = accounts[0]
      const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
      setAuth({ connected: true, address, shortAddress, authMethod: 'wallet', role: 'User' })
      setShowModal(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      if (msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('denied')) {
        setError('You rejected the connection request.')
      } else {
        setError(msg)
      }
    } finally {
      setConnecting(false)
    }
  }, [])

  // ── Google Sign-In ─────────────────────────────────────────────────────────
  const handleGoogleCredential = useCallback(async (idToken: string) => {
    setError(null)
    setConnecting(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/google/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Google authentication failed')

      // Store JWT
      if (typeof window !== 'undefined') localStorage.setItem('dvault_jwt', json.token)

      const { email, name, picture, role } = json.user
      setAuth({
        connected: true,
        address: `google:${email}`,
        shortAddress: name ?? email,
        email,
        name,
        picture,
        authMethod: 'google',
        role: role ?? 'USER',
      })
      setShowModal(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (typeof window !== 'undefined') localStorage.removeItem('dvault_jwt')
    setAuth({ connected: false })
    setError(null)
  }, [])

  return { auth, connecting, error, showModal, setShowModal, connectWallet, handleGoogleCredential, disconnect }
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

declare global {
  interface Window {
    handleGoogleSignIn?: (response: { credential: string }) => void
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (r: { credential: string }) => void; ux_mode: string }) => void
          renderButton: (el: HTMLElement, config: object) => void
        }
      }
    }
  }
}

function AuthModal({
  onClose, onWallet, onGoogleCredential, connecting, error
}: {
  onClose: () => void
  onWallet: () => void
  onGoogleCredential: (token: string) => void
  connecting: boolean
  error: string | null
}) {
  const googleBtnRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || !GOOGLE_CLIENT_ID) return
    // Load GSI script once
    if (!document.getElementById('gsi-script')) {
      const script = document.createElement('script')
      script.id = 'gsi-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => initGoogle(node)
      document.head.appendChild(script)
    } else if (window.google) {
      initGoogle(node)
    }
  }, [])

  function initGoogle(container: HTMLElement) {
    window.google?.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => onGoogleCredential(response.credential),
      ux_mode: 'popup',
    })
    window.google?.accounts.id.renderButton(container, {
      theme: 'filled_black',
      size: 'medium',
      width: 400,
      text: 'continue_with',
      shape: 'rectangular',
    })
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Sign in" onClick={e => e.stopPropagation()}>
        <div className="auth-modal-head">
          <div className="brand"><Logo /><span>ledger<span className="brand-dot">.</span>protocol</span></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={17} /></button>
        </div>

        <h2 className="auth-title">Sign in to continue</h2>
        <p className="auth-subtitle muted-copy">Choose how you want to access your sovereign identity.</p>

        {error && (
          <div className="wallet-error">
            <X size={13} />
            {error === 'Failed to fetch'
              ? 'Cannot reach backend server. Make sure it is running on port 5000.'
              : error}
          </div>
        )}

        {/* ── MetaMask row ── */}
        <div className="auth-option">
          <div className="auth-option-icon"><Wallet size={20} /></div>
          <div className="auth-option-text">
            <strong>Connect wallet</strong>
            <span>MetaMask or any injected Ethereum wallet</span>
          </div>
          <button className="button button-primary button-small" onClick={onWallet} disabled={connecting}>
            {connecting ? <Loader2 size={13} className="spin" /> : <Wallet size={13} />}
            {connecting ? 'Opening…' : 'Connect'}
          </button>
        </div>

        <div className="auth-divider"><span>or</span></div>

        {/* ── Google section ── */}
        <div className="auth-google-section">
          <div className="auth-google-label">
            <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
            <span className="auth-google-note">Admins granted automatically</span>
          </div>
          {GOOGLE_CLIENT_ID ? (
            <div ref={googleBtnRef} className="google-btn-wrapper" />
          ) : (
            <div className="auth-no-google"><ShieldCheck size={13} /> Google Client ID not configured in .env.local</div>
          )}
        </div>

        <p className="auth-footnote">
          <ShieldCheck size={12} /> No custody of your keys &nbsp;·&nbsp; <Globe2 size={12} /> Open protocol
        </p>
      </div>
    </div>
  )
}

// ─── Identity Card ────────────────────────────────────────────────────────────

function IdentityCard({ compact = false, address }: { compact?: boolean; address: string }) {
  const shortAddr = address.length > 10 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address
  const did = `did:ethr:${shortAddr}`
  return (
    <div className={`identity-card ${compact ? 'compact' : ''}`}>
      <div className="identity-top">
        <div className="seal"><Fingerprint size={compact ? 24 : 34} /></div>
        <div><p className="eyebrow">Sovereign identity</p><h3>Operator / {shortAddr}</h3></div>
        <ProofPill />
      </div>
      <div className="identity-did">
        <span className="muted-label">DID identifier</span>
        <Hash>{did}</Hash>
        <button className="icon-button" aria-label="Copy DID" onClick={() => navigator.clipboard.writeText(did)}><Copy size={14} /></button>
      </div>
      {!compact && (
        <div className="identity-meta">
          <div><span className="muted-label">Created</span><strong>{currentIdentity.created}</strong></div>
          <div><span className="muted-label">Verification method</span><strong>{currentIdentity.key}</strong></div>
          <div><span className="muted-label">Network</span><strong><span className="network-dot" />{currentIdentity.network}</strong></div>
        </div>
      )}
      <div className="identity-footer">
        <span><ShieldCheck size={14} /> No central authority</span>
        <span><Zap size={14} /> Proof checked 2m ago</span>
      </div>
    </div>
  )
}

// ─── Asset Card ───────────────────────────────────────────────────────────────

function AssetCard({ asset, onSelect }: { asset: Asset; onSelect: (asset: Asset) => void }) {
  return (
    <button className="asset-card" onClick={() => onSelect(asset)}>
      <div className={`asset-art art-${asset.color}`}><div className="art-grid" /><span className="art-symbol">{asset.color === 'mint' ? '◈' : asset.color === 'amber' ? '◌' : asset.color === 'blue' ? '⌬' : '◇'}</span><span className="art-token">{asset.tokenId}</span></div>
      <div className="asset-info">
        <div><p className="asset-name">{asset.name}</p><p className="muted-label">{asset.collection} · {asset.standard}</p></div>
        <span className={`asset-status ${asset.status === 'Verified' ? 'is-verified' : 'is-pending'}`}><span />{asset.status}</span>
      </div>
      <div className="asset-foot"><Hash>{asset.owner}</Hash><ArrowUpRight size={14} /></div>
    </button>
  )
}

// ─── Provenance Timeline ──────────────────────────────────────────────────────

function Timeline({ asset }: { asset: Asset }) {
  return (
    <div className="timeline">
      {asset.provenance.map((event, index) => (
        <div className="timeline-item" key={event.hash}>
          <div className={`timeline-node ${index === 0 ? 'active' : ''}`} />
          {index < asset.provenance.length - 1 && <div className="timeline-line" />}
          <div>
            <div className="timeline-title"><strong>{event.action}</strong><span>{event.time}</span></div>
            <p>{event.detail}</p>
            <button
              className="hash hash-link"
              onClick={() => openTxInExplorer(event.hash)}
              title="Open transaction in Sepolia Etherscan"
            >
              {event.hash} <ArrowUpRight size={11} style={{ display: 'inline' }} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Audit Ledger ─────────────────────────────────────────────────────────────

function ActivityLedger({ compact = false }: { compact?: boolean }) {
  const entries = compact ? auditEntries.slice(0, 4) : auditEntries
  return (
    <div className="ledger-list">
      {entries.map((entry) => (
        <div className="ledger-row" key={entry.hash}>
          <div className={`event-icon event-${entry.tone}`}><Activity size={16} /></div>
          <div className="ledger-main"><strong>{entry.type}</strong><span>{entry.target}</span><Hash>{entry.actor}</Hash></div>
          <div className="ledger-right"><span>{entry.time}</span>
            <button className="hash hash-link" onClick={() => openTxInExplorer(entry.hash)} title="View on Sepolia Etherscan">{entry.hash} <ArrowUpRight size={11} style={{ display: 'inline' }} /></button>
          </div>
          <button className="verify-button" aria-label="Verify event" onClick={() => openTxInExplorer(entry.hash)}><BadgeCheck size={16} /></button>
        </div>
      ))}
    </div>
  )
}

// ─── Landing page ─────────────────────────────────────────────────────────────

function Landing({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <main className="landing">
      <div className="landing-nav">
        <div className="brand"><Logo /><span>ledger<span className="brand-dot">.</span>protocol</span></div>
        <span className="network-tag"><span className="network-dot" /> Sepolia testnet</span>
        <button className="button button-outline" onClick={onOpenModal}>
          Sign in <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="landing-content">
        <div className="landing-copy">
          <p className="eyebrow accent-text">A sovereign coordination layer</p>
          <h1>Identity that<br /><em>proves itself.</em></h1>
          <p className="landing-sub">Own your credentials. Govern your access. Leave a permanent, verifiable trail.</p>
          <button className="button button-primary button-large" onClick={onOpenModal}>
            <Wallet size={17} />
            Get started
            <span className="button-arrow">→</span>
          </button>
          <div className="landing-trust">
            <span><ShieldCheck size={15} /> No custody</span>
            <span><Globe2 size={15} /> Open protocol</span>
            <span><BadgeCheck size={15} /> Verifiable by anyone</span>
          </div>
        </div>
        <div className="flow-visual">
          <div className="flow-line line-one" /><div className="flow-line line-two" /><div className="flow-line line-three" />
          <div className="flow-node node-did"><Fingerprint size={27} /><span>DID</span><small>self-sovereign</small></div>
          <div className="flow-node node-nft"><GitBranch size={26} /><span>ASSET</span><small>owned on-chain</small></div>
          <div className="flow-node node-role"><KeyRound size={26} /><span>ROLE</span><small>permissioned</small></div>
          <div className="flow-node node-audit"><BookOpen size={25} /><span>LEDGER</span><small>immutable proof</small></div>
          <div className="proof-orbit"><div /><div /><div /></div>
          <div className="flow-caption"><span className="live-dot" /> Everything is verifiable</div>
        </div>
      </div>
      <div className="landing-foot"><span>LEDGER / 001</span><span>Built for the sovereign web</span><span>EST. 2026</span></div>
    </main>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function Topbar({ role, setRole, onMenu, theme, setTheme, shortAddress, onDisconnect }: {
  role: Role; setRole: (role: Role) => void; onMenu: () => void
  theme: 'dark' | 'light'; setTheme: (theme: 'dark' | 'light') => void
  shortAddress: string; onDisconnect: () => void
}) {
  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button>
      <div className="crumb"><span className="crumb-active">Console</span><span>/</span><span>{roleMeta[role].description}</span></div>
      <div className="top-actions">
        <div className="role-switcher">
          <span className="muted-label">Viewing as</span>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Switch demo role">
            {(['Admin', 'Manager', 'Auditor', 'User'] as Role[]).map((item) => <option key={item}>{item}</option>)}
          </select>
          <ChevronDown size={13} />
        </div>
        <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? '◐' : '◑'}</button>
        <button className="notification-button" aria-label="Notifications"><Bell size={17} /><span /></button>
        <button className="avatar" title={`Connected: ${shortAddress}\nClick to disconnect`} onClick={onDisconnect}>{shortAddress.slice(2, 4).toUpperCase()}</button>
      </div>
    </header>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ role, page, setPage, open, onClose, shortAddress }: {
  role: Role; page: string; setPage: (page: string) => void; open: boolean; onClose: () => void; shortAddress: string
}) {
  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand"><Logo /><span>ledger<span className="brand-dot">.</span>protocol</span></div>
        <button className="sidebar-close" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="workspace">
        <span className="workspace-label">Workspace</span>
        <div className="workspace-row"><div className="workspace-icon">A</div><div><strong>Aegis Protocol</strong><span>Core network</span></div><ChevronDown size={14} /></div>
      </div>
      <nav className="nav-list">
        {nav.filter((item) => item.roles.includes(role)).map((item) => (
          <button
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => { setPage(item.id); onClose() }}
            key={item.id}
          >
            <item.icon size={17} /><span>{item.label}</span>
            {item.id === 'audit' && <i className="nav-count">186K</i>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="network-card">
          <span className="network-dot" />
          <div><span className="muted-label">Connected network</span><strong>Ethereum Sepolia</strong></div>
          <Globe2 size={16} />
        </div>
        <button className="nav-item"><Settings2 size={17} /><span>Settings</span></button>
        <button
          className="wallet-row"
          onClick={() => openAddressInExplorer(shortAddress)}
          title="View address on Etherscan"
        >
          <div className="avatar">{shortAddress.slice(2, 4).toUpperCase()}</div>
          <div><strong>{shortAddress}</strong><span><span className="live-dot" /> Wallet connected</span></div>
          <ArrowUpRight size={14} />
        </button>
      </div>
    </aside>
  )
}

// ─── Asset Detail Modal ───────────────────────────────────────────────────────

function DetailModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const latestTxHash = asset.provenance[asset.provenance.length - 1]?.hash
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="detail-modal" role="dialog" aria-modal="true" aria-label="Asset details" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><p className="eyebrow">Asset registry / {asset.tokenId}</p><h2>{asset.name}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={17} /></button>
        </div>
        <div className="detail-layout">
          <div className={`asset-art art-large art-${asset.color}`}><div className="art-grid" /><span className="art-symbol">{asset.color === 'mint' ? '◈' : asset.color === 'amber' ? '◌' : '⌬'}</span></div>
          <div className="detail-content">
            <div className="detail-facts">
              <div><span className="muted-label">Collection</span><strong>{asset.collection}</strong></div>
              <div><span className="muted-label">Token standard</span><strong>{asset.standard}</strong></div>
              <div>
                <span className="muted-label">Current owner</span>
                <button className="hash hash-link" onClick={() => openAddressInExplorer(asset.owner)}>{asset.owner} <ArrowUpRight size={11} style={{ display: 'inline' }} /></button>
              </div>
              <div>
                <span className="muted-label">Contract</span>
                <button className="hash hash-link" onClick={() => openAddressInExplorer('0xAeg184f2')}><Hash>0xAeg1...84f2</Hash> <ArrowUpRight size={11} style={{ display: 'inline' }} /></button>
              </div>
            </div>
            <div className="detail-proof"><ProofPill /> <span>Ownership proof matches DID controller</span></div>
            <h3 className="subheading">Provenance history</h3>
            <Timeline asset={asset} />
            <button
              className="button button-outline full-button"
              onClick={() => latestTxHash && openTxInExplorer(latestTxHash)}
            >
              <Globe2 size={15} /> View on block explorer <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function Overview({ role, onSelect, address }: { role: Role; onSelect: (asset: Asset) => void; address: string }) {
  return (
    <div className="page-content">
      <div className="hero-row">
        <div>
          <p className="eyebrow accent-text">{role === 'Auditor' ? 'Verification console' : 'Good morning, operator'}</p>
          <h1>{role === 'Admin' ? 'Protocol overview' : role === 'Manager' ? 'Asset operations' : role === 'Auditor' ? 'Trust, made visible' : 'Your sovereign portfolio'}</h1>
          <p className="page-intro">{roleMeta[role].description} <span className="separator">·</span> <Hash>{`did:ethr:${address.slice(0, 6)}...${address.slice(-4)}`}</Hash></p>
        </div>
        <div className="hero-status"><span className="live-dot" /><strong>All systems verified</strong><span>Block #18,402,991</span></div>
      </div>
      <StatStrip />
      <div className="overview-grid">
        <div className="wide-panel">
          <SectionHeading eyebrow="Owned assets" title="Your registry" action={<button className="text-button">View all <ArrowUpRight size={14} /></button>} />
          <div className="asset-grid">{assets.slice(0, 3).map((asset) => <AssetCard key={asset.id} asset={asset} onSelect={onSelect} />)}</div>
        </div>
        <IdentityCard compact address={address} />
        <div className="wide-panel activity-panel">
          <SectionHeading eyebrow="Protocol activity" title="Latest proofs" action={<button className="text-button">Open ledger <ArrowUpRight size={14} /></button>} />
          <ActivityLedger compact />
        </div>
        <div className="proof-panel">
          <div className="proof-icon"><BadgeCheck size={23} /></div>
          <p className="eyebrow">Proof of the moment</p>
          <h3>Every action<br /><span>leaves a trace.</span></h3>
          <p>Cryptographically signed, permanently available, independently verifiable.</p>
          <div className="proof-hash"><span>Latest block hash</span><Hash>0x91ab8e...c20f</Hash></div>
        </div>
      </div>
    </div>
  )
}

function IdentityPage({ address }: { address: string }) {
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`
  const did = `did:ethr:${shortAddr}`
  return (
    <div className="page-content">
      <SectionHeading eyebrow="Identity / 001" title="Sovereign identity" action={<button className="button button-outline" onClick={() => navigator.clipboard.writeText(did)}><Copy size={14} /> Copy DID</button>} />
      <div className="identity-layout">
        <IdentityCard address={address} />
        <div className="credential-panel">
          <div className="credential-stamp"><ShieldCheck size={26} /></div>
          <p className="eyebrow">Verifiable credential</p>
          <h3>Identity credential</h3>
          <p className="muted-copy">A portable, cryptographically verifiable proof that this wallet controls the identity below.</p>
          <div className="credential-list">
            <div><span>Issuer</span><Hash>did:ethr:0xAeg1...84f2</Hash></div>
            <div><span>Subject</span><Hash>{did}</Hash></div>
            <div><span>Issued</span><strong>08 Mar 2026, 14:22 UTC</strong></div>
            <div><span>Status</span><ProofPill /></div>
          </div>
          <button className="button button-primary full-button" onClick={() => openAddressInExplorer(address)}><BadgeCheck size={15} /> Verify on Etherscan</button>
        </div>
      </div>
      <div className="keys-panel">
        <SectionHeading eyebrow="Cryptographic material" title="Verification methods" />
        <div className="key-row">
          <div className="key-icon"><KeyRound size={17} /></div>
          <div><strong>Primary signing key</strong><span>secp256k1 · ECDSA</span></div>
          <Hash>0x03b7...1d90</Hash><ProofPill />
        </div>
        <div className="key-row">
          <div className="key-icon"><Network size={17} /></div>
          <div><strong>Controller document</strong><span>Ethereum DID Registry</span></div>
          <Hash>{shortAddr}</Hash>
          <button className="text-button" onClick={() => openAddressInExplorer(address)}>Inspect <ArrowUpRight size={14} /></button>
        </div>
      </div>
    </div>
  )
}

function AssetsPage({ onSelect }: { onSelect: (asset: Asset) => void }) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => assets.filter(a => a.name.toLowerCase().includes(query.toLowerCase()) || a.tokenId.includes(query)), [query])
  return (
    <div className="page-content">
      <SectionHeading eyebrow={`Asset registry / ${assets.length} owned`} title="Your assets" action={<button className="button button-primary"><Plus size={15} /> Mint new</button>} />
      <div className="filter-row">
        <div className="search-box"><Search size={15} /><input placeholder="Search assets, collections, token IDs" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <button className="filter-button">All collections <ChevronDown size={14} /></button>
        <button className="filter-button">Verified <ChevronDown size={14} /></button>
      </div>
      <div className="full-asset-grid">{filtered.map((asset) => <AssetCard key={asset.id} asset={asset} onSelect={onSelect} />)}</div>
    </div>
  )
}

function AuditPage() {
  return (
    <div className="page-content">
      <SectionHeading eyebrow="Immutable activity / 186,402 events" title="Audit ledger" action={<button className="button button-outline"><ArrowUpRight size={15} /> Export ledger</button>} />
      <div className="audit-callout">
        <div className="proof-icon"><BadgeCheck size={22} /></div>
        <div><strong>Ledger integrity verified</strong><span>All 186,402 events reconcile with the protocol state root.</span></div>
        <button className="hash hash-link" onClick={() => openTxInExplorer('0x91ab8ec20f')}>root: 0x91ab...c20f <ArrowUpRight size={11} style={{ display: 'inline' }} /></button>
        <button className="text-button" onClick={() => openTxInExplorer('0x91ab8ec20f')}>Verify now <ArrowUpRight size={14} /></button>
      </div>
      <div className="filter-row">
        <div className="search-box"><Search size={15} /><input placeholder="Search by DID, hash or action" /></div>
        <button className="filter-button">All actions <ChevronDown size={14} /></button>
        <button className="filter-button">Last 24 hours <ChevronDown size={14} /></button>
      </div>
      <div className="audit-table">
        <div className="audit-header"><span>Event</span><span>Actor / target</span><span>Timestamp</span><span>Proof</span></div>
        <ActivityLedger />
      </div>
    </div>
  )
}

// ─── File icon helper ─────────────────────────────────────────────────────────

function FileIcon({ mimetype }: { mimetype: string }) {
  if (mimetype === 'application/pdf') return <FileText size={20} className="file-icon-pdf" />
  if (mimetype.startsWith('image/')) return <FileText size={20} className="file-icon-img" />
  return <File size={20} className="file-icon-doc" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// ─── MintPage ─────────────────────────────────────────────────────────────────

function MintPage() {
  const [step, setStep] = useState(1)
  const steps = ['Recipient', 'Metadata', 'Review', 'Sign']

  // Step 1 state
  const [recipientDID, setRecipientDID] = useState('did:ethr:0x71C7...9a42')

  // Step 2 state
  const [assetName, setAssetName] = useState('')
  const [collection, setCollection] = useState('')
  const [description, setDescription] = useState('')
  const [assetType, setAssetType] = useState('Document')

  // File state
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload / API state
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedDocUrl, setUploadedDocUrl] = useState<string | null>(null)
  const [uploadedDocFilename, setUploadedDocFilename] = useState<string | null>(null)
  const [metadataCID, setMetadataCID] = useState<string | null>(null)

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

  // ── File picking ────────────────────────────────────────────────────────────

  const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv']

  function acceptFile(f: File) {
    const ext = '.' + f.name.split('.').pop()!.toLowerCase()
    if (!ALLOWED_EXTS.includes(ext)) {
      setUploadError(`File type "${ext}" is not supported. Allowed: ${ALLOWED_EXTS.join(', ')}`)
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      setUploadError('File is too large. Maximum size is 50 MB.')
      return
    }
    setUploadError(null)
    setPickedFile(f)
    setUploadedDocUrl(null)
    setUploadedDocFilename(null)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) acceptFile(f)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) acceptFile(f)
  }

  function removeFile() {
    setPickedFile(null)
    setUploadedDocUrl(null)
    setUploadedDocFilename(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Continue from step 2 → 3 (upload file + metadata) ──────────────────────

  async function handleMetadataContinue() {
    if (!assetName.trim() || !description.trim()) {
      setUploadError('Asset name and description are required.')
      return
    }
    setUploadError(null)
    setUploading(true)

    try {
      const token = localStorage.getItem('auth_token') ?? ''

      const formData = new FormData()
      formData.append('name', assetName.trim())
      formData.append('description', description.trim())
      formData.append('assetType', assetType)
      formData.append('ownerDID', recipientDID)
      if (pickedFile) formData.append('file', pickedFile)

      const res = await fetch(`${API_BASE}/api/assets/metadata`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: { message: 'Upload failed' } }))
        throw new Error(errBody?.error?.message ?? `Server error ${res.status}`)
      }

      const body = await res.json()
      const data = body.data
      setMetadataCID(data.cid ?? null)
      setUploadedDocUrl(data.documentUrl ?? null)
      setUploadedDocFilename(data.documentFilename ?? null)
      setStep(3)
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="page-content">
      <SectionHeading eyebrow="Asset operations / New issuance" title="Mint an asset" action={<span className="gas-note"><Zap size={14} /> Est. gas 0.002 ETH</span>} />
      <div className="mint-layout">
        <div className="mint-main">
          <div className="stepper">{steps.map((item, index) => <div className={`step ${step > index + 1 ? 'done' : ''} ${step === index + 1 ? 'current' : ''}`} key={item}><span>{step > index + 1 ? <Check size={13} /> : index + 1}</span><label>{item}</label></div>)}</div>
          <div className="form-card">

            {/* ── Step 1: Recipient ── */}
            {step === 1 && <>
              <p className="eyebrow">Step 01 / Recipient</p>
              <h2>Who should own this asset?</h2>
              <p className="muted-copy">Assets are linked to a DID. The recipient will receive a verifiable ownership credential.</p>
              <label className="field-label">Recipient DID</label>
              <div className="input-wrap"><Fingerprint size={16} /><input value={recipientDID} onChange={e => setRecipientDID(e.target.value)} placeholder="did:ethr:0x..." /></div>
              <div className="recipient-check"><BadgeCheck size={17} /><div><strong>Identity resolved</strong><span>Operator / 0x71C7 · Created 08 Mar 2026</span></div></div>
            </>}

            {/* ── Step 2: Metadata + File Upload ── */}
            {step === 2 && <>
              <p className="eyebrow">Step 02 / Metadata</p>
              <h2>Describe the asset</h2>
              <p className="muted-copy">Metadata is pinned to IPFS and its content hash committed on-chain with the mint.</p>

              <label className="field-label">Asset name</label>
              <div className="input-wrap"><input placeholder="e.g. Field Credential / Level 04" value={assetName} onChange={e => setAssetName(e.target.value)} /></div>

              <label className="field-label">Asset type</label>
              <div className="input-wrap">
                <select value={assetType} onChange={e => setAssetType(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit', fontSize: 'inherit', width: '100%', cursor: 'pointer' }}>
                  <option value="Document">Document</option>
                  <option value="Certificate">Certificate</option>
                  <option value="Image">Image</option>
                  <option value="Credential">Credential</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <label className="field-label">Description</label>
              <div className="input-wrap textarea"><textarea placeholder="What does this asset represent?" value={description} onChange={e => setDescription(e.target.value)} /></div>

              {/* ── File Attachment Zone ── */}
              <label className="field-label" style={{ marginTop: '1.2rem' }}>
                <Paperclip size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                Attach document <span className="muted-label">(optional · max 50 MB)</span>
              </label>

              {!pickedFile ? (
                <div
                  className={`file-drop-zone${isDragOver ? ' drag-over' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload document"
                  onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                >
                  <Upload size={26} className="drop-icon" />
                  <p><strong>Click to browse</strong> or drag &amp; drop a file here</p>
                  <span className="muted-label">PDF · DOCX · XLSX · TXT · CSV · Images</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp"
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                  />
                </div>
              ) : (
                <div className="file-selected">
                  <FileIcon mimetype={pickedFile.type} />
                  <div className="file-selected-info">
                    <strong>{pickedFile.name}</strong>
                    <span>{formatBytes(pickedFile.size)} · {pickedFile.type || 'unknown type'}</span>
                  </div>
                  <button className="icon-button file-remove-btn" onClick={removeFile} aria-label="Remove file"><X size={15} /></button>
                </div>
              )}

              {uploadError && (
                <div className="upload-error">
                  <X size={14} /> {uploadError}
                </div>
              )}
            </>}

            {/* ── Step 3: Review ── */}
            {step === 3 && <>
              <p className="eyebrow">Step 03 / Review</p>
              <h2>Check the issuance</h2>
              <div className="review-list">
                <div><span>Recipient</span><Hash>{recipientDID}</Hash></div>
                <div><span>Asset name</span><strong>{assetName}</strong></div>
                <div><span>Asset type</span><strong>{assetType}</strong></div>
                <div><span>Standard</span><strong>ERC-721</strong></div>
                <div><span>Network fee</span><strong>~ 0.002 ETH <small>($6.42)</small></strong></div>
                <div><span>Metadata</span><ProofPill>{metadataCID ? `CID: ${metadataCID.slice(0, 12)}…` : 'Content hash ready'}</ProofPill></div>
                {uploadedDocUrl && (
                  <div>
                    <span>Document</span>
                    <a
                      href={`${API_BASE}${uploadedDocUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hash hash-link"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Paperclip size={12} />
                      {uploadedDocFilename ?? 'View file'}
                      <ArrowUpRight size={11} style={{ display: 'inline' }} />
                    </a>
                  </div>
                )}
              </div>
              <div className="signature-note"><KeyRound size={18} /><div><strong>Next: sign a transaction</strong><span>This action will cost gas and permanently create the asset. Your wallet will ask for confirmation.</span></div></div>
            </>}

            {/* ── Step 4: Success ── */}
            {step === 4 && (
              <div className="mint-success">
                <div className="success-orbit"><BadgeCheck size={34} /></div>
                <p className="eyebrow accent-text">Transaction confirmed</p>
                <h2>Asset is now yours.</h2>
                <p className="muted-copy">{assetName || 'Field Credential / Level 04'} has been minted and linked to your DID.</p>
                <button className="hash hash-link" onClick={() => openTxInExplorer('0xac11f8e0')}>tx: 0xac11...f8e0 <ArrowUpRight size={11} style={{ display: 'inline' }} /></button>
                <ProofPill>Ownership verified</ProofPill>
                {uploadedDocUrl && (
                  <a
                    href={`${API_BASE}${uploadedDocUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hash hash-link"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem' }}
                  >
                    <Paperclip size={13} /> View attached document <ArrowUpRight size={11} />
                  </a>
                )}
              </div>
            )}

            {/* ── Navigation buttons ── */}
            <div className="form-actions">
              {step > 1 && step < 4 && (
                <button className="button button-outline" onClick={() => setStep(step - 1)} disabled={uploading}>Back</button>
              )}
              {step === 1 && (
                <button className="button button-primary" onClick={() => setStep(2)}>Continue <ArrowUpRight size={15} /></button>
              )}
              {step === 2 && (
                <button
                  className="button button-primary"
                  onClick={handleMetadataContinue}
                  disabled={uploading || !assetName.trim() || !description.trim()}
                >
                  {uploading
                    ? <><Loader2 size={15} className="spin" /> Uploading…</>
                    : <>Continue <ArrowUpRight size={15} /></>
                  }
                </button>
              )}
              {step === 3 && (
                <button className="button button-primary" onClick={() => setStep(4)}>Sign &amp; mint <ArrowUpRight size={15} /></button>
              )}
              {step === 4 && (
                <button className="button button-primary" onClick={() => { setStep(1); setAssetName(''); setCollection(''); setDescription(''); setPickedFile(null); setUploadedDocUrl(null); setMetadataCID(null) }}>Mint another asset <Plus size={15} /></button>
              )}
            </div>
          </div>
        </div>
        <div className="mint-aside">
          <div className="aside-art"><Fingerprint size={42} /><span>DID → NFT</span><small>permanent ownership link</small></div>
          <div className="gas-card">
            <div><span className="muted-label">Transaction type</span><strong>On-chain write</strong></div>
            <div><span className="muted-label">Estimated gas</span><strong>0.002 ETH</strong></div>
            <div><span className="muted-label">Confirmation</span><strong>~ 15 seconds</strong></div>
            <div><span className="muted-label">Contract</span><strong>NFTAsset</strong></div>
            <div><span className="muted-label">Network</span><strong>Ethereum Sepolia</strong></div>
          </div>
          {pickedFile && (
            <div className="gas-card" style={{ marginTop: '0.75rem' }}>
              <div style={{ marginBottom: '0.4rem' }}><span className="muted-label">Attached file</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileIcon mimetype={pickedFile.type} />
                <div style={{ overflow: 'hidden' }}>
                  <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{pickedFile.name}</strong>
                  <span className="muted-label">{formatBytes(pickedFile.size)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


function RolesPage() {
  const [assigned, setAssigned] = useState<string | null>(null)
  const members = [['0x4df1...aa08', 'Protocol operator', 'Manager'], ['0x9ac2...8d14', 'Security review', 'Auditor'], ['0x71C7...9a42', 'Sovereign operator', 'User'], ['0xA18e...c102', 'Treasury control', 'User']]
  return (
    <div className="page-content">
      <SectionHeading eyebrow="Governance / Access control" title="Role control" action={<button className="button button-primary"><Plus size={15} /> Add identity</button>} />
      <div className="danger-banner"><CircleHelp size={18} /><div><strong>Role changes are on-chain actions</strong><span>Every assignment updates the access registry and is permanently recorded in the audit ledger.</span></div><Hash>contract: 0xAeg1...84f2</Hash></div>
      <div className="roles-card">
        <div className="roles-card-head"><div><p className="eyebrow">Active identities / 04</p><h3>Permission registry</h3></div><div className="search-box compact-search"><Search size={15} /><input placeholder="Find an identity" /></div></div>
        {members.map(([address, name, memberRole]) => (
          <div className="member-row" key={address}>
            <div className="avatar small-avatar">{address.slice(2, 4)}</div>
            <div className="member-name"><strong>{name}</strong>
              <button className="hash hash-link" onClick={() => openAddressInExplorer(address)} title="View on Etherscan">{address} <ArrowUpRight size={11} style={{ display: 'inline' }} /></button>
            </div>
            <RoleBadge role={memberRole as Role} />
            <span className="member-status"><span className="live-dot" /> Active</span>
            <button className="button button-outline button-small" onClick={() => setAssigned(address)}>{assigned === address ? 'Pending sign' : 'Change role'} <ChevronDown size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── NEW: Register User Page ──────────────────────────────────────────────────

function RegisterUserPage() {
  const [step, setStep] = useState<'form' | 'signing' | 'done'>('form')
  const [walletAddr, setWalletAddr] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [generatedDID, setGeneratedDID] = useState('')

  const handleRegister = async () => {
    if (!walletAddr) return
    setStep('signing')
    await new Promise(r => setTimeout(r, 1800)) // simulate tx
    const did = `did:ethr:${walletAddr.slice(0, 6)}...${walletAddr.slice(-4)}`
    setGeneratedDID(did)
    setStep('done')
  }

  return (
    <div className="page-content">
      <SectionHeading eyebrow="Identity / New registration" title="Register user" />
      <div className="mint-layout">
        <div className="mint-main">
          {step === 'form' && (
            <div className="form-card">
              <p className="eyebrow">Step 01 / Identity setup</p>
              <h2>Register a new sovereign identity</h2>
              <p className="muted-copy">A decentralised identifier (DID) is created on-chain and permanently linked to the wallet address. No central authority controls it.</p>

              <label className="field-label">Wallet address</label>
              <div className="input-wrap"><Wallet size={16} /><input placeholder="0x..." value={walletAddr} onChange={e => setWalletAddr(e.target.value)} /></div>

              <label className="field-label">Display name <span className="muted-label">(optional)</span></label>
              <div className="input-wrap"><UserRound size={16} /><input placeholder="e.g. Alice Chen" value={displayName} onChange={e => setDisplayName(e.target.value)} /></div>

              <div className="registration-info">
                <div><ShieldCheck size={18} /><div><strong>What gets created?</strong><span>A <code>DIDRegistry</code> entry linking this wallet to a unique <code>did:ethr:…</code> identifier, stored permanently on Sepolia.</span></div></div>
                <div><Zap size={18} /><div><strong>Gas cost</strong><span>~0.001 ETH on Sepolia testnet. The signing wallet must hold enough ETH to cover gas.</span></div></div>
              </div>

              <div className="form-actions">
                <button className="button button-primary" onClick={handleRegister} disabled={!walletAddr}><UserPlus size={15} /> Register identity <ArrowUpRight size={15} /></button>
              </div>
            </div>
          )}

          {step === 'signing' && (
            <div className="form-card center-card">
              <div className="signing-orbit"><Loader2 size={38} className="spin" /></div>
              <p className="eyebrow accent-text">Broadcasting transaction</p>
              <h2>Creating DID on-chain…</h2>
              <p className="muted-copy">Waiting for confirmation on Sepolia. This usually takes 15–30 seconds.</p>
            </div>
          )}

          {step === 'done' && (
            <div className="form-card">
              <div className="mint-success">
                <div className="success-orbit"><BadgeCheck size={34} /></div>
                <p className="eyebrow accent-text">Identity registered</p>
                <h2>DID created successfully.</h2>
                <p className="muted-copy">The wallet <strong>{walletAddr.slice(0, 10)}…</strong> now has a sovereign identity on Sepolia.</p>
                <div className="registered-did">
                  <span className="muted-label">DID identifier</span>
                  <Hash>{generatedDID}</Hash>
                  <button className="icon-button" onClick={() => navigator.clipboard.writeText(generatedDID)}><Copy size={14} /></button>
                </div>
                <ProofPill>Identity verified on-chain</ProofPill>
              </div>
              <div className="form-actions">
                <button className="button button-outline" onClick={() => { setStep('form'); setWalletAddr(''); setDisplayName('') }}>Register another <Plus size={15} /></button>
                <button className="button button-primary" onClick={() => openAddressInExplorer(walletAddr)}>View on Etherscan <ArrowUpRight size={15} /></button>
              </div>
            </div>
          )}
        </div>

        <div className="mint-aside">
          <div className="aside-art"><Fingerprint size={42} /><span>Wallet → DID</span><small>permanent on-chain link</small></div>
          <div className="gas-card">
            <div><span className="muted-label">Contract</span><strong>DIDRegistry</strong></div>
            <div><span className="muted-label">Estimated gas</span><strong>0.001 ETH</strong></div>
            <div><span className="muted-label">Network</span><strong>Ethereum Sepolia</strong></div>
            <div><span className="muted-label">Confirmation</span><strong>~ 15–30 sec</strong></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── NEW: Register Admin Page ─────────────────────────────────────────────────

function RegisterAdminPage() {
  const [step, setStep] = useState<'form' | 'signing' | 'done'>('form')
  const [walletAddr, setWalletAddr] = useState('')
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Manager' | 'Auditor'>('Manager')
  const [reason, setReason] = useState('')

  const roleOptions: { value: 'Admin' | 'Manager' | 'Auditor'; label: string; desc: string }[] = [
    { value: 'Admin',   label: 'Admin',   desc: 'Full governance access. Can assign all roles, mint assets, and manage the protocol.' },
    { value: 'Manager', label: 'Manager', desc: 'Can mint and transfer assets. Cannot assign Admin roles.' },
    { value: 'Auditor', label: 'Auditor', desc: 'Read-only access to the audit ledger and all activity logs.' },
  ]

  const handleAssign = async () => {
    if (!walletAddr) return
    setStep('signing')
    await new Promise(r => setTimeout(r, 1800))
    setStep('done')
  }

  return (
    <div className="page-content">
      <SectionHeading eyebrow="Governance / Privileged access" title="Register admin" />
      <div className="danger-banner">
        <CircleHelp size={18} />
        <div><strong>This is an on-chain governance action</strong><span>Role assignments are recorded permanently on the blockchain and broadcast to the audit ledger. Only perform this if you are certain.</span></div>
      </div>
      <div className="mint-layout">
        <div className="mint-main">
          {step === 'form' && (
            <div className="form-card">
              <p className="eyebrow">Step 01 / Access assignment</p>
              <h2>Assign a privileged role</h2>
              <p className="muted-copy">The target wallet must already have a registered DID. The role is stored in the <code>RBACManager</code> contract and enforced across the entire protocol.</p>

              <label className="field-label">Target wallet address</label>
              <div className="input-wrap"><Wallet size={16} /><input placeholder="0x..." value={walletAddr} onChange={e => setWalletAddr(e.target.value)} /></div>

              <label className="field-label">Role to assign</label>
              <div className="role-picker">
                {roleOptions.map(opt => (
                  <button
                    key={opt.value}
                    className={`role-option ${selectedRole === opt.value ? 'selected' : ''}`}
                    onClick={() => setSelectedRole(opt.value)}
                  >
                    <div className="role-option-top"><RoleBadge role={opt.value} />{selectedRole === opt.value && <Check size={15} />}</div>
                    <p>{opt.desc}</p>
                  </button>
                ))}
              </div>

              <label className="field-label">Reason <span className="muted-label">(recorded in audit log)</span></label>
              <div className="input-wrap textarea"><textarea placeholder="Why is this role being assigned?" value={reason} onChange={e => setReason(e.target.value)} /></div>

              <div className="signature-note">
                <KeyRound size={18} />
                <div><strong>Requires Admin signature</strong><span>Your wallet will be asked to sign this transaction. The role assignment is irreversible without another Admin action.</span></div>
              </div>

              <div className="form-actions">
                <button className="button button-primary" onClick={handleAssign} disabled={!walletAddr}><ShieldCheck size={15} /> Assign {selectedRole} role <ArrowUpRight size={15} /></button>
              </div>
            </div>
          )}

          {step === 'signing' && (
            <div className="form-card center-card">
              <div className="signing-orbit"><Loader2 size={38} className="spin" /></div>
              <p className="eyebrow accent-text">Broadcasting transaction</p>
              <h2>Assigning {selectedRole} role…</h2>
              <p className="muted-copy">Waiting for Sepolia confirmation. This usually takes 15–30 seconds.</p>
            </div>
          )}

          {step === 'done' && (
            <div className="form-card">
              <div className="mint-success">
                <div className="success-orbit"><BadgeCheck size={34} /></div>
                <p className="eyebrow accent-text">Role assigned</p>
                <h2>{selectedRole} access granted.</h2>
                <p className="muted-copy">Wallet <strong>{walletAddr.slice(0, 10)}…</strong> now holds the <strong>{selectedRole}</strong> role in the RBACManager contract.</p>
                <ProofPill>Recorded in audit ledger</ProofPill>
              </div>
              <div className="form-actions">
                <button className="button button-outline" onClick={() => { setStep('form'); setWalletAddr(''); setReason('') }}>Assign another <Plus size={15} /></button>
                <button className="button button-primary" onClick={() => openAddressInExplorer(walletAddr)}>View on Etherscan <ArrowUpRight size={15} /></button>
              </div>
            </div>
          )}
        </div>

        <div className="mint-aside">
          <div className="aside-art"><ShieldCheck size={42} /><span>Admin → Role</span><small>on-chain governance</small></div>
          <div className="gas-card">
            <div><span className="muted-label">Contract</span><strong>RBACManager</strong></div>
            <div><span className="muted-label">Estimated gas</span><strong>0.001 ETH</strong></div>
            <div><span className="muted-label">Network</span><strong>Ethereum Sepolia</strong></div>
            <div><span className="muted-label">Reversible?</span><strong>Only by Admin</strong></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

function App() {
  const { auth, connecting, error, showModal, setShowModal, connectWallet, handleGoogleCredential, disconnect } = useAuth()
  const [role, setRole] = useState<Role>('Admin')
  const [page, setPage] = useState('overview')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  // Sync role from auth when Google user logs in (role comes from backend)
  useEffect(() => {
    if (auth.connected && auth.authMethod === 'google') {
      const backendRole = auth.role as string
      const map: Record<string, Role> = { ADMIN: 'Admin', MANAGER: 'Manager', AUDITOR: 'Auditor', USER: 'User' }
      setRole(map[backendRole] ?? 'User')
    }
  }, [auth])

  // Role-gate: redirect to overview if current page not allowed
  const effectivePage = useMemo(() => {
    const allowed = nav.find(n => n.id === page)?.roles ?? []
    return allowed.includes(role) ? page : 'overview'
  }, [page, role])

  // Sync theme with <html> attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const address = auth.connected ? auth.address : ''
  const shortAddress = auth.connected ? auth.shortAddress : ''

  const view = useMemo(() => {
    if (effectivePage === 'identity')       return <IdentityPage address={address} />
    if (effectivePage === 'assets')         return <AssetsPage onSelect={setSelectedAsset} />
    if (effectivePage === 'audit')          return <AuditPage />
    if (effectivePage === 'mint')           return <MintPage />
    if (effectivePage === 'roles')          return <RolesPage />
    if (effectivePage === 'register-user')  return <RegisterUserPage />
    if (effectivePage === 'register-admin') return <RegisterAdminPage />
    return <Overview role={role} onSelect={setSelectedAsset} address={address} />
  }, [effectivePage, role, address])

  // Show landing + modal when not connected
  if (!auth.connected) {
    return (
      <>
        <Landing onOpenModal={() => setShowModal(true)} />
        {showModal && (
          <AuthModal
            onClose={() => setShowModal(false)}
            onWallet={connectWallet}
            onGoogleCredential={handleGoogleCredential}
            connecting={connecting}
            error={error}
          />
        )}
      </>
    )
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <Sidebar role={role} page={effectivePage} setPage={setPage} open={menuOpen} onClose={() => setMenuOpen(false)} shortAddress={shortAddress} />
      <div className="main-shell">
        <Topbar role={role} setRole={setRole} onMenu={() => setMenuOpen(true)} theme={theme} setTheme={setTheme} shortAddress={shortAddress} onDisconnect={disconnect} />
        <main className="app-main">{view}</main>
      </div>
      {selectedAsset && <DetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
      <div className="tx-toast"><span className="live-dot" /><div><strong>Ledger synced</strong><span>Block #18,402,991 · 2 sec ago</span></div><X size={14} /></div>
    </div>
  )
}

export default function Page() { return <App /> }
