import { useState, useEffect } from "react";
import {
  Calendar, Loader2, Zap, Check, Plus,
  Route, Sparkles,
} from "lucide-react";
import clsx from "clsx";
import AppShell from "../components/layout/AppShell";
import WeekSchedule from "../components/schedule/WeekSchedule";
import { api } from "../lib/api";
import { useToastStore } from "../store/toast";
import type { RoadmapResponse, TopicResponse, PageResponse, AutoSchedulePreview, UserSettingsResponse } from "../lib/types";

export default function Schedule() {
  const toast = useToastStore((s) => s.push);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [roadmaps, setRoadmaps] = useState<RoadmapResponse[]>([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState<number | null>(null);
  const [topics, setTopics] = useState<TopicResponse[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dailyHours, setDailyHours] = useState(2);
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [planning, setPlanning] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [preview, setPreview] = useState<AutoSchedulePreview | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  useEffect(() => {
    api.get<UserSettingsResponse>("/settings/obsidian").then((s) => {
      if (s.dailyStudyHours > 0) setDailyHours(s.dailyStudyHours);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.get<PageResponse<RoadmapResponse>>("/roadmaps?size=100").then((res) => setRoadmaps(res.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedRoadmap) {
      api.get<TopicResponse[]>(`/roadmaps/${selectedRoadmap}/topics`).then(setTopics).catch(() => setTopics([]));
    } else {
      setTopics([]);
    }
    setSelectedTopics(new Set());
  }, [selectedRoadmap]);

  function toggleTopic(id: number) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleStudyDay(idx: number) {
    setStudyDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort()
    );
  }

  async function handlePreview() {
    if (selectedTopics.size === 0) {
      toast("Select at least one topic", { tone: "error" });
      return;
    }
    setPlanning(true);
    try {
      const result = await api.post<AutoSchedulePreview>("/schedule/auto/plan", {
        topicIds: Array.from(selectedTopics),
        startDate,
        dailyMinutes: dailyHours * 60,
        studyDays,
      });
      setPreview(result);
    } catch {
      toast("Failed to generate plan", { tone: "error" });
    } finally { setPlanning(false); }
  }

  async function handleConfirm() {
    if (!preview || preview.items.length === 0) return;
    setPlanning(true);
    try {
      await api.post("/schedule/auto/plan/confirm", {
        topicIds: Array.from(selectedTopics),
        startDate,
        dailyMinutes: dailyHours * 60,
        studyDays,
      });
      toast(`${preview.items.length} sessions scheduled!`, { tone: "success" });
      setPreview(null);
      setShowPlanner(false);
      setRefreshKey((k) => k + 1);
    } catch {
      toast("Failed to confirm plan", { tone: "error" });
    } finally { setPlanning(false); }
  }

  function formatMinutes(m: number): string {
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h === 0) return `${min}m`;
    if (min === 0) return `${h}h`;
    return `${h}h ${min}m`;
  }

  return (
    <AppShell title="Schedule">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={18} className="text-ember-400" />
            <h1 className="font-display text-[26px] text-paper">Study Schedule</h1>
          </div>
          <p className="text-[13px] text-mist-500 mt-1">Plan your weekly study sessions and sync to your calendar.</p>
        </div>
        <button
          onClick={() => setShowPlanner(!showPlanner)}
          className={clsx("inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13.5px] font-medium transition-colors", showPlanner ? "bg-slate-700 text-paper" : "bg-ember-500 text-ink-900 hover:bg-ember-400")}
        >
          <Route size={15} /> {showPlanner ? "Close Planner" : "Plan Roadmap"}
        </button>
      </div>

      {/* ── Roadmap Planner ── */}
      {showPlanner && (
        <div className="panel p-5 mb-6 animate-rise">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-ember-400" />
            <h2 className="text-[14.5px] font-semibold text-paper">Roadmap Study Planner</h2>
          </div>
          <p className="text-[12px] text-mist-500 mb-4">Select a roadmap, choose topics, and generate a balanced weekly study plan.</p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Roadmap</label>
              <select
                value={selectedRoadmap ?? ""}
                onChange={(e) => setSelectedRoadmap(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-ember-500/50"
              >
                <option value="">Select a roadmap…</option>
                {roadmaps.map((r) => <option key={r.id} value={r.id}>{r.title} ({r.progressPercent}%)</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Daily study hours</label>
              <input type="number" min={1} max={12} value={dailyHours} onChange={(e) => setDailyHours(Number(e.target.value))} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-ember-500/50" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[13px] text-paper outline-none focus:border-ember-500/50" />
            </div>
          </div>

          {/* Study days */}
          <div className="mb-4">
            <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">Study days</label>
            <div className="flex gap-2">
              {dayNames.map((name, i) => (
                <button
                  key={i}
                  onClick={() => toggleStudyDay(i)}
                  className={clsx(
                    "w-10 h-10 rounded-lg text-[11px] font-medium border transition-colors",
                    studyDays.includes(i) ? "bg-ember-500/10 border-ember-500/40 text-ember-400" : "border-slate-700 text-mist-500 hover:text-mist-200",
                  )}
                >
                  {name[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Topics */}
          {selectedRoadmap && (
            <div className="mb-4">
              <label className="text-[12px] text-mist-500 mb-1.5 block font-medium">
                Topics ({selectedTopics.size} selected)
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-slate-700 p-2">
                {topics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => toggleTopic(t.id)}
                    className={clsx(
                      "w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[12px] transition-colors text-left",
                      selectedTopics.has(t.id) ? "bg-ember-500/10 text-ember-300" : "text-mist-400 hover:bg-slate-800",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {selectedTopics.has(t.id) ? <Check size={12} /> : <Plus size={12} />}
                      {t.title}
                    </span>
                    <span className="text-[10px] text-mist-600 font-mono">{t.estHours}h</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={handlePreview} disabled={planning || selectedTopics.size === 0} className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-5 py-2.5 text-[13px] hover:bg-ember-400 transition-colors disabled:opacity-50">
            {planning ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {planning ? "Generating…" : "Preview Plan"}
          </button>
        </div>
      )}

      {/* ── Preview Modal ── */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-ink-900 p-6 shadow-2xl">
            <h3 className="text-[15px] font-semibold text-paper mb-1">Study Plan Preview</h3>
            <p className="text-[13px] text-mist-400 mb-4">
              {preview.totalTopics} topics across {preview.totalDays} days
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1 mb-4">
              {preview.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-[12px] text-mist-200 py-1.5 border-b border-slate-700/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-ember-400 shrink-0">&#8226;</span>
                    <span className="truncate">{item.topicTitle}</span>
                  </div>
                  <span className="text-mist-500 font-mono shrink-0 ml-2">{item.scheduledDate} &middot; {formatMinutes(item.plannedMinutes)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleConfirm} disabled={planning} className="flex-1 rounded-lg bg-ember-500 text-ink-900 text-[13px] font-medium py-2 hover:bg-ember-400 disabled:opacity-50">
                {planning ? "Confirming..." : `Schedule ${preview.items.length} sessions`}
              </button>
              <button onClick={() => setPreview(null)} className="flex-1 rounded-lg border border-slate-600 text-mist-300 text-[13px] py-2 hover:bg-slate-700">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Week Schedule ── */}
      <WeekSchedule weekStart={weekStart} onWeekChange={setWeekStart} dailyHours={dailyHours} refreshKey={refreshKey} />
    </AppShell>
  );
}
