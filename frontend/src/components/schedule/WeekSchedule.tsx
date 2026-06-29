import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Download, Zap, Check } from "lucide-react";
import clsx from "clsx";
import { api, getAccessToken } from "../../lib/api";
import { useToastStore } from "../../store/toast";
import type { StudyScheduleItem, ScheduleStats, AutoSchedulePreview, TopicResponse, RoadmapResponse, PageResponse } from "../../lib/types";

interface WeekScheduleProps {
  weekStart: Date;
  onWeekChange: (date: Date) => void;
  dailyHours: number;
  refreshKey?: number;
}

function ScheduleItemRow({ item, onUpdate, onRemove }: {
  item: StudyScheduleItem;
  onUpdate: (item: StudyScheduleItem, mins: number) => void;
  onRemove: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(item.plannedMinutes));
  return (
    <div className="flex items-center gap-1 group rounded-lg bg-slate-700/50 px-2 py-1">
      <span className="flex-1 text-[11px] text-mist-200 truncate">{item.topicTitle}</span>
      {editing ? (
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            const n = parseInt(val, 10);
            if (n > 0) onUpdate(item, n);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const n = parseInt(val, 10);
              if (n > 0) onUpdate(item, n);
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-14 bg-slate-800 rounded px-1 text-[10px] font-mono text-mist-200 outline-none text-center"
          autoFocus
        />
      ) : (
        <button
          onClick={() => { setVal(String(item.plannedMinutes)); setEditing(true); }}
          className="text-[9px] font-mono text-mist-500 hover:text-mist-200"
        >
          {formatMinutes(item.plannedMinutes)}
        </button>
      )}
      <button onClick={() => onRemove(item.id)} className="text-mist-600 hover:text-ember-400 opacity-0 group-hover:opacity-100"><X size={10} /></button>
    </div>
  );
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function dayLabel(date: Date, i: number): string {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return `${days[i]} ${date.getDate()}`;
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
}

export default function WeekSchedule({ weekStart, onWeekChange, dailyHours, refreshKey = 0 }: WeekScheduleProps) {
  const toast = useToastStore((s) => s.push);
  const [items, setItems] = useState<StudyScheduleItem[]>([]);
  const [stats, setStats] = useState<ScheduleStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<TopicResponse[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapResponse[]>([]);
  const [showAutoPreview, setShowAutoPreview] = useState(false);
  const [autoPreview, setAutoPreview] = useState<AutoSchedulePreview | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const [topicSearch, setTopicSearch] = useState("");
  const [roadmapFilter, setRoadmapFilter] = useState<number | null>(null);
  const [addMinutes, setAddMinutes] = useState("60");

  const monday = getMonday(weekStart);
  const weekStartStr = formatDate(monday);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });

  const fetchWeek = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsData, statsData] = await Promise.all([
        api.get<StudyScheduleItem[]>(`/schedule?weekStart=${weekStartStr}`),
        api.get<ScheduleStats[]>(`/schedule/stats?weekStart=${weekStartStr}`),
      ]);
      setItems(itemsData);
      setStats(statsData);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [weekStartStr, refreshKey]);

  useEffect(() => { fetchWeek(); }, [fetchWeek]);

  useEffect(() => {
    api.get<PageResponse<RoadmapResponse>>("/roadmaps?size=100").then((res) => setRoadmaps(res.items)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get<RoadmapResponse[]>("/roadmaps").then(async (roadmapsData) => {
      const all: TopicResponse[] = [];
      for (const r of roadmapsData) {
        try {
          const t = await api.get<TopicResponse[]>(`/roadmaps/${r.id}/topics`);
          all.push(...t);
        } catch {}
      }
      setTopics(all);
    }).catch(() => {});
  }, []);

  function getItemsForDay(date: Date): StudyScheduleItem[] {
    const ds = formatDate(date);
    return items.filter((i) => i.scheduledDate === ds);
  }

  function getStatsForDay(date: Date): ScheduleStats | undefined {
    const ds = formatDate(date);
    return stats.find((s) => s.date === ds);
  }

  const scheduledTopicIds = new Set(items.map((i) => i.topicId));

  async function handleAddTopic(topicId: number, date: Date) {
    const mins = Math.max(1, parseInt(addMinutes, 10) || 60);
    try {
      const created = await api.post<StudyScheduleItem>("/schedule", {
        topicId,
        scheduledDate: formatDate(date),
        plannedMinutes: mins,
      });
      setItems((prev) => [...prev, created]);
      toast("Topic scheduled", { tone: "success" });
      setActiveDayIndex(null);
      setTopicSearch("");
      setAddMinutes("60");
    } catch {
      toast("Failed to schedule topic", { tone: "error" });
    }
  }

  async function handleUpdateMinutes(item: StudyScheduleItem, newMinutes: number) {
    if (newMinutes < 1) return;
    try {
      const updated = await api.put<StudyScheduleItem>(`/schedule/${item.id}`, {
        topicId: item.topicId,
        scheduledDate: item.scheduledDate,
        plannedMinutes: newMinutes,
      });
      setItems((prev) => prev.map((i) => i.id === item.id ? updated : i));
    } catch {
      toast("Failed to update", { tone: "error" });
    }
  }

  async function handleRemove(id: number) {
    try {
      await api.del(`/schedule/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast("Failed to remove", { tone: "error" });
    }
  }

  async function handleAutoSchedule() {
    setAutoLoading(true);
    try {
      const preview = await api.post<AutoSchedulePreview>("/schedule/auto");
      setAutoPreview(preview);
      setShowAutoPreview(true);
    } catch {
      toast("Auto-schedule failed", { tone: "error" });
    } finally {
      setAutoLoading(false);
    }
  }

  async function handleConfirmAuto() {
    try {
      const created = await api.post<StudyScheduleItem[]>("/schedule/auto/confirm");
      setItems((prev) => [...prev, ...created]);
      setShowAutoPreview(false);
      setAutoPreview(null);
      toast(`${created.length} topics scheduled`, { tone: "success" });
    } catch {
      toast("Failed to confirm schedule", { tone: "error" });
    }
  }

  async function handleExport() {
    try {
      const raw = (import.meta.env.VITE_API_URL || "https://jumpstart-production.up.railway.app").replace(/\/+$/, "");
      const exportUrl = `${raw}${raw.endsWith("/api") ? "" : "/api"}/schedule/export.ics?weekStart=${weekStartStr}`;
      const res = await fetch(exportUrl, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jumpstart-week-${weekStartStr}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast("Export failed", { tone: "error" });
    }
  }

  function handleAddMinutesChange(val: string) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) setAddMinutes(val);
    else if (val === "") setAddMinutes("");
  }

  const prevWeek = () => {
    const d = new Date(monday);
    d.setDate(d.getDate() - 7);
    onWeekChange(d);
  };
  const nextWeek = () => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 7);
    onWeekChange(d);
  };
  const today = () => onWeekChange(new Date());
  const isCurrentWeek = formatDate(getMonday(new Date())) === weekStartStr;

  const filteredByRoadmap = roadmapFilter
    ? topics.filter((t) => t.roadmapId === roadmapFilter)
    : topics;

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-1.5 rounded-lg text-mist-500 hover:text-mist-200 hover:bg-slate-700"><ChevronLeft size={16} /></button>
          <button onClick={nextWeek} className="p-1.5 rounded-lg text-mist-500 hover:text-mist-200 hover:bg-slate-700"><ChevronRight size={16} /></button>
          <span className="text-[13px] text-mist-200 font-medium ml-2">
            {days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          {!isCurrentWeek && (
            <button onClick={today} className="text-[11px] text-ember-400 hover:text-ember-200 ml-2">Today</button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-[11.5px] text-mist-300 hover:bg-slate-700">
            <Download size={12} /> Export
          </button>
          <button onClick={handleAutoSchedule} disabled={autoLoading} className="inline-flex items-center gap-1.5 rounded-lg bg-ember-500 text-ink-900 px-3 py-1.5 text-[11.5px] font-medium hover:bg-ember-400 disabled:opacity-50">
            {autoLoading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            Auto-schedule
          </button>
        </div>
      </div>

      {/* Auto-schedule preview modal */}
      {showAutoPreview && autoPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-ink-900 p-6 shadow-2xl">
            <h3 className="text-[15px] font-semibold text-paper mb-2">Auto-schedule preview</h3>
            <p className="text-[13px] text-mist-400 mb-4">
              This will schedule {autoPreview.totalTopics} topics across {autoPreview.totalDays} days.
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
              {autoPreview.items.slice(0, 20).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-[12px] text-mist-200 py-1">
                  <span>{item.topicTitle}</span>
                  <span className="text-mist-500 font-mono">{item.scheduledDate} · {formatMinutes(item.plannedMinutes)}</span>
                </div>
              ))}
              {autoPreview.items.length > 20 && (
                <p className="text-[11px] text-mist-600 text-center">+{autoPreview.items.length - 20} more</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleConfirmAuto} className="flex-1 rounded-lg bg-ember-500 text-ink-900 text-[13px] font-medium py-2 hover:bg-ember-400">Confirm</button>
              <button onClick={() => { setShowAutoPreview(false); setAutoPreview(null); }} className="flex-1 rounded-lg border border-slate-600 text-mist-300 text-[13px] py-2 hover:bg-slate-700">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Week grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-ember-400" /></div>
      ) : (
        <div className="grid grid-cols-7 gap-3">
          {days.map((day, i) => {
            const dayItems = getItemsForDay(day);
            const dayStats = getStatsForDay(day);
            const planned = dayStats?.plannedMinutes || 0;
            const isToday = formatDate(day) === formatDate(new Date());
            const overLimit = planned > dailyHours * 60;

            return (
              <div key={i} className={clsx(
                "panel p-3 min-h-[180px] flex flex-col",
                isToday && "border-ember-500/40"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className={clsx("text-[11px] font-medium", isToday ? "text-ember-400" : "text-mist-300")}>
                    {dayLabel(day, i)}
                  </span>
                  {planned > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] font-mono text-mist-500">Plan: {formatMinutes(planned)}</p>
                    </div>
                  )}
                </div>

                {planned > 0 && (
                  <div className="h-1 rounded-full bg-slate-700 overflow-hidden mb-3">
                    <div
                      className={clsx("h-full rounded-full", overLimit ? "bg-ember-500" : "bg-moss-500")}
                      style={{ width: `${Math.min(100, (planned / (dailyHours * 60)) * 100)}%` }}
                    />
                  </div>
                )}

                {overLimit && (
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-[9px] text-ember-400">⚠ Exceeds daily limit</span>
                  </div>
                )}

                <div className="flex-1 space-y-1">
                  {dayItems.map((item) => (
                    <ScheduleItemRow
                      key={item.id}
                      item={item}
                      onUpdate={handleUpdateMinutes}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>

                {/* Add topic button with inline popup */}
                <div className="relative mt-2">
                  <button
                    onClick={() => setActiveDayIndex(activeDayIndex === i ? null : i)}
                    className="w-full flex items-center justify-center gap-1 rounded-lg border border-dashed border-slate-600 py-1 text-[10px] text-mist-500 hover:text-mist-200 hover:border-slate-500"
                  >
                    <Plus size={10} /> Add
                  </button>

                  {activeDayIndex === i && (
                    <div className="absolute bottom-full left-0 right-0 z-20 mb-1 rounded-lg border border-slate-700 bg-ink-900 shadow-xl max-h-56 overflow-y-auto">
                      <div className="p-2 border-b border-slate-700 space-y-1.5">
                        <select
                          value={roadmapFilter ?? ""}
                          onChange={(e) => setRoadmapFilter(e.target.value ? Number(e.target.value) : null)}
                          className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] text-mist-200 outline-none"
                        >
                          <option value="">All roadmaps</option>
                          {roadmaps.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                        </select>
                        <input
                          value={topicSearch}
                          onChange={(e) => setTopicSearch(e.target.value)}
                          placeholder="Type topic name…"
                          className="w-full bg-transparent outline-none text-[11px] text-paper placeholder:text-mist-500"
                          autoFocus
                        />
                      </div>
                      <div className="p-1.5 border-b border-slate-700 flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={addMinutes}
                          onChange={(e) => handleAddMinutesChange(e.target.value)}
                          className="w-16 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-mono text-mist-200 outline-none text-center"
                        />
                        <span className="text-[9px] text-mist-600">minutes</span>
                      </div>
                      {filteredByRoadmap
                        .filter((t) => !scheduledTopicIds.has(t.id) && (!topicSearch || t.title.toLowerCase().includes(topicSearch.toLowerCase())))
                        .slice(0, 8)
                        .map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleAddTopic(t.id, day)}
                            className="w-full text-left px-3 py-1.5 text-[11px] text-mist-200 hover:bg-slate-700 flex items-center justify-between"
                          >
                            <span className="truncate">{t.title}</span>
                            <span className="text-[9px] text-mist-600 shrink-0 ml-1">{Math.round(t.estHours * 60)}m</span>
                          </button>
                        ))}
                      {filteredByRoadmap.filter((t) => !scheduledTopicIds.has(t.id)).length === 0 && (
                        <p className="text-[10px] text-mist-600 text-center py-2">All topics scheduled</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
