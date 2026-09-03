import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  delta?: string;
  iconClassName?: string;
  className?: string;
}

export function StatCard({ icon: Icon, label, value, delta, iconClassName, className }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800", iconClassName)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-mono text-3xl font-bold text-white">{value}</p>
      {delta && <p className="mt-1 text-xs text-slate-500">{delta}</p>}
    </div>
  );
}
