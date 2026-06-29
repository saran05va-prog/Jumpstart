import { useState, useEffect, useCallback } from "react";
import { Bell, Lock, User as UserIcon, Mail, Shield, Loader2, Check, ExternalLink, BookOpen, FolderOpen, RefreshCw, AlertCircle, HardDrive, Activity } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import { useAuthStore } from "../store/auth";
import { useObsidianStore } from "../store/obsidian";
import { useToastStore } from "../store/toast";
import { api, getNotesStorage, saveNotesStorage, verifyNotesStorage, resetNotesStorage } from "../lib/api";
import type { VerifyConnectionResponse, SyncStatusResponse } from "../lib/types";
import clsx from "clsx";

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={clsx("w-10 h-6 rounded-full transition-colors relative shrink-0", checked ? "bg-ember-500" : "bg-slate-700")} role="switch" aria-checked={checked}>
      <span className={clsx("absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-paper transition-transform", checked && "translate-x-4")} />
    </button>
  );
}

export default function Settings() {
  const { user, logout, updateProfile } = useAuthStore();
  const { settings, fetchSettings, saveVaultName } = useObsidianStore();
  const toast = useToastStore((s) => s.push);
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [obsidianVault, setObsidianVault] = useState("");
  const [obsidianVaultPath, setObsidianVaultPath] = useState("");
  const [obsidianSaving, setObsidianSaving] = useState(false);
  const [notifs, setNotifs] = useState({ streak: true, goals: true, mentor: false, product: true });

  // Vault connection
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyConnectionResponse | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Notes storage
  const [notesStoragePath, setNotesStoragePath] = useState("");
  const [notesStorageSaving, setNotesStorageSaving] = useState(false);
  const [notesStorageVerifying, setNotesStorageVerifying] = useState(false);
  const [notesStorageResult, setNotesStorageResult] = useState<{ success: boolean; message: string } | null>(null);
  const [notesStorageConfigured, setNotesStorageConfigured] = useState(false);

  const checkSyncStatus = useCallback(async () => {
    try {
      const s = await api.get<SyncStatusResponse>("/settings/obsidian/sync-status");
      setSyncStatus(s);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchSettings();
    checkSyncStatus();
  }, [fetchSettings, checkSyncStatus]);

  useEffect(() => {
    if (settings?.obsidianVaultName) setObsidianVault(settings.obsidianVaultName);
    if (settings?.obsidianVaultPath) setObsidianVaultPath(settings.obsidianVaultPath);
  }, [settings]);

  useEffect(() => {
    getNotesStorage().then((s) => {
      if (s.notesStoragePath) {
        setNotesStoragePath(s.notesStoragePath);
        setNotesStorageConfigured(true);
      }
    }).catch(() => {});
  }, []);

  const displayName = user?.name ?? "User";
  const displayRole = user ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : "";
  const initials = displayName.split(" ").map((n) => n[0]).join("");
  const nameChanged = name.trim().length > 0 && name !== (user?.name ?? "");

  async function handleSaveName() {
    if (!nameChanged) return;
    setSaving(true);
    setError("");
    try {
      await updateProfile(name.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally { setSaving(false); }
  }

  async function handleSaveObsidian() {
    setObsidianSaving(true);
    setVerifyResult(null);
    try {
      await api.put("/settings/obsidian", { vaultName: obsidianVault.trim(), vaultPath: obsidianVaultPath.trim() });
      toast("Obsidian settings saved", { tone: "success" });
      // Auto-verify after saving
      try {
        const vr = await api.post<VerifyConnectionResponse>("/settings/obsidian/verify");
        setVerifyResult(vr);
      } catch {}
      checkSyncStatus();
    } catch {
      toast("Failed to save vault settings", { tone: "error" });
    } finally { setObsidianSaving(false); }
  }

  async function handleVerify() {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await api.post<VerifyConnectionResponse>("/settings/obsidian/verify");
      setVerifyResult(result);
      if (result.success) {
        toast("Vault connected: " + result.markdownFileCount + " markdown files found", { tone: "success" });
      } else {
        toast(result.message, { tone: "error" });
      }
    } catch {
      setVerifyResult({ success: false, message: "Failed to verify connection", vaultPath: null, fileCount: 0, markdownFileCount: 0 });
      toast("Verification failed", { tone: "error" });
    } finally { setVerifying(false); }
  }

  async function handleSyncNow() {
    setSyncing(true);
    try {
      await api.post("/settings/obsidian/sync-now");
      toast("Sync completed", { tone: "success" });
      checkSyncStatus();
    } catch {
      toast("Sync failed", { tone: "error" });
    } finally { setSyncing(false); }
  }

  async function handleDeleteAccount() {
    if (!window.confirm("Delete your account? This will permanently remove all your data. This cannot be undone.")) return;
    await logout();
  }

  return (
    <AppShell title="Settings">
      <div className="mb-7">
        <h1 className="font-display text-[26px] text-paper">Settings</h1>
        <p className="text-[13px] text-mist-500 mt-1">Manage your profile, integrations and preferences.</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserIcon size={15} className="text-mist-400" />
            <h2 className="text-[14.5px] font-semibold text-paper">Profile</h2>
          </div>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-moss-500 flex items-center justify-center text-[16px] font-semibold text-ink-900">{initials}</div>
            <div>
              <p className="text-[13px] text-mist-100">{displayName}</p>
              <p className="text-[11.5px] text-mist-500">{displayRole}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Full name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-slate-500" />
            </label>
            <label className="block">
              <span className="text-[12px] text-mist-500 mb-1.5 block">Role</span>
              <input value={displayRole} disabled className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-[13px] text-mist-500 outline-none" />
            </label>
          </div>
          {error && <p className="text-[12px] text-ember-400 mt-3">{error}</p>}
          <div className="mt-4">
            <button onClick={handleSaveName} disabled={!nameChanged || saving} className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2 text-[13px] hover:bg-ember-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
              {saved ? "Saved" : "Save changes"}
            </button>
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <ExternalLink size={15} className="text-mist-400" />
            <h2 className="text-[14.5px] font-semibold text-paper">Obsidian Integration</h2>
          </div>
          <p className="text-[12px] text-mist-500 mb-4">Link notes to your Obsidian vault for bidirectional editing. Notes save as .md files in a Jumpstart Notes folder inside your vault.</p>

          <label className="block mb-3">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Vault folder path</span>
            <input
              value={obsidianVaultPath}
              onChange={(e) => setObsidianVaultPath(e.target.value)}
              placeholder="C:\Users\saran\Documents\obsidian\Saran"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-slate-500 font-mono text-[12px]"
            />
          </label>

          <label className="block mb-4">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Vault name (optional)</span>
            <input
              value={obsidianVault}
              onChange={(e) => setObsidianVault(e.target.value)}
              placeholder="Saran"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-slate-500"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button onClick={handleSaveObsidian} disabled={obsidianSaving} className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2 text-[13px] hover:bg-ember-400 transition-colors disabled:opacity-50">
              {obsidianSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save
            </button>
            <button onClick={handleVerify} disabled={verifying} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-[13px] text-mist-300 hover:bg-slate-700 transition-colors disabled:opacity-50">
              {verifying ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />}
              Verify Connection
            </button>
            <button onClick={handleSyncNow} disabled={syncing} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-[13px] text-mist-300 hover:bg-slate-700 transition-colors disabled:opacity-50">
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Sync Now
            </button>
          </div>

          {/* Verify result */}
          {verifyResult && (
            <div className={clsx("rounded-lg border px-4 py-3 mb-4 text-[12.5px]", verifyResult.success ? "border-moss-500/30 bg-moss-500/10 text-moss-400" : "border-ember-500/30 bg-ember-500/10 text-ember-400")}>
              <div className="flex items-center gap-2 mb-1">
                {verifyResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                <span className="font-medium">{verifyResult.success ? "Connected" : "Failed"}</span>
              </div>
              <p>{verifyResult.message}</p>
              {verifyResult.success && (
                <p className="text-[11px] text-mist-500 mt-1">{verifyResult.markdownFileCount} markdown files · {verifyResult.fileCount} total files</p>
              )}
            </div>
          )}

          {/* Sync status */}
          {syncStatus && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className={syncStatus.connected ? "text-moss-400" : "text-mist-600"} />
                <span className="text-[12px] font-medium text-mist-200">
                  Sync Status: {syncStatus.connected ? "Connected" : "Not connected"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[18px] font-display text-paper">{syncStatus.syncedNotes}</p>
                  <p className="text-[10px] text-mist-600">Synced</p>
                </div>
                <div>
                  <p className="text-[18px] font-display text-gold-400">{syncStatus.pendingNotes}</p>
                  <p className="text-[10px] text-mist-600">Pending</p>
                </div>
                <div>
                  <p className="text-[18px] font-display text-ember-400">{syncStatus.conflictedNotes}</p>
                  <p className="text-[10px] text-mist-600">Conflicts</p>
                </div>
              </div>
              {syncStatus.lastSyncAt && (
                <p className="text-[10px] text-mist-700 mt-2">Last sync: {new Date(syncStatus.lastSyncAt).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen size={15} className="text-mist-400" />
            <h2 className="text-[14.5px] font-semibold text-paper">Notes Storage</h2>
          </div>
          <p className="text-[12px] text-mist-500 mb-4">
            Choose a folder on your computer to store notes as standard Markdown (.md) files.
            Works with Obsidian or any text editor. Notes are organized under <code className="text-mist-300">Roadmaps/{"{Roadmap}"}/{"{Topic}"}/</code>.
          </p>

          <label className="block mb-4">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Storage folder path</span>
            <input
              value={notesStoragePath}
              onChange={(e) => { setNotesStoragePath(e.target.value); setNotesStorageConfigured(false); }}
              placeholder="C:\Users\saran\Documents\notes"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-slate-500 font-mono text-[12px]"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button onClick={async () => {
              if (!notesStoragePath.trim()) { toast("Enter a folder path", { tone: "error" }); return; }
              setNotesStorageSaving(true);
              setNotesStorageResult(null);
              try {
                await saveNotesStorage(notesStoragePath.trim());
                setNotesStorageConfigured(true);
                toast("Storage path saved", { tone: "success" });
              } catch {
                toast("Failed to save storage path", { tone: "error" });
              } finally { setNotesStorageSaving(false); }
            }} disabled={notesStorageSaving || !notesStoragePath.trim()} className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2 text-[13px] hover:bg-ember-400 transition-colors disabled:opacity-50">
              {notesStorageSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save
            </button>
            <button onClick={async () => {
              setNotesStorageVerifying(true);
              setNotesStorageResult(null);
              try {
                const result = await verifyNotesStorage();
                setNotesStorageResult(result);
                if (result.success) {
                  toast(result.message, { tone: "success" });
                } else {
                  toast(result.message, { tone: "error" });
                }
              } catch {
                setNotesStorageResult({ success: false, message: "Verification failed" });
                toast("Verification failed", { tone: "error" });
              } finally { setNotesStorageVerifying(false); }
            }} disabled={notesStorageVerifying || !notesStorageConfigured} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-[13px] text-mist-300 hover:bg-slate-700 transition-colors disabled:opacity-50">
              {notesStorageVerifying ? <Loader2 size={14} className="animate-spin" /> : <HardDrive size={14} />}
              Test Access
            </button>
            <button onClick={async () => {
              if (!window.confirm("Reset the notes storage path? Notes will only be stored in the database.")) return;
              try {
                await resetNotesStorage();
                setNotesStoragePath("");
                setNotesStorageConfigured(false);
                setNotesStorageResult(null);
                toast("Storage path reset", { tone: "success" });
              } catch {
                toast("Failed to reset", { tone: "error" });
              }
            }} className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-[13px] text-mist-300 hover:bg-slate-700 transition-colors">
              <RefreshCw size={14} />
              Reset
            </button>
          </div>

          {notesStorageResult && (
            <div className={clsx("rounded-lg border px-4 py-3 text-[12.5px]", notesStorageResult.success ? "border-moss-500/30 bg-moss-500/10 text-moss-400" : "border-ember-500/30 bg-ember-500/10 text-ember-400")}>
              <div className="flex items-center gap-2 mb-1">
                {notesStorageResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                <span className="font-medium">{notesStorageResult.success ? "Access OK" : "Access Failed"}</span>
              </div>
              <p>{notesStorageResult.message}</p>
            </div>
          )}

          {notesStorageConfigured && !notesStorageResult && (
            <div className="rounded-lg border border-moss-500/30 bg-moss-500/10 px-4 py-3 text-[12.5px] text-moss-400">
              <div className="flex items-center gap-2">
                <Check size={14} />
                <span className="font-medium">Path configured</span>
              </div>
              <p className="text-[11px] text-mist-500 mt-1">Click <strong>Test Access</strong> to verify the folder exists and is writable.</p>
            </div>
          )}
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={15} className="text-mist-400" />
            <h2 className="text-[14.5px] font-semibold text-paper">Account</h2>
          </div>
          <label className="block mb-4">
            <span className="text-[12px] text-mist-500 mb-1.5 block">Email address</span>
            <input value={user?.email ?? ""} disabled className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-[13px] text-mist-500 outline-none" />
          </label>
          <div className="flex items-center gap-2">
            <Lock size={13} className="text-mist-500" />
            <span className="text-[12.5px] text-mist-500">Password changes are not yet available.</span>
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={15} className="text-mist-400" />
            <h2 className="text-[14.5px] font-semibold text-paper">Notifications</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: "streak" as const, label: "Streak reminders", desc: "Get nudged before a study streak breaks" },
              { key: "goals" as const, label: "Goal progress", desc: "Weekly summary of goal completion" },
              { key: "mentor" as const, label: "Mentor activity", desc: "Comments and feedback on your notes" },
              { key: "product" as const, label: "Product updates", desc: "New features and roadmap templates" },
            ].map((row) => (
              <div key={row.key} className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] text-mist-100">{row.label}</p>
                  <p className="text-[11.5px] text-mist-500">{row.desc}</p>
                </div>
                <Toggle checked={notifs[row.key]} onChange={() => setNotifs((n) => ({ ...n, [row.key]: !n[row.key] }))} />
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-5 border-ember-500/25">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={15} className="text-ember-400" />
            <h2 className="text-[14.5px] font-semibold text-paper">Danger zone</h2>
          </div>
          <p className="text-[12.5px] text-mist-500 mb-4">Logging out will end your session. You can log back in anytime.</p>
          <button onClick={() => logout()} className="inline-flex items-center gap-2 rounded-lg border border-ember-500/40 px-4 py-2 text-[13px] text-ember-400 hover:bg-ember-500/10 transition-colors">Log out</button>
        </div>
      </div>
    </AppShell>
  );
}
