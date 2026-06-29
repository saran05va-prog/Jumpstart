import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { type ProjectResponse, type ProjectRequest, type RoadmapResponse, type PageResponse } from "../../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  project?: ProjectResponse | null;
}

export default function ProjectModal({ open, onClose, onSaved, project }: Props) {
  const isEdit = !!project;
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [completed, setCompleted] = useState(false);
  const [roadmapId, setRoadmapId] = useState("");
  const [roadmaps, setRoadmaps] = useState<RoadmapResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(project?.title ?? "");
      setSummary(project?.summary ?? "");
      setGithubUrl(project?.githubUrl ?? "");
      setDemoUrl(project?.demoUrl ?? "");
      setCompleted(project?.completed ?? false);
      setRoadmapId(project?.roadmapId ? String(project.roadmapId) : "");
      setError("");
      api.get<PageResponse<RoadmapResponse>>("/roadmaps?size=100&archived=false")
        .then((r) => setRoadmaps(r.items))
        .catch(() => {});
    }
  }, [open, project]);

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
    const body: ProjectRequest = {
      title,
      summary: summary || undefined,
      githubUrl: githubUrl || undefined,
      demoUrl: demoUrl || undefined,
      completed,
      roadmapId: roadmapId ? Number(roadmapId) : undefined,
    };
    try {
      if (isEdit) {
        await api.patch<ProjectResponse>(`/projects/${project!.id}`, body);
      } else {
        await api.post<ProjectResponse>("/projects", body);
      }
      onSaved();
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
          <h2 className="font-display text-[18px] text-paper">{isEdit ? "Edit project" : "New project"}</h2>
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
              placeholder="e.g. REST API for Todo App"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50"
            />
          </label>

          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Summary</span>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What does this project do?"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50 resize-none"
            />
          </label>

          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">GitHub URL</span>
            <input
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username/repo"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50"
            />
          </label>

          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Demo URL</span>
            <input
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder="https://my-project-demo.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50"
            />
          </label>

          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Roadmap (optional)</span>
            <select
              value={roadmapId}
              onChange={(e) => setRoadmapId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50"
            >
              <option value="">None</option>
              {roadmaps.map((r) => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-ember-500"
            />
            <span className="text-[13px] text-mist-100">Mark as completed</span>
          </label>

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
              {isEdit ? "Save changes" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
