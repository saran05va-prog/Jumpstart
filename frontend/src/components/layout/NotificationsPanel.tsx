import { X, Clock, FolderGit2, Target, BookOpen } from "lucide-react";
import clsx from "clsx";
import { useState, useEffect } from "react";
import { api, ApiError } from "../../lib/api";
import { type DashboardResponse, type RecentActivity } from "../../lib/types";

const typeIcon: Record<string, typeof Clock> = {
  SESSION: Clock,
  PROJECT: FolderGit2,
  GOAL: Target,
  NOTE: BookOpen,
};

const typeColor: Record<string, string> = {
  SESSION: "bg-ember-500",
  PROJECT: "bg-gold-500",
  GOAL: "bg-moss-500",
  NOTE: "bg-moss-500",
};

export default function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<DashboardResponse>("/dashboard")
      .then((d) => setItems(d.recentActivity))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-12 z-50 w-[340px] panel animate-rise overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <p className="text-[13px] font-semibold text-paper">Recent Activity</p>
          <button onClick={onClose} className="text-mist-500 hover:text-mist-200" aria-label="Close">
            <X size={15} />
          </button>
        </div>
        <ul className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <li className="px-4 py-8 text-center text-[12px] text-mist-600">Loading…</li>
          ) : items.length === 0 ? (
            <li className="px-4 py-8 text-center text-[12px] text-mist-600">No recent activity yet.</li>
          ) : (
            items.map((item, i) => {
              const Icon = typeIcon[item.type] ?? Clock;
              return (
                <li key={i} className="flex gap-3 px-4 py-3 border-b border-slate-700/60 last:border-0 hover:bg-slate-700/40">
                  <span className={clsx("mt-0.5 w-1.5 h-1.5 rounded-full shrink-0", typeColor[item.type] ?? "bg-slate-500")} />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-mist-100">{item.title}</p>
                    <p className="text-[12px] text-mist-500 mt-0.5 leading-snug">{item.subtitle}</p>
                    <p className="text-[10.5px] font-mono text-mist-700 mt-1">{item.timestamp}</p>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </>
  );
}
