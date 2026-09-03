"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Role } from "@/types";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/permissions/rolePermissions";
import { useAssignRole } from "@/hooks/web3/useAssignRole";
import { useAllIdentities } from "@/hooks/web3/useAuditEvents";
import { TransactionStatus } from "@/components/transactions/TransactionStatus";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { ContractWarningBanner } from "@/components/ui/DemoModeBanner";
import { ShieldCheck } from "lucide-react";

const schema = z.object({
  targetAddress: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, "Must be a valid Ethereum address"),
  role: z.enum(["MANAGER", "AUDITOR", "USER"] as const),
});

type FormData = z.infer<typeof schema>;

interface RoleAssignmentFormProps {
  actorAddress: `0x${string}`;
}

export function RoleAssignmentForm({ actorAddress }: RoleAssignmentFormProps) {
  const { identities } = useAllIdentities();
  const { assign, txState, reset } = useAssignRole();
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<FormData | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    reset: resetForm,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { targetAddress: "", role: "USER" },
    mode: "onChange",
  });

  const watchedAddress = watch("targetAddress");
  const watchedRole = watch("role") as Role;
  const matchedIdentity = identities.find(
    (i) => i.address.toLowerCase() === watchedAddress.toLowerCase()
  );

  const onPreview = (data: FormData) => {
    setPreview(data);
    setConfirming(true);
  };

  const onConfirm = async () => {
    if (!preview) return;
    await assign(actorAddress, preview.targetAddress as `0x${string}`, preview.role as Role);
    setConfirming(false);
    setPreview(null);
    resetForm();
  };

  const isProcessing = txState.status === "confirm" || txState.status === "pending";

  return (
    <div className="space-y-4">
      <ContractWarningBanner />

      {!confirming ? (
        <form onSubmit={handleSubmit(onPreview)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Target Wallet Address
            </label>
            <input
              {...register("targetAddress")}
              placeholder="0x..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            />
            {errors.targetAddress && (
              <p className="mt-1 text-xs text-red-400">{errors.targetAddress.message}</p>
            )}
            {matchedIdentity && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/40 px-3 py-2 text-xs">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-slate-300">Identity found —</span>
                <RoleBadge role={matchedIdentity.role} size="sm" />
              </div>
            )}
          </div>

          {/* Quick select from known identities */}
          {identities.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs text-slate-500">Or select registered identity:</p>
              <div className="flex flex-wrap gap-2">
                {identities.map((id) => (
                  <button
                    type="button"
                    key={id.address}
                    onClick={() => {
                      const el = document.querySelector<HTMLInputElement>("[name=targetAddress]");
                      if (el) { el.value = id.address; el.dispatchEvent(new Event("input", { bubbles: true })); }
                    }}
                    className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-[10px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
                  >
                    {`${id.address.slice(0, 6)}…${id.address.slice(-4)}`}
                    <RoleBadge role={id.role} size="sm" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Assign Role</label>
            <select
              {...register("role")}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className="w-full rounded-lg border border-cyan-500/50 bg-cyan-500/10 py-2.5 text-sm font-semibold text-cyan-400 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Review Assignment
          </button>
        </form>
      ) : (
        /* Confirmation step */
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Confirm Role Assignment
            </p>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Target</span>
                <code className="font-mono text-slate-300">{preview?.targetAddress}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">New Role</span>
                <RoleBadge role={preview?.role as Role} />
              </div>
            </div>
          </div>

          <TransactionStatus state={txState} />

          <div className="flex gap-3">
            <button
              onClick={() => { setConfirming(false); reset(); }}
              disabled={isProcessing}
              className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm text-slate-400 transition hover:text-slate-200 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing || txState.status === "confirmed"}
              className="flex-1 rounded-lg border border-amber-500/50 bg-amber-500/10 py-2.5 text-sm font-semibold text-amber-400 transition hover:bg-amber-500/20 disabled:opacity-40"
            >
              {isProcessing ? "Processing…" : "Confirm Transaction"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
