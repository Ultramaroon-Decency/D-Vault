'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ArrowUpRight, BadgeCheck, BarChart3, Bell, BookOpen, Check, ChevronDown, CircleHelp, Copy, FileText, Fingerprint, GitBranch, Globe2, KeyRound, LayoutDashboard, Loader2, LogOut, Menu, Network, Plus, Search, Settings2, ShieldCheck, Sparkles, Upload, UserPlus, UserRound, Users, Wallet, X, Zap } from 'lucide-react'
import {
  initialAssets,
  initialAuditEntries,
  initialMembers,
  currentIdentity,
  roleMeta,
  stats,
  type Asset,
  type AuditEntry,
  type Member,
  type Role,
  truncate
} from '@/lib/mock-data'

// ─── Constants ────────────────────────────────────────────────────────────────

const SEPOLIA_EXPLORER = 'https://sepolia.etherscan.io'
const SEPOLIA_CHAIN_ID = '0xaa36a7' // 11155111 in hex

const nav = [
  { id: 'overview',       label: 'Dashboard',        icon: LayoutDashboard, roles: ['Admin', 'Manager', 'Auditor', 'User'] },
  { id: 'identity',       label: 'Identity',          icon: Fingerprint,     roles: ['Admin', 'Manager', 'Auditor', 'User'] },
  { id: 'assets',         label: 'Asset registry',    icon: GitBranch,       roles: ['Admin', 'Manager', 'Auditor', 'User'] },
  { id: 'mint',           label: 'Mint asset',        icon: Plus,            roles: ['Admin', 'Manager'] },
  { id: 'roles',          label: 'Role control',      icon: Users,           roles: ['Admin'] },
  { id: 'register-admin', label: 'Register Role',     icon: ShieldCheck,     roles: ['Admin'] },
  { id: 'audit',          label: 'Audit ledger',      icon: BookOpen,        roles: ['Admin', 'Manager', 'Auditor', 'User'] },
]

// ─── Small reusable components ────────────────────────────────────────────────

function Logo() { return <div className="logo-mark" aria-label="DataVault home"><span>∿</span><span>∿</span><span>∿</span></div> }
function RoleBadge({ role }: { role: Role }) { return <span className={`role-badge role-${role.toLowerCase()}`}><span className="role-dot" />{role}</span> }
function ProofPill({ children = 'Verified on-chain' }: { children?: React.ReactNode }) { return <span className="proof-pill"><BadgeCheck size={13} />{children}</span> }
function Hash({ children }: { children: string }) { return <span className="hash">{children}</span> }
function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) { return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{action}</div> }
function StatStrip() { return <div className="stat-strip">{stats.map((stat) => <div className="stat-item" key={stat.label}><span className="stat-label">{stat.label}</span><strong>{stat.value}</strong><span className="stat-delta">↗ {stat.delta}</span></div>)}</div> }

// ─── Block explorer helpers ────────────────────────────────────────────────────

function openTxInExplorer(hash: string) {
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

  // ── Restore session from localStorage JWT on mount ────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('dvault_jwt')
    if (!stored) return
    try {
      // Decode JWT payload (base64url, no verification — backend validates each request)
      const payload = JSON.parse(atob(stored.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      const { walletAddress, email, role, exp } = payload as { walletAddress?: string; email?: string; role?: string; exp?: number }
      if (exp && exp * 1000 < Date.now()) { localStorage.removeItem('dvault_jwt'); return } // expired
      const isGoogle = walletAddress?.startsWith('google:')
      if (isGoogle) {
        setAuth({ connected: true, address: walletAddress!, shortAddress: email ?? walletAddress!, email, authMethod: 'google', role: role ?? 'USER' })
      } else if (walletAddress) {
        setAuth({ connected: true, address: walletAddress, shortAddress: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`, authMethod: 'wallet', role: role ?? 'USER' })
      }
    } catch { /* invalid token — ignore */ }
  }, [])

  // ── MetaMask wallet connect ────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    setError(null)
    setConnecting(true)
    try {
      const anyWin = typeof window !== 'undefined' ? (window as unknown as { ethereum?: { isMetaMask?: boolean; providers?: Array<{ isMetaMask?: boolean; request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }>; request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }) : undefined
      let eth = anyWin?.ethereum
      if (eth?.providers?.length) {
        eth = eth.providers.find(p => p.isMetaMask) ?? eth.providers[0]
      }
      if (!eth) {
        setError('MetaMask not detected. Please install the MetaMask extension.')
        setConnecting(false)
        return
      }

      // Request accounts first
      const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[]
      if (!accounts || !accounts.length || !accounts[0]) {
        setError('No account selected in MetaMask. Please unlock or select an account.')
        setConnecting(false)
        return
      }
      const address = accounts[0]
      const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`

      // Attempt network switch non-blockingly
      try {
        await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA_CHAIN_ID }] })
      } catch (switchErr: unknown) {
        const errObj = switchErr as { code?: number }
        if (errObj?.code === 4902) {
          await eth.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: SEPOLIA_CHAIN_ID,
              chainName: 'Sepolia test network',
              nativeCurrency: { name: 'SepoliaETH', symbol: 'SEP', decimals: 18 },
              rpcUrls: ['https://rpc.sepolia.org'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            }],
          }).catch(() => {})
        }
      }

      // ── Backend auth: nonce → sign → verify → JWT ──────────────────────────
      try {
        const nonceRes = await fetch(`${API_URL}/api/auth/nonce`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address }),
        })
        if (nonceRes.ok) {
          const nonceJson = await nonceRes.json()
          const message = nonceJson.data?.message ?? nonceJson.message
          if (message) {
            const hexMsg = '0x' + Array.from(new TextEncoder().encode(message as string)).map(b => b.toString(16).padStart(2, '0')).join('')
            const signature = await eth.request({ method: 'personal_sign', params: [hexMsg, address] }) as string
            const verifyRes = await fetch(`${API_URL}/api/auth/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ walletAddress: address, signature }),
            })
            if (verifyRes.ok) {
              const verifyJson = await verifyRes.json()
              const token = verifyJson.data?.token ?? verifyJson.token
              if (token) {
                if (typeof window !== 'undefined') localStorage.setItem('dvault_jwt', token)
                let role = 'User'
                try {
                  const jwtPayload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
                  const roleMap: Record<string, string> = { ADMIN: 'Admin', MANAGER: 'Manager', AUDITOR: 'Auditor', USER: 'User' }
                  role = roleMap[jwtPayload.role as string] ?? 'User'
                } catch { /* fallback to User */ }
                setAuth({ connected: true, address, shortAddress, authMethod: 'wallet', role })
                setShowModal(false)
                return
              }
            }
          }
        }
      } catch (signErr: unknown) {
        const msg = signErr instanceof Error ? signErr.message : String(signErr)
        if (msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('cancel')) {
          setError('Signature request was rejected in MetaMask.')
          setConnecting(false)
          return
        }
      }

      // Backend auth offline/failed — allow wallet with USER role in client web3 mode
      setAuth({ connected: true, address, shortAddress, authMethod: 'wallet', role: 'User' })
      setShowModal(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      if (msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('denied')) {
        setError('You rejected the connection request in MetaMask.')
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

  // ── Direct Self-Registration login ──────────────────────────────────────────
  const connectAsRegisteredUser = useCallback((userAddress: string, userName?: string) => {
    const shortAddress = userAddress.length > 10 ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : userAddress
    setAuth({
      connected: true,
      address: userAddress,
      shortAddress: userName ? `${userName} (${shortAddress})` : shortAddress,
      name: userName,
      authMethod: 'wallet',
      role: 'User',
    })
    setShowModal(false)
  }, [])

  const disconnect = useCallback(() => {
    if (typeof window !== 'undefined') localStorage.removeItem('dvault_jwt')
    setAuth({ connected: false })
    setError(null)
  }, [])

  useEffect(() => {
    const anyWin = typeof window !== 'undefined' ? (window as unknown as { ethereum?: { on?: (event: string, handler: (args: unknown) => void) => void; removeListener?: (event: string, handler: (args: unknown) => void) => void } }) : undefined
    const eth = anyWin?.ethereum
    if (!eth?.on) return

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[]
      if (!accs || !accs.length) {
        disconnect()
      } else if (auth.connected && auth.authMethod === 'wallet' && accs[0].toLowerCase() !== auth.address.toLowerCase()) {
        const address = accs[0]
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`
        setAuth(prev => prev.connected ? { ...prev, address, shortAddress } : prev)
      }
    }

    eth.on('accountsChanged', handleAccountsChanged)
    return () => {
      eth.removeListener?.('accountsChanged', handleAccountsChanged)
    }
  }, [auth, disconnect])

  return { auth, connecting, error, showModal, setShowModal, connectWallet, handleGoogleCredential, connectAsRegisteredUser, disconnect }
}

// ─── Auth Modal (includes Self-Registration for Users) ─────────────────────────

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
  onClose,
  onWallet,
  onGoogleCredential,
  onSelfRegister,
  connecting,
  error,
  initialTab = 'login',
}: {
  onClose: () => void
  onWallet: () => void
  onGoogleCredential: (token: string) => void
  onSelfRegister: (address: string, name: string) => void
  connecting: boolean
  error: string | null
  initialTab?: 'login' | 'register'
}) {
  const [tab, setTab] = useState<'login' | 'register'>(initialTab)
  const [regAddress, setRegAddress] = useState('')
  const [regName, setRegName] = useState('')
  const [registering, setRegistering] = useState(false)
  const [registeredDID, setRegisteredDID] = useState<string | null>(null)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  const googleBtnRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || !GOOGLE_CLIENT_ID) return
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
      width: 300,
      text: 'continue_with',
      shape: 'rectangular',
    })
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regAddress) return
    setRegistering(true)
    await new Promise(r => setTimeout(r, 1500))
    const did = `did:ethr:${regAddress.slice(0, 6)}...${regAddress.slice(-4)}`
    setRegisteredDID(did)
    setRegistering(false)
    onSelfRegister(regAddress, regName)
  }

  const isRegister = tab === 'register'

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`auth-slider-container ${isRegister ? 'active' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Sign in"
        onClick={e => e.stopPropagation()}
      >
        <button className="icon-button auth-slider-close" onClick={onClose} aria-label="Close">
          <X size={17} />
        </button>

        {/* ── Sign In Form Container ── */}
        <div className="auth-slider-form-container sign-in">
          <div className="auth-modal-head">
            <div className="brand"><Logo /><span>Data<span className="brand-dot">.</span>Vault</span></div>
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

          <div className="auth-slider-mobile-toggle">
            <span>New to DataVault?</span>
            <button
              type="button"
              className="text-button"
              onClick={() => setTab('register')}
            >
              Create New Sovereign Identity →
            </button>
          </div>
        </div>

        {/* ── Register Form Container ── */}
        <div className="auth-slider-form-container sign-up">
          <div className="auth-modal-head">
            <div className="brand"><Logo /><span>Data<span className="brand-dot">.</span>Vault</span></div>
          </div>

          <h2 className="auth-title">User Self-Registration</h2>
          <p className="auth-subtitle muted-copy">Register your wallet address to create a self-sovereign DID on Sepolia.</p>

          <form onSubmit={handleRegisterSubmit}>
            <label className="field-label" style={{ marginTop: '10px' }}>Your Wallet Address</label>
            <div className="input-wrap">
              <Wallet size={16} />
              <input
                placeholder="0x71C7... or your address"
                value={regAddress}
                onChange={e => setRegAddress(e.target.value)}
                required
              />
            </div>

            <label className="field-label" style={{ marginTop: '14px' }}>Display Name / Pseudonym</label>
            <div className="input-wrap">
              <UserRound size={16} />
              <input
                placeholder="e.g. Satoshi Operator"
                value={regName}
                onChange={e => setRegName(e.target.value)}
              />
            </div>

            <div className="signature-note" style={{ marginTop: '14px' }}>
              <ShieldCheck size={16} />
              <div>
                <strong>Self-Sovereign Identity</strong>
                <span>Links your wallet to DIDRegistry on Sepolia without central intermediaries.</span>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="button button-outline" onClick={() => setTab('login')}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={!regAddress || registering}>
                {registering ? <Loader2 size={13} className="spin" /> : <UserPlus size={13} />}
                {registering ? 'Creating DID on-chain…' : 'Register Identity & Enter'}
              </button>
            </div>
          </form>

          <p className="auth-footnote">
            <ShieldCheck size={12} /> No custody of your keys &nbsp;·&nbsp; <Globe2 size={12} /> Open protocol
          </p>

          <div className="auth-slider-mobile-toggle">
            <span>Already registered?</span>
            <button
              type="button"
              className="text-button"
              onClick={() => setTab('login')}
            >
              Sign In →
            </button>
          </div>
        </div>

        {/* ── Sliding Toggle Container (Adapted from Demo) ── */}
        <div className="auth-slider-toggle-container">
          <div className="auth-slider-toggle">
            <div className="auth-slider-toggle-panel auth-slider-toggle-left">
              <div className="brand" style={{ marginBottom: '14px' }}>
                <Logo />
                <span>Data<span className="brand-dot">.</span>Vault</span>
              </div>
              <h2>Welcome Back</h2>
              <p>Sign in to access your sovereign credentials, assets, and permissions.</p>
              <button
                type="button"
                className="auth-slider-btn-hidden"
                onClick={() => setTab('login')}
              >
                Sign In
              </button>
            </div>
            <div className="auth-slider-toggle-panel auth-slider-toggle-right">
              <div className="brand" style={{ marginBottom: '14px' }}>
                <Logo />
                <span>Data<span className="brand-dot">.</span>Vault</span>
              </div>
              <h2>Create Identity</h2>
              <p>Register your wallet address to mint a self-sovereign DID on Sepolia.</p>
              <button
                type="button"
                className="auth-slider-btn-hidden"
                onClick={() => setTab('register')}
              >
                Register Identity
              </button>
            </div>
          </div>
        </div>
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

// ─── Asset Card (with Manager Update & Revoke Actions) ─────────────────────────

function AssetCard({
  asset,
  role,
  onSelect,
  onUpdate,
  onRevoke,
}: {
  asset: Asset
  role: Role
  onSelect: (asset: Asset) => void
  onUpdate?: (asset: Asset) => void
  onRevoke?: (asset: Asset) => void
}) {
  const isManager = role === 'Manager'

  return (
    <div className="asset-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => onSelect(asset)}>
        <div className={`asset-art art-${asset.color}`}>
          <div className="art-grid" />
          <span className="art-symbol">{asset.color === 'mint' ? '◈' : asset.color === 'amber' ? '◌' : asset.color === 'blue' ? '⌬' : '◇'}</span>
          <span className="art-token">{asset.tokenId}</span>
        </div>
        <div className="asset-info">
          <div>
            <p className="asset-name">{asset.name}</p>
            <p className="muted-label">{asset.collection} · {asset.standard}</p>
          </div>
          <span className={`asset-status ${asset.status === 'Verified' ? 'is-verified' : asset.status === 'Revoked' ? 'is-revoked' : 'is-pending'}`}>
            <span />{asset.status}
          </span>
        </div>
        <div className="asset-foot">
          <Hash>{asset.owner}</Hash>
          <ArrowUpRight size={14} />
        </div>
      </div>

      {/* CHANGE #5: Manager Update and Revoke Action Buttons */}
      {isManager && (
        <div className="asset-actions">
          <button
            className="button button-outline"
            onClick={(e) => {
              e.stopPropagation()
              onUpdate?.(asset)
            }}
            title="Update asset properties"
          >
            <Settings2 size={11} /> Update
          </button>
          <button
            className="button button-danger"
            onClick={(e) => {
              e.stopPropagation()
              onRevoke?.(asset)
            }}
            title="Revoke asset from owner"
            disabled={asset.status === 'Revoked'}
          >
            <X size={11} /> {asset.status === 'Revoked' ? 'Revoked' : 'Revoke'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Provenance Timeline ──────────────────────────────────────────────────────

function Timeline({ asset }: { asset: Asset }) {
  return (
    <div className="timeline">
      {asset.provenance.map((event, index) => (
        <div className="timeline-item" key={event.hash + index}>
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

// ─── Audit Ledger (CHANGE #2: Verification restricted to Auditor only) ────────

function ActivityLedger({ compact = false, role, auditEntries }: { compact?: boolean; role: Role; auditEntries: AuditEntry[] }) {
  const isAuditor = role === 'Auditor'
  const entries = compact ? auditEntries.slice(0, 4) : auditEntries

  return (
    <div className="ledger-list">
      {entries.map((entry, index) => (
        <div className="ledger-row" key={entry.hash + index}>
          <div className={`event-icon event-${entry.tone}`}><Activity size={16} /></div>
          <div className="ledger-main">
            <strong>{entry.type}</strong>
            <span>{entry.target}</span>
            <Hash>{entry.actor}</Hash>
          </div>
          <div className="ledger-right">
            <span>{entry.time}</span>
            {isAuditor ? (
              <button
                className="hash hash-link"
                onClick={() => openTxInExplorer(entry.hash)}
                title="View on Sepolia Etherscan"
              >
                {entry.hash} <ArrowUpRight size={11} style={{ display: 'inline' }} />
              </button>
            ) : (
              <Hash>{entry.hash}</Hash>
            )}
          </div>
          {isAuditor && (
            <button
              className="verify-button"
              aria-label="Verify event on Sepolia Etherscan"
              title="Verify on Sepolia Etherscan"
              onClick={() => openTxInExplorer(entry.hash)}
            >
              <BadgeCheck size={16} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Landing page ─────────────────────────────────────────────────────────────

function Landing({
  onOpenModal,
  onOpenRegister,
}: {
  onOpenModal: () => void
  onOpenRegister: () => void
}) {
  return (
    <main className="landing">
      <div className="landing-nav">
        <div className="brand"><Logo /><span>Data<span className="brand-dot">.</span>Vault</span></div>
        <span className="network-tag"><span className="network-dot" /> Sepolia testnet</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="button button-outline" onClick={onOpenRegister}>
            <UserPlus size={14} /> Self-Register
          </button>
          <button className="button button-primary" onClick={onOpenModal}>
            Sign in <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
      <div className="landing-content">
        <div className="landing-copy">
          <div className="landing-brand-badge">
            <span className="network-dot" />
            <strong className="landing-brand-title">DataVault</strong>
            <span className="landing-brand-tag">Sovereign Layer</span>
          </div>
          <p className="eyebrow accent-text">A sovereign coordination layer</p>
          <h1><span className="hero-brand-highlight">DataVault</span><br />Identity that<br /><em>proves itself.</em></h1>
          <p className="landing-sub">Own your credentials. Govern your access. Leave a permanent, verifiable trail with DataVault.</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="button button-primary button-large" onClick={onOpenModal}>
              <Wallet size={17} />
              Get started
              <span className="button-arrow">→</span>
            </button>
            <button className="button button-outline button-large" onClick={onOpenRegister}>
              <UserPlus size={17} />
              Register Identity
            </button>
          </div>
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
      <div className="landing-foot"><span>DATAVAULT / 001</span><span>Built for the sovereign web</span><span>EST. 2026</span></div>
    </main>
  )
}

// ─── Role Switcher Component ──────────────────────────────────────────────────

function RoleSwitcher({ role, setRole, authRole }: { role: Role; setRole: (role: Role) => void; authRole: Role }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Admin can view as any role; all other users are locked to their own assigned role
  const roles: Role[] = authRole === 'Admin' ? ['Admin', 'Manager', 'Auditor', 'User'] : [authRole]

  return (
    <div className="role-switcher" ref={ref}>
      <span className="muted-label">Viewing as</span>
      <button
        type="button"
        className="role-switcher-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Switch viewing role"
      >
        <span className={`role-dot role-${role.toLowerCase()}`} />
        <span>{role}</span>
        <ChevronDown size={13} className={`role-chevron ${open ? 'is-open' : ''}`} />
      </button>
      {open && (
        <div className="role-dropdown-menu" role="menu">
          <div className="role-dropdown-header">Switch role</div>
          {roles.map((item) => (
            <button
              key={item}
              type="button"
              className={`role-dropdown-item ${role === item ? 'is-active' : ''}`}
              onClick={() => {
                setRole(item)
                setOpen(false)
              }}
              role="menuitem"
            >
              <div className="role-dropdown-item-content">
                <RoleBadge role={item} />
                <span className="role-dropdown-desc">{roleMeta[item].description}</span>
              </div>
              {role === item && <Check size={14} className="role-dropdown-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Notification Popover Component ───────────────────────────────────────────

function NotificationPopover({
  auditEntries,
  onNavigate,
}: {
  auditEntries: AuditEntry[]
  onNavigate: (page: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const recentEntries = auditEntries.slice(0, 4)

  return (
    <div className="notification-wrapper" ref={ref}>
      <button
        type="button"
        className="notification-button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Notifications"
        title="Recent activity notifications"
      >
        <Bell size={17} />
        <span />
      </button>

      {open && (
        <div className="notification-popover" role="dialog" aria-label="Notifications">
          <div className="notification-popover-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={13} style={{ color: 'var(--mint)' }} />
              <strong>Recent Activity</strong>
            </div>
            <span className="notification-count">{auditEntries.length} events</span>
          </div>

          <div className="notification-popover-list">
            {recentEntries.length === 0 ? (
              <div className="notification-empty">No recent activity</div>
            ) : (
              recentEntries.map((entry, index) => (
                <div className="notification-item" key={entry.hash + index}>
                  <div className={`event-icon event-${entry.tone}`} style={{ width: '24px', height: '24px', flexShrink: 0 }}>
                    <Activity size={12} />
                  </div>
                  <div className="notification-item-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                      <strong className="notification-item-type">{entry.type}</strong>
                      <span className="notification-item-time">{entry.time}</span>
                    </div>
                    <span className="notification-item-target">{entry.target}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="notification-popover-footer">
            <button
              type="button"
              className="notification-view-all-btn"
              onClick={() => {
                setOpen(false)
                onNavigate('audit')
              }}
            >
              <span>View Full Audit Ledger</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function Topbar({ role, setRole, authRole, onMenu, theme, setTheme, shortAddress, onNavigate, auditEntries, onSignOut }: {
  role: Role; setRole: (role: Role) => void; authRole: Role; onMenu: () => void
  theme: 'dark' | 'light'; setTheme: (theme: 'dark' | 'light') => void
  shortAddress: string; onNavigate: (page: string) => void
  auditEntries: AuditEntry[]
  onSignOut: () => void
}) {
  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button>
      <div className="crumb"><span className="crumb-active">Console</span><span>/</span><span>{roleMeta[role].description}</span></div>
      <div className="top-actions">
        <RoleSwitcher role={role} setRole={setRole} authRole={authRole} />
        <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? '◐' : '◑'}</button>
        <NotificationPopover auditEntries={auditEntries} onNavigate={onNavigate} />
        <button className="avatar" title={`Profile: ${shortAddress}`} onClick={() => onNavigate('profile')} aria-label="View profile">{shortAddress.slice(0, 2).toUpperCase()}</button>
        <button
          type="button"
          className="sign-out-button"
          onClick={onSignOut}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ role, page, setPage, open, onClose, shortAddress }: {
  role: Role; page: string; setPage: (page: string) => void; open: boolean; onClose: () => void; shortAddress: string
}) {
  const [navCollapsed, setNavCollapsed] = useState(false)

  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand"><Logo /><span>Data<span className="brand-dot">.</span>Vault</span></div>
        <button className="sidebar-close" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="workspace">
        <span className="workspace-label">Workspace</span>
        <button
          type="button"
          className="workspace-row workspace-toggle"
          onClick={() => setNavCollapsed((prev) => !prev)}
          aria-expanded={!navCollapsed}
          aria-label="Toggle navigation"
        >
          <div className="workspace-icon">A</div>
          <div><strong>Aegis Protocol</strong><span>Core network</span></div>
          <ChevronDown size={14} className={`workspace-chevron ${navCollapsed ? 'is-collapsed' : ''}`} />
        </button>
      </div>
      <div className={`nav-collapse-wrapper ${navCollapsed ? 'is-collapsed' : ''}`}>
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
      </div>
      <div className="sidebar-bottom">
        <div className="network-card">
          <span className="network-dot" />
          <div><span className="muted-label">Connected network</span><strong>Ethereum Sepolia</strong></div>
          <Globe2 size={16} />
        </div>
        <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => { setPage('settings'); onClose() }}><Settings2 size={17} /><span>Settings</span></button>
        <button
          className="wallet-row"
          onClick={() => openAddressInExplorer(shortAddress)}
          title="View address on Etherscan"
        >
          <div className="avatar">{shortAddress.slice(0, 2).toUpperCase()}</div>
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
            {asset.description && (
              <p className="muted-copy" style={{ marginTop: '14px' }}>{asset.description}</p>
            )}
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

// ─── Modal: Update Asset (CHANGE #5 for Manager) ──────────────────────────────

function UpdateAssetModal({
  asset,
  onClose,
  onSave,
}: {
  asset: Asset
  onClose: () => void
  onSave: (updated: Asset) => void
}) {
  const [name, setName] = useState(asset.name)
  const [collection, setCollection] = useState(asset.collection)
  const [description, setDescription] = useState(asset.description ?? '')
  const [standard, setStandard] = useState(asset.standard)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    await new Promise(r => setTimeout(r, 1200))
    onSave({
      ...asset,
      name,
      collection,
      description,
      standard,
      provenance: [
        {
          action: 'Asset updated',
          detail: `Metadata amended by Manager: ${name}`,
          time: 'Just now',
          hash: '0x' + Math.random().toString(16).slice(2, 10) + '...feed',
        },
        ...asset.provenance,
      ],
    })
    setIsUpdating(false)
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="confirm-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-head" style={{ marginBottom: '16px' }}>
          <div><p className="eyebrow">Manager Operations / Edit</p><h2>Update Asset Properties</h2></div>
          <button className="icon-button" onClick={onClose}><X size={17} /></button>
        </div>
        <p className="muted-copy" style={{ marginBottom: '18px' }}>Update metadata and specification for token <strong>{asset.tokenId}</strong>.</p>

        <form onSubmit={handleSubmit}>
          <label className="field-label">Asset Name</label>
          <div className="input-wrap"><input value={name} onChange={e => setName(e.target.value)} required /></div>

          <label className="field-label" style={{ marginTop: '12px' }}>Collection</label>
          <div className="input-wrap"><input value={collection} onChange={e => setCollection(e.target.value)} required /></div>

          <label className="field-label" style={{ marginTop: '12px' }}>Description</label>
          <div className="input-wrap textarea"><textarea value={description} onChange={e => setDescription(e.target.value)} /></div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '22px' }}>
            <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={isUpdating}>
              {isUpdating ? <Loader2 size={13} className="spin" /> : <Settings2 size={13} />}
              {isUpdating ? 'Saving on-chain…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: Revoke Asset Confirmation (CHANGE #5 for Manager) ─────────────────

function RevokeAssetModal({
  asset,
  onClose,
  onConfirm,
}: {
  asset: Asset
  onClose: () => void
  onConfirm: (asset: Asset) => void
}) {
  const [isRevoking, setIsRevoking] = useState(false)

  const handleConfirm = async () => {
    setIsRevoking(true)
    await new Promise(r => setTimeout(r, 1400))
    onConfirm(asset)
    setIsRevoking(false)
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="confirm-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-head" style={{ marginBottom: '14px' }}>
          <div><p className="eyebrow" style={{ color: 'var(--danger)' }}>Dangerous Action / Revoke</p><h2>Revoke Asset</h2></div>
          <button className="icon-button" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="danger-banner" style={{ margin: '0 0 16px' }}>
          <CircleHelp size={18} />
          <div>
            <strong>Are you sure you want to revoke this asset?</strong>
            <span>Token <strong>{asset.tokenId}</strong> ({asset.name}) assigned to <code>{asset.owner}</code> will be burned/revoked and made inaccessible.</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          <button type="button" className="button button-outline" onClick={onClose} disabled={isRevoking}>Cancel</button>
          <button type="button" className="button button-danger" onClick={handleConfirm} disabled={isRevoking}>
            {isRevoking ? <Loader2 size={13} className="spin" /> : <X size={13} />}
            {isRevoking ? 'Revoking on-chain…' : 'Yes, Revoke Asset'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Add Identity (CHANGE #3 for Admin) ────────────────────────────────

function AddIdentityModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (member: Member) => void
}) {
  const [address, setAddress] = useState('')
  const [name, setName] = useState('')
  const [memberRole, setMemberRole] = useState<Role>('User')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1500))
    onAdd({
      address: address.includes('...') ? address : `${address.slice(0, 6)}...${address.slice(-4)}`,
      name: name || 'Sovereign Operator',
      memberRole,
      status: 'Active',
    })
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="confirm-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-head" style={{ marginBottom: '14px' }}>
          <div><p className="eyebrow">Governance / DID Registry</p><h2>Add New Identity</h2></div>
          <button className="icon-button" onClick={onClose}><X size={17} /></button>
        </div>
        <p className="muted-copy" style={{ marginBottom: '16px' }}>Register a new address and assign an initial access tier in the RBACManager contract.</p>

        <form onSubmit={handleSubmit}>
          <label className="field-label">Wallet Address</label>
          <div className="input-wrap">
            <Wallet size={16} />
            <input placeholder="0x..." value={address} onChange={e => setAddress(e.target.value)} required />
          </div>

          <label className="field-label" style={{ marginTop: '12px' }}>Display Name / Label</label>
          <div className="input-wrap">
            <UserRound size={16} />
            <input placeholder="e.g. Protocol Operator" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <label className="field-label" style={{ marginTop: '12px' }}>Assigned Role</label>
          <div className="input-wrap">
            <select
              value={memberRole}
              onChange={e => setMemberRole(e.target.value as Role)}
              style={{ background: 'transparent', border: 0, color: 'var(--foreground)', width: '100%', cursor: 'pointer' }}
            >
              <option value="User">User (Default Sovereign)</option>
              <option value="Manager">Manager (Asset Operations)</option>
              <option value="Auditor">Auditor (Audit Verification)</option>
              <option value="Admin">Admin (Full Governance)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '22px' }}>
            <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={!address || submitting}>
              {submitting ? <Loader2 size={13} className="spin" /> : <Plus size={13} />}
              {submitting ? 'Registering on-chain…' : 'Add Identity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: Deactivate User Confirmation (CHANGE #6 for Admin) ────────────────

function DeactivateUserModal({
  member,
  onClose,
  onConfirm,
}: {
  member: Member
  onClose: () => void
  onConfirm: (member: Member) => void
}) {
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1400))
    onConfirm(member)
    setSubmitting(false)
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="confirm-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-head" style={{ marginBottom: '14px' }}>
          <div><p className="eyebrow" style={{ color: 'var(--danger)' }}>Governance / Revocation</p><h2>Deactivate User</h2></div>
          <button className="icon-button" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="danger-banner" style={{ margin: '0 0 16px' }}>
          <CircleHelp size={18} />
          <div>
            <strong>Are you sure you want to deactivate {member.name}?</strong>
            <span>Address <code>{member.address}</code> ({member.memberRole}) will have all platform permissions revoked and will no longer be authorized to access services.</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          <button type="button" className="button button-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="button" className="button button-danger" onClick={handleConfirm} disabled={submitting}>
            {submitting ? <Loader2 size={13} className="spin" /> : <X size={13} />}
            {submitting ? 'Revoking Access…' : 'Yes, Deactivate User'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function Overview({
  role,
  onSelect,
  address,
  auditEntries,
  assetList,
  onNavigate,
}: {
  role: Role
  onSelect: (asset: Asset) => void
  address: string
  auditEntries: AuditEntry[]
  assetList: Asset[]
  onNavigate: (page: string) => void
}) {
  // Build quick-access cards based on the pages available for this role
  const quickActions = nav
    .filter((item) => item.roles.includes(role) && item.id !== 'overview')
    .map((item) => {
      const descriptions: Record<string, string> = {
        identity: 'View and manage your decentralized identity credentials',
        assets: 'Browse the full asset registry and manage owned assets',
        mint: 'Create and issue new on-chain assets',
        roles: 'Manage user roles and access permissions',
        'register-admin': 'Register a new role operator on-chain',
        audit: 'Inspect the immutable audit trail and verify proofs',
      }
      return { ...item, description: descriptions[item.id] || '' }
    })

  return (
    <div className="page-content">
      <div className="hero-row">
        <div>
          <p className="eyebrow accent-text">{role === 'Auditor' ? 'Verification console' : 'Good morning, operator'}</p>
          <h1>{role === 'Admin' ? 'Dashboard' : role === 'Manager' ? 'Asset operations' : role === 'Auditor' ? 'Trust, made visible' : 'Your sovereign portfolio'}</h1>
          <p className="page-intro">{roleMeta[role].description} <span className="separator">·</span> <Hash>{`did:ethr:${address.slice(0, 6)}...${address.slice(-4)}`}</Hash></p>
        </div>
        <div className="hero-status"><span className="live-dot" /><strong>All systems verified</strong><span>Block #18,402,991</span></div>
      </div>

      {/* Quick-access shortcuts to existing pages */}
      <div className="dashboard-shortcuts">
        {quickActions.map((item) => (
          <button
            key={item.id}
            className="dashboard-shortcut-card"
            onClick={() => onNavigate(item.id)}
          >
            <div className="shortcut-icon-wrap">
              <item.icon size={20} />
            </div>
            <div className="shortcut-text">
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </div>
            <ArrowUpRight size={14} className="shortcut-arrow" />
          </button>
        ))}
      </div>

      <div className="overview-grid">
        <div className="wide-panel">
          <SectionHeading eyebrow="Owned assets" title="Your registry" action={<button className="text-button" onClick={() => onNavigate('assets')}>View all <ArrowUpRight size={14} /></button>} />
          <div className="asset-grid">
            {assetList.slice(0, 3).map((asset) => (
              <AssetCard key={asset.id} asset={asset} role={role} onSelect={onSelect} />
            ))}
          </div>
        </div>
        <IdentityCard compact address={address} />
        <div className="wide-panel activity-panel">
          <SectionHeading eyebrow="Protocol activity" title="Latest proofs" action={<button className="text-button" onClick={() => onNavigate('audit')}>Open ledger <ArrowUpRight size={14} /></button>} />
          <ActivityLedger compact role={role} auditEntries={auditEntries} />
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

// ─── Assets Page (CHANGE #1: Mint removed for User; CHANGE #5: Manager Update & Revoke)

function AssetsPage({
  role,
  onSelect,
  onMintClick,
  onOpenUpdate,
  onOpenRevoke,
  assetList,
}: {
  role: Role
  onSelect: (asset: Asset) => void
  onMintClick: () => void
  onOpenUpdate: (asset: Asset) => void
  onOpenRevoke: (asset: Asset) => void
  assetList: Asset[]
}) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(
    () => assetList.filter(a => a.name.toLowerCase().includes(query.toLowerCase()) || a.tokenId.includes(query)),
    [assetList, query]
  )

  // CHANGE #1: Only Admin & Manager can mint new assets. Hidden completely for User & Auditor.
  const canMint = role === 'Admin' || role === 'Manager'

  return (
    <div className="page-content">
      <SectionHeading
        eyebrow={`Asset registry / ${assetList.length} total`}
        title="Your assets"
        action={
          canMint ? (
            <button className="button button-primary" onClick={onMintClick}>
              <Plus size={15} /> Mint new
            </button>
          ) : undefined
        }
      />
      <div className="filter-row">
        <div className="search-box"><Search size={15} /><input placeholder="Search assets, collections, token IDs" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <button className="filter-button">All collections <ChevronDown size={14} /></button>
        <button className="filter-button">Verified <ChevronDown size={14} /></button>
      </div>
      <div className="full-asset-grid">
        {filtered.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            role={role}
            onSelect={onSelect}
            onUpdate={onOpenUpdate}
            onRevoke={onOpenRevoke}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Audit Page (CHANGE #2: Verification restricted to Auditor only) ──────────

function AuditPage({ role, auditEntries }: { role: Role; auditEntries: AuditEntry[] }) {
  const isAuditor = role === 'Auditor'

  return (
    <div className="page-content">
      <SectionHeading
        eyebrow={`Immutable activity / ${auditEntries.length} events`}
        title="Audit ledger"
        action={<button className="button button-outline"><ArrowUpRight size={15} /> Export ledger</button>}
      />
      <div className="audit-callout">
        <div className="proof-icon"><BadgeCheck size={22} /></div>
        <div><strong>Ledger integrity verified</strong><span>All events reconcile with the protocol state root on Sepolia.</span></div>
        {isAuditor ? (
          <>
            <button className="hash hash-link" onClick={() => openTxInExplorer('0x91ab8ec20f')}>root: 0x91ab...c20f <ArrowUpRight size={11} style={{ display: 'inline' }} /></button>
            <button className="text-button" onClick={() => openTxInExplorer('0x91ab8ec20f')}>Verify now <ArrowUpRight size={14} /></button>
          </>
        ) : (
          <Hash>root: 0x91ab...c20f</Hash>
        )}
      </div>
      <div className="filter-row">
        <div className="search-box"><Search size={15} /><input placeholder="Search by DID, hash or action" /></div>
        <button className="filter-button">All actions <ChevronDown size={14} /></button>
        <button className="filter-button">Last 24 hours <ChevronDown size={14} /></button>
      </div>
      <div className="audit-table">
        <div className="audit-header"><span>Event</span><span>Actor / target</span><span>Timestamp</span><span>Proof</span></div>
        <ActivityLedger role={role} auditEntries={auditEntries} />
      </div>
    </div>
  )
}

function MintPage({ address = '', onMintCreated }: { address?: string; onMintCreated?: (asset: Asset) => void }) {
  const [step, setStep] = useState<1|2|3|4>(1)
  const steps = ['Recipient', 'Metadata', 'Review', 'Sign']
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddr, setWalletAddr] = useState('')
  const [recipient, setRecipient] = useState(address.startsWith('0x') ? address : '')
  const [assetName, setAssetName] = useState('Field Credential / Level 04')
  const [description, setDescription] = useState('Authorized infrastructure clearance token.')
  const [assetType, setAssetType] = useState('document')
  const [txHash, setTxHash] = useState('')
  const [tokenId, setTokenId] = useState('')
  const [mintError, setMintError] = useState<string | null>(null)
  const [minting, setMinting] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // ── Connect MetaMask for on-chain signing (separate from Google auth) ────
  const connectMetaMask = async () => {
    setMintError(null)
    try {
      const eth = (window as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
      if (!eth) { setMintError('MetaMask not detected. Please install the MetaMask browser extension.'); return }
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SEPOLIA_CHAIN_ID }] }).catch(() => {})
      const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[]
      if (accounts[0]) {
        setWalletAddr(accounts[0])
        setWalletConnected(true)
        if (!recipient) setRecipient(accounts[0])
      }
    } catch (err: unknown) {
      setMintError(err instanceof Error ? err.message : 'Failed to connect MetaMask')
    }
  }

  const handleSign = async () => {
    if (!assetName.trim()) { setMintError('Asset name is required.'); return }
    if (!recipient.trim() || !recipient.startsWith('0x') || recipient.length !== 42) { setMintError('Please enter a valid Ethereum address (0x...) as the recipient.'); return }

    const eth = typeof window !== 'undefined' ? (window as { ethereum?: object }).ethereum : null
    if (eth && walletConnected) {
      setMinting(true)
      setMintError(null)
      try {
        const jwtToken = typeof window !== 'undefined' ? localStorage.getItem('dvault_jwt') ?? '' : ''
        let ipfsUri = 'ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
        try {
          const formData = new FormData()
          formData.append('name', assetName)
          formData.append('description', description)
          formData.append('assetType', assetType)
          if (uploadFile) formData.append('file', uploadFile)
          const metaRes = await fetch(`${API_URL}/api/assets/metadata`, {
            method: 'POST',
            headers: { ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}) },
            body: formData,
          })
          if (metaRes.ok) {
            const metaJson = await metaRes.json()
            ipfsUri = metaJson.data?.ipfsUri ?? metaJson.ipfsUri ?? ipfsUri
          }
        } catch { /* fallback to default IPFS URI */ }

        const { BrowserProvider, Contract, Interface } = await import('ethers')
        const { CONTRACT_ADDRESSES: addrs, NFT_ABI } = await import('@/lib/contracts')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const provider = new BrowserProvider(eth as any)
        const signer = await provider.getSigner()
        const nft = new Contract(addrs.nft, NFT_ABI as unknown as object[], signer)
        const tx = await nft.mint(recipient, ipfsUri)
        setTxHash(tx.hash)
        const receipt = await tx.wait()

        const iface = new Interface(NFT_ABI as unknown as object[])
        let mintedId = ''
        for (const log of receipt.logs) {
          try { const p = iface.parseLog(log); if (p?.name === 'NFTMinted') mintedId = p.args.tokenId.toString() } catch { /* skip */ }
        }
        setTokenId(mintedId)
        if (onMintCreated) {
          onMintCreated({
            id: 'asset-' + (mintedId || Math.random().toString(36).slice(2, 7)),
            name: assetName,
            collection: 'Sepolia NFT',
            tokenId: mintedId ? `#${mintedId}` : '#000001',
            standard: 'ERC-721',
            status: 'Verified',
            color: 'mint',
            owner: recipient,
            description,
            provenance: [
              { action: 'Current owner', detail: 'DID ownership verified on-chain', time: 'Just now', hash: tx.hash },
              { action: 'Minted', detail: 'On-chain NFTAsset', time: 'Just now', hash: tx.hash },
            ],
          })
        }
        setStep(4)
        return
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Minting failed'
        if (msg.toLowerCase().includes('reject') || msg.toLowerCase().includes('denied')) {
          setMintError('You rejected the transaction in MetaMask.')
          setMinting(false)
          return
        }
      } finally {
        setMinting(false)
      }
    }

    // Demo / fallback simulation when wallet is not connected
    const simulatedHash = '0x' + Math.random().toString(16).slice(2, 10) + '...f8e0'
    const simulatedTokenId = Math.floor(100000 + Math.random() * 900000).toString()
    setTxHash(simulatedHash)
    setTokenId(simulatedTokenId)
    if (onMintCreated) {
      onMintCreated({
        id: 'asset-' + Math.random().toString(36).slice(2, 7),
        name: assetName || 'New Minted Asset',
        collection: 'Operator Keys',
        tokenId: '#' + simulatedTokenId,
        standard: 'ERC-721',
        status: 'Verified',
        color: 'mint',
        owner: recipient || currentIdentity.did,
        description,
        provenance: [
          { action: 'Current owner', detail: 'DID ownership verified', time: 'Just now', hash: simulatedHash },
          { action: 'Minted', detail: 'By ' + (recipient || currentIdentity.did), time: 'Just now', hash: simulatedHash },
        ],
      })
    }
    setStep(4)
  }

  return (
    <div className="page-content">
      <SectionHeading eyebrow="Asset operations / New issuance" title="Mint an asset" action={<span className="gas-note"><Zap size={14} /> Est. gas 0.002 ETH</span>} />

      {/* ── MetaMask connection banner ── */}
      {!walletConnected ? (
        <div className="danger-banner" style={{ cursor: 'pointer', marginBottom: 20 }} onClick={connectMetaMask}>
          <Wallet size={18} />
          <div>
            <strong>Connect MetaMask to sign transactions</strong>
            <span>Connect your MetaMask wallet on Sepolia to mint real ERC-721 NFTs on-chain, or continue to test in prototype mode.</span>
          </div>
          <button className="button button-primary button-small" onClick={e => { e.stopPropagation(); connectMetaMask() }}>Connect wallet</button>
        </div>
      ) : (
        <div className="danger-banner" style={{ borderColor: 'var(--mint)', background: 'rgba(157, 245, 193, 0.06)', marginBottom: 20 }}>
          <Check size={18} style={{ color: 'var(--mint)' }} />
          <div>
            <strong>MetaMask connected</strong>
            <span>Signing with {walletAddr.slice(0, 6)}...{walletAddr.slice(-4)}</span>
          </div>
        </div>
      )}

      <div className="mint-layout">
        <div className="mint-main">
          <div className="stepper">{steps.map((item, index) => <div className={`step ${step > index + 1 ? 'done' : ''} ${step === index + 1 ? 'current' : ''}`} key={item}><span>{step > index + 1 ? <Check size={13} /> : index + 1}</span><label>{item}</label></div>)}</div>
          <div className="form-card">
            {mintError && <div className="wallet-error" style={{ marginBottom: 16 }}><X size={13} /> {mintError}</div>}

            {step === 1 && <>
              <p className="eyebrow">Step 01 / Recipient</p><h2>Who should own this asset?</h2>
              <p className="muted-copy">Enter the wallet address of the recipient. They will receive the NFT and the verifiable ownership credential.</p>
              <label className="field-label">Recipient wallet address</label>
              <div className="input-wrap"><Wallet size={16} /><input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="0x..." /></div>
            </>}

            {step === 2 && <>
              <p className="eyebrow">Step 02 / Metadata</p><h2>Describe the asset</h2>
              <p className="muted-copy">Metadata is pinned to IPFS and its content hash committed on-chain with the mint.</p>
              <label className="field-label">Asset name</label>
              <div className="input-wrap"><input value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g. Field Credential / Level 04" /></div>
              <label className="field-label">Asset type</label>
              <div className="input-wrap"><select value={assetType} onChange={e => setAssetType(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'inherit', flex: 1, fontSize: 13 }}><option value="document">Document</option><option value="certificate">Certificate</option><option value="identity">Identity credential</option><option value="access">Access pass</option><option value="equipment">Equipment</option></select></div>
              <label className="field-label">Description</label>
              <div className="input-wrap textarea"><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this asset represent?" /></div>

              {/* ── Document upload ── */}
              <label className="field-label" style={{ marginTop: 16 }}>Upload document (optional)</label>
              <div
                className="file-drop-zone"
                style={{
                  border: `2px dashed ${dragActive ? 'var(--mint)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: '28px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: dragActive ? 'rgba(157,245,193,0.06)' : 'rgba(255,255,255,0.02)',
                  marginBottom: 8,
                }}
                onDragOver={e => { e.preventDefault(); setDragActive(true) }}
                onDragLeave={() => setDragActive(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDragActive(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f) setUploadFile(f)
                }}
                onClick={() => {
                  const inp = document.createElement('input')
                  inp.type = 'file'
                  inp.accept = 'image/jpeg,image/png,image/gif,image/webp,application/pdf'
                  inp.onchange = () => { if (inp.files?.[0]) setUploadFile(inp.files[0]) }
                  inp.click()
                }}
              >
                {uploadFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <FileText size={20} style={{ color: 'var(--mint)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ fontSize: 13 }}>{uploadFile.name}</strong>
                      <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>{(uploadFile.size / 1024).toFixed(1)} KB · {uploadFile.type || 'unknown'}</p>
                    </div>
                    <button
                      style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
                      onClick={e => { e.stopPropagation(); setUploadFile(null) }}
                      title="Remove file"
                    ><X size={16} /></button>
                  </div>
                ) : (
                  <div>
                    <Upload size={28} style={{ color: 'var(--muted)', marginBottom: 8 }} />
                    <p style={{ fontSize: 13, color: 'var(--fg)', margin: '0 0 4px' }}><strong>Click to upload</strong> or drag and drop</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>PDF, JPEG, PNG, GIF, WebP — max 10 MB</p>
                  </div>
                )}
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 4px' }}>File will be uploaded to IPFS (Pinata) and linked to the NFT metadata.</p>
            </>}

            {step === 3 && <>
              <p className="eyebrow">Step 03 / Review</p><h2>Check the issuance</h2>
              <div className="review-list">
                <div><span>Recipient</span><Hash>{`${recipient.slice(0, 10)}...${recipient.slice(-6)}`}</Hash></div>
                <div><span>Asset name</span><strong>{assetName}</strong></div>
                <div><span>Asset type</span><strong>{assetType}</strong></div>
                <div><span>Standard</span><strong>ERC-721</strong></div>
                <div><span>Network</span><strong>Ethereum Sepolia</strong></div>
                {uploadFile && <div><span>Document</span><strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={13} /> {uploadFile.name} <span style={{ fontSize: 11, color: 'var(--muted)' }}>({(uploadFile.size / 1024).toFixed(1)} KB)</span></strong></div>}
                <div><span>Metadata</span><ProofPill>Will be pinned to IPFS</ProofPill></div>
              </div>
              <div className="signature-note"><KeyRound size={18} /><div><strong>Next: sign a transaction</strong><span>MetaMask will ask for confirmation. This permanently creates the asset on-chain.</span></div></div>
            </>}

            {step === 4 && <div className="mint-success">
              <div className="success-orbit"><BadgeCheck size={34} /></div>
              <p className="eyebrow accent-text">Transaction confirmed</p>
              <h2>Asset minted on Sepolia.</h2>
              <p className="muted-copy">{assetName} has been minted as NFT{tokenId ? ` #${tokenId}` : ''} and linked to the recipient address.</p>
              {txHash && <button className="hash hash-link" onClick={() => openTxInExplorer(txHash)}>tx: {txHash.slice(0, 10)}...{txHash.slice(-6)} <ArrowUpRight size={11} style={{ display: 'inline' }} /></button>}
              <ProofPill>Ownership verified on-chain</ProofPill>
            </div>}

            <div className="form-actions">
              {step > 1 && step < 4 && <button className="button button-outline" onClick={() => setStep((step - 1) as 1|2|3|4)}>Back</button>}
              {step < 3 && <button className="button button-primary" onClick={() => setStep((step + 1) as 1|2|3|4)} disabled={step === 1 && !recipient.trim()}>Continue <ArrowUpRight size={15} /></button>}
              {step === 3 && <button className="button button-primary" onClick={handleSign} disabled={minting}>{minting ? <><Loader2 size={15} className="spin" /> Minting…</> : <>Sign &amp; mint <ArrowUpRight size={15} /></>}</button>}
              {step === 4 && <button className="button button-primary" onClick={() => { setStep(1); setAssetName(''); setDescription(''); setTxHash(''); setTokenId(''); setMintError(null); setUploadFile(null) }}>Mint another <Plus size={15} /></button>}
            </div>
          </div>
        </div>
        <div className="mint-aside">
          <div className="aside-art"><Fingerprint size={42} /><span>DID → NFT</span><small>permanent ownership link</small></div>
          <div className="gas-card">
            <div><span className="muted-label">Contract</span><strong>NFTAsset (ERC-721)</strong></div>
            <div><span className="muted-label">Address</span><button className="hash hash-link" onClick={() => openAddressInExplorer('0x7Ea4666bF8A593bD8b387871f1D57a27313dFfA9')}>0x7Ea4...fA9 <ArrowUpRight size={10} style={{ display: 'inline' }} /></button></div>
            <div><span className="muted-label">Estimated gas</span><strong>0.002 ETH</strong></div>
            <div><span className="muted-label">Network</span><strong>Ethereum Sepolia</strong></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Roles Page (CHANGE #3: Fix Add Identity; CHANGE #6: Deactivate User) ──────

function RolesPage({
  members,
  role,
  onOpenAddModal,
  onOpenDeactivateModal,
}: {
  members: Member[]
  role: Role
  onOpenAddModal: () => void
  onOpenDeactivateModal: (member: Member) => void
}) {
  const [assigned, setAssigned] = useState<string | null>(null)
  const isAdmin = role === 'Admin'

  return (
    <div className="page-content">
      {/* CHANGE #3: Add Identity button is connected to onOpenAddModal */}
      <SectionHeading
        eyebrow="Governance / Access control"
        title="Role control"
        action={
          isAdmin ? (
            <button className="button button-primary" onClick={onOpenAddModal}>
              <Plus size={15} /> Add identity
            </button>
          ) : undefined
        }
      />
      <div className="danger-banner"><CircleHelp size={18} /><div><strong>Role changes are on-chain actions</strong><span>Every assignment updates the access registry and is permanently recorded in the audit ledger.</span></div><Hash>contract: 0xAeg1...84f2</Hash></div>
      <div className="roles-card">
        <div className="roles-card-head"><div><p className="eyebrow">Active identities / {members.length.toString().padStart(2, '0')}</p><h3>Permission registry</h3></div><div className="search-box compact-search"><Search size={15} /><input placeholder="Find an identity" /></div></div>
        {members.map((member) => (
          <div className="member-row" key={member.address} style={{ gridTemplateColumns: isAdmin ? '32px 1fr 110px 90px 115px 105px' : '32px 1fr 110px 90px 115px' }}>
            <div className="avatar small-avatar">{member.address.slice(2, 4)}</div>
            <div className="member-name"><strong>{member.name}</strong>
              <button className="hash hash-link" onClick={() => openAddressInExplorer(member.address)} title="View on Etherscan">{member.address} <ArrowUpRight size={11} style={{ display: 'inline' }} /></button>
            </div>
            <RoleBadge role={member.memberRole} />
            <span className={`member-status ${member.status === 'Inactive' ? 'is-inactive' : ''}`}>
              <span className="live-dot" /> {member.status ?? 'Active'}
            </span>
            <button className="button button-outline button-small" onClick={() => setAssigned(member.address)}>{assigned === member.address ? 'Pending sign' : 'Change role'} <ChevronDown size={13} /></button>

            {/* CHANGE #6: Admin Capability to Remove/Deactivate Users */}
            {isAdmin && (
              <button
                className="button button-danger button-small"
                onClick={() => onOpenDeactivateModal(member)}
                disabled={member.status === 'Inactive'}
                title="Deactivate this user and revoke access"
              >
                <X size={12} /> {member.status === 'Inactive' ? 'Inactive' : 'Deactivate'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Register Admin Page (Retained for Admin role governance) ──────────────────

function RegisterAdminPage({ onAdminAssigned, members }: { onAdminAssigned: (address: string, role: Role) => void; members: Member[] }) {
  const [step, setStep] = useState<'form' | 'signing' | 'done'>('form')
  const [selectedUserAddress, setSelectedUserAddress] = useState('')
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Manager' | 'Auditor'>('Manager')
  const [reason, setReason] = useState('')

  // Get the selected member for display
  const selectedMember = members.find(m => m.address === selectedUserAddress)
  // Derive DID from wallet address (existing relationship: User → DID → Wallet)
  const derivedDID = selectedUserAddress ? `did:ethr:${selectedUserAddress}` : ''

  const roleOptions: { value: 'Admin' | 'Manager' | 'Auditor'; label: string; desc: string }[] = [
    { value: 'Admin',   label: 'Admin',   desc: 'Full governance access. Can assign all roles, mint assets, and manage the protocol.' },
    { value: 'Manager', label: 'Manager', desc: 'Can mint and transfer assets. Cannot assign Admin roles.' },
    { value: 'Auditor', label: 'Auditor', desc: 'Read-only access to the audit ledger and all activity logs.' },
  ]

  const handleAssign = async () => {
    if (!selectedUserAddress) return
    setStep('signing')
    await new Promise(r => setTimeout(r, 1800))
    onAdminAssigned(selectedUserAddress, selectedRole)
    setStep('done')
  }

  return (
    <div className="page-content">
      <SectionHeading eyebrow="Governance / Privileged access" title="Register Role" />
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
              <p className="muted-copy">Select a registered user from the system. Their DID and wallet address will be resolved automatically. The role is stored in the <code>RBACManager</code> contract and enforced across the entire protocol.</p>

              <label className="field-label">Select registered user</label>
              <div className="input-wrap">
                <Users size={16} />
                <select
                  value={selectedUserAddress}
                  onChange={e => setSelectedUserAddress(e.target.value)}
                  style={{ appearance: 'auto', background: 'transparent', border: 0, color: 'var(--foreground)', width: '100%', fontSize: '11px', cursor: 'pointer' }}
                >
                  <option value="" disabled>Choose a registered user…</option>
                  {members.filter(m => m.status === 'Active').map(m => (
                    <option key={m.address} value={m.address}>
                      {m.name} — {m.memberRole} ({m.address})
                    </option>
                  ))}
                </select>
              </div>

              {selectedMember && (
                <div className="recipient-check">
                  <BadgeCheck size={18} />
                  <div>
                    <strong>User resolved: {selectedMember.name}</strong>
                    <span>DID: {derivedDID} · Wallet: {selectedUserAddress}</span>
                  </div>
                </div>
              )}

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
                <button className="button button-primary" onClick={handleAssign} disabled={!selectedUserAddress}><ShieldCheck size={15} /> Assign {selectedRole} role <ArrowUpRight size={15} /></button>
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
                <p className="muted-copy">User <strong>{selectedMember?.name || selectedUserAddress}</strong> now holds the <strong>{selectedRole}</strong> role in the RBACManager contract.</p>
                <ProofPill>Recorded in audit ledger</ProofPill>
              </div>
              <div className="form-actions">
                <button className="button button-outline" onClick={() => { setStep('form'); setSelectedUserAddress(''); setReason('') }}>Assign another <Plus size={15} /></button>
                <button className="button button-primary" onClick={() => openAddressInExplorer(selectedUserAddress)}>View on Etherscan <ArrowUpRight size={15} /></button>
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

// ─── Profile Page (Large View) ────────────────────────────────────────────────

function ProfilePage({ role, shortAddress, address, auth }: {
  role: Role; shortAddress: string; address: string; auth: AuthState
}) {
  const userName = auth.connected && auth.name ? auth.name : `${role} Operator`
  const userEmail = auth.connected && auth.email ? auth.email : null
  const authMethod = auth.connected ? (auth.authMethod === 'google' ? 'Google OAuth' : 'MetaMask (SIWE)') : 'Demo session'

  return (
    <div className="page-content">
      <SectionHeading eyebrow="Account & Identity" title="Profile" />
      <div className="settings-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '780px' }}>
        <div className="settings-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '22px' }}>
            <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
              {shortAddress.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '18px' }}>{userName}</h3>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '12px' }}>
                {userEmail ? `${userEmail} · ` : ''}DataVault Protocol Operator
              </p>
            </div>
          </div>
          <div className="settings-row"><span>Active role</span><strong><RoleBadge role={role} /></strong></div>
          {userName && <div className="settings-row"><span>User name</span><strong>{userName}</strong></div>}
          {userEmail && <div className="settings-row"><span>Email</span><strong>{userEmail}</strong></div>}
          <div className="settings-row"><span>Wallet address</span><strong className="hash">{address || shortAddress}</strong></div>
          <div className="settings-row"><span>DID</span><strong className="hash">did:ethr:{address || shortAddress}</strong></div>
          <div className="settings-row"><span>Authentication</span><strong>{authMethod}</strong></div>
          <div className="settings-row"><span>Role description</span><strong>{roleMeta[role].description}</strong></div>
        </div>
      </div>
    </div>
  )
}

// ─── Settings Page ────────────────────────────────────────────────────────────

function SettingsPage({ theme, setTheme }: {
  theme: 'dark' | 'light'; setTheme: (t: 'dark' | 'light') => void
}) {
  return (
    <div className="page-content">
      <SectionHeading eyebrow="Configuration" title="Settings" />
      <div className="settings-grid">
        <div className="settings-card">
          <h3>Network</h3>
          <p>Blockchain network and protocol connection details.</p>
          <div className="settings-row"><span>Network</span><strong>Ethereum Sepolia</strong></div>
          <div className="settings-row"><span>Chain ID</span><strong className="hash">11155111</strong></div>
          <div className="settings-row"><span>Status</span><strong style={{ color: 'var(--mint)' }}>● Connected</strong></div>
          <div className="settings-row"><span>RPC endpoint</span><strong className="hash">sepolia.infura.io</strong></div>
        </div>
        <div className="settings-card">
          <h3>Appearance</h3>
          <p>Customize the look and feel of your DataVault console.</p>
          <div className="settings-row">
            <span>Theme</span>
            <button className="button button-outline button-small" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? '◐' : '◑'} {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
          </div>
          <div className="settings-row"><span>Font</span><strong>DM Sans</strong></div>
          <div className="settings-row"><span>Mono font</span><strong className="hash">IBM Plex Mono</strong></div>
        </div>
        <div className="settings-card">
          <h3>Protocol</h3>
          <p>Smart contract and protocol version information.</p>
          <div className="settings-row"><span>RBAC contract</span><strong className="hash">RBACManager v1.0</strong></div>
          <div className="settings-row"><span>Asset contract</span><strong className="hash">ERC-721 / ERC-1155</strong></div>
          <div className="settings-row"><span>Explorer</span><strong className="hash">sepolia.etherscan.io</strong></div>
        </div>
      </div>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

function App() {
  const { auth, connecting, error, showModal, setShowModal, connectWallet, handleGoogleCredential, connectAsRegisteredUser, disconnect } = useAuth()
  const [role, setRole] = useState<Role>('User')
  const [page, setPage] = useState('overview')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  // App-wide stateful data
  const [assetList, setAssetList] = useState<Asset[]>(initialAssets)
  const [memberList, setMemberList] = useState<Member[]>(initialMembers)
  const [auditList, setAuditList] = useState<AuditEntry[]>(initialAuditEntries)
  const [toastMessage, setToastMessage] = useState<string | null>('Ledger synced · Block #18,402,991')

  // Modals state
  const [showAddIdentityModal, setShowAddIdentityModal] = useState(false)
  const [updatingAsset, setUpdatingAsset] = useState<Asset | null>(null)
  const [revokingAsset, setRevokingAsset] = useState<Asset | null>(null)
  const [deactivatingMember, setDeactivatingMember] = useState<Member | null>(null)
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login')

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev)
    }, 4000)
  }

  // Handlers
  const handleAddMember = (newMember: Member) => {
    setMemberList(prev => [newMember, ...prev])
    setAuditList(prev => [
      {
        type: 'Identity created',
        actor: auth.connected ? auth.address : 'did:ethr:0xAeg1...84f2',
        target: `${newMember.name} (${newMember.memberRole})`,
        time: 'Just now',
        hash: '0x' + Math.random().toString(16).slice(2, 10) + '...1d90',
        tone: 'mint',
      },
      ...prev,
    ])
    showToast(`Identity created: ${newMember.name}`)
  }

  const handleDeactivateMember = (target: Member) => {
    setMemberList(prev => prev.map(m => m.address === target.address ? { ...m, status: 'Inactive' } : m))
    setAuditList(prev => [
      {
        type: 'Identity deactivated',
        actor: auth.connected ? auth.address : 'did:ethr:0xAdmin...84f2',
        target: `Deactivated ${target.name} (${target.address})`,
        time: 'Just now',
        hash: '0x' + Math.random().toString(16).slice(2, 10) + '...deac',
        tone: 'amber',
      },
      ...prev,
    ])
    showToast(`User deactivated: ${target.name}`)
  }

  const handleUpdateAsset = (updated: Asset) => {
    setAssetList(prev => prev.map(a => a.id === updated.id ? updated : a))
    setAuditList(prev => [
      {
        type: 'Asset updated',
        actor: auth.connected ? auth.address : 'did:ethr:0xManager...aa08',
        target: `Updated ${updated.name} · ${updated.tokenId}`,
        time: 'Just now',
        hash: '0x' + Math.random().toString(16).slice(2, 10) + '...feed',
        tone: 'blue',
      },
      ...prev,
    ])
    showToast(`Asset updated: ${updated.name}`)
  }

  const handleRevokeAsset = (target: Asset) => {
    setAssetList(prev => prev.map(a => a.id === target.id ? { ...a, status: 'Revoked' } : a))
    setAuditList(prev => [
      {
        type: 'Asset revoked',
        actor: auth.connected ? auth.address : 'did:ethr:0xManager...aa08',
        target: `Revoked ${target.name} · ${target.tokenId}`,
        time: 'Just now',
        hash: '0x' + Math.random().toString(16).slice(2, 10) + '...burn',
        tone: 'coral',
      },
      ...prev,
    ])
    showToast(`Asset revoked: ${target.name}`)
  }

  const handleMintCreated = (newAsset: Asset) => {
    setAssetList(prev => [newAsset, ...prev])
    setAuditList(prev => [
      {
        type: 'NFT minted',
        actor: auth.connected ? auth.address : currentIdentity.did,
        target: `${newAsset.name} · ${newAsset.tokenId}`,
        time: 'Just now',
        hash: '0x' + Math.random().toString(16).slice(2, 10) + '...f8e0',
        tone: 'mint',
      },
      ...prev,
    ])
    showToast(`Asset minted: ${newAsset.name}`)
  }

  const handleAdminAssigned = (address: string, assignedRole: Role) => {
    setMemberList(prev => [
      {
        address: address.includes('...') ? address : `${address.slice(0, 6)}...${address.slice(-4)}`,
        name: `${assignedRole} Operator`,
        memberRole: assignedRole,
        status: 'Active',
      },
      ...prev,
    ])
    setAuditList(prev => [
      {
        type: 'Role assigned',
        actor: auth.connected ? auth.address : 'did:ethr:0xAdmin...84f2',
        target: `${assignedRole} → ${address.slice(0, 8)}...`,
        time: 'Just now',
        hash: '0x' + Math.random().toString(16).slice(2, 10) + '...fa42',
        tone: 'blue',
      },
      ...prev,
    ])
    showToast(`Assigned ${assignedRole} role`)
  }

  const handleSelfRegister = (regAddress: string, regName: string) => {
    const formatted = regAddress.includes('...') ? regAddress : `${regAddress.slice(0, 6)}...${regAddress.slice(-4)}`
    setMemberList(prev => [
      {
        address: formatted,
        name: regName || 'Sovereign User',
        memberRole: 'User',
        status: 'Active',
      },
      ...prev,
    ])
    setAuditList(prev => [
      {
        type: 'Identity created',
        actor: `did:ethr:${formatted}`,
        target: `Self-registered identity (${regName || 'User'})`,
        time: 'Just now',
        hash: '0x' + Math.random().toString(16).slice(2, 10) + '...c20f',
        tone: 'mint',
      },
      ...prev,
    ])
    connectAsRegisteredUser(regAddress, regName)
    showToast(`Welcome! Registered DID for ${regName || formatted}`)
  }

  // Sync role from auth when Google user logs in
  useEffect(() => {
    if (auth.connected && auth.authMethod === 'google') {
      const backendRole = auth.role as string
      const map: Record<string, Role> = { ADMIN: 'Admin', MANAGER: 'Manager', AUDITOR: 'Auditor', USER: 'User' }
      setRole(map[backendRole] ?? 'User')
    }
  }, [auth])

  // Role-gate: redirect to overview if current page not allowed
  const effectivePage = useMemo(() => {
    if (page === 'settings') return 'settings'
    if (page === 'profile') return 'profile'
    const allowed = nav.find(n => n.id === page)?.roles ?? []
    return allowed.includes(role) ? page : 'overview'
  }, [page, role])

  // Sync theme with <html> attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const address = auth.connected ? auth.address : '0x71C74e8A92d16F0c8c219a42'
  const shortAddress = auth.connected ? auth.shortAddress : '0x71C7...9a42'

  const view = useMemo(() => {
    if (effectivePage === 'identity') return <IdentityPage address={address} />
    if (effectivePage === 'assets') {
      return (
        <AssetsPage
          role={role}
          onSelect={setSelectedAsset}
          onMintClick={() => setPage('mint')}
          onOpenUpdate={(asset) => setUpdatingAsset(asset)}
          onOpenRevoke={(asset) => setRevokingAsset(asset)}
          assetList={assetList}
        />
      )
    }
    if (effectivePage === 'audit') return <AuditPage role={role} auditEntries={auditList} />
    if (effectivePage === 'mint') return <MintPage address={address} onMintCreated={handleMintCreated} />
    if (effectivePage === 'roles') {
      return (
        <RolesPage
          members={memberList}
          role={role}
          onOpenAddModal={() => setShowAddIdentityModal(true)}
          onOpenDeactivateModal={(member) => setDeactivatingMember(member)}
        />
      )
    }
    if (effectivePage === 'register-admin') return <RegisterAdminPage onAdminAssigned={handleAdminAssigned} members={memberList} />
    if (effectivePage === 'profile') return <ProfilePage role={role} shortAddress={shortAddress} address={address} auth={auth} />
    if (effectivePage === 'settings') return <SettingsPage theme={theme} setTheme={setTheme} />
    return <Overview role={role} onSelect={setSelectedAsset} address={address} auditEntries={auditList} assetList={assetList} onNavigate={setPage} />
  }, [effectivePage, role, address, assetList, memberList, auditList, theme, shortAddress, auth])

  const handleSignOut = useCallback(() => {
    disconnect()
    setRole('User')
    setPage('overview')
  }, [disconnect])

  // Show landing + modal when not connected
  if (!auth.connected) {
    return (
      <>
        <Landing
          onOpenModal={() => {
            setAuthModalTab('login')
            setShowModal(true)
          }}
          onOpenRegister={() => {
            setAuthModalTab('register')
            setShowModal(true)
          }}
        />
        {showModal && (
          <AuthModal
            onClose={() => setShowModal(false)}
            onWallet={connectWallet}
            onGoogleCredential={handleGoogleCredential}
            onSelfRegister={handleSelfRegister}
            connecting={connecting}
            error={error}
            initialTab={authModalTab}
          />
        )}
      </>
    )
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <Sidebar role={role} page={effectivePage} setPage={setPage} open={menuOpen} onClose={() => setMenuOpen(false)} shortAddress={shortAddress} />
      <div className="main-shell">
        <Topbar role={role} setRole={setRole} authRole={auth.connected && auth.role ? ({ ADMIN: 'Admin', MANAGER: 'Manager', AUDITOR: 'Auditor', USER: 'User' } as Record<string, Role>)[auth.role as string] ?? 'User' : 'User'} onMenu={() => setMenuOpen(true)} theme={theme} setTheme={setTheme} shortAddress={shortAddress} onNavigate={setPage} auditEntries={auditList} onSignOut={handleSignOut} />
        <main className="app-main">{view}</main>
      </div>

      {selectedAsset && <DetailModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}

      {/* CHANGE #3: Add Identity Modal for Admin */}
      {showAddIdentityModal && (
        <AddIdentityModal
          onClose={() => setShowAddIdentityModal(false)}
          onAdd={handleAddMember}
        />
      )}

      {/* CHANGE #5: Manager Update & Revoke Modals */}
      {updatingAsset && (
        <UpdateAssetModal
          asset={updatingAsset}
          onClose={() => setUpdatingAsset(null)}
          onSave={handleUpdateAsset}
        />
      )}

      {revokingAsset && (
        <RevokeAssetModal
          asset={revokingAsset}
          onClose={() => setRevokingAsset(null)}
          onConfirm={handleRevokeAsset}
        />
      )}

      {/* CHANGE #6: Admin Deactivate User Modal */}
      {deactivatingMember && (
        <DeactivateUserModal
          member={deactivatingMember}
          onClose={() => setDeactivatingMember(null)}
          onConfirm={handleDeactivateMember}
        />
      )}

      {toastMessage && (
        <div className="tx-toast">
          <span className="live-dot" />
          <div>
            <strong>Transaction Notice</strong>
            <span>{toastMessage}</span>
          </div>
          <X size={14} style={{ cursor: 'pointer' }} onClick={() => setToastMessage(null)} />
        </div>
      )}
    </div>
  )
}

export default function Page() { return <App /> }
