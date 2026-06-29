import { useState, useEffect, useCallback } from "react";
import { FolderGit2, Plus, ExternalLink, CheckCircle2, Clock, Loader2, RotateCcw, Pencil, Trash2, Github } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import EmptyState from "../components/ui/EmptyState";
import ProjectModal from "../components/roadmaps/ProjectModal";
import { api, ApiError } from "../lib/api";
import { type ProjectResponse } from "../lib/types";

export default function Projects() {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectResponse | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<ProjectResponse[]>("/projects");
      setProjects(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(p: ProjectResponse) {
    setEditing(p);
    setModalOpen(true);
  }

  async function handleToggle(p: ProjectResponse) {
    try {
      const updated = await api.patch<ProjectResponse>(`/projects/${p.id}/toggle`, {});
      setProjects((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update project.");
    }
  }

  async function handleDelete(p: ProjectResponse) {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    try {
      await api.del(`/projects/${p.id}`);
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete project.");
    }
  }

  return (
    <AppShell title="Projects">
      <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[26px] text-paper">Projects</h1>
          <p className="text-[13px] text-mist-500 mt-1">Hands-on work tied to a roadmap, ready to become a portfolio.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2.5 text-[13.5px] hover:bg-ember-400 transition-colors"
        >
          <Plus size={15} /> New project
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-ember-500/30 bg-ember-500/10 px-4 py-3 mb-5">
          <p className="text-[12.5px] text-ember-400">{error}</p>
          <button onClick={fetchProjects} className="text-ember-400 hover:text-ember-200">
            <RotateCcw size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-ember-400" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 size={22} />}
          title="No projects yet"
          body="Create your first project to track hands-on work tied to your roadmaps."
          action={
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2.5 text-[13.5px] hover:bg-ember-400 transition-colors"
            >
              <Plus size={15} /> Add project
            </button>
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {projects.map((p) => (
            <div key={p.id} className="panel p-5 flex flex-col group hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                  <FolderGit2 size={18} className="text-mist-300" />
                </div>
                <div className="flex items-center gap-2">
                  {p.completed ? (
                    <span className="flex items-center gap-1.5 text-[11.5px] text-moss-400">
                      <CheckCircle2 size={13} /> Shipped
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[11.5px] text-ember-400">
                      <Clock size={13} /> In progress
                    </span>
                  )}
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-lg text-mist-500 hover:text-mist-200 hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleToggle(p)}
                    className="text-[11px] text-ember-400 hover:text-ember-200 px-2 py-1 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    {p.completed ? "Reopen" : "Complete"}
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="p-1.5 rounded-lg text-mist-500 hover:text-ember-400 hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <h2 className="text-[15px] font-semibold text-paper mb-1.5">{p.title}</h2>
              {p.summary && <p className="text-[12.5px] text-mist-500 leading-relaxed mb-4">{p.summary}</p>}

              <div className="flex items-center gap-3 mt-auto pt-3 border-t border-slate-700">
                {p.githubUrl && (
                  <a
                    href={p.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[12px] text-mist-300 hover:text-paper transition-colors"
                  >
                    <Github size={13} /> Code
                  </a>
                )}
                {p.demoUrl && (
                  <a
                    href={p.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[12px] text-ember-400 hover:text-ember-200 transition-colors"
                  >
                    <ExternalLink size={12} /> Demo
                  </a>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={openCreate}
            className="panel border-dashed border-slate-600 p-5 flex flex-col items-center justify-center text-center text-mist-500 hover:text-mist-200 hover:border-slate-500 transition-colors min-h-[200px]"
          >
            <Plus size={20} className="mb-2" />
            <p className="text-[13.5px] font-medium">Add a project</p>
            <p className="text-[11.5px] mt-1 max-w-[220px]">Link it to a roadmap and track your hands-on work.</p>
          </button>
        </div>
      )}

      <ProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchProjects} project={editing} />
    </AppShell>
  );
}
