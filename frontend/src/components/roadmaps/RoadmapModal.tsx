import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import clsx from "clsx";
import { api, ApiError } from "../../lib/api";
import { colorMap } from "../../lib/utils";
import {
  type RoadmapResponse,
  type RoadmapRequest,
  ROADMAP_COLORS,
  colorThemeToTone,
} from "../../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (roadmap: RoadmapResponse) => void;
  roadmap?: RoadmapResponse | null;
}

export default function RoadmapModal({ open, onClose, onSaved, roadmap }: Props) {
  const isEdit = !!roadmap;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");
  const [colorTheme, setColorTheme] = useState("MOSS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(roadmap?.title ?? "");
      setDescription(roadmap?.description ?? "");
      setTag(roadmap?.tag ?? "");
      setColorTheme(roadmap?.colorTheme ?? "MOSS");
      setError("");
    }
  }, [open, roadmap]);

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
    const body: RoadmapRequest = {
      title,
      description: description || undefined,
      tag: tag || undefined,
      colorTheme,
    };
    try {
      const result = isEdit
        ? await api.patch<RoadmapResponse>(`/roadmaps/${roadmap!.id}`, body)
        : await api.post<RoadmapResponse>("/roadmaps", body);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-slate-700 bg-ink-900 shadow-xl animate-rise">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="font-display text-[18px] text-paper">
            {isEdit ? "Edit roadmap" : "New roadmap"}
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
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Backend Systems Engineering"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50"
            />
          </label>

          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Description</span>
            <textarea
              maxLength={4000}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will this roadmap cover?"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50 resize-none"
            />
          </label>

          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Tag</span>
            <input
              maxLength={60}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. backend, ml, interview"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50"
            />
          </label>

          <div>
            <span className="text-[12px] text-mist-500 mb-2 block">Color theme</span>
            <div className="flex items-center gap-3">
              {ROADMAP_COLORS.map((c) => {
                const tone = colorThemeToTone(c.value);
                const cm = colorMap[tone];
                const selected = colorTheme === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColorTheme(c.value)}
                    className={clsx(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] transition-colors",
                      selected
                        ? "border-slate-500 bg-slate-700 text-paper"
                        : "border-slate-700 bg-slate-800 text-mist-400 hover:border-slate-600",
                    )}
                  >
                    <span className={clsx("w-4 h-4 rounded-full", cm.bg)} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-[12px] text-ember-400">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
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
              {isEdit ? "Save changes" : "Create roadmap"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
