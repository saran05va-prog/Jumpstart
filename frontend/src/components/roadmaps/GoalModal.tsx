import { useState, useEffect } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { type GoalResponse, type GoalRequest, CADENCES } from "../../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  goal?: GoalResponse | null;
}

export default function GoalModal({ open, onClose, onSaved, goal }: Props) {
  const isEdit = !!goal;
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [cadence, setCadence] = useState("WEEKLY");
  const [priority, setPriority] = useState("medium");
  const [targetValue, setTargetValue] = useState(1);
  const [progressValue, setProgressValue] = useState(0);
  const [unit, setUnit] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setLabel(goal?.label ?? "");
      setDescription(goal?.description ?? "");
      setCadence(goal?.cadence ?? "WEEKLY");
      setPriority(goal?.priority ?? "medium");
      setTargetValue(goal?.targetValue ?? 1);
      setProgressValue(goal?.progressValue ?? 0);
      setUnit(goal?.unit ?? "");
      setDueDate(goal?.dueDate ?? "");
      setError("");
    }
  }, [open, goal]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const body: GoalRequest = {
      label,
      description: description || undefined,
      cadence,
      priority,
      targetValue: Number(targetValue),
      progressValue: Number(progressValue),
      unit: unit || undefined,
      dueDate: dueDate || undefined,
    };
    try {
      if (isEdit) await api.patch<GoalResponse>(`/goals/${goal!.id}`, body);
      else await api.post<GoalResponse>("/goals", body);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors ? Object.values(err.fieldErrors).join(" ") : err.message) : "Unable to connect to the server.");
    } finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!goal) return;
    if (!window.confirm(`Delete "${goal.label}"?`)) return;
    setDeleting(true);
    try {
      await api.del(`/goals/${goal.id}`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to connect to the server.");
    } finally { setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-slate-700 bg-ink-900 shadow-xl animate-rise">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="font-display text-[18px] text-paper">{isEdit ? "Edit goal" : "New goal"}</h2>
          <button onClick={onClose} className="text-mist-400 hover:text-mist-200 p-1" aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Label</span>
            <input required maxLength={160} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Study 2 hours daily" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
          </label>
          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Description</span>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50 resize-none" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Cadence</span>
              <select value={cadence} onChange={(e) => setCadence(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50">
                {CADENCES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Priority</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Target</span>
              <input type="number" required min={0.5} step={0.5} value={targetValue} onChange={(e) => setTargetValue(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
            </label>
            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Current progress</span>
              <input type="number" required min={0} step={0.5} value={progressValue} onChange={(e) => setProgressValue(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Unit</span>
              <input maxLength={30} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. hours, pages" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
            </label>
            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Due date (optional)</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
            </label>
          </div>
          {error && <p className="text-[12px] text-ember-400">{error}</p>}
          <div className="flex items-center justify-between pt-2">
            <div>{isEdit && (
              <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-lg border border-ember-500/30 px-3 py-2 text-[12.5px] text-ember-400 hover:bg-ember-500/10 transition-colors disabled:opacity-60">
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
              </button>
            )}</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] text-mist-400 hover:text-mist-200 transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-ember-500 px-4 py-2 text-[13px] font-medium text-ink-900 hover:bg-ember-400 transition-colors disabled:opacity-60">
                {loading && <Loader2 size={14} className="animate-spin" />}{isEdit ? "Save" : "Create goal"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
