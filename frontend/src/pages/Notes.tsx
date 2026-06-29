import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Search, Trash2, Loader2, Check, Star, Pin, Copy, Download,
  ChevronRight, Tag as TagIcon, X, Eye, EyeOff, FileText,
  Link2, AlertCircle, Clock,
  Vault,
} from "lucide-react";
import clsx from "clsx";
import AppShell from "../components/layout/AppShell";
import EmptyState from "../components/ui/EmptyState";
import MarkdownPreview from "../components/notes/MarkdownPreview";
import { api, ApiError } from "../lib/api";
import { useFileSystemVault } from "../hooks/useFileSystemVault";
import type {
  NoteResponse, NoteRequest, RoadmapResponse, TopicResponse,
  PageResponse, BacklinkResponse,
} from "../lib/types";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function groupByTopic(notes: NoteListItem[], topics: TopicResponse[]): { label: string; notes: NoteListItem[] }[] {
  const topicMap = new Map(topics.map((t) => [t.id, t.title]));
  const grouped: Record<string, NoteListItem[]> = {};
  const unlinked: NoteListItem[] = [];
  for (const n of notes) {
    if (n.topicId && topicMap.has(n.topicId)) {
      const label = topicMap.get(n.topicId)!;
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(n);
    } else {
      unlinked.push(n);
    }
  }
  const result = Object.entries(grouped).map(([label, items]) => ({ label, notes: items }));
  if (unlinked.length > 0) result.push({ label: "Unlinked", notes: unlinked });
  return result;
}

interface NoteListItem extends Omit<NoteResponse, "summary"|"roadmapId"|"obsidianUri"|"obsidianFile"|"lastViewedAt"|"backlinks"|"conflictContent"|"conflictDetectedAt"|"lastSyncedAt"> {
  summary?: string | null;
  roadmapId?: number | null;
  obsidianUri?: string | null;
  obsidianFile?: string | null;
  backlinks?: BacklinkResponse[] | null;
}

function hashPath(path: string): number {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    const c = path.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function savePinStar(path: string, pinned: boolean, starred: boolean) {
  try {
    localStorage.setItem("vault_pin_star_" + path, JSON.stringify({ pinned, starred }));
  } catch {}
}

function loadPinStar(path: string): { pinned: boolean; starred: boolean } {
  try {
    const raw = localStorage.getItem("vault_pin_star_" + path);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { pinned: false, starred: false };
}

export default function Notes() {
  const fsVault = useFileSystemVault();

  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [topics, setTopics] = useState<TopicResponse[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [backlinks, setBacklinks] = useState<BacklinkResponse[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<number | null>(null);
  const contentRef = useRef("");
  const titleRef = useRef("");
  const tagsRef = useRef<string[]>([]);
  const notesRef = useRef<NoteListItem[]>([]);
  const vaultFileMapRef = useRef<Map<number, import("../hooks/useFileSystemVault").VaultFileEntry>>(new Map());

  activeIdRef.current = activeId;
  contentRef.current = content;
  titleRef.current = title;
  tagsRef.current = tags;
  notesRef.current = notes;

  const active = notes.find((n) => n.id === activeId);
  const vaultFiles = fsVault.files;
  const vaultIsConnected = fsVault.isConnected;
  const vaultConnected = vaultIsConnected && vaultFiles.length > 0;
  const parseVaultNote = fsVault.parseNote;

  // ── Load notes from vault files or REST ──
  const loadVaultNotes = useCallback(async () => {
    if (!vaultIsConnected || vaultFiles.length === 0) return;
    const hadNotes = notesRef.current.length > 0;
    if (!hadNotes) setLoading(true);
    setError("");
    const map = new Map<number, import("../hooks/useFileSystemVault").VaultFileEntry>();
    const items: NoteListItem[] = [];
    for (const f of vaultFiles) {
      try {
        const parsed = await parseVaultNote(f);
        const id = hashPath(f.path);
        map.set(id, f);
        items.push({
          id,
          title: parsed.title,
          content: parsed.content,
          tags: parsed.tags,
          wordCount: parsed.content ? parsed.content.trim().split(/\s+/).length : 0,
          topicId: parsed.topicId,
          isStarred: loadPinStar(f.path).starred,
          isPinned: loadPinStar(f.path).pinned,
          createdAt: parsed.createdAt || "",
          updatedAt: parsed.updatedAt || "",
          syncStatus: null,
          vaultPath: f.path,
          hasConflict: false,
        } as NoteListItem);
      } catch {
        // skip unreadable files
      }
    }
    vaultFileMapRef.current = map;
    setNotes(items);
    if (items.length > 0 && activeIdRef.current === null) setActiveId(items[0].id);
    if (items.length === 0) setActiveId(null);
    if (!hadNotes) setLoading(false);
  }, [vaultIsConnected, vaultFiles, parseVaultNote]);

  const fetchRestNotes = useCallback(async (q: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await api.get<NoteListItem[]>(`/notes${params.toString() ? "?" + params : ""}`);
      setNotes(res);
      if (res.length > 0 && activeIdRef.current === null) setActiveId(res[0].id);
      if (res.length === 0) setActiveId(null);
    } catch {
      // Silently fail in REST mode — empty state is shown instead of error popup
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContext = useCallback(async () => {
    try {
      const roadmapsRes = await api.get<PageResponse<RoadmapResponse>>("/roadmaps?size=100");
      const allTopics: TopicResponse[] = [];
      for (const r of roadmapsRes.items) {
        try {
          const t = await api.get<TopicResponse[]>(`/roadmaps/${r.id}/topics`);
          allTopics.push(...t);
        } catch {}
      }
      setTopics(allTopics);
    } catch {}
  }, []);

  useEffect(() => { fetchContext(); }, [fetchContext]);

  // Load vault notes when vault connection or files change
  useEffect(() => {
    if (vaultIsConnected && vaultFiles.length > 0) {
      loadVaultNotes();
    }
  }, [vaultIsConnected, vaultFiles, loadVaultNotes]);

  // Load REST notes on mount / connection change (debounced search handles query changes)
  useEffect(() => {
    if (!fsVault.isConnected) {
      fetchRestNotes("");
    }
  }, [fsVault.isConnected, fetchRestNotes]);

  const [displayNotes, setDisplayNotes] = useState<NoteListItem[]>([]);

  useEffect(() => {
    if (fsVault.isConnected) {
      const q = query.toLowerCase();
      if (!q) {
        setDisplayNotes(notes);
      } else {
        setDisplayNotes(notes.filter((n) => n.title.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)));
      }
    } else {
      setDisplayNotes(notes);
    }
  }, [notes, query, fsVault.isConnected]);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!fsVault.isConnected && query) {
      searchTimeoutRef.current = setTimeout(() => fetchRestNotes(query), 350);
    }
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [query, fetchRestNotes, fsVault.isConnected]);

  // Load note detail
  useEffect(() => {
    if (!activeId) {
      setTitle(""); setContent(""); setTags([]); setBacklinks([]);
      return;
    }
    if (fsVault.isConnected) {
      const note = notes.find((n) => n.id === activeId);
      if (note) {
        setTitle(note.title);
        setContent(note.content || "");
        setTags(note.tags || []);
        setBacklinks([]);
      }
    } else {
      api.get<NoteResponse>(`/notes/${activeId}`)
        .then((n) => {
          setTitle(n.title);
          setContent(n.content || "");
          setTags(n.tags || []);
          setBacklinks(n.backlinks || []);
        })
        .catch(() => {
          // Silently fail in REST mode
        });
    }
  }, [activeId, fsVault.isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  const doSave = useCallback(async () => {
    const id = activeIdRef.current;
    if (!id) return;
    setSaving(true);
    setSaved(false);
    try {
      const entry = vaultFileMapRef.current.get(id);
      if (fsVault.isConnected && entry) {
        const md = fsVault.buildMarkdownContent(
          titleRef.current || "Untitled note",
          contentRef.current || "",
          { tags: tagsRef.current.length > 0 ? tagsRef.current : undefined },
        );
        await fsVault.writeFile(entry, md);
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id
              ? { ...n, title: titleRef.current, content: contentRef.current, tags: tagsRef.current, wordCount: contentRef.current ? contentRef.current.trim().split(/\s+/).length : 0 }
              : n,
          ),
        );
      } else {
        const body: NoteRequest = {
          title: titleRef.current || "Untitled note",
          content: contentRef.current,
          tags: tagsRef.current,
        };
        const updated = await api.put<NoteResponse>(`/notes/${id}`, body);
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updated } : n)));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }, [fsVault]);

  useEffect(() => {
    if (!activeId) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => doSave(), 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [content, title, activeId, doSave]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        doSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setShowPreview((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [doSave]);

  async function handleNew() {
    setError("");
    if (fsVault.isConnected) {
      const name = `Untitled note ${Date.now()}.md`;
      const md = fsVault.buildMarkdownContent("Untitled note", "");
      const entry = await fsVault.createFile(name, md);
      if (entry) {
        const id = hashPath(entry.path);
        vaultFileMapRef.current.set(id, entry);
        const vaultNote: NoteListItem = { id, title: "Untitled note", content: "", tags: [], wordCount: 0, topicId: null, isStarred: false, isPinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), syncStatus: null, vaultPath: entry.path, hasConflict: false } as NoteListItem;
        setNotes((prev) => [...prev, vaultNote]);
        setActiveId(id);
      }
    } else {
      try {
        const created = await api.post<NoteResponse>("/notes", { title: "Untitled note", content: "" });
        setNotes((prev) => [created, ...prev]);
        setActiveId(created.id);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to create note.");
      }
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Delete this note?")) return;
    const entry = vaultFileMapRef.current.get(id);
    if (fsVault.isConnected && entry) {
      try {
        await fsVault.deleteFile(entry);
        vaultFileMapRef.current.delete(id);
        setNotes((prev) => prev.filter((n) => n.id !== id));
        if (activeId === id) {
          const remaining = notesRef.current.filter((n) => n.id !== id);
          setActiveId(remaining.length > 0 ? remaining[0].id : null);
        }
      } catch (err) {
        setError(err instanceof ApiError ? (err as ApiError).message : "Failed to delete note.");
      }
    } else {
      try {
        await api.del(`/notes/${id}`);
        setNotes((prev) => prev.filter((n) => n.id !== id));
        if (activeId === id) {
          const remaining = notesRef.current.filter((n) => n.id !== id);
          setActiveId(remaining.length > 0 ? remaining[0].id : null);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to delete note.");
      }
    }
  }

  async function handleTogglePin() {
    if (!activeId) return;
    if (fsVault.isConnected) {
      const note = notes.find((n) => n.id === activeId);
      if (note) {
        const next = !note.isPinned;
        savePinStar(note.vaultPath || "", next, note.isStarred);
        setNotes((prev) => prev.map((n) => (n.id === activeId ? { ...n, isPinned: next } : n)));
      }
    } else {
      try {
        const updated = await api.patch<NoteResponse>(`/notes/${activeId}/pin`, {});
        setNotes((prev) => prev.map((n) => (n.id === activeId ? { ...n, isPinned: updated.isPinned } : n)));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to pin note.");
      }
    }
  }

  async function handleToggleStar() {
    if (!activeId) return;
    if (fsVault.isConnected) {
      const note = notes.find((n) => n.id === activeId);
      if (note) {
        const next = !note.isStarred;
        savePinStar(note.vaultPath || "", note.isPinned, next);
        setNotes((prev) => prev.map((n) => (n.id === activeId ? { ...n, isStarred: next } : n)));
      }
    } else {
      try {
        const updated = await api.patch<NoteResponse>(`/notes/${activeId}/star`, {});
        setNotes((prev) => prev.map((n) => (n.id === activeId ? { ...n, isStarred: updated.isStarred } : n)));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to star note.");
      }
    }
  }

  async function handleDuplicate() {
    if (!activeId) return;
    if (fsVault.isConnected) {
      const note = notes.find((n) => n.id === activeId);
      if (note) {
        const name = (note.title + " (copy).md").replace(/[<>:"/\\|?*]/g, "_");
        const md = fsVault.buildMarkdownContent(note.title + " (copy)", note.content || "", { tags: note.tags.length > 0 ? note.tags : undefined });
        const entry = await fsVault.createFile(name, md);
        if (entry) {
          const id = hashPath(entry.path);
          vaultFileMapRef.current.set(id, entry);
          const dupeNote: NoteListItem = { id, title: note.title + " (copy)", content: note.content, tags: note.tags, wordCount: note.wordCount, topicId: null, isStarred: false, isPinned: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), syncStatus: null, vaultPath: entry.path, hasConflict: false } as NoteListItem;
          setNotes((prev) => [...prev, dupeNote]);
          setActiveId(id);
        }
      }
    } else {
      try {
        const copy = await api.post<NoteResponse>(`/notes/${activeId}/duplicate`, {});
        setNotes((prev) => [copy, ...prev]);
        setActiveId(copy.id);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to duplicate note.");
      }
    }
  }

  async function handleExport() {
    if (!activeId) return;
    const note = notes.find((n) => n.id === activeId);
    if (!note) return;
    const md = fsVault.isConnected && note.vaultPath
      ? fsVault.buildMarkdownContent(note.title, note.content || "", { tags: note.tags.length > 0 ? note.tags : undefined })
      : await api.get<string>(`/notes/${activeId}/export`);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "note"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleWikilinkClick(noteTitle: string) {
    const found = notes.find((n) => n.title.toLowerCase().trim() === noteTitle.toLowerCase().trim());
    if (found) {
      setActiveId(found.id);
    } else {
      setError(`No note found for [[${noteTitle}]]. Create it first.`);
      setTimeout(() => setError(""), 3000);
    }
  }

  function addTag() {
    const t = tagInput.trim().replace(/^#/, "");
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  function insertSyntax(before: string, after = "", placeholder = "") {
    const ta = document.getElementById("md-editor") as HTMLTextAreaElement | null;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = content.substring(start, end) || placeholder;
    setContent(content.substring(0, start) + before + sel + after + content.substring(end));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + before.length, start + before.length + sel.length); }, 0);
  }

  function insertLine(prefix: string) {
    const ta = document.getElementById("md-editor") as HTMLTextAreaElement | null;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    setContent(content.substring(0, lineStart) + prefix + content.substring(lineStart));
    setTimeout(() => ta.focus(), 0);
  }

  const pinnedNotes = displayNotes.filter((n) => n.isPinned);
  const nonPinned = displayNotes.filter((n) => !n.isPinned);
  const groups = groupByTopic(nonPinned, topics);
  const wc = content.trim() ? content.trim().split(/\s+/).length : 0;

  const toolbarBtns = [
    { label: "B", title: "Bold", onClick: () => insertSyntax("**", "**", "bold") },
    { label: "I", title: "Italic", onClick: () => insertSyntax("*", "*", "italic") },
    { label: "H1", title: "Heading 1", onClick: () => insertLine("# ") },
    { label: "H2", title: "Heading 2", onClick: () => insertLine("## ") },
    { label: "•", title: "Bullet list", onClick: () => insertLine("- ") },
    { label: "1.", title: "Numbered list", onClick: () => insertLine("1. ") },
    { label: "☐", title: "Task", onClick: () => insertLine("- [ ] ") },
    { label: "</>", title: "Code", onClick: () => insertSyntax("`", "`", "code") },
    { label: "```", title: "Code block", onClick: () => insertSyntax("\n```\n", "\n```\n", "code") },
    { label: '"', title: "Quote", onClick: () => insertLine("> ") },
    { label: "[[", title: "Wikilink", onClick: () => insertSyntax("[[", "]]", "Note Title") },
    { label: "[]", title: "Link", onClick: () => insertSyntax("[", "](https://)", "text") },
    { label: "|", title: "Table", onClick: () => insertLine("\n| Col 1 | Col 2 |\n| --- | --- |\n| | |\n") },
  ];

  return (
    <AppShell title="Notes">
      {/* ── Vault status banner ── */}
      {!vaultConnected && fsVault.isSupported && (
        <button
          onClick={async () => {
            setConnecting(true);
            await fsVault.connect();
            setConnecting(false);
          }}
          disabled={connecting}
          className="flex items-center gap-2 rounded-lg border border-gold-500/20 bg-gold-500/5 px-4 py-2.5 mb-4 text-[12px] text-gold-400 hover:bg-gold-500/10 transition-colors group w-full disabled:opacity-50"
        >
          {connecting ? (
            <Loader2 size={13} className="animate-spin shrink-0" />
          ) : (
            <Vault size={13} className="shrink-0" />
          )}
          <span className="flex-1">
            {connecting ? "Connecting to vault..." : "Connect to your Obsidian vault folder — notes saved directly to disk."}
          </span>
        </button>
      )}
      {!vaultConnected && !fsVault.isSupported && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5 mb-4 text-[12px] text-mist-500">
          <AlertCircle size={13} className="shrink-0" />
          <span>Browser does not support direct vault access. Notes are saved to the server.</span>
        </div>
      )}

      <div className="grid lg:grid-cols-[280px_1fr] gap-0 h-[calc(100vh-175px)] min-h-[500px]">
        {/* ── Note list sidebar ── */}
        <div className="panel rounded-r-none flex flex-col overflow-hidden border-r-0">
          <div className="p-3 border-b border-slate-700/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-[16px] text-paper">Notes</h1>
              <button onClick={handleNew} className="flex items-center justify-center gap-1 rounded-lg bg-ember-500 text-ink-900 text-[11.5px] font-medium px-2.5 py-1.5 hover:bg-ember-400 transition-colors">
                <Plus size={13} /> New
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 transition-colors focus-within:border-slate-500">
              <Search size={13} className="text-mist-500 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes…"
                className="flex-1 bg-transparent outline-none text-[12.5px] text-paper placeholder:text-mist-500"
              />
              {query && <button onClick={() => setQuery("")} className="text-mist-600 hover:text-mist-300"><X size={12} /></button>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={18} className="animate-spin text-ember-400" /></div>
            ) : displayNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <FileText size={32} className="text-mist-700 mb-3" />
                <p className="text-[12.5px] text-mist-500">No notes yet</p>
                <button onClick={handleNew} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ember-500 text-ink-900 text-[11.5px] font-medium px-3 py-1.5 hover:bg-ember-400 transition-colors">
                  <Plus size={12} /> Create your first note
                </button>
              </div>
            ) : (
              <>
                {pinnedNotes.length > 0 && (
                  <div>
                    <div className="sticky top-0 z-10 px-4 py-1.5 text-[10px] font-mono text-gold-400/80 uppercase tracking-wider bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/40 flex items-center gap-1.5">
                      <Pin size={9} className="fill-gold-500/60 text-gold-500/60" />
                      Pinned
                      <span className="text-mist-600 font-normal">{pinnedNotes.length}</span>
                    </div>
                    {pinnedNotes.map((n) => (
                      <NoteRow key={n.id} note={n} activeId={activeId} onClick={() => setActiveId(n.id)} onDelete={handleDelete} topics={topics} vaultConnected={vaultConnected} />
                    ))}
                  </div>
                )}
                {groups.map((group) => (
                  <div key={group.label}>
                    <div className="sticky top-0 z-10 px-4 py-1.5 text-[10px] font-mono text-mist-600 uppercase tracking-wider bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/40 flex items-center gap-1.5">
                      {group.label === "Unlinked" ? <FileText size={9} className="text-mist-700" /> : <TagIcon size={9} className="text-mist-700" />}
                      {group.label}
                      <span className="text-mist-700 font-normal">{group.notes.length}</span>
                    </div>
                    {group.notes.map((n) => (
                      <NoteRow key={n.id} note={n} activeId={activeId} onClick={() => setActiveId(n.id)} onDelete={handleDelete} topics={topics} vaultConnected={vaultConnected} />
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Vault status footer */}
          <div className="px-3 py-2 border-t border-slate-700/50">
            {vaultConnected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-moss-400 shrink-0" />
                  <div className="text-[10px] font-mono text-mist-500 truncate">
                    <span className="text-moss-400">Connected</span>
                    <span className="text-mist-600 ml-1">· {fsVault.vaultName} ({fsVault.files.length})</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={fsVault.refresh} className="p-1 rounded text-mist-500 hover:text-mist-200 hover:bg-slate-700/50 transition-colors" title="Refresh vault">
                    <Loader2 size={10} className={fsVault.loading ? "animate-spin" : ""} />
                  </button>
                  <button onClick={fsVault.disconnect} className="p-1 rounded text-mist-600 hover:text-ember-400 transition-colors" title="Disconnect vault">
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-mist-700 shrink-0" />
                <span className="text-[10px] font-mono text-mist-600 flex-1">Disconnected</span>
                {fsVault.isSupported && (
                  <button
                    onClick={async () => {
                      setConnecting(true);
                      await fsVault.connect();
                      setConnecting(false);
                    }}
                    disabled={connecting}
                    className="inline-flex items-center gap-1 rounded bg-ember-500/10 text-ember-400 hover:bg-ember-500/20 text-[10px] font-mono px-2 py-0.5 transition-colors disabled:opacity-50"
                  >
                    {connecting ? <Loader2 size={9} className="animate-spin" /> : <Vault size={9} />}
                    {connecting ? "Connecting..." : "Connect"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Editor panel ── */}
        <div className="panel rounded-l-none flex flex-col overflow-hidden border-l-0">
          {active ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 bg-slate-900/40">
                <div className="flex items-center gap-2 text-[11px]">
                  <button onClick={handleTogglePin} title="Pin">
                    <Pin size={13} className={clsx("transition-colors", active.isPinned ? "fill-gold-500 text-gold-500" : "text-mist-600 hover:text-mist-400")} />
                  </button>
                  <button onClick={handleToggleStar} title="Star">
                    <Star size={13} className={clsx("transition-colors", active.isStarred ? "fill-gold-500 text-gold-500" : "text-mist-600 hover:text-mist-400")} />
                  </button>
                  <span className="text-mist-700">|</span>
                  {active.topicId ? (
                    <span className="flex items-center gap-1 text-mist-500">
                      <FileText size={10} />
                      {topics.find((t) => t.id === active.topicId)?.title || "Topic"}
                    </span>
                  ) : (
                    <span className="text-mist-600">No topic</span>
                  )}
                  {active.vaultPath && vaultConnected && (
                    <span className="text-[9.5px] font-mono text-mist-700 truncate max-w-[120px]" title={active.vaultPath}>
                      {active.vaultPath.split("/").pop()}
                    </span>
                  )}
                  {!vaultConnected && active.syncStatus && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-mono text-mist-500">
                      {active.syncStatus}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  {saving ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-ember-400 bg-ember-500/10 rounded-full px-2.5 py-0.5">
                      <Loader2 size={10} className="animate-spin" /> Saving…
                    </span>
                  ) : saved ? (
                    <span className="flex items-center gap-1.5 text-[11px] text-moss-400 bg-moss-500/10 rounded-full px-2.5 py-0.5">
                      <Check size={10} /> Saved
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10.5px] text-mist-600">
                      <Clock size={10} /> {timeAgo(active.updatedAt)}
                    </span>
                  )}
                  <div className="flex items-center gap-1 pl-2 border-l border-slate-700">
                    <span className="text-[10px] font-mono text-mist-600">{wc} words</span>
                    <button onClick={() => setShowPreview(!showPreview)} title="Toggle preview (Ctrl+P)" className="p-1 rounded text-mist-500 hover:text-mist-200 hover:bg-slate-700 transition-colors">
                      {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={handleDuplicate} title="Duplicate" className="p-1 rounded text-mist-500 hover:text-mist-200 hover:bg-slate-700 transition-colors">
                      <Copy size={12} />
                    </button>
                    <button onClick={handleExport} title="Export markdown" className="p-1 rounded text-mist-500 hover:text-mist-200 hover:bg-slate-700 transition-colors">
                      <Download size={12} />
                    </button>
                    <button onClick={() => handleDelete(active.id)} title="Delete" className="p-1 rounded text-mist-500 hover:text-ember-400 hover:bg-slate-700 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Title */}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title…"
                className="px-5 pt-4 pb-3 bg-transparent border-b border-slate-700/50 font-display text-[20px] text-paper outline-none placeholder:text-mist-700"
              />

              {/* Tags */}
              <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-700/50 flex-wrap min-h-[36px]">
                <TagIcon size={11} className="text-mist-600 shrink-0" />
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full border border-slate-600/60 bg-slate-800 px-2 py-0.5 text-[10.5px] text-gold-400">
                    #{t}
                    <button onClick={() => removeTag(t)} className="text-mist-600 hover:text-ember-400"><X size={8} /></button>
                  </span>
                ))}
                {showTagEditor ? (
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addTag(); if (e.key === "Escape") { setShowTagEditor(false); setTagInput(""); } }}
                    onBlur={() => { addTag(); setShowTagEditor(false); }}
                    placeholder="tag…"
                    autoFocus
                    className="bg-transparent outline-none text-[11px] text-paper w-20"
                  />
                ) : (
                  <button onClick={() => setShowTagEditor(true)} className="text-[10.5px] text-mist-600 hover:text-mist-300 px-1">+ add tag</button>
                )}
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-0.5 flex-wrap px-3 py-1 border-b border-slate-700/30 bg-slate-900/20">
                {toolbarBtns.map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.onClick}
                    title={btn.title}
                    className="px-2 py-1 text-[11px] rounded text-mist-500 hover:text-mist-100 hover:bg-slate-700/60 transition-colors font-mono"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Editor + Preview split */}
              <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: showPreview ? "1fr 1fr" : "1fr" }}>
                <div className="overflow-y-auto border-r border-slate-700/30">
                  <textarea
                    id="md-editor"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start writing in markdown…  Use [[Note Title]] for wikilinks, #tags, - [ ] for tasks"
                    className="w-full h-full bg-transparent p-5 text-[13.5px] font-mono text-mist-100 outline-none resize-none leading-relaxed"
                    spellCheck={false}
                  />
                </div>
                {showPreview && (
                  <div className="overflow-y-auto p-5">
                    {content.trim() ? (
                      <MarkdownPreview content={content} onWikilinkClick={handleWikilinkClick} />
                    ) : (
                      <p className="text-[13px] text-mist-600 italic">Preview will appear here…</p>
                    )}
                  </div>
                )}
              </div>

              {/* Backlinks */}
              {backlinks.length > 0 && (
                <div className="border-t border-slate-700/50 px-4 py-2.5 bg-slate-900/30">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Link2 size={11} className="text-ember-400" />
                    <span className="text-[10px] font-mono text-mist-500 uppercase tracking-wider">Backlinks ({backlinks.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {backlinks.map((bl) => (
                      <button
                        key={bl.noteId}
                        onClick={() => setActiveId(bl.noteId)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-600/50 bg-slate-800/50 px-2.5 py-1 text-[11px] text-mist-300 hover:border-ember-500/30 hover:text-ember-400 hover:bg-slate-800 transition-colors"
                      >
                        <FileText size={9} className="shrink-0" />
                        <span className="truncate max-w-[160px]">{bl.title}</span>
                        <ChevronRight size={9} className="text-mist-700" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={<FileText size={24} />}
              title="No note selected"
              body="Create a new note to start your knowledge base. Use [[wikilinks]] to connect ideas."
              action={
                <button onClick={handleNew} className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2.5 text-[13px] hover:bg-ember-400 transition-colors">
                  <Plus size={15} /> New note
                </button>
              }
            />
          )}
        </div>
      </div>

      {/* Toast error */}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-ember-500/30 bg-slate-900 px-4 py-3 shadow-lg shadow-black/30 max-w-sm">
          <AlertCircle size={14} className="text-ember-400 shrink-0" />
          <p className="text-[12.5px] text-ember-400 flex-1">{error}</p>
          <button onClick={() => setError("")} className="text-ember-400/60 hover:text-ember-200 ml-1"><X size={14} /></button>
        </div>
      )}
    </AppShell>
  );
}

function NoteRow({
  note, activeId, onClick, onDelete, topics, vaultConnected,
}: {
  note: NoteListItem;
  activeId: number | null;
  onClick: () => void;
  onDelete: (id: number) => void;
  topics: TopicResponse[];
  vaultConnected: boolean;
}) {
  const preview = note.content
    ? note.content.replace(/[#*`>\-\[\]]/g, "").replace(/\n+/g, " ").slice(0, 80)
    : "Empty note";
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left px-4 py-2.5 border-b border-slate-700/40 transition-all group relative",
        activeId === note.id
          ? "bg-slate-700/50 border-l-2 border-l-ember-500"
          : "hover:bg-slate-700/20 border-l-2 border-l-transparent",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            {note.isPinned && <Pin size={8} className="fill-gold-500 text-gold-500 shrink-0" />}
            {note.isStarred && <Star size={8} className="fill-gold-500 text-gold-500 shrink-0" />}
            <p className="text-[12.5px] font-medium text-paper truncate">{note.title}</p>
          </div>
          <p className="text-[11px] text-mist-600 truncate leading-snug">{preview}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono text-mist-700">{note.wordCount}w</span>
            <span className="text-[10px] text-mist-700">·</span>
            <span className="text-[10px] text-mist-700">{timeAgo(note.updatedAt)}</span>
            {note.topicId && (
              <>
                <span className="text-[10px] text-mist-700">·</span>
                <span className="text-[10px] text-mist-700 truncate max-w-[60px]">{topics.find((t) => t.id === note.topicId)?.title}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
          <span onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className="text-mist-700 hover:text-ember-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 size={10} />
          </span>
        </div>
      </div>
    </button>
  );
}
