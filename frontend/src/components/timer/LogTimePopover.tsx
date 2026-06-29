import { useState, useEffect } from "react";
import { Loader2, X, Trash2, Clock } from "lucide-react";
import { api } from "../../lib/api";
import type { TimerSessionResponse } from "../../lib/types";
import { useToastStore } from "../../store/toast";

interface LogTimePopoverProps {
  topicId: number;
  onClose: () => void;
}

export default function LogTimePopover({ topicId, onClose }: LogTimePopoverProps) {
  const toast = useToastStore((s) => s.push);
  const [minutes, setMinutes] = useState(30);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<TimerSessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get<TimerSessionResponse[]>(`/topics/${topicId}/timer/history`)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [topicId]);

  async function handleAddManual() {
    setSaving(true);
    try {
      await api.post(`/topics/${topicId}/timer/log`, {
        durationSeconds: minutes * 60,
        note: note || null,
        sessionDate,
      });
      toast("Time logged", { tone: "success" });
      setMinutes(30);
      setNote("");
      const h = await api.get<TimerSessionResponse[]>(`/topics/${topicId}/timer/history`);
      setHistory(h);
    } catch {
      toast("Failed to log time", { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  return (
    <div className="absolute bottom-full mb-2 right-0 z-[9999] w-72 rounded-xl border border-slate-700 bg-ink-900 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-[13px] font-semibold text-paper">Timer</h3>
        <button onClick={onClose} className="text-mist-500 hover:text-mist-200"><X size={14} /></button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-[11px] text-mist-500 mb-2 font-medium">Add manual time</p>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="number"
              min={1}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[12px] text-paper outline-none focus:border-ember-500/50"
            />
            <span className="text-[11px] text-mist-500">minutes</span>
          </div>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[12px] text-paper outline-none focus:border-ember-500/50 mb-2"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note…"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[12px] text-paper outline-none focus:border-ember-500/50 mb-2"
          />
          <button
            onClick={handleAddManual}
            disabled={saving}
            className="w-full rounded-lg bg-ember-500 text-ink-900 text-[12px] font-medium py-1.5 hover:bg-ember-400 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin inline" /> : null}
            Add
          </button>
        </div>

        <div>
          <p className="text-[11px] text-mist-500 mb-2 font-medium flex items-center gap-1">
            <Clock size={11} /> Session history
          </p>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-ember-400" /></div>
          ) : history.length === 0 ? (
            <p className="text-[11px] text-mist-600 py-2 text-center">No sessions yet</p>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {history.slice(0, 20).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800">
                  <div>
                    <span className="text-[11px] text-mist-200 font-mono">{formatDuration(s.durationSeconds || 0)}</span>
                    {s.isManual && <span className="text-[9px] text-gold-500 ml-1.5">manual</span>}
                    {s.note && <p className="text-[10px] text-mist-500 truncate max-w-[120px]">{s.note}</p>}
                  </div>
                  <span className="text-[9px] text-mist-600">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
