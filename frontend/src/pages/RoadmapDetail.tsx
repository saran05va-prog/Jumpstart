import { useState, useEffect, useCallback } from "react";
import { useParams, Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Archive, Trash2, Pencil, Plus, Loader2, RotateCcw, Network } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import TrailMap from "../components/trail/TrailMap";
import GraphView from "../components/graph/GraphView";
import TopicDetailPanel from "../components/roadmaps/TopicDetailPanel";
import { Tag } from "../components/ui/Tag";
import EmptyState from "../components/ui/EmptyState";
import RoadmapModal from "../components/roadmaps/RoadmapModal";
import TopicModal from "../components/roadmaps/TopicModal";
import { api, ApiError } from "../lib/api";
import { type RoadmapResponse, type TopicResponse, type ResourceResponse, type PageResponse } from "../lib/types";

export default function RoadmapDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const roadmapId = Number(id);

  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [topics, setTopics] = useState<TopicResponse[]>([]);
  const [topicResourceCounts, setTopicResourceCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roadmapModalOpen, setRoadmapModalOpen] = useState(false);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicResponse | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicResponse | null>(null);

  const fetchData = useCallback(async () => {
    if (isNaN(roadmapId)) return;
    setLoading(true);
    setError("");
    try {
      const [r, t, resPage] = await Promise.all([
        api.get<RoadmapResponse>(`/roadmaps/${roadmapId}`),
        api.get<TopicResponse[]>(`/roadmaps/${roadmapId}/topics`),
        api.get<PageResponse<ResourceResponse>>(`/resources?roadmapId=${roadmapId}&size=500`),
      ]);
      setRoadmap(r);
      setTopics(t);
      const counts: Record<number, number> = {};
      for (const res of resPage.items) {
        if (res.topicId) counts[res.topicId] = (counts[res.topicId] || 0) + 1;
      }
      setTopicResourceCounts(counts);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load roadmap.");
    } finally {
      setLoading(false);
    }
  }, [roadmapId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function fetchTopics() {
    try {
      const [t, resPage] = await Promise.all([
        api.get<TopicResponse[]>(`/roadmaps/${roadmapId}/topics`),
        api.get<PageResponse<ResourceResponse>>(`/resources?roadmapId=${roadmapId}&size=500`),
      ]);
      setTopics(t);
      const counts: Record<number, number> = {};
      for (const res of resPage.items) {
        if (res.topicId) counts[res.topicId] = (counts[res.topicId] || 0) + 1;
      }
      setTopicResourceCounts(counts);
    } catch {
      // silent
    }
  }

  async function fetchRoadmap() {
    try {
      const r = await api.get<RoadmapResponse>(`/roadmaps/${roadmapId}`);
      setRoadmap(r);
    } catch {
      // silent
    }
  }

  async function handleArchive() {
    if (!roadmap) return;
    try {
      const updated = await api.patch<RoadmapResponse>(
        `/roadmaps/${roadmapId}/archive?value=${!roadmap.archived}`,
        {},
      );
      setRoadmap(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update roadmap.");
    }
  }

  async function handleClone() {
    try {
      const cloned = await api.post<RoadmapResponse>(`/roadmaps/${roadmapId}/clone`);
      navigate(`/app/roadmaps/${cloned.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to clone roadmap.");
    }
  }

  async function handleDelete() {
    if (!roadmap) return;
    if (!window.confirm(`Delete "${roadmap.title}"? This will also delete all topics. This cannot be undone.`)) return;
    try {
      await api.del(`/roadmaps/${roadmapId}`);
      navigate("/app/roadmaps");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete roadmap.");
    }
  }

  function openAddTopic() {
    setEditingTopic(null);
    setTopicModalOpen(true);
  }

  function openEditTopic(topic: TopicResponse) {
    setEditingTopic(topic);
    setTopicModalOpen(true);
  }

  function handleTopicClick(topic: TopicResponse) {
    setSelectedTopic(topic);
  }

  function handleTopicEdit(topic: TopicResponse) {
    setEditingTopic(topic);
    setTopicModalOpen(true);
  }

  function handleViewResources(topic: TopicResponse) {
    navigate(`/app/resources?topicId=${topic.id}&topicName=${encodeURIComponent(topic.title)}&roadmapId=${roadmapId}`);
  }

  function handleTopicSaved() {
    fetchTopics();
    fetchRoadmap();
  }

  function handleTopicDeleted() {
    fetchTopics();
    fetchRoadmap();
  }

  if (isNaN(roadmapId)) return <Navigate to="/app/roadmaps" replace />;

  const totalHours = topics.reduce((s, t) => s + t.estHours, 0);
  const doneHours = topics.filter((t) => t.status === "DONE").reduce((s, t) => s + t.estHours, 0);
  const doneCount = topics.filter((t) => t.status === "DONE").length;
  const nextSortOrder = topics.length > 0 ? Math.max(...topics.map((t) => t.sortOrder)) + 1 : 0;

  return (
    <AppShell title="Roadmap">
      <Link to="/app/roadmaps" className="inline-flex items-center gap-1.5 text-[12.5px] text-mist-500 hover:text-mist-200 mb-5">
        <ArrowLeft size={14} /> All roadmaps
      </Link>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-ember-400" />
        </div>
      ) : error && !roadmap ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-[14px] text-ember-400 mb-4">{error}</p>
          <button onClick={fetchData} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-[13px] text-mist-100 hover:bg-slate-800 transition-colors">
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      ) : roadmap ? (
        <>
          {error && (
            <div className="rounded-lg border border-ember-500/30 bg-ember-500/10 px-4 py-3 mb-5">
              <p className="text-[12.5px] text-ember-400">{error}</p>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {roadmap.tag && <Tag>{roadmap.tag}</Tag>}
                {roadmap.archived && <Tag className="border-ember-500/30 text-ember-400">Archived</Tag>}
              </div>
              <h1 className="font-display text-[26px] md:text-[28px] text-paper mb-1.5">{roadmap.title}</h1>
              <p className="text-[13.5px] text-mist-500 max-w-xl">{roadmap.description || "No description"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setRoadmapModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-[12.5px] text-mist-100 hover:border-slate-500 hover:bg-slate-800 transition-colors">
                <Pencil size={13} /> Edit
              </button>
              <button onClick={handleClone} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-[12.5px] text-mist-100 hover:border-slate-500 hover:bg-slate-800 transition-colors">
                <Copy size={13} /> Clone
              </button>
              <button onClick={handleArchive} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] text-mist-300 hover:text-mist-100 hover:bg-slate-800 transition-colors">
                <Archive size={13} /> {roadmap.archived ? "Unarchive" : "Archive"}
              </button>
              <button onClick={handleDelete} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] text-mist-300 hover:text-ember-400 hover:bg-slate-800 transition-colors">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-7">
            <div className="panel p-4">
              <p className="eyebrow mb-1.5">Trail progress</p>
              <p className="num text-[22px] text-paper">{roadmap.progressPercent}%</p>
              <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden mt-2">
                <div className="h-full bg-ember-500 rounded-full" style={{ width: `${roadmap.progressPercent}%` }} />
              </div>
            </div>
            <div className="panel p-4">
              <p className="eyebrow mb-1.5">Distance covered</p>
              <p className="num text-[22px] text-paper">{doneHours}h <span className="text-mist-500 text-[14px]">/ {totalHours}h</span></p>
              <p className="text-[11px] text-mist-500 mt-1">Estimated study time</p>
            </div>
            <div className="panel p-4">
              <p className="eyebrow mb-1.5">Topics</p>
              <p className="num text-[22px] text-paper">
                {doneCount} <span className="text-mist-500 text-[14px]">/ {topics.length} complete</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-5 text-[11.5px] text-mist-500 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-moss-500" /> Completed</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-ember-500" /> In progress</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-mist-500" /> Up next</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-600" /> Locked</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGraph(!showGraph)}
                className={showGraph ? "inline-flex items-center gap-1.5 rounded-lg bg-ember-500 text-ink-900 px-3 py-1.5 text-[12px] font-medium" : "inline-flex items-center gap-1.5 rounded-lg border border-slate-600 text-mist-300 px-3 py-1.5 text-[12px] hover:bg-slate-700"}
              >
                <Network size={14} /> {showGraph ? "Trail view" : "Graph view"}
              </button>
              <button
                onClick={openAddTopic}
                className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-3 py-1.5 text-[12.5px] hover:bg-ember-400 transition-colors"
              >
                <Plus size={14} /> Add topic
              </button>
            </div>
          </div>

          {topics.length === 0 ? (
            <EmptyState
              icon={<Plus size={22} />}
              title="No topics yet"
              body="Add your first topic to start building the learning trail for this roadmap."
              action={
                <button onClick={openAddTopic} className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2.5 text-[13.5px] hover:bg-ember-400 transition-colors">
                  <Plus size={15} /> Add topic
                </button>
              }
            />
          ) : showGraph ? (
            <div className="panel p-4" style={{ height: "calc(100vh - 400px)", minHeight: 500 }}>
              <GraphView roadmapId={roadmapId} onTopicSelect={(tid) => {
                const topic = topics.find(t => t.id === tid);
                if (topic) handleTopicClick(topic);
              }} />
            </div>
          ) : (
            <TrailMap topics={topics} onTopicClick={handleTopicClick} topicResourceCounts={topicResourceCounts} onTopicEdit={handleTopicEdit} onViewResources={handleViewResources} />
          )}
        </>
      ) : null}

      <RoadmapModal
        open={roadmapModalOpen}
        onClose={() => setRoadmapModalOpen(false)}
        onSaved={(r) => setRoadmap(r)}
        roadmap={roadmap}
      />
      <TopicModal
        open={topicModalOpen}
        onClose={() => setTopicModalOpen(false)}
        onSaved={handleTopicSaved}
        onDelete={handleTopicDeleted}
        topic={editingTopic}
        roadmapId={roadmapId}
        nextSortOrder={nextSortOrder}
      />
      {selectedTopic && (
        <TopicDetailPanel topic={selectedTopic} onClose={() => setSelectedTopic(null)} />
      )}
    </AppShell>
  );
}
