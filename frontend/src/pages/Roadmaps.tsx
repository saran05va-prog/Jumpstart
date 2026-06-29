import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Route, Plus, Pencil, Archive, Copy, Trash2, Loader2, RotateCcw, Download } from "lucide-react";
import clsx from "clsx";
import AppShell from "../components/layout/AppShell";
import { Pill, Tag } from "../components/ui/Tag";
import EmptyState from "../components/ui/EmptyState";
import RoadmapModal from "../components/roadmaps/RoadmapModal";
import TemplateImportModal from "../components/roadmaps/TemplateImportModal";
import { api, ApiError } from "../lib/api";
import { colorMap } from "../lib/utils";
import { type RoadmapResponse, colorThemeToTone, type PageResponse } from "../lib/types";

export default function Roadmaps() {
  const [roadmaps, setRoadmaps] = useState<RoadmapResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [editing, setEditing] = useState<RoadmapResponse | null>(null);

  const fetchRoadmaps = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<PageResponse<RoadmapResponse>>(
        `/roadmaps?size=100&archived=${showArchived}`,
      );
      setRoadmaps(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load roadmaps.");
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchRoadmaps();
  }, [fetchRoadmaps]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(r: RoadmapResponse) {
    setEditing(r);
    setModalOpen(true);
  }

  async function handleArchive(r: RoadmapResponse) {
    try {
      await api.patch(`/roadmaps/${r.id}/archive?value=${!r.archived}`, {});
      fetchRoadmaps();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update roadmap.");
    }
  }

  async function handleClone(r: RoadmapResponse) {
    try {
      await api.post<RoadmapResponse>(`/roadmaps/${r.id}/clone`);
      fetchRoadmaps();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to clone roadmap.");
    }
  }

  async function handleDelete(r: RoadmapResponse) {
    if (!window.confirm(`Delete "${r.title}"? This will also delete all topics. This cannot be undone.`)) return;
    try {
      await api.del(`/roadmaps/${r.id}`);
      fetchRoadmaps();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete roadmap.");
    }
  }

  return (
    <AppShell title="Roadmaps">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-[26px] text-paper">Roadmaps</h1>
          <p className="text-[13px] text-mist-500 mt-1">Structured paths toward a skill, broken into ordered topics.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
            <button
              onClick={() => setShowArchived(false)}
              className={clsx("px-3 py-1.5 rounded-md text-[12px] transition-colors", !showArchived ? "bg-slate-700 text-paper" : "text-mist-500")}
            >
              Active
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={clsx("px-3 py-1.5 rounded-md text-[12px] transition-colors", showArchived ? "bg-slate-700 text-paper" : "text-mist-500")}
            >
              Archived
            </button>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2.5 text-[13.5px] hover:bg-ember-400 transition-colors"
          >
            <Plus size={15} /> New roadmap
          </button>
          <button
            onClick={() => setTemplateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 text-mist-100 font-medium px-4 py-2.5 text-[13.5px] hover:bg-slate-800 transition-colors"
          >
            <Download size={15} /> Templates
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-ember-500/30 bg-ember-500/10 px-4 py-3 mb-5">
          <p className="text-[12.5px] text-ember-400">{error}</p>
          <button onClick={fetchRoadmaps} className="text-ember-400 hover:text-ember-200">
            <RotateCcw size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-ember-400" />
        </div>
      ) : roadmaps.length === 0 ? (
        <EmptyState
          icon={<Route size={22} />}
          title={showArchived ? "No archived roadmaps" : "No roadmaps yet"}
          body={showArchived ? "Archived roadmaps will appear here." : "Create your first roadmap to start organizing your learning path into ordered topics."}
          action={
            !showArchived && (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2.5 text-[13.5px] hover:bg-ember-400 transition-colors"
              >
                <Plus size={15} /> Create roadmap
              </button>
            )
          }
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {roadmaps.map((r) => {
            const tone = colorThemeToTone(r.colorTheme);
            const cm = colorMap[tone];
            return (
              <div key={r.id} className="panel p-5 flex flex-col group hover:border-slate-600 transition-colors">
                <Link to={`/app/roadmaps/${r.id}`} className="flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                      <Route size={18} className="text-mist-300" />
                    </div>
                    <Pill tone={tone}>{r.progressPercent}% complete</Pill>
                  </div>

                  <h2 className="text-[16px] font-semibold text-paper mb-1.5 group-hover:text-ember-400 transition-colors">{r.title}</h2>
                  <p className="text-[12.5px] text-mist-500 leading-relaxed mb-4 line-clamp-2">{r.description || "No description"}</p>

                  <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden mb-4">
                    <div className={clsx("h-full rounded-full", cm.bg)} style={{ width: `${r.progressPercent}%` }} />
                  </div>

                  <div className="flex items-center gap-2 mt-auto">
                    {r.tag && <Tag>{r.tag}</Tag>}
                    <span className="font-mono text-[11px] text-mist-600">{r.topicCount} {r.topicCount === 1 ? "topic" : "topics"}</span>
                  </div>
                </Link>

                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-700">
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-mist-500 hover:text-mist-200 hover:bg-slate-800 transition-colors" aria-label="Edit roadmap">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleClone(r)} className="p-1.5 rounded-lg text-mist-500 hover:text-mist-200 hover:bg-slate-800 transition-colors" aria-label="Clone roadmap">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => handleArchive(r)} className="p-1.5 rounded-lg text-mist-500 hover:text-mist-200 hover:bg-slate-800 transition-colors" aria-label={r.archived ? "Unarchive" : "Archive"}>
                    <Archive size={14} />
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg text-mist-500 hover:text-ember-400 hover:bg-slate-800 transition-colors" aria-label="Delete roadmap">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {!showArchived && (
            <button
              onClick={openCreate}
              className="panel border-dashed border-slate-600 p-5 flex flex-col items-center justify-center text-center text-mist-500 hover:text-mist-200 hover:border-slate-500 transition-colors min-h-[220px]"
            >
              <Plus size={20} className="mb-2" />
              <p className="text-[13.5px] font-medium">Create a new roadmap</p>
              <p className="text-[11.5px] mt-1 max-w-[200px]">Start from scratch and build your learning path topic by topic.</p>
            </button>
          )}
        </div>
      )}

      <RoadmapModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={fetchRoadmaps}
        roadmap={editing}
      />
      <TemplateImportModal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onImported={() => fetchRoadmaps()}
      />
    </AppShell>
  );
}
