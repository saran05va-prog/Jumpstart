import { useState, useEffect } from "react";
import { X, Loader2, Trash2 } from "lucide-react";
import { api, ApiError } from "../../lib/api";
import { type CertificationResponse, type CertificationRequest, type RoadmapResponse, type PageResponse, CERT_STATUSES } from "../../lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  certification?: CertificationResponse | null;
}

export default function CertificationModal({ open, onClose, onSaved, certification }: Props) {
  const isEdit = !!certification;
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiresDate, setExpiresDate] = useState("");
  const [verificationUrl, setVerificationUrl] = useState("");
  const [status, setStatus] = useState("PLANNED");
  const [roadmapId, setRoadmapId] = useState<number | null>(null);
  const [studyHours, setStudyHours] = useState(0);
  const [notes, setNotes] = useState("");
  const [roadmaps, setRoadmaps] = useState<RoadmapResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<PageResponse<RoadmapResponse>>("/roadmaps").then((r) => setRoadmaps(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      setTitle(certification?.title ?? "");
      setIssuer(certification?.issuer ?? "");
      setIssuedDate(certification?.issuedDate ?? "");
      setExpiresDate(certification?.expiresDate ?? "");
      setVerificationUrl(certification?.verificationUrl ?? "");
      setStatus(certification?.status ?? "PLANNED");
      setRoadmapId(certification?.roadmapId ?? null);
      setStudyHours(certification?.studyHours ?? 0);
      setNotes(certification?.notes ?? "");
      setError("");
    }
  }, [open, certification]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const body: CertificationRequest = {
      title, issuer, issuedDate,
      expiresDate: expiresDate || undefined,
      verificationUrl: verificationUrl || undefined,
      status,
      roadmapId: roadmapId ?? undefined,
      studyHours: studyHours || undefined,
      notes: notes || undefined,
    };
    try {
      if (isEdit) await api.patch<CertificationResponse>(`/certifications/${certification!.id}`, body);
      else await api.post<CertificationResponse>("/certifications", body);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors ? Object.values(err.fieldErrors).join(" ") : err.message) : "Unable to connect to the server.");
    } finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!certification) return;
    if (!window.confirm(`Delete "${certification.title}"?`)) return;
    setDeleting(true);
    try {
      await api.del(`/certifications/${certification.id}`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to connect to the server.");
    } finally { setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/70" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-slate-700 bg-ink-900 shadow-xl animate-rise">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="font-display text-[18px] text-paper">{isEdit ? "Edit certification" : "Add certification"}</h2>
          <button onClick={onClose} className="text-mist-400 hover:text-mist-200 p-1" aria-label="Close"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Title</span>
            <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AWS Solutions Architect" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
          </label>
          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Issuer</span>
            <input required maxLength={160} value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="e.g. Amazon Web Services" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Issued date</span>
              <input type="date" required value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
            </label>
            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Expires (optional)</span>
              <input type="date" value={expiresDate} onChange={(e) => setExpiresDate(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
            </label>
          </div>
          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Verification URL</span>
            <input value={verificationUrl} onChange={(e) => setVerificationUrl(e.target.value)} placeholder="https://…" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
          </label>
          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50">
              {CERT_STATUSES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
            </select>
          </label>
          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Linked roadmap (optional)</span>
            <select value={roadmapId ?? ""} onChange={(e) => setRoadmapId(e.target.value ? Number(e.target.value) : null)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50">
              <option value="">None</option>
              {roadmaps.map((rm) => <option key={rm.id} value={rm.id}>{rm.title}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Study hours</span>
              <input type="number" min={0} value={studyHours} onChange={(e) => setStudyHours(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50" />
            </label>
          </div>
          <label className="block">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Notes</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-[13.5px] text-paper outline-none focus:border-ember-500/50 resize-none" />
          </label>
          {error && <p className="text-[12px] text-ember-400">{error}</p>}
          <div className="flex items-center justify-between pt-2">
            <div>{isEdit && (
              <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-lg border border-ember-500/30 px-3 py-2 text-[12.5px] text-ember-400 hover:bg-ember-500/10 transition-colors disabled:opacity-60">
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
              </button>
            )}</div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-[13px] text-mist-400 hover:text-mist-200 transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-ember-500 px-4 py-2 text-[13px] font-medium text-ink-900 hover:bg-ember-400 transition-colors disabled:opacity-60">
                {loading && <Loader2 size={14} className="animate-spin" />}{isEdit ? "Save" : "Add certification"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
