import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Route, Library, NotebookPen, CornerDownLeft } from "lucide-react";
import { useUIStore } from "../../store/ui";
import { api } from "../../lib/api";
import { type SearchResult } from "../../lib/types";

const typeIcon: Record<string, typeof Route> = { ROADMAP: Route, NOTE: NotebookPen, RESOURCE: Library };
const typePath: Record<string, (id: number) => string> = {
  ROADMAP: (id) => `/app/roadmaps/${id}`,
  NOTE: () => `/app/notes`,
  RESOURCE: () => `/app/resources`,
};

export default function CommandPalette() {
  const { commandOpen, setCommandOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!commandOpen) { setQuery(""); setResults([]); }
  }, [commandOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (e.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commandOpen, setCommandOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`);
        setResults(res);
      } catch {
        setResults([]);
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  if (!commandOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-ink-900/70 backdrop-blur-sm" onClick={() => setCommandOpen(false)}>
      <div className="w-full max-w-lg panel overflow-hidden animate-rise" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Global search">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-700">
          <Search size={16} className="text-mist-500" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search roadmaps, notes, resources…" className="flex-1 bg-transparent outline-none text-[14px] text-paper placeholder:text-mist-500" />
          <kbd className="rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-mist-500">esc</kbd>
        </div>
        <ul className="max-h-[320px] overflow-y-auto py-1.5">
          {query.trim() === "" ? (
            <li className="px-4 py-6 text-center text-[13px] text-mist-500">Start typing to search across your roadmaps, notes, and resources.</li>
          ) : loading ? (
            <li className="px-4 py-6 text-center text-[13px] text-mist-500">Searching…</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-6 text-center text-[13px] text-mist-500">No matches for "{query}".</li>
          ) : (
            results.map((r) => {
              const Icon = typeIcon[r.type] ?? Search;
              const path = typePath[r.type]?.(r.id) ?? "/app";
              return (
                <li key={`${r.type}-${r.id}`}>
                  <button onClick={() => { navigate(path); setCommandOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-700/50 group">
                    <Icon size={16} className="text-mist-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] text-mist-100 truncate">{r.title}</p>
                      <p className="text-[11px] text-mist-500 truncate">{r.subtitle || r.type}</p>
                    </div>
                    <CornerDownLeft size={13} className="ml-auto text-mist-700 opacity-0 group-hover:opacity-100 shrink-0" />
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
