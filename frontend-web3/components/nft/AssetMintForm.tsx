"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMintAsset } from "@/hooks/web3/useMintAsset";
import { useAllIdentities } from "@/hooks/web3/useAuditEvents";
import { TransactionStatus } from "@/components/transactions/TransactionStatus";
import { ContractWarningBanner } from "@/components/ui/DemoModeBanner";
import { Sparkles, Upload } from "lucide-react";

const schema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(5, "Please provide a description"),
  recipientAddress: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, "Must be a valid Ethereum address"),
  recipientDid: z.string().min(5, "DID is required"),
  metadataUri: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AssetMintFormProps {
  actorAddress: `0x${string}`;
}

export function AssetMintForm({ actorAddress }: AssetMintFormProps) {
  const { identities } = useAllIdentities();
  const { mint, txState, mintedAsset, reset } = useMintAsset();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
    reset: resetForm,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", recipientAddress: "", recipientDid: "", metadataUri: "" },
    mode: "onChange",
  });

  const isProcessing = txState.status === "confirm" || txState.status === "pending";
  const isDone = txState.status === "confirmed";

  const onSubmit = async (data: FormData) => {
    await mint({
      actor: actorAddress,
      recipientAddress: data.recipientAddress as `0x${string}`,
      recipientDid: data.recipientDid,
      name: data.name,
      description: data.description,
      metadataUri: data.metadataUri,
    });
  };

  const handleIdentitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const identity = identities.find((i) => i.address === e.target.value);
    if (identity) {
      setValue("recipientAddress", identity.address);
      setValue("recipientDid", identity.did);
    }
  };

  const handleReset = () => {
    reset();
    resetForm();
  };

  return (
    <div className="space-y-4">
      <ContractWarningBanner />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Quick select recipient */}
        {identities.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Select Recipient (from registered identities)
            </label>
            <select
              onChange={handleIdentitySelect}
              defaultValue=""
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 font-mono text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
            >
              <option value="" disabled>Choose identity…</option>
              {identities.map((id) => (
                <option key={id.address} value={id.address}>
                  {id.did} ({id.role})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Recipient Address *
            </label>
            <input
              {...register("recipientAddress")}
              placeholder="0x…"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            />
            {errors.recipientAddress && (
              <p className="mt-1 text-xs text-red-400">{errors.recipientAddress.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Recipient DID *
            </label>
            <input
              {...register("recipientDid")}
              placeholder="did:ethr:0x…"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            />
            {errors.recipientDid && (
              <p className="mt-1 text-xs text-red-400">{errors.recipientDid.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            Asset Name *
          </label>
          <input
            {...register("name")}
            placeholder="Access Credential #003"
            className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          />
          {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            Description *
          </label>
          <textarea
            {...register("description")}
            rows={3}
            placeholder="Describe what this digital asset represents…"
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Upload className="h-3 w-3" />
            Metadata URI (IPFS) — optional
          </label>
          <input
            {...register("metadataUri")}
            placeholder="ipfs://Qm… or leave empty to auto-generate"
            className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          />
          <p className="mt-1 text-[10px] text-slate-600">
            Upload your metadata to IPFS first, then paste the URI here. In production, the backend handles this.
          </p>
        </div>

        <TransactionStatus state={txState} />

        {isDone && mintedAsset ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs">
              <p className="font-semibold text-emerald-400">✓ Asset minted successfully</p>
              <p className="mt-1 text-slate-400">
                Token <span className="font-mono text-emerald-300">#{mintedAsset.tokenId}</span> was
                assigned to the recipient's DID.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-lg border border-slate-700 py-2.5 text-sm text-slate-400 transition hover:text-slate-200"
            >
              Mint Another
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={!isValid || isProcessing}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 py-2.5 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4" />
            {isProcessing ? "Processing…" : "Mint NFT Asset"}
          </button>
        )}
      </form>
    </div>
  );
}
