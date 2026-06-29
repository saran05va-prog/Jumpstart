import { useState, useEffect } from "react";
import { X, Loader2, Trash2, Triangle } from "lucide-react";
import clsx from "clsx";
import { api, ApiError } from "../../lib/api";
import {
  type TopicResponse,
  type TopicRequest,
  TOPIC_STATUSES,
} from "../../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (topic: TopicResponse) => void;
  onDelete?: (topicId: number) => void;
  topic?: TopicResponse | null;
  roadmapId: number;
  nextSortOrder: number;
}

export default function TopicModal({
  open,
  onClose,
  onSaved,
  onDelete,
  topic,
  roadmapId,
  nextSortOrder,
}: Props) {
  const isEdit = !!topic;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("NOT_STARTED");
  const [difficulty, setDifficulty] = useState(1);
  const [estHours, setEstHours] = useState(1);
  const [sortOrder, setSortOrder] = useState(0);
  const [milestoneLabel, setMilestoneLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(topic?.title ?? "");
      setDescription(topic?.description ?? "");
      setStatus(topic?.status ?? "NOT_STARTED");
      setDifficulty(topic?.difficulty ?? 1);
      setEstHours(topic?.estHours ?? 1);
      setSortOrder(topic?.sortOrder ?? nextSortOrder);
      setMilestoneLabel(topic?.milestoneLabel ?? "");
      setError("");
    }
  }, [open, topic, nextSortOrder]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const body: TopicRequest = {
      title,
      description: description || undefined,
      status,
      difficulty,
      estHours: Number(estHours),
      sortOrder: Number(sortOrder),
      milestoneLabel: milestoneLabel || undefined,
    };
    try {
      const result = isEdit
        ? await api.patch<TopicResponse>(`/topics/${topic!.id}`, body)
        : await api.post<TopicResponse>(`/roadmaps/${roadmapId}/topics`, body);
      onSaved(result);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.fieldErrors ? Object.values(err.fieldErrors).join(" ") : err.message);
      } else {
        setError("Unable to connect to the server.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!topic || !onDelete) return;
    if (!window.confirm(`Delete "${topic.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.del(`/topics/${topic.id}`);
      onDelete(topic.id);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to connect to the server.");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-slate-700 bg-ink-900 shadow-xl animate-rise">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="font-display text-[18px] text-paper">
            {isEdit ? "Edit topic" : "Add topic"}
          </h2>
          <button onClick={onClose} className="text-mist-400 hover:text-mist-200 p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Title</span>
            <input
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Caching Strategies"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50"
            />
          </label>

          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Description</span>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you learn in this topic?"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50 resize-none"
            />
          </label>

          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50"
            >
              {TOPIC_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[12px] text-mist-500 mb-1.5 block">Difficulty</span>
              <div className="flex items-center gap-2 h-[42px]">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDifficulty(n)}
                    className="p-1 transition-transform hover:scale-110"
                    aria-label={`Difficulty ${n}`}
                  >
                    <Triangle
                      size={20}
                      className={n <= difficulty ? "text-ember-400 fill-ember-400" : "text-slate-600 fill-slate-600"}
                    />
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Est. hours</span>
              <input
                type="number"
                required
                min={0.5}
                step={0.5}
                value={estHours}
                onChange={(e) => setEstHours(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Milestone label</span>
            <input value={milestoneLabel} onChange={(e) => setMilestoneLabel(e.target.value)} placeholder="e.g. Milestone 1" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
          </label>

          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Sort order</span>
            <input
              type="number"
              required
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50"
            />
          </label>

          {error && <p className="text-[12px] text-ember-400">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <div>
              {isEdit && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ember-500/30 px-3 py-2 text-[12.5px] text-ember-400 hover:bg-ember-500/10 transition-colors disabled:opacity-60"
                >
                  {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-[13px] text-mist-400 hover:text-mist-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-ember-500 px-4 py-2 text-[13px] font-medium text-ink-900 hover:bg-ember-400 transition-colors disabled:opacity-60"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {isEdit ? "Save" : "Add topic"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
