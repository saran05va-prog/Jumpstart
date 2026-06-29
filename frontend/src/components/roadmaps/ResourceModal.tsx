import { useState, useEffect } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import {
  type ResourceResponse,
  type ResourceRequest,
  RESOURCE_TYPES,
} from "../../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  resource?: ResourceResponse | null;
  roadmapId?: number | null;
  topicId?: number | null;
  initialTags?: string | null;
}

export default function ResourceModal({ open, onClose, onSaved, resource, roadmapId, topicId, initialTags }: Props) {
  const isEdit = !!resource;
  const [title, setTitle] = useState("");
  const [type, setType] = useState("VIDEO");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [rating, setRating] = useState(0);
  const [duration, setDuration] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(resource?.title ?? "");
      setType(resource?.type ?? "VIDEO");
      setUrl(resource?.url ?? "");
      if (resource) {
        setTags(resource.tags?.join(", ") ?? "");
      } else if (initialTags) {
        setTags(initialTags);
      } else {
        setTags("");
      }
      setRating(resource?.rating ?? 0);
      setDuration(resource?.duration ?? "");
      setBookmarked(resource?.bookmarked ?? false);
      setCompleted(resource?.completed ?? false);
      setError("");
    }
  }, [open, resource, initialTags]);

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
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const body: ResourceRequest = {
      title, type,
      url: url || undefined,
      tags: tagList,
      rating: Number(rating),
      bookmarked,
      completed,
      duration: duration || undefined,
      roadmapId: roadmapId ?? undefined,
      topicId: topicId ?? undefined,
    };
    try {
      if (isEdit) await api.patch<ResourceResponse>(`/resources/${resource!.id}`, body);
      else await api.post<ResourceResponse>("/resources", body);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors ? Object.values(err.fieldErrors).join(" ") : err.message) : "Unable to connect to the server.");
    } finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!resource) return;
    if (!window.confirm(`Delete "${resource.title}"?`)) return;
    setDeleting(true);
    try {
      await api.del(`/resources/${resource.id}`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to connect to the server.");
    } finally { setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-slate-700 bg-ink-900 shadow-xl animate-rise max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 sticky top-0 bg-ink-900 z-10">
          <h2 className="font-display text-[18px] text-paper">{isEdit ? "Edit resource" : "Add resource"}</h2>
          <button onClick={onClose} className="text-mist-400 hover:text-mist-200 p-1" aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Title</span>
            <input required maxLength={240} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Redis Crash Course" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
          </label>
          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50">
              {RESOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">URL</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
          </label>
          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Tags (comma-separated)</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="redis, caching, tutorial" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Rating (0–5)</span>
              <input type="number" min={0} max={5} step={0.5} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
            </label>
            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Duration</span>
              <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 2h 30m" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
            </label>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={bookmarked} onChange={(e) => setBookmarked(e.target.checked)} className="accent-ember-500" />
              <span className="text-[13px] text-mist-200">Bookmarked</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} className="accent-moss-500" />
              <span className="text-[13px] text-mist-200">Completed</span>
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
                {loading && <Loader2 size={14} className="animate-spin" />}{isEdit ? "Save" : "Add resource"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
