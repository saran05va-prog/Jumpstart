import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md";
  icon?: ReactNode;
}

export default function Button({ variant = "secondary", size = "md", icon, className, children, ...rest }: Props) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "px-3 py-1.5 text-[12.5px]" : "px-4 py-2.5 text-[13.5px]",
        variant === "primary" && "bg-ember-500 text-ink-900 hover:bg-ember-400",
        variant === "secondary" && "bg-slate-700 text-paper hover:bg-slate-600",
        variant === "outline" && "border border-slate-600 text-mist-100 hover:border-slate-500 hover:bg-slate-800",
        variant === "ghost" && "text-mist-300 hover:text-mist-100 hover:bg-slate-800",
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
