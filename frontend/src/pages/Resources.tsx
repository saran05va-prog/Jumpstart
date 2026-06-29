import { useState, useEffect, useRef, type RefObject } from "react";
import {
  Search, Star, Bookmark, Youtube, FileText, Newspaper, BookOpen, Github, GraduationCap,
  Plus, Loader2, RotateCcw, Pencil, ExternalLink, Tag, FolderOpen, X, CheckCircle2, Circle, PlayCircle,
  ChevronDown, ChevronRight, MoreHorizontal, Heart, Copy, Archive, Trash2, Network, List,
} from "lucide-react";
import clsx from "clsx";
import { useSearchParams, useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import EmptyState from "../components/ui/EmptyState";
import ResourceModal from "../components/roadmaps/ResourceModal";
import RoadmapGraph from "../components/roadmaps/RoadmapGraph";
import { api, ApiError } from "../lib/api";
import {
  type ResourceResponse, type PageResponse, type TopicResourceGroup, type RoadmapResponse,
  type TagCount, type GraphNodeDTO, type GraphEdgeDTO, RESOURCE_TYPES, type ResourceStatus as RS,
} from "../lib/types";

const typeIcons: Record<string, typeof Youtube> = {
  VIDEO: Youtube, DOC: FileText, ARTICLE: Newspaper, PDF: FileText,
  REPO: Github, BOOK: BookOpen, COURSE: GraduationCap,
};
const typeColors: Record<string, string> = {
  VIDEO: "text-ember-400", DOC: "text-moss-400", ARTICLE: "text-gold-400",
  BOOK: "text-ember-400", COURSE: "text-moss-400", GITHUB: "text-gold-400",
  PDF: "text-ember-400", REPO: "text-gold-400", YOUTUBE: "text-ember-400", CUSTOM: "text-mist-300",
};

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "NOT_STARTED", label: "○ Not Started" },
  { value: "IN_PROGRESS", label: "◐ In Progress" },
  { value: "COMPLETED", label: "✓ Completed" },
];

const statusMeta = (status: string) => {
  switch (status) {
    case "COMPLETED": return { symbol: "✓", color: "text-moss-400", bg: "bg-moss-500/20", btn: "text-moss-400 hover:text-moss-300" };
    case "IN_PROGRESS": return { symbol: "◐", color: "text-ember-400", bg: "bg-ember-500/20", btn: "text-ember-400 hover:text-ember-300" };
    default: return { symbol: "○", color: "text-mist-500", bg: "bg-slate-800", btn: "text-mist-500 hover:text-mist-200" };
  }
};

const USER_RESOURCE_TYPES = [...RESOURCE_TYPES, { value: "YOUTUBE", label: "YouTube" }];

export default function Resources() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const topicIdParam = searchParams.get("topicId");
  const topicNameParam = searchParams.get("topicName");
  const roadmapIdParam = searchParams.get("roadmapId");

  const [topicGroups, setTopicGroups] = useState<TopicResourceGroup[]>([]);
  const [allResources, setAllResources] = useState<ResourceResponse[]>([]);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [roadmapFilter, setRoadmapFilter] = useState<number | null>(roadmapIdParam ? Number(roadmapIdParam) : null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceResponse | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "graph">("list");

  // Graph data
  const [graphNodes, setGraphNodes] = useState<GraphNodeDTO[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdgeDTO[]>([]);

  useEffect(() => {
    api.get<PageResponse<RoadmapResponse>>("/roadmaps?size=100").then((res) => setRoadmaps(res.items)).catch(() => {});
    api.get<TagCount[]>("/resources/tags").then(setTags).catch(() => {});
  }, []);

  // Fetch graph data when roadmap is selected and graph view is active
  useEffect(() => {
    if (roadmapFilter && viewMode === "graph") {
      api.get<{ nodes: GraphNodeDTO[]; edges: GraphEdgeDTO[] }>(`/roadmaps/${roadmapFilter}/graph`)
        .then((g) => { setGraphNodes(g.nodes); setGraphEdges(g.edges); })
        .catch(() => { setGraphNodes([]); setGraphEdges([]); });
    }
  }, [roadmapFilter, viewMode]);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ size: "200" });
      if (typeFilter !== "All") params.set("type", typeFilter);
      if (onlyBookmarked) params.set("bookmarked", "true");
      if (query) params.set("q", query);
      if (roadmapFilter) params.set("roadmapId", String(roadmapFilter));
      if (selectedTag) params.set("tag", selectedTag);
      if (topicIdParam) params.set("topicId", topicIdParam);
      if (statusFilter) params.set("status", statusFilter);

      const res = await api.get<PageResponse<ResourceResponse>>(`/resources?${params}`);
      setAllResources(res.items);

      if (roadmapFilter) {
        try {
          const groups = await api.get<TopicResourceGroup[]>(`/resources/by-topic?roadmapId=${roadmapFilter}`);
          const filtered = groups.map((g) => ({
            ...g,
            resources: g.resources.filter((r) => {
              if (typeFilter !== "All" && r.type !== typeFilter) return false;
              if (onlyBookmarked && !r.bookmarked) return false;
              if (selectedTag && !r.tags?.includes(selectedTag)) return false;
              if (topicIdParam && r.topicId !== Number(topicIdParam)) return false;
              if (statusFilter && r.status !== statusFilter) return false;
              return true;
            }),
          }));
          setTopicGroups(filtered);
          const expanded: Record<number, boolean> = {};
          filtered.forEach((g) => { expanded[g.topicId] = true; });
          setExpandedGroups(expanded);
        } catch { setTopicGroups([]); }
      } else {
        setTopicGroups([]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load resources.");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, [typeFilter, onlyBookmarked, roadmapFilter, selectedTag, topicIdParam, statusFilter]);
  useEffect(() => {
    const t = setTimeout(() => { if (query) fetchData(); else fetchData(); }, 400);
    return () => clearTimeout(t);
  }, [query]);

  function refreshTags() { api.get<TagCount[]>("/resources/tags").then(setTags).catch(() => {}); }

  async function handleCycle(r: ResourceResponse) {
    try {
      const updated = await api.patch<ResourceResponse>(`/resources/${r.id}/cycle`, {});
      setAllResources((prev) => prev.map((x) => x.id === r.id ? updated : x));
      setTopicGroups((prev) => prev.map((g) => ({ ...g, resources: g.resources.map((x) => x.id === r.id ? updated : x), completedCount: g.resources.filter((x) => x.id === r.id ? updated.status === "COMPLETED" : x.status === "COMPLETED").length })));
    } catch (err) { setError(err instanceof ApiError ? err.message : "Failed to update status."); }
  }

  async function handleBookmark(r: ResourceResponse) {
    try {
      const updated = await api.patch<ResourceResponse>(`/resources/${r.id}/bookmark`, {});
      setAllResources((prev) => prev.map((x) => x.id === r.id ? updated : x));
      setTopicGroups((prev) => prev.map((g) => ({ ...g, resources: g.resources.map((x) => x.id === r.id ? updated : x) })));
    } catch (err) { setError(err instanceof ApiError ? err.message : "Failed to update bookmark."); }
  }

  async function handleFavorite(r: ResourceResponse) {
    try {
      const updated = await api.patch<ResourceResponse>(`/resources/${r.id}/favorite`, {});
      setAllResources((prev) => prev.map((x) => x.id === r.id ? updated : x));
      setTopicGroups((prev) => prev.map((g) => ({ ...g, resources: g.resources.map((x) => x.id === r.id ? updated : x) })));
    } catch (err) { setError(err instanceof ApiError ? err.message : "Failed to update favorite."); }
  }

  async function handleDelete(r: ResourceResponse) {
    if (!window.confirm(`Delete "${r.title}"?`)) return;
    try {
      await api.del(`/resources/${r.id}`);
      fetchData();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Failed to delete."); }
  }

  async function handleDuplicate(r: ResourceResponse) {
    try {
      await api.post<ResourceResponse>("/resources", { ...r, title: r.title + " (copy)", completed: false, bookmarked: false });
      fetchData();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Failed to duplicate."); }
  }

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(r: ResourceResponse) { setEditing(r); setModalOpen(true); }
  function handleSaved() { fetchData(); refreshTags(); }

  function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setSelectedTag(name);
    setShowNewCategory(false);
    setNewCategoryName("");
  }

  function handleGraphNodeClick(node: GraphNodeDTO) {
    // Navigate to that topic's resources
    navigate(`/app/resources?roadmapId=${roadmapFilter}&topicId=${node.id}&topicName=${encodeURIComponent(node.title)}`);
  }

  const filters = ["All", ...USER_RESOURCE_TYPES.map((t) => t.value)];
  const completedResources = allResources.filter((r) => r.status === "COMPLETED").length;

  function toggleGroup(topicId: number) {
    setExpandedGroups((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  }

  function ResourceCard({ r }: { r: ResourceResponse }) {
    const Icon = typeIcons[r.type] ?? FileText;
    const meta = statusMeta(r.status);
    const [menuOpen, setMenuOpen] = useState(false);
    const completed = r.status === "COMPLETED";

    return (
      <div
        className={clsx(
          "panel p-3.5 flex flex-col relative transition-all duration-300",
          completed
            ? "border-moss-500/40 bg-moss-500/5 hover:border-moss-500/60"
            : "hover:border-slate-600",
        )}
      >
        {/* Completed ribbon */}
        {completed && (
          <div className="absolute top-0 right-0 w-0 h-0 border-t-[28px] border-r-[28px] border-t-moss-500/80 border-r-transparent rounded-tr-xl" />
        )}

        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Gamified status badge */}
            <div
              className={clsx(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                completed ? "bg-moss-500 shadow-lg shadow-moss-500/20" : "bg-slate-700",
              )}
            >
              {completed ? (
                <CheckCircle2 size={18} className="text-ink-900" />
              ) : (
                <Icon size={15} className={typeColors[r.type] ?? "text-mist-300"} />
              )}
            </div>
            <div className="min-w-0">
              <h4 className={clsx("text-[12.5px] font-semibold leading-snug truncate", completed ? "text-moss-300" : "text-paper")}>
                {r.title}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                {!completed && <Icon size={10} className={typeColors[r.type] ?? "text-mist-500"} />}
                <span className="text-[10px] text-mist-600 capitalize">{r.type?.toLowerCase()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Quick-complete cycle button — gamified */}
            <button
              onClick={() => handleCycle(r)}
              className={clsx(
                "p-1.5 rounded-lg transition-all duration-300",
                completed ? "bg-moss-500/20 text-moss-400 hover:bg-moss-500/30" : meta.btn,
              )}
              title={r.status}
            >
              {completed ? (
                <span className="text-[14px] leading-none">✓</span>
              ) : meta.symbol === "◐" ? (
                <PlayCircle size={15} />
              ) : (
                <Circle size={15} />
              )}
            </button>
            {/* Context menu */}
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="p-1.5 rounded-lg text-mist-500 hover:text-mist-200 hover:bg-slate-700 transition-colors">
                <MoreHorizontal size={13} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-7 z-20 w-44 rounded-lg border border-slate-700 bg-ink-900 shadow-xl py-1">
                    <MenuItem icon={<Pencil size={12} />} label="Edit" onClick={() => { setMenuOpen(false); openEdit(r); }} />
                    <MenuItem icon={<ExternalLink size={12} />} label="Open URL" onClick={() => { setMenuOpen(false); if (r.url) window.open(r.url, "_blank"); }} />
                    <MenuItem icon={<Heart size={12} />} label={r.favorite ? "Unfavorite" : "Favorite"} onClick={() => { setMenuOpen(false); handleFavorite(r); }} />
                    <MenuItem icon={<Bookmark size={12} />} label={r.bookmarked ? "Unbookmark" : "Bookmark"} onClick={() => { setMenuOpen(false); handleBookmark(r); }} />
                    <MenuItem icon={<Copy size={12} />} label="Duplicate" onClick={() => { setMenuOpen(false); handleDuplicate(r); }} />
                    <div className="border-t border-slate-700 my-1" />
                    <MenuItem icon={<Trash2 size={12} />} label="Delete" onClick={() => { setMenuOpen(false); handleDelete(r); }} className="text-ember-400 hover:text-ember-300" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {r.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {r.tags.map((t) => (
              <span key={t} className="inline-flex items-center rounded-full border border-slate-600 bg-slate-800 px-1.5 py-0.5 text-[9.5px] text-mist-300">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Progress level bar (gamified) */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-700 ease-out",
                completed ? "bg-moss-500" : r.status === "IN_PROGRESS" ? "bg-ember-500" : "bg-slate-600",
              )}
              style={{ width: `${completed ? 100 : r.progressPercent || 0}%` }}
            />
          </div>
          <span className={clsx("text-[9.5px] font-mono", completed ? "text-moss-500" : "text-mist-600")}>
            {completed ? "Lv.Up!" : `${r.progressPercent || 0}%`}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between text-[11px] text-mist-500">
          <span className="flex items-center gap-1">
            <Star size={11} className={r.rating > 0 ? "fill-gold-500 text-gold-500" : "text-mist-600"} />
            {r.rating || "—"}
          </span>
          <div className="flex items-center gap-2">
            {r.favorite && <Heart size={10} className="text-ember-400 fill-ember-400" />}
            {r.bookmarked && <Bookmark size={10} className="text-gold-400" />}
            <span className="font-mono">{r.duration || "—"}</span>
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/60">
          {r.url && (
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10.5px] text-ember-400 hover:text-ember-200">
              <ExternalLink size={9} /> Open
            </a>
          )}
          {r.status === "IN_PROGRESS" && r.videoPositionSeconds != null && (
            <span className="text-[10px] text-mist-600">
              {Math.floor(r.videoPositionSeconds / 60)}:{String(r.videoPositionSeconds % 60).padStart(2, "0")}
            </span>
          )}
          {r.status === "IN_PROGRESS" && r.lastPage != null && (
            <span className="text-[10px] text-mist-600">p.{r.lastPage}</span>
          )}
          {completed && (
            <span className="text-[10px] text-moss-500 font-medium flex items-center gap-1">
              <CheckCircle2 size={10} /> Mastered
            </span>
          )}
        </div>
      </div>
    );
  }

  const hasRoadmap = !!roadmapFilter;
  const currentRoadmap = roadmaps.find((r) => r.id === roadmapFilter);

  return (
    <AppShell title="Resources">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-[26px] text-paper">Resources</h1>
          <p className="text-[13px] text-mist-500 mt-1">
            {topicNameParam
              ? <>Resources for <span className="text-mist-200 font-medium">{topicNameParam}</span></>
              : "Organize your learning materials by topic."}
          </p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2.5 text-[13.5px] hover:bg-ember-400 transition-colors">
          <Plus size={15} /> Add resource
        </button>
      </div>

      {/* ── Breadcrumb ── */}
      {topicNameParam && (
        <div className="flex items-center gap-2 mb-4 text-[12px]">
          <button onClick={() => navigate("/app/resources")} className="text-mist-500 hover:text-mist-200">Resources</button>
          <span className="text-mist-600">›</span>
          {roadmapFilter && <>
            <button onClick={() => navigate("/app/resources")} className="text-mist-500 hover:text-mist-200">{currentRoadmap?.title || "All"}</button>
            <span className="text-mist-600">›</span>
          </>}
          <span className="text-mist-200 font-medium">{topicNameParam}</span>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 mb-5">
        {/* Primary: Roadmap selector */}
        <div className="flex flex-wrap items-center gap-2">
          <FolderOpen size={14} className="text-mist-500 shrink-0" />
          <span className="text-[11.5px] text-mist-500 font-medium">Roadmap:</span>
          {roadmaps.map((rm) => (
            <button key={rm.id} onClick={() => setRoadmapFilter(rm.id === roadmapFilter ? null : rm.id)} className={clsx("shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium border transition-colors", roadmapFilter === rm.id ? "bg-ember-500/10 border-ember-500/40 text-ember-400" : "border-slate-700 text-mist-500 hover:text-mist-200")}>
              {rm.title}
            </button>
          ))}
          <button onClick={() => setRoadmapFilter(null)} className={clsx("shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium border transition-colors", !roadmapFilter ? "bg-slate-700 border-slate-600 text-paper" : "border-slate-700 text-mist-500 hover:text-mist-200")}>
            All
          </button>
        </div>

        {/* Secondary: Search + Status + Bookmark + View toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 flex-1">
            <Search size={15} className="text-mist-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search resources…" className="flex-1 bg-transparent outline-none text-[13px] text-paper placeholder:text-mist-500" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-[12.5px] text-mist-300 outline-none focus:border-ember-500/50">
            {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={() => setOnlyBookmarked(!onlyBookmarked)} className={clsx("flex items-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-[12.5px] font-medium transition-colors shrink-0", onlyBookmarked ? "border-ember-500/40 bg-ember-500/10 text-ember-400" : "border-slate-700 bg-slate-800 text-mist-500 hover:text-mist-200")}>
            <Bookmark size={14} className={onlyBookmarked ? "fill-ember-400" : ""} /> Bookmarked
          </button>

          {/* View toggle — only when a roadmap is selected */}
          {hasRoadmap && (
            <div className="flex rounded-lg border border-slate-700 overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode("list")}
                className={clsx("flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium transition-colors", viewMode === "list" ? "bg-slate-700 text-paper" : "bg-slate-800 text-mist-500 hover:text-mist-200")}
              >
                <List size={13} /> List
              </button>
              <button
                onClick={() => setViewMode("graph")}
                className={clsx("flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium transition-colors", viewMode === "graph" ? "bg-slate-700 text-paper" : "bg-slate-800 text-mist-500 hover:text-mist-200")}
              >
                <Network size={13} /> Graph
              </button>
            </div>
          )}
        </div>

        {/* Type filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {filters.map((f) => (
            <button key={f} onClick={() => setTypeFilter(f)} className={clsx("shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium border transition-colors capitalize whitespace-nowrap", typeFilter === f ? "bg-slate-700 border-slate-600 text-paper" : "border-slate-700 text-mist-500 hover:text-mist-200")}>
              {f === "All" ? "All" : f.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Categories ── */}
      <div className="panel p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="text-mist-500" />
            <h2 className="text-[13px] font-semibold text-paper">Categories</h2>
          </div>
          <div>
            {showNewCategory ? (
              <div className="flex items-center gap-1.5">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); if (e.key === "Escape") { setShowNewCategory(false); setNewCategoryName(""); } }}
                  placeholder="Category name…"
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11.5px] text-paper outline-none focus:border-ember-500/50 w-40"
                  autoFocus
                />
                <button onClick={handleAddCategory} className="text-[11px] text-ember-400 hover:text-ember-200">Create</button>
                <button onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }} className="text-[11px] text-mist-600 hover:text-mist-400">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowNewCategory(true)} className="flex items-center gap-1 text-[11.5px] text-mist-500 hover:text-mist-200 transition-colors">
                <Plus size={12} /> New category
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={clsx("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium border transition-colors", !selectedTag ? "bg-ember-500/10 border-ember-500/40 text-ember-400" : "border-slate-700 text-mist-500 hover:text-mist-200")}
          >
            <Tag size={11} /> All
          </button>
          {tags.map((t) => (
            <button
              key={t.tag}
              onClick={() => setSelectedTag(t.tag === selectedTag ? null : t.tag)}
              className={clsx("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium border transition-colors group", selectedTag === t.tag ? "bg-ember-500/10 border-ember-500/40 text-ember-400" : "border-slate-700 text-mist-500 hover:text-mist-200")}
            >
              {t.tag} <span className="text-[10px] text-mist-600 group-hover:text-mist-400">({t.count})</span>
              {selectedTag === t.tag && <X size={11} className="text-ember-400/60 hover:text-ember-200" onClick={(e) => { e.stopPropagation(); setSelectedTag(null); }} />}
            </button>
          ))}
          {tags.length === 0 && !showNewCategory && (
            <p className="text-[12px] text-mist-600 py-1">No categories yet. Add tags to resources to create them.</p>
          )}
        </div>
      </div>

      {/* ── Progress bar ── */}
      {allResources.length > 0 && viewMode === "list" && (
        <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <span className="text-[12px] text-mist-300 font-medium">{selectedTag || "All resources"}</span>
          <div className="h-2 flex-1 rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ember-500 via-gold-500 to-moss-500 transition-all duration-700"
              style={{ width: `${allResources.length > 0 ? (completedResources / allResources.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[11px] text-mist-500 font-mono">{completedResources}/{allResources.length} done</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-ember-500/30 bg-ember-500/10 px-4 py-3 mb-5">
          <p className="text-[12.5px] text-ember-400">{error}</p>
          <button onClick={fetchData} className="text-ember-400 hover:text-ember-200"><RotateCcw size={14} /></button>
        </div>
      )}

      {/* ── Content area ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-ember-400" /></div>
      ) : allResources.length === 0 && viewMode === "list" ? (
        <EmptyState icon={<Search size={20} />} title="No resources found" body="Save links, videos, and docs to build your personal learning library." action={<button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2.5 text-[13.5px] hover:bg-ember-400 transition-colors"><Plus size={15} /> Add resource</button>} />
      ) : viewMode === "graph" && hasRoadmap && currentRoadmap ? (
        /* ── Graph view (roadmap.sh style) ── */
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14.5px] font-semibold text-paper">{currentRoadmap.title}</h2>
            <span className="text-[11px] text-mist-500">{graphNodes.length} topics</span>
          </div>
          {graphNodes.length === 0 ? (
            <p className="text-[13px] text-mist-600 py-8 text-center">No graph data available for this roadmap.</p>
          ) : (
            <RoadmapGraph
              nodes={graphNodes}
              edges={graphEdges}
              roadmap={currentRoadmap}
              onNodeClick={handleGraphNodeClick}
            />
          )}
        </div>
      ) : (
        /* ── List view ── */
        <div className="space-y-4">
          {topicGroups.length > 0 && hasRoadmap ? (
            topicGroups.map((group) => {
              if (group.resources.length === 0 && expandedGroups[group.topicId] !== false) return null;
              const isExpanded = expandedGroups[group.topicId] !== false;
              const completed = group.resources.filter((r) => r.status === "COMPLETED").length;
              const total = group.resources.length;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <div key={group.topicId} className="panel overflow-hidden">
                  <button onClick={() => toggleGroup(group.topicId)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 transition-colors text-left">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isExpanded ? <ChevronDown size={14} className="text-mist-500 shrink-0" /> : <ChevronRight size={14} className="text-mist-500 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[13.5px] font-medium text-paper truncate">{group.topicTitle}</h3>
                          {group.topicId === -1 && <span className="text-[10px] text-mist-600 px-1.5 py-0.5 rounded-full bg-slate-800">Unassigned</span>}
                        </div>
                        {total > 0 && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="h-1.5 flex-1 max-w-[140px] rounded-full bg-slate-700 overflow-hidden">
                              <div
                                className={clsx(
                                  "h-full rounded-full transition-all duration-500",
                                  completed === total ? "bg-moss-500" : "bg-gradient-to-r from-ember-500 via-gold-500 to-moss-500",
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10.5px] text-mist-500 font-mono">{completed}/{total}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={clsx("text-[11px] shrink-0", completed === total ? "text-moss-400" : "text-mist-600")}>
                      {total} resource{total !== 1 ? "s" : ""}
                    </span>
                  </button>
                  {isExpanded && total > 0 && (
                    <div className="px-4 pb-4 border-t border-slate-700/60 pt-3">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.resources.map((r) => <ResourceCard key={r.id} r={r} />)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allResources.map((r) => <ResourceCard key={r.id} r={r} />)}
            </div>
          )}
        </div>
      )}

      <ResourceModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={handleSaved} resource={editing} initialTags={selectedTag} />
    </AppShell>
  );
}

function MenuItem({ icon, label, onClick, className }: { icon: React.ReactNode; label: string; onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={clsx("w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-mist-200 hover:bg-slate-700 transition-colors text-left", className)}>
      {icon} {label}
    </button>
  );
}
