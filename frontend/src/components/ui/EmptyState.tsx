import { ReactNode } from "react";

export default function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center text-center px-6 py-14">
      <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-mist-400 mb-4">{icon}</div>
      <h3 className="font-display text-[17px] text-paper mb-1.5">{title}</h3>
      <p className="text-[13px] text-mist-500 max-w-sm mb-5">{body}</p>
      {action}
    </div>
  );
}
