import { ReactNode } from "react";
import clsx from "clsx";

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-mist-300", className)}>
      {children}
    </span>
  );
}

export function Pill({ tone = "moss", children }: { tone?: "moss" | "ember" | "gold" | "mist"; children: ReactNode }) {
  const map = {
    moss: "bg-moss-500/15 text-moss-400 border-moss-500/30",
    ember: "bg-ember-500/15 text-ember-400 border-ember-500/30",
    gold: "bg-gold-500/15 text-gold-400 border-gold-500/30",
    mist: "bg-slate-700 text-mist-300 border-slate-600",
  };
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", map[tone])}>
      {children}
    </span>
  );
}
