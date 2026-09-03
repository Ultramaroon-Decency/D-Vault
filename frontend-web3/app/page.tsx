"use client";

import Link from "next/link";
import {
  Shield, Fingerprint, Coins, ScrollText,
  ArrowRight, ChevronRight, Lock, Globe, Zap,
} from "lucide-react";
import { MOCK_MODE } from "@/config/app";
import { useDemoAuth, MOCK_PERSONAS } from "@/lib/web3/demoAuth";

const FEATURES = [
  {
    icon: Fingerprint,
    title: "Decentralized Identity",
    description:
      "Every user controls a cryptographically-secured DID — independent of any central authority. Identities are registered on-chain and verified through cryptographic proofs.",
    color: "text-cyan-400",
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/5",
  },
  {
    icon: Coins,
    title: "NFT Asset Ownership",
    description:
      "Digital assets are minted as ERC-721 NFTs and linked directly to a DID. Ownership is unique, non-duplicable, and permanently recorded on the blockchain.",
    color: "text-violet-400",
    border: "border-violet-500/20",
    bg: "bg-violet-500/5",
  },
  {
    icon: Lock,
    title: "Blockchain RBAC & Audit Trail",
    description:
      "Roles (Admin, Manager, Auditor, User) are enforced by smart contracts — not config files. Every identity, role change, and asset operation is immutably logged.",
    color: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/5",
  },
];

const FLOW_STEPS = [
  { label: "Connect Wallet", icon: Globe },
  { label: "Load DID Identity", icon: Fingerprint },
  { label: "Read Role (RBAC)", icon: Shield },
  { label: "Access Dashboard", icon: Zap },
];

export default function LandingPage() {
  const { isSignedIn, connectMock } = useDemoAuth();

  return (
    <div className="relative min-h-screen bg-slate-950 bg-grid-pattern">
      {/* Hero radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-hero-radial" />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between border-b border-slate-800/60 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">DID Platform</p>
            <p className="text-[10px] text-slate-500">Decentralized Identity & Assets</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {MOCK_MODE && !isSignedIn && (
            <span className="hidden rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-400 sm:inline">
              Demo Mode Active
            </span>
          )}
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-400 transition hover:bg-cyan-500/20"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="#connect"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              Connect Wallet
            </Link>
          )}
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative mx-auto max-w-5xl px-6 pb-20 pt-24 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 text-xs text-cyan-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          Smart India Hackathon — Web3 Module
        </div>

        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
          Decentralized Identity
          <br />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
            & Asset Management
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-slate-400 sm:text-lg">
          Secure identities. Verifiable ownership. Transparent access control.
          <br />
          All governed by smart contracts — no central authority holding the keys.
        </p>

        {/* Stack badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
          {["did:ethr", "ERC-721", "RBAC", "Sepolia", "wagmi", "RainbowKit"].map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1 font-mono text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        {isSignedIn ? (
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-8 py-3.5 text-base font-semibold text-cyan-400 shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-500/20"
            >
              Open Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/identity"
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-8 py-3.5 text-base font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              View My Identity
            </Link>
          </div>
        ) : (
          /* Demo personas */
          <div id="connect" className="mt-10">
            <p className="mb-4 text-sm text-slate-500">
              {MOCK_MODE
                ? "Instant demo — connect as any role:"
                : "Connect your wallet to continue:"}
            </p>
            {MOCK_MODE ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                {MOCK_PERSONAS.map((p) => (
                  <button
                    key={p.address}
                    onClick={() => connectMock(p.address)}
                    className="group flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-medium text-slate-300 backdrop-blur-sm transition hover:border-cyan-500/40 hover:bg-slate-800/60 hover:text-white"
                  >
                    <Zap className="h-4 w-4 text-cyan-400 transition group-hover:scale-110" />
                    Sign in as {p.label}
                    <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400" />
                  </button>
                ))}
              </div>
            ) : (
              <button className="rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-10 py-3.5 text-base font-semibold text-cyan-400 transition hover:bg-cyan-500/20">
                Connect Wallet
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Flow diagram ── */}
      <section className="border-y border-slate-800/60 bg-slate-900/30 py-10">
        <div className="mx-auto max-w-4xl px-6">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
            How It Works
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {FLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3">
                    <Icon className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-medium text-slate-300">{step.label}</span>
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-600" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="mb-10 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
          Platform Pillars
        </p>
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className={`rounded-xl border p-6 backdrop-blur-sm transition hover:shadow-lg ${feat.border} ${feat.bg}`}
              >
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border ${feat.border} ${feat.bg}`}>
                  <Icon className={`h-5 w-5 ${feat.color}`} />
                </div>
                <h3 className="text-base font-semibold text-white">{feat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{feat.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800/60 px-6 py-6 text-center text-xs text-slate-600">
        <p>
          Smart contract authorization is final. UI role checks are for display only.
          <br />
          Built for Smart India Hackathon — Decentralized Identity & Asset Management Platform
        </p>
      </footer>
    </div>
  );
}
