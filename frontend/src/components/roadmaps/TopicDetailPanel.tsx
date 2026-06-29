import { useState, useEffect, useCallback } from "react";
import {
  X, Check, Plus, Loader2, Trash2, ExternalLink, Link2, FolderGit2,
  FileText, BookOpen, Target, TrendingUp, ListChecks, Pin, Star,
  Copy, Download, Eye, EyeOff, Circle, CheckCircle2, PlayCircle,
} from "lucide-react";
import clsx from "clsx";
import { api, ApiError } from "../../lib/api";
import MarkdownPreview from "../notes/MarkdownPreview";
import {
  type TopicResponse, type ChecklistItemResponse, type ChecklistItemRequest,
  type TopicLinkResponse, type TopicLinkRequest, type ProjectResponse, type ProjectRequest,
  type ResourceResponse, type PageResponse, type NoteResponse, type NoteRequest,
  type GoalResponse, type PageResponse as PageResp, RESOURCE_STATUSES,
} from "../../lib/types";

interface Props {
  topic: TopicResponse;
  onClose: () => void;
}

type Tab = "overview" | "resources" | "notes" | "projects" | "goals" | "progress";

const TABS: { value: Tab; label: string; icon: typeof FileText }[] = [
  { value: "overview", label: "Overview", icon: ListChecks },
  { value: "resources", label: "Resources", icon: BookOpen },
  { value: "notes", label: "Notes", icon: FileText },
  { value: "projects", label: "Projects", icon: FolderGit2 },
  { value: "goals", label: "Goals", icon: Target },
  { value: "progress", label: "Progress", icon: TrendingUp },
];

const RESOURCE_ICONS: Record<string, string> = {
  VIDEO: "text-ember-400", DOCUMENTATION: "text-moss-400", ARTICLE: "text-gold-400",
  BOOK: "text-ember-400", COURSE: "text-moss-400", GITHUB: "text-gold-400",
  PDF: "text-ember-400", DOC: "text-moss-400", REPO: "text-gold-400",
  YOUTUBE: "text-ember-400", CUSTOM: "text-mist-400",
};

function statusMeta(status: string) {
  const s = RESOURCE_STATUSES.find((r) => r.value === status);
  if (!s) return { symbol: "○", color: "text-mist-500", bg: "bg-slate-700" };
  return {
    symbol: s.symbol,
    color: s.color === "moss" ? "text-moss-400" : s.color === "ember" ? "text-ember-400" : "text-mist-500",
    bg: s.color === "moss" ? "bg-moss-500" : s.color === "ember" ? "bg-ember-500" : "bg-slate-700",
  };
}

export default function TopicDetailPanel({ topic, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [checklist, setChecklist] = useState<ChecklistItemResponse[]>([]);
  const [links, setLinks] = useState<TopicLinkResponse[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [resources, setResources] = useState<ResourceResponse[]>([]);
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, l, p, res, n, g] = await Promise.all([
        api.get<ChecklistItemResponse[]>(`/topics/${topic.id}/checklist`),
        api.get<TopicLinkResponse[]>(`/topics/${topic.id}/links`),
        api.get<ProjectResponse[]>(`/projects?topicId=${topic.id}`),
        api.get<PageResponse<ResourceResponse>>(`/resources?topicId=${topic.id}&size=100`).then((r) => r.items).catch(() => []),
        api.get<NoteResponse[]>(`/notes?topicId=${topic.id}`),
        api.get<PageResp<GoalResponse>>(`/goals?topicId=${topic.id}&size=50`).then((r) => r.items).catch(() => []),
      ]);
      setChecklist(c);
      setLinks(l);
      setProjects(p);
      setResources(res);
      setNotes(n);
      setGoals(g);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load topic data.");
    } finally {
      setLoading(false);
    }
  }, [topic.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const completedResources = resources.filter((r) => r.status === "COMPLETED").length;
  const progressPct = resources.length > 0 ? Math.round((completedResources / resources.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-ink-800 border-l border-slate-700 flex flex-col shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-700">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[18px] text-paper mb-1">{topic.title}</h2>
            {topic.description && <p className="text-[12.5px] text-mist-500">{topic.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-mist-600">
              <span className="font-mono">{progressPct}% complete</span>
              <span>·</span>
              <span>{resources.length} resources</span>
              <span>·</span>
              <span>{notes.length} notes</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-mist-500 hover:text-mist-200 hover:bg-slate-800 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 border-b border-slate-700 overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap",
                tab === t.value ? "border-ember-500 text-ember-400" : "border-transparent text-mist-500 hover:text-mist-200",
              )}
            >
              <t.icon size={13} />
              {t.label}
              {t.value === "notes" && notes.length > 0 && <span className="text-[10px] text-mist-600">({notes.length})</span>}
              {t.value === "resources" && resources.length > 0 && <span className="text-[10px] text-mist-600">({resources.length})</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="text-[12px] text-ember-400 mb-3">{error}</p>}
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-ember-400" /></div>
          ) : (
            <>
              {tab === "overview" && <OverviewTab topic={topic} checklist={checklist} links={links} onChecklistChange={fetchData} />}
              {tab === "resources" && <ResourcesTab topic={topic} resources={resources} onChange={fetchData} />}
              {tab === "notes" && <NotesTab topic={topic} notes={notes} onChange={fetchData} />}
              {tab === "projects" && <ProjectsTab topic={topic} projects={projects} onChange={fetchData} />}
              {tab === "goals" && <GoalsTab topic={topic} goals={goals} />}
              {tab === "progress" && <ProgressTab resources={resources} notes={notes} checklist={checklist} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Overview Tab ── */
function OverviewTab({ topic, checklist, links, onChecklistChange }: {
  topic: TopicResponse;
  checklist: ChecklistItemResponse[];
  links: TopicLinkResponse[];
  onChecklistChange: () => void;
}) {
  const [newItem, setNewItem] = useState("");
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUri, setNewLinkUri] = useState("");

  async function addChecklistItem() {
    if (!newItem.trim()) return;
    try {
      await api.post<ChecklistItemResponse>(`/topics/${topic.id}/checklist`, {
        label: newItem, completed: false, sortOrder: checklist.length,
      } as ChecklistItemRequest);
      setNewItem("");
      onChecklistChange();
    } catch (e) { /* handled by parent */ }
  }

  async function toggleItem(item: ChecklistItemResponse) {
    try {
      await api.patch<ChecklistItemResponse>(`/checklist/${item.id}/toggle`, {});
      onChecklistChange();
    } catch { /* */ }
  }

  async function deleteItem(item: ChecklistItemResponse) {
    try { await api.del(`/checklist/${item.id}`); onChecklistChange(); } catch { /* */ }
  }

  async function addLink() {
    if (!newLinkLabel.trim() || !newLinkUri.trim()) return;
    try {
      await api.post<TopicLinkResponse>(`/topics/${topic.id}/links`, {
        label: newLinkLabel, uri: newLinkUri,
      } as TopicLinkRequest);
      setNewLinkLabel(""); setNewLinkUri("");
      onChecklistChange();
    } catch { /* */ }
  }

  async function deleteLink(link: TopicLinkResponse) {
    try { await api.del(`/topic-links/${link.id}`); onChecklistChange(); } catch { /* */ }
  }

  const completed = checklist.filter((c) => c.completed).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[13px] font-semibold text-paper mb-2">About this topic</h3>
        <div className="flex flex-wrap gap-4 text-[12px] text-mist-500">
          <span>Status: <span className="text-mist-200 font-medium">{topic.status.replace(/_/g, " ").toLowerCase()}</span></span>
          <span>Difficulty: <span className="text-mist-200 font-medium">{"★".repeat(topic.difficulty)}</span></span>
          <span>Est. <span className="text-mist-200 font-medium">{topic.estHours}h</span></span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-semibold text-paper">Checklist ({completed}/{checklist.length})</h3>
        </div>
        <div className="space-y-1.5 mb-2">
          {checklist.length === 0 && <p className="text-[12px] text-mist-600 py-2">No checklist items yet.</p>}
          {checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-2 group">
              <button onClick={() => toggleItem(item)} className={clsx("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors", item.completed ? "bg-moss-500 border-moss-500" : "border-slate-600 hover:border-slate-500")}>
                {item.completed && <Check size={11} className="text-ink-900" />}
              </button>
              <span className={clsx("text-[12.5px] flex-1", item.completed ? "text-mist-600 line-through" : "text-mist-100")}>{item.label}</span>
              <button onClick={() => deleteItem(item)} className="text-mist-700 hover:text-ember-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={11} /></button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addChecklistItem()} placeholder="Add checklist item…" className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[12px] text-paper outline-none focus:border-ember-500/50" />
          <button onClick={addChecklistItem} className="p-1.5 rounded-lg bg-slate-700 text-mist-300 hover:bg-slate-600"><Plus size={13} /></button>
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-paper mb-2">References</h3>
        <div className="space-y-1.5 mb-2">
          {links.length === 0 && <p className="text-[12px] text-mist-600 py-2">No references yet.</p>}
          {links.map((link) => (
            <div key={link.id} className="flex items-center gap-2 group">
              <a href={link.uri} target="_blank" rel="noopener noreferrer" className="text-[12px] text-ember-400 hover:text-ember-200 truncate flex-1 flex items-center gap-1"><ExternalLink size={11} className="shrink-0" />{link.label}</a>
              <button onClick={() => deleteLink(link)} className="text-mist-700 hover:text-ember-400 opacity-0 group-hover:opacity-100"><Trash2 size={11} /></button>
            </div>
          ))}
        </div>
        {(newLinkLabel || newLinkUri) ? (
          <div className="space-y-1.5">
            <input value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} placeholder="Label" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[12px] text-paper outline-none focus:border-ember-500/50" />
            <input value={newLinkUri} onChange={(e) => setNewLinkUri(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addLink()} placeholder="URL" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[12px] text-paper outline-none focus:border-ember-500/50" />
            <button onClick={addLink} className="text-[11px] text-ember-400 hover:text-ember-200">Add reference</button>
          </div>
        ) : (
          <button onClick={() => setNewLinkLabel(" ")} className="flex items-center gap-1.5 text-[11.5px] text-mist-500 hover:text-mist-200"><Plus size={12} /> Add reference</button>
        )}
      </div>
    </div>
  );
}

/* ── Resources Tab (quick-complete cycle) ── */
function ResourcesTab({ topic, resources, onChange }: {
  topic: TopicResponse;
  resources: ResourceResponse[];
  onChange: () => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("ARTICLE");

  async function cycle(r: ResourceResponse) {
    try { await api.patch<ResourceResponse>(`/resources/${r.id}/cycle`, {}); onChange(); } catch { /* */ }
  }
  async function toggleBookmark(r: ResourceResponse) {
    try { await api.patch<ResourceResponse>(`/resources/${r.id}/bookmark`, {}); onChange(); } catch { /* */ }
  }
  async function toggleFavorite(r: ResourceResponse) {
    try { await api.patch<ResourceResponse>(`/resources/${r.id}/favorite`, {}); onChange(); } catch { /* */ }
  }
  async function deleteRes(r: ResourceResponse) {
    try { await api.del(`/resources/${r.id}`); onChange(); } catch { /* */ }
  }
  async function addResource() {
    if (!newTitle.trim()) return;
    try {
      await api.post<ResourceResponse>("/resources", {
        title: newTitle, type: newType, url: newUrl || undefined, tags: [],
        rating: 0, bookmarked: false, completed: false, roadmapId: topic.roadmapId, topicId: topic.id,
      });
      setNewTitle(""); setNewUrl(""); setNewType("ARTICLE");
      onChange();
    } catch { /* */ }
  }

  return (
    <div className="space-y-3">
      {resources.length === 0 && !newTitle && <p className="text-[12px] text-mist-600 py-4 text-center">No resources yet. Add one below.</p>}
      {resources.map((r) => {
        const meta = statusMeta(r.status);
        return (
          <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800/50 group hover:border-slate-600 transition-colors">
            <button onClick={() => cycle(r)} title={`Status: ${r.status} (click to cycle)`} className={clsx("shrink-0 mt-0.5", meta.color)}>
              {r.status === "COMPLETED" ? <CheckCircle2 size={18} /> : r.status === "IN_PROGRESS" ? <PlayCircle size={18} /> : <Circle size={18} />}
            </button>
            <div className="min-w-0 flex-1">
              <a href={r.url || "#"} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-mist-100 hover:text-ember-400 font-medium block truncate">
                <FileText size={11} className={clsx("inline mr-1", RESOURCE_ICONS[r.type] || "text-mist-500")} />
                {r.title}
              </a>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-mist-600 font-mono">{r.type}</span>
                {r.progressPercent > 0 && r.status !== "COMPLETED" && (
                  <span className="text-[10px] text-mist-600">{r.progressPercent}%</span>
                )}
                {r.tags?.map((t) => <span key={t} className="text-[9px] text-gold-400">#{t}</span>)}
              </div>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => toggleFavorite(r)} className={clsx("p-1 rounded", r.favorite ? "text-gold-400" : "text-mist-600 hover:text-gold-400")}><Star size={12} className={r.favorite ? "fill-gold-400" : ""} /></button>
              <button onClick={() => toggleBookmark(r)} className={clsx("p-1 rounded", r.bookmarked ? "text-ember-400" : "text-mist-600 hover:text-ember-400")}>🔖</button>
              <button onClick={() => deleteRes(r)} className="p-1 rounded text-mist-600 hover:text-ember-400"><Trash2 size={12} /></button>
            </div>
          </div>
        );
      })}
      {/* Quick add */}
      <div className="border-t border-slate-700 pt-3">
        {newTitle ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select value={newType} onChange={(e) => setNewType(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-[11px] text-paper outline-none">
                <option value="ARTICLE">Article</option><option value="VIDEO">Video</option><option value="DOCUMENTATION">Docs</option>
                <option value="COURSE">Course</option><option value="BOOK">Book</option><option value="GITHUB">GitHub</option><option value="PDF">PDF</option>
              </select>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Resource title…" className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[12px] text-paper outline-none focus:border-ember-500/50" />
            </div>
            <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addResource()} placeholder="https://…" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[12px] text-paper outline-none focus:border-ember-500/50" />
            <div className="flex gap-2"><button onClick={addResource} className="text-[11px] text-ember-400 hover:text-ember-200">Add resource</button><button onClick={() => { setNewTitle(""); setNewUrl(""); }} className="text-[11px] text-mist-600">Cancel</button></div>
          </div>
        ) : (
          <button onClick={() => setNewTitle(" ")} className="flex items-center gap-1.5 text-[11.5px] text-mist-500 hover:text-mist-200"><Plus size={12} /> Add resource</button>
        )}
      </div>
    </div>
  );
}

/* ── Notes Tab ── */
function NotesTab({ topic, notes, onChange }: {
  topic: TopicResponse;
  notes: NoteResponse[];
  onChange: () => void;
}) {
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useCallback((t: string, c: string, id: number) => {
    setSaving(true);
    api.put<NoteResponse>(`/notes/${id}`, { title: t, content: c, tags: notes.find((n) => n.id === id)?.tags || [], topicId: topic.id }).then(() => {
      setSaving(false);
      onChange();
    }).catch(() => setSaving(false));
  }, [notes, topic.id, onChange]);

  const active = notes.find((n) => n.id === activeNoteId);

  useEffect(() => {
    if (notes.length > 0 && !activeNoteId) setActiveNoteId(notes[0].id);
  }, [notes, activeNoteId]);

  useEffect(() => {
    if (active) { setTitle(active.title); setContent(active.content || ""); }
  }, [activeNoteId]);

  async function handleNew() {
    try {
      const created = await api.post<NoteResponse>("/notes", { title: "Untitled note", content: "", topicId: topic.id, roadmapId: topic.roadmapId });
      onChange();
      setActiveNoteId(created.id);
    } catch { /* */ }
  }

  async function handleDelete(id: number) {
    try { await api.del(`/notes/${id}`); onChange(); if (activeNoteId === id) setActiveNoteId(null); } catch { /* */ }
  }

  async function togglePin(id: number) {
    try { await api.patch<NoteResponse>(`/notes/${id}/pin`, {}); onChange(); } catch { /* */ }
  }

  const sortedNotes = [...notes].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 h-full min-h-[400px]">
      <div className="flex flex-col gap-1 overflow-y-auto">
        <button onClick={handleNew} className="flex items-center justify-center gap-1 rounded-lg bg-ember-500 text-ink-900 text-[11.5px] font-medium py-1.5 mb-1 hover:bg-ember-400"><Plus size={12} /> New note</button>
        {sortedNotes.length === 0 && <p className="text-[11px] text-mist-600 py-3 text-center">No notes yet.</p>}
        {sortedNotes.map((n) => (
          <button key={n.id} onClick={() => setActiveNoteId(n.id)} className={clsx("text-left px-2.5 py-2 rounded-lg border transition-colors", activeNoteId === n.id ? "border-ember-500/40 bg-ember-500/5" : "border-slate-700 hover:border-slate-600")}>
            <div className="flex items-center gap-1 mb-0.5">
              {n.isPinned && <Pin size={8} className="fill-gold-500 text-gold-500 shrink-0" />}
              <p className="text-[11.5px] font-medium text-paper truncate flex-1">{n.title}</p>
            </div>
            <p className="text-[10px] text-mist-600 truncate">{n.content?.replace(/[#*`\[\]]/g, "").slice(0, 40) || "Empty"}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-col border border-slate-700 rounded-lg overflow-hidden">
        {active ? (
          <>
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <button onClick={() => togglePin(active.id)}><Pin size={12} className={active.isPinned ? "fill-gold-500 text-gold-500" : "text-mist-600"} /></button>
                <span className="text-[10px] text-mist-600">{saving ? "Saving…" : "Auto-saved"}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowPreview(!showPreview)} className="p-1 text-mist-500 hover:text-mist-200">{showPreview ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                <button onClick={() => handleDelete(active.id)} className="p-1 text-mist-500 hover:text-ember-400"><Trash2 size={12} /></button>
              </div>
            </div>
            <input value={title} onChange={(e) => { setTitle(e.target.value); saveTimer(e.target.value, content, active.id); }} className="px-3 py-2 bg-transparent border-b border-slate-700 text-[14px] font-display text-paper outline-none" />
            <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: showPreview ? "1fr 1fr" : "1fr" }}>
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); saveTimer(title, e.target.value, active.id); }}
                placeholder="Write markdown… use [[wikilinks]]"
                className="w-full h-full bg-transparent p-3 text-[12px] font-mono text-mist-100 outline-none resize-none"
                spellCheck={false}
              />
              {showPreview && <div className="overflow-y-auto p-3 border-l border-slate-700/50"><MarkdownPreview content={content} /></div>}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center text-[12px] text-mist-600">Select or create a note</div>
        )}
      </div>
    </div>
  );
}

/* ── Projects Tab ── */
function ProjectsTab({ topic, projects, onChange }: {
  topic: TopicResponse;
  projects: ProjectResponse[];
  onChange: () => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  async function addProject() {
    if (!newTitle.trim()) return;
    try {
      await api.post<ProjectResponse>("/projects", { title: newTitle, completed: false, topicId: topic.id, roadmapId: topic.roadmapId } as ProjectRequest);
      setNewTitle(""); onChange();
    } catch { /* */ }
  }
  async function toggle(p: ProjectResponse) {
    try { await api.patch<ProjectResponse>(`/projects/${p.id}/toggle`, {}); onChange(); } catch { /* */ }
  }
  async function del(p: ProjectResponse) {
    try { await api.del(`/projects/${p.id}`); onChange(); } catch { /* */ }
  }
  return (
    <div className="space-y-2">
      {projects.length === 0 && !newTitle && <p className="text-[12px] text-mist-600 py-4 text-center">No projects yet.</p>}
      {projects.map((p) => (
        <div key={p.id} className="flex items-center gap-2 group p-2.5 rounded-lg border border-slate-700 bg-slate-800/50">
          <button onClick={() => toggle(p)} className={clsx("w-4 h-4 rounded-full border flex items-center justify-center shrink-0", p.completed ? "bg-moss-500 border-moss-500" : "border-slate-600")}>{p.completed && <Check size={9} className="text-ink-900" />}</button>
          <span className={clsx("text-[12.5px] flex-1 truncate", p.completed ? "text-moss-400" : "text-mist-100")}>{p.title}</span>
          {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="text-mist-500 hover:text-mist-200"><ExternalLink size={11} /></a>}
          <button onClick={() => del(p)} className="text-mist-700 hover:text-ember-400 opacity-0 group-hover:opacity-100"><Trash2 size={11} /></button>
        </div>
      ))}
      <div className="flex gap-2 pt-2 border-t border-slate-700">
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addProject()} placeholder="New project…" className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[12px] text-paper outline-none focus:border-ember-500/50" />
        <button onClick={addProject} className="p-1.5 rounded-lg bg-slate-700 text-mist-300 hover:bg-slate-600"><Plus size={13} /></button>
      </div>
    </div>
  );
}

/* ── Goals Tab ── */
function GoalsTab({ topic, goals }: { topic: TopicResponse; goals: GoalResponse[] }) {
  if (goals.length === 0) return <p className="text-[12px] text-mist-600 py-4 text-center">No goals linked to this topic yet.</p>;
  return (
    <div className="space-y-2">
      {goals.map((g) => {
        const pct = g.targetValue > 0 ? Math.min(100, Math.round((g.progressValue / g.targetValue) * 100)) : 0;
        return (
          <div key={g.id} className="p-3 rounded-lg border border-slate-700 bg-slate-800/50">
            <div className="flex items-center justify-between mb-1">
              <span className={clsx("text-[12.5px] font-medium", g.status === "completed" ? "text-moss-400" : "text-mist-100")}>{g.label}</span>
              <span className="text-[10px] text-mist-600 font-mono">{g.cadence.toLowerCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-slate-700 overflow-hidden"><div className="h-full bg-ember-500 rounded-full" style={{ width: `${pct}%` }} /></div>
              <span className="text-[10px] text-mist-500 font-mono">{g.progressValue}/{g.targetValue} {g.unit || ""}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Progress Tab ── */
function ProgressTab({ resources, notes, checklist }: {
  resources: ResourceResponse[];
  notes: NoteResponse[];
  checklist: ChecklistItemResponse[];
}) {
  const completed = resources.filter((r) => r.status === "COMPLETED").length;
  const inProgress = resources.filter((r) => r.status === "IN_PROGRESS").length;
  const notStarted = resources.filter((r) => r.status === "NOT_STARTED").length;
  const resourcePct = resources.length > 0 ? Math.round((completed / resources.length) * 100) : 0;
  const checklistCompleted = checklist.filter((c) => c.completed).length;
  const checklistPct = checklist.length > 0 ? Math.round((checklistCompleted / checklist.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
          <p className="eyebrow mb-1.5">Resource completion</p>
          <p className="num text-[22px] text-paper">{resourcePct}%</p>
          <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden mt-2"><div className="h-full bg-moss-500 rounded-full" style={{ width: `${resourcePct}%` }} /></div>
          <p className="text-[10px] text-mist-600 mt-1.5">{completed}/{resources.length} completed</p>
        </div>
        <div className="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
          <p className="eyebrow mb-1.5">Checklist</p>
          <p className="num text-[22px] text-paper">{checklistPct}%</p>
          <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden mt-2"><div className="h-full bg-ember-500 rounded-full" style={{ width: `${checklistPct}%` }} /></div>
          <p className="text-[10px] text-mist-600 mt-1.5">{checklistCompleted}/{checklist.length} done</p>
        </div>
      </div>
      <div>
        <h3 className="text-[13px] font-semibold text-paper mb-2">Status breakdown</h3>
        <div className="space-y-2">
          <StatusRow label="Completed" count={completed} total={resources.length} color="bg-moss-500" />
          <StatusRow label="In progress" count={inProgress} total={resources.length} color="bg-ember-500" />
          <StatusRow label="Not started" count={notStarted} total={resources.length} color="bg-slate-600" />
        </div>
      </div>
      <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50">
        <p className="text-[12px] text-mist-400"><FileText size={12} className="inline mr-1.5 text-ember-400" />{notes.length} notes written for this topic</p>
      </div>
    </div>
  );
}

function StatusRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11.5px] text-mist-300 w-20 shrink-0">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-slate-700 overflow-hidden"><div className={clsx("h-full rounded-full", color)} style={{ width: `${pct}%` }} /></div>
      <span className="text-[10.5px] text-mist-500 font-mono w-8 text-right">{count}</span>
    </div>
  );
}
