import { useState, useEffect, useMemo, useCallback } from "react";
import { X, Loader2, Download, Search, ChevronRight, FileText, GitBranch, Layers } from "lucide-react";
import clsx from "clsx";
import { api, ApiError } from "../../lib/api";
import {
  type RoadmapResponse,
  type TemplateSummary,
  type TemplatePreview,
} from "../../lib/types";
import { colorMap } from "../../lib/utils";
import { colorThemeToTone } from "../../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: (roadmap: RoadmapResponse) => void;
}

export default function TemplateImportModal({ open, onClose, onImported }: Props) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchTemplates = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get<TemplateSummary[]>("/templates")
      .then(setTemplates)
      .catch(() => setError("Failed to load templates."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setSearch("");
      setSelectedKey(null);
      setPreview(null);
    }
  }, [open, fetchTemplates]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!selectedKey) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    api
      .get<TemplatePreview>(`/templates/${selectedKey}`)
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));
  }, [selectedKey]);

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tag.toLowerCase().includes(q),
    );
  }, [templates, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, TemplateSummary[]> = {};
    for (const t of filtered) {
      const cat = t.tag || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return groups;
  }, [filtered]);

  if (!open) return null;

  async function handleImport(key: string) {
    setImporting(key);
    setError("");
    try {
      const roadmap = await api.post<RoadmapResponse>(`/templates/${key}/import`);
      onImported(roadmap);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to import template.");
    } finally {
      setImporting(null);
    }
  }

  const totalCount = filtered.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl rounded-xl border border-slate-700 bg-ink-900 shadow-2xl animate-rise max-h-[88vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="font-display text-[20px] text-paper">Import Roadmap Template</h2>
            <p className="text-[12.5px] text-mist-500 mt-0.5">
              Choose from {templates.length} curated learning paths. You own everything after import.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-mist-400 hover:text-mist-200 hover:bg-slate-800 transition-colors" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left: Search + Template List */}
          <div className="w-[340px] border-r border-slate-700 flex flex-col shrink-0">
            {/* Search */}
            <div className="p-4 border-b border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mist-600" size={15} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-[13px] text-paper placeholder:text-mist-600 outline-none focus:border-ember-500/50"
                />
              </div>
              <p className="text-[11px] text-mist-700 mt-2">{totalCount} template{totalCount !== 1 ? "s" : ""}</p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-ember-400" />
                </div>
              ) : error ? (
                <p className="text-[13px] text-ember-400 text-center py-8">{error}</p>
              ) : totalCount === 0 ? (
                <p className="text-[12.5px] text-mist-600 text-center py-8">No templates match "{search}"</p>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-4">
                    <h4 className="px-3 text-[10.5px] font-bold text-mist-700 uppercase tracking-wider mb-1.5">
                      {category}
                    </h4>
                    <div className="space-y-0.5">
                      {items.map((t) => {
                        const tone = colorThemeToTone(t.colorTheme);
                        const cm = colorMap[tone];
                        const isSelected = selectedKey === t.key;
                        return (
                          <button
                            key={t.key}
                            onClick={() => setSelectedKey(t.key)}
                            className={clsx(
                              "w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 group",
                              isSelected
                                ? "bg-ember-500/10 border border-ember-500/30"
                                : "hover:bg-slate-800 border border-transparent",
                            )}
                          >
                            <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cm.bgSoft)}>
                              <Layers size={14} className={cm.text} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={clsx("text-[13px] font-medium truncate", isSelected ? "text-ember-400" : "text-mist-100")}>
                                {t.title}
                              </p>
                              <p className="text-[11px] text-mist-600 mt-0.5">
                                {t.topicCount} topics
                                {t.source && t.source !== "roadmap.sh" ? ` · ${t.source}` : ""}
                              </p>
                            </div>
                            <ChevronRight
                              size={14}
                              className={clsx(
                                "shrink-0 transition-colors",
                                isSelected ? "text-ember-400" : "text-mist-700 group-hover:text-mist-400",
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Preview Pane */}
          <div className="flex-1 bg-slate-950/40 overflow-y-auto">
            {selectedKey ? (
              previewLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={22} className="animate-spin text-ember-400" />
                </div>
              ) : preview ? (
                <div className="p-6">
                  {/* Title section */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-mist-400 text-[10.5px] font-medium border border-slate-700">
                        {preview.category}
                      </span>
                      {preview.edgeCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-500/10 text-gold-400 text-[10.5px] font-medium border border-gold-500/20">
                          <GitBranch size={10} /> {preview.edgeCount} prerequisites
                        </span>
                      )}
                    </div>
                    <h3 className="text-[22px] font-display text-paper mb-2">{preview.title}</h3>
                    <p className="text-[13.5px] text-mist-500 leading-relaxed">{preview.description}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                      <p className="text-[10.5px] text-mist-600 uppercase tracking-wide mb-1">Topics</p>
                      <p className="num text-[18px] text-paper">{preview.topics.length}</p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                      <p className="text-[10.5px] text-mist-600 uppercase tracking-wide mb-1">Subtopics</p>
                      <p className="num text-[18px] text-paper">
                        {preview.topics.reduce((s, t) => s + (t.children?.length || 0), 0)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
                      <p className="text-[10.5px] text-mist-600 uppercase tracking-wide mb-1">Resources</p>
                      <p className="num text-[18px] text-paper">
                        {preview.topics.reduce(
                          (s, t) => s + (t.resourceCount || 0) + (t.children?.reduce((c, ch) => c + (ch.resourceCount || 0), 0) || 0),
                          0,
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Topic list */}
                  <div>
                    <h4 className="text-[11px] font-bold text-mist-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <FileText size={12} /> Curriculum
                    </h4>
                    <div className="space-y-1.5">
                      {preview.topics.slice(0, 30).map((t, i) => (
                        <div key={t.id} className="rounded-lg border border-slate-700/60 bg-slate-800/30 px-3.5 py-2.5">
                          <div className="flex items-start gap-2.5">
                            <span className="font-mono text-[10.5px] text-mist-700 mt-0.5 shrink-0">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] text-mist-100 font-medium">{t.title}</p>
                              {t.description && (
                                <p className="text-[11.5px] text-mist-600 mt-0.5 line-clamp-2">{t.description}</p>
                              )}
                              {t.children && t.children.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {t.children.slice(0, 5).map((c) => (
                                    <span key={c.id} className="text-[10px] text-mist-500 bg-slate-800 rounded px-1.5 py-0.5">
                                      {c.title}
                                    </span>
                                  ))}
                                  {t.children.length > 5 && (
                                    <span className="text-[10px] text-mist-600">+{t.children.length - 5} more</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {t.resourceCount && t.resourceCount > 0 ? (
                                <span className="text-[10px] text-mist-600 flex items-center gap-0.5">
                                  <FileText size={9} /> {t.resourceCount}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                      {preview.topics.length > 30 && (
                        <p className="text-[11.5px] text-mist-600 text-center py-2">
                          +{preview.topics.length - 30} more topics...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Import button */}
                  <div className="mt-6 pt-5 border-t border-slate-700">
                    {error && <p className="text-[12.5px] text-ember-400 mb-3">{error}</p>}
                    <button
                      onClick={() => handleImport(preview.key)}
                      disabled={importing !== null}
                      className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 text-[13.5px] font-semibold px-5 py-2.5 hover:bg-ember-400 transition-colors disabled:opacity-60 w-full justify-center"
                    >
                      {importing === preview.key ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Importing...
                        </>
                      ) : (
                        <>
                          <Download size={16} /> Import this roadmap
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <p className="text-[13px] text-mist-600">Failed to load preview.</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
                  <Layers size={28} className="text-mist-600" />
                </div>
                <h3 className="text-[16px] font-medium text-mist-300 mb-1">Select a template</h3>
                <p className="text-[13px] text-mist-600 max-w-xs">
                  Choose from the list to preview the curriculum, topics, and resources before importing.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-700 shrink-0">
          <p className="text-[11.5px] text-mist-700 text-center">
            Templates provide starter structure from roadmap.sh. You own and can customize everything after import.
          </p>
        </div>
      </div>
    </div>
  );
}
