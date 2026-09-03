import { AlertTriangle, FlaskConical } from "lucide-react";

export function DemoModeBanner() {
  return (
    <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-400">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      <span>
        <strong>Demo Mode</strong> — Blockchain integration is currently mocked. All data is
        simulated and does not represent real on-chain transactions.
      </span>
    </div>
  );
}

export function ContractWarningBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-400">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>
        <strong>Security Notice:</strong> UI role checks are for display only. All authorization is
        enforced by smart contracts. Unauthorized contract calls will be rejected by the blockchain.
      </p>
    </div>
  );
}
