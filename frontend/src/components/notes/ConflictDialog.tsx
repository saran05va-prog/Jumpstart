import { useState } from "react";
import { AlertCircle, Check, X, Code2, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import type { NoteResponse } from "../../lib/types";
import MarkdownPreview from "./MarkdownPreview";

interface Props {
  noteId: number;
  jumpstartContent: string;
  obsidianContent: string;
  title: string;
  onResolved: (note: NoteResponse) => void;
  onClose: () => void;
}

export default function ConflictDialog({
  noteId, jumpstartContent, obsidianContent, title, onResolved, onClose,
}: Props) {
  const [resolving, setResolving] = useState(false);
  const [mergedContent, setMergedContent] = useState("");
  const [mode, setMode] = useState<"choose" | "merge">("choose");

  async function handleResolve(resolution: string) {
    setResolving(true);
    try {
      const body: Record<string, unknown> = { noteId, resolution };
      if (resolution === "MERGE") body.mergedContent = mergedContent;
      const updated = await api.post<NoteResponse>(`/notes/${noteId}/resolve-conflict`, body);
      onResolved(updated);
    } catch {
      onClose();
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl mx-4 rounded-xl border border-ember-500/30 bg-slate-900 shadow-2xl shadow-black/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700">
          <AlertCircle size={18} className="text-ember-400 shrink-0" />
          <div className="flex-1">
            <h2 className="text-[14px] font-semibold text-paper">Sync Conflict</h2>
            <p className="text-[12px] text-mist-500">
              "{title}" was modified in both Jumpstart and Obsidian since last sync
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-mist-500 hover:text-mist-300 hover:bg-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        {mode === "choose" ? (
          <>
            {/* Content comparison */}
            <div className="grid grid-cols-2 gap-0 divide-x divide-slate-700">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[12px] font-medium text-ember-400">Jumpstart version</span>
                  <span className="text-[10px] font-mono text-mist-600">local</span>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 max-h-80 overflow-y-auto">
                  <MarkdownPreview content={jumpstartContent} />
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[12px] font-medium text-mist-200">Obsidian version</span>
                  <span className="text-[10px] font-mono text-mist-600">vault</span>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 max-h-80 overflow-y-auto">
                  <MarkdownPreview content={obsidianContent} />
                </div>
              </div>
            </div>

            {/* Resolution actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-700 bg-slate-900/50">
              <button
                onClick={() => handleResolve("KEEP_JUMPSTART")}
                disabled={resolving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2 text-[12.5px] hover:bg-ember-400 transition-colors disabled:opacity-50"
              >
                {resolving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Keep Jumpstart
              </button>
              <button
                onClick={() => handleResolve("KEEP_OBSIDIAN")}
                disabled={resolving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-4 py-2 text-[12.5px] text-mist-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <Check size={13} /> Keep Obsidian
              </button>
              <button
                onClick={() => {
                  setMergedContent(`# ${title}\n\n--- Jumpstart ---\n${jumpstartContent}\n\n--- Obsidian ---\n${obsidianContent}`);
                  setMode("merge");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-4 py-2 text-[12.5px] text-mist-200 hover:bg-slate-700 transition-colors"
              >
                <Code2 size={13} /> Merge manually
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Manual merge */}
            <div className="p-4">
              <p className="text-[12px] text-mist-500 mb-3">
                Edit the merged content below. Both versions are shown for reference.
              </p>
              <textarea
                value={mergedContent}
                onChange={(e) => setMergedContent(e.target.value)}
                className="w-full h-64 rounded-lg border border-slate-700 bg-slate-900 p-3 text-[13px] font-mono text-mist-100 outline-none resize-none focus:border-slate-500"
                spellCheck={false}
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-700 bg-slate-900/50">
              <button
                onClick={() => setMode("choose")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-4 py-2 text-[12.5px] text-mist-200 hover:bg-slate-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => handleResolve("MERGE")}
                disabled={resolving || !mergedContent.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-moss-500 text-ink-900 font-medium px-4 py-2 text-[12.5px] hover:bg-moss-400 transition-colors disabled:opacity-50"
              >
                {resolving ? <Loader2 size={13} className="animate-spin" /> : null}
                {resolving ? "Resolving..." : "Apply merge"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
