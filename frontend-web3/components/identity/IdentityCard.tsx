import type { Identity, DIDDocument } from "@/types";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { CopyableAddress } from "@/components/ui/CopyableAddress";
import { ExplorerLink } from "@/components/ui/ExplorerLink";
import { Key, Hash, Calendar } from "lucide-react";

interface IdentityCardProps {
  identity: Identity;
  didDocument?: DIDDocument | null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  );
}

export function IdentityCard({ identity, didDocument }: IdentityCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800/50 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Decentralized Identity
          </p>
          <p className="mt-1 font-mono text-xs text-slate-300 break-all">{identity.did}</p>
        </div>
        <VerificationBadge verified={identity.verified} />
      </div>

      {/* Details */}
      <dl className="divide-y divide-slate-800/60 px-5">
        <Row label="Wallet Address">
          <CopyableAddress address={identity.address} truncate={false} />
        </Row>
        <Row label="Role">
          <RoleBadge role={identity.role} />
        </Row>
        <Row label="Controller">
          <CopyableAddress address={identity.controller} />
        </Row>
        <Row label="Registered Block">
          <span className="flex items-center gap-1.5 font-mono text-xs text-slate-300">
            <Hash className="h-3 w-3 text-slate-500" />
            {identity.createdAtBlock.toLocaleString()}
          </span>
        </Row>
        <Row label="Registration Tx">
          <ExplorerLink type="tx" value={identity.createdAtTx} />
        </Row>
        <Row label="Registered On">
          <span className="flex items-center gap-1.5 text-xs text-slate-300">
            <Calendar className="h-3 w-3 text-slate-500" />
            {new Date(identity.createdAtTimestamp).toLocaleString()}
          </span>
        </Row>
      </dl>

      {/* DID Document preview */}
      {didDocument && (
        <details className="group border-t border-slate-800">
          <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-xs font-medium text-slate-400 transition hover:text-slate-200">
            <Key className="h-3.5 w-3.5" />
            DID Document
            <span className="ml-auto text-slate-600 group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="border-t border-slate-800 bg-slate-950/60 px-5 py-4">
            <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-[10px] text-emerald-300/80 leading-relaxed">
              {JSON.stringify(didDocument, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}
