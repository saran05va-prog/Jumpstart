import { useState, useEffect, useRef } from "react";
import { ExternalLink, Copy, Check, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useObsidianStore } from "../../store/obsidian";

interface ObsidianLinkPanelProps {
  noteId: number;
  topicName: string;
  obsidianUri: string | null;
  obsidianFile: string | null;
  onSave: (uri: string, file: string) => void;
}

export default function ObsidianLinkPanel({ noteId, topicName, obsidianUri, obsidianFile, onSave }: ObsidianLinkPanelProps) {
  const { settings, fetchSettings } = useObsidianStore();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [filePath, setFilePath] = useState(obsidianFile || "");
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved" | "error">("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setFilePath(obsidianFile || "");
  }, [obsidianFile]);

  const vaultName = settings?.obsidianVaultName || "";
  const vaultConfigured = !!vaultName;

  function constructUri(file: string): string {
    if (!vaultName || !file) return "";
    return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(file)}`;
  }

  function handleFilePathChange(val: string) {
    setFilePath(val);
    const uri = constructUri(val);
    onSave(uri, val);
  }

  function handleOpenInObsidian() {
    const uri = constructUri(filePath);
    if (uri) window.location.href = uri;
  }

  function handlePushToObsidian() {
    if (!vaultName || !filePath) return;
    const uri = `obsidian://new?vault=${encodeURIComponent(vaultName)}&name=${encodeURIComponent(filePath)}&content=${encodeURIComponent(topicName || "Note")}&append=true`;
    window.location.href = uri;
  }

  async function handleCopyUri() {
    const uri = constructUri(filePath);
    if (!uri) return;
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = uri;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="border-t border-slate-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] text-mist-500 hover:text-mist-200 transition-colors"
      >
        <span className="flex items-center gap-2">
          <ExternalLink size={13} />
          Obsidian
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {!vaultConfigured ? (
            <div className="rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 py-2.5">
              <p className="text-[12px] text-gold-400 mb-2">Obsidian vault not configured</p>
              <button
                onClick={() => navigate("/app/settings")}
                className="inline-flex items-center gap-1.5 text-[11px] text-ember-400 hover:text-ember-200"
              >
                <Settings size={12} /> Go to Settings
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-mist-500 shrink-0">Vault:</span>
                <span className="text-[12px] text-mist-200 font-medium">{vaultName}</span>
              </div>

              <div>
                <label className="text-[11px] text-mist-500 block mb-1">Obsidian file path</label>
                <input
                  ref={inputRef}
                  value={filePath}
                  onChange={(e) => handleFilePathChange(e.target.value)}
                  placeholder="Kubernetes/Introduction"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[12px] text-paper outline-none focus:border-ember-500/50 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleOpenInObsidian}
                  disabled={!filePath}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-[11px] text-mist-200 hover:bg-slate-600 disabled:opacity-50 transition-colors"
                >
                  <ExternalLink size={12} /> Open in Obsidian
                </button>
                <button
                  onClick={handlePushToObsidian}
                  disabled={!filePath}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-[11px] text-mist-200 hover:bg-slate-600 disabled:opacity-50 transition-colors"
                >
                  <ExternalLink size={12} /> Push to Obsidian
                </button>
                <button
                  onClick={handleCopyUri}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-[11px] text-mist-300 hover:bg-slate-700 transition-colors"
                >
                  {copied ? <Check size={12} className="text-moss-400" /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy URI"}
                </button>
              </div>

              {filePath && vaultName && (
                <p className="text-[10px] font-mono text-mist-600 break-all truncate">
                  obsidian://open?vault={vaultName}&file={encodeURIComponent(filePath)}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
