import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { useToastStore, type ToastTone } from "../../store/toast";

const toneStyles: Record<ToastTone, { wrap: string; icon: typeof Info; iconClass: string }> = {
  default: {
    wrap: "border-slate-600 bg-slate-800",
    icon: Info,
    iconClass: "text-mist-300",
  },
  success: {
    wrap: "border-moss-500/40 bg-moss-700/40",
    icon: CheckCircle2,
    iconClass: "text-moss-400",
  },
  error: {
    wrap: "border-ember-500/40 bg-ember-700/30",
    icon: AlertCircle,
    iconClass: "text-ember-400",
  },
};

export default function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed z-[120] bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 px-4 w-full max-w-sm pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const cfg = toneStyles[t.tone];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={clsx(
                "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-panel backdrop-blur w-full",
                cfg.wrap,
              )}
            >
              <Icon size={17} className={clsx("mt-0.5 shrink-0", cfg.iconClass)} />
              <p className="text-[13px] text-paper leading-snug flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-mist-500 hover:text-mist-100 transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
