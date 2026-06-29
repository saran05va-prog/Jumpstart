import { useState, useEffect, useCallback } from "react";
import { Award, Plus, ExternalLink, AlertTriangle, Loader2, RotateCcw, Pencil } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import { Pill } from "../components/ui/Tag";
import EmptyState from "../components/ui/EmptyState";
import CertificationModal from "../components/roadmaps/CertificationModal";
import { api, ApiError } from "../lib/api";
import { type CertificationResponse, type PageResponse } from "../lib/types";

const statusTone: Record<string, "moss" | "ember" | "gold" | "mist"> = { ACTIVE: "moss", EXPIRING: "gold", EXPIRED: "ember" };
const statusLabel: Record<string, string> = { ACTIVE: "Active", EXPIRING: "Expiring soon", EXPIRED: "Expired" };

export default function Certifications() {
  const [certs, setCerts] = useState<CertificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CertificationResponse | null>(null);

  const fetchCerts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<PageResponse<CertificationResponse>>("/certifications?size=100");
      setCerts(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load certifications.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(c: CertificationResponse) { setEditing(c); setModalOpen(true); }

  const expiringCount = certs.filter((c) => c.status === "EXPIRING").length;
  const expiredCount = certs.filter((c) => c.status === "EXPIRED").length;
  const hasWarning = expiringCount > 0 || expiredCount > 0;

  return (
    <AppShell title="Certifications">
      <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[26px] text-paper">Certifications</h1>
          <p className="text-[13px] text-mist-500 mt-1">Store certificates, track renewal dates, and share verification links.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2.5 text-[13.5px] hover:bg-ember-400 transition-colors">
          <Plus size={15} /> Add certification
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-ember-500/30 bg-ember-500/10 px-4 py-3 mb-5">
          <p className="text-[12.5px] text-ember-400">{error}</p>
          <button onClick={fetchCerts} className="text-ember-400 hover:text-ember-200"><RotateCcw size={14} /></button>
        </div>
      )}

      {!loading && hasWarning && (
        <div className="panel p-4 mb-6 flex items-start gap-3 border-gold-500/25 bg-gradient-to-br from-gold-500/10 to-transparent">
          <AlertTriangle size={16} className="text-gold-400 mt-0.5 shrink-0" />
          <p className="text-[12.5px] text-mist-300">
            {expiringCount > 0 && <><span className="text-gold-400 font-medium">{expiringCount}</span> {expiringCount === 1 ? "certification expires" : "certifications expire"} soon. </>}
            {expiredCount > 0 && <><span className="text-ember-400 font-medium">{expiredCount}</span> {expiredCount === 1 ? "has" : "have"} expired. </>}
            Renew them to keep your profile current.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-ember-400" /></div>
      ) : certs.length === 0 ? (
        <EmptyState icon={<Award size={22} />} title="No certifications yet" body="Add your professional certifications to track renewal dates and verification links." action={<button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2.5 text-[13.5px] hover:bg-ember-400 transition-colors"><Plus size={15} /> Add certification</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {certs.map((c) => (
            <div key={c.id} className="panel p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center"><Award size={18} className="text-mist-300" /></div>
                <div className="flex items-center gap-2">
                  <Pill tone={statusTone[c.status] ?? "mist"}>{statusLabel[c.status] ?? c.status}</Pill>
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-mist-500 hover:text-mist-200 hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100" aria-label="Edit"><Pencil size={13} /></button>
                </div>
              </div>
              <h3 className="text-[14.5px] font-semibold text-paper mb-1">{c.title}</h3>
              <p className="text-[12.5px] text-mist-500 mb-3">{c.issuer}</p>
              <div className="flex items-center justify-between text-[11.5px] font-mono text-mist-500 border-t border-slate-700 pt-3">
                <span>Issued {c.issuedDate}</span>
                <span>{c.expiresDate ? `Expires ${c.expiresDate}` : "No expiry"}</span>
              </div>
              {c.verificationUrl && <a href={c.verificationUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-1.5 text-[12px] text-ember-400 hover:text-ember-200"><ExternalLink size={12} /> View certificate</a>}
            </div>
          ))}
        </div>
      )}

      <CertificationModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchCerts} certification={editing} />
    </AppShell>
  );
}
