import { useState, useEffect, useCallback } from "react";
import {
  Plus, Target, Check, Loader2, RotateCcw, Pencil, ListChecks, Circle, CheckCircle2, Trash2,
  Flame, Zap, Trophy, Star, TrendingUp, Clock, Sparkles, Medal, Timer, Play, Square,
} from "lucide-react";
import clsx from "clsx";
import AppShell from "../components/layout/AppShell";
import EmptyState from "../components/ui/EmptyState";
import GoalModal from "../components/roadmaps/GoalModal";
import { api, ApiError } from "../lib/api";
import {
  type GoalResponse, type GoalChecklistItemResponse, type PageResponse, type GamificationDashboardResponse,
  type StudyScheduleItem, CADENCES,
} from "../lib/types";
import { pct } from "../lib/utils";

function GoalChecklist({ goalId }: { goalId: number }) {
  const [items, setItems] = useState<GoalChecklistItemResponse[]>([]);
  const [newText, setNewText] = useState("");

  useEffect(() => {
    api.get<GoalChecklistItemResponse[]>(`/goals/${goalId}/checklist`).then(setItems).catch(() => {});
  }, [goalId]);

  async function addItem() {
    if (!newText.trim()) return;
    const created = await api.post<GoalChecklistItemResponse>(`/goals/${goalId}/checklist`, { text: newText.trim() });
    setItems((prev) => [...prev, created]);
    setNewText("");
  }

  async function toggleItem(item: GoalChecklistItemResponse) {
    const updated = await api.patch<GoalChecklistItemResponse>(`/goals/${goalId}/checklist/${item.id}`, { done: !item.done });
    setItems((prev) => prev.map((i) => i.id === item.id ? updated : i));
  }

  async function deleteItem(id: number) {
    await api.del(`/goals/${goalId}/checklist/${id}`);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-700/60">
      <div className="flex items-center gap-1.5 mb-2">
        <ListChecks size={12} className="text-mist-500" />
        <span className="text-[11px] text-mist-500 font-medium">Subtasks</span>
      </div>
      <div className="space-y-1 mb-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <button onClick={() => toggleItem(item)} className="shrink-0 text-mist-500 hover:text-moss-400 transition-colors">
              {item.done ? <CheckCircle2 size={14} className="text-moss-400" /> : <Circle size={14} />}
            </button>
            <span className={clsx("text-[12px] flex-1", item.done ? "text-mist-600 line-through" : "text-mist-300")}>{item.text}</span>
            <button onClick={() => deleteItem(item.id)} className="text-mist-700 hover:text-ember-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={11} /></button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addItem(); }} placeholder="Add subtask…" className="flex-1 bg-transparent outline-none text-[11.5px] text-mist-400 placeholder:text-mist-600" />
        <button onClick={addItem} className="text-[10px] text-ember-400 hover:text-ember-200 font-medium">Add</button>
      </div>
    </div>
  );
}

function TimerButton({ topicId, className }: { topicId: number | null; className?: string }) {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!topicId || !running) return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [topicId, running]);

  useEffect(() => {
    if (!topicId) return;
    api.get<{ status: string; accumulatedSeconds: number }>(`/topics/${topicId}/timer/status`).then((s) => {
      if (s.status === "RUNNING") {
        setRunning(true);
        setSeconds(s.accumulatedSeconds);
      }
    }).catch(() => {});
  }, [topicId]);

  if (!topicId) return null;

  async function handleToggle() {
    setLoading(true);
    try {
      if (running) {
        await api.post(`/topics/${topicId}/timer/stop`);
        setRunning(false);
        setSeconds(0);
      } else {
        const res = await api.post<{ status: string; accumulatedSeconds: number }>(`/topics/${topicId}/timer/start`);
        setRunning(true);
        setSeconds(res.accumulatedSeconds);
      }
    } catch {} finally { setLoading(false); }
  }

  const display = running
    ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
    : null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={clsx(
        "flex items-center gap-1 rounded px-2 py-1 text-[10px] font-mono transition-colors",
        running ? "bg-ember-500/20 text-ember-400 animate-pulse" : "bg-slate-700 text-mist-400 hover:text-mist-200",
        className,
      )}
    >
      {loading ? <Loader2 size={10} className="animate-spin" /> : running ? <Square size={10} /> : <Play size={10} />}
      {display || "Timer"}
    </button>
  );
}

export default function Goals() {
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<StudyScheduleItem[]>([]);
  const [gamification, setGamification] = useState<GamificationDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GoalResponse | null>(null);
  const [todayFocus, setTodayFocus] = useState({ tasksCompleted: 0, totalTasks: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [goalsRes, gamiRes, schedRes] = await Promise.all([
        api.get<PageResponse<GoalResponse>>("/goals?size=100"),
        api.get<GamificationDashboardResponse>("/gamification/dashboard"),
        api.get<StudyScheduleItem[]>("/goals/today-schedule").catch(() => [] as StudyScheduleItem[]),
      ]);
      setGoals(goalsRes.items);
      setTodaySchedule(schedRes);

      const activeGoals = goalsRes.items.filter((g) => g.status === "active");
      const completed = activeGoals.filter((g) => g.complete).length;
      setTodayFocus({ tasksCompleted: completed, totalTasks: activeGoals.length });

      setGamification(gamiRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load data.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(g: GoalResponse) { setEditing(g); setModalOpen(true); }

  async function handleCompleteNow(id: number) {
    try {
      await api.patch<GoalResponse>(`/goals/${id}`, {
        label: "",
        cadence: "DAILY",
        targetValue: 1,
        progressValue: 1,
        status: "completed",
      });
      fetchData();
    } catch {}
  }

  async function handleCreateGoalFromSchedule(item: StudyScheduleItem) {
    try {
      await api.post(`/goals/from-schedule/${item.topicId}?title=${encodeURIComponent(item.topicTitle)}&minutes=${item.plannedMinutes}`);
      fetchData();
    } catch {}
  }

  const priorityColors: Record<string, string> = { high: "text-ember-400", medium: "text-gold-400", low: "text-mist-500" };

  if (loading) {
    return (
      <AppShell title="Goals">
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-ember-400" /></div>
      </AppShell>
    );
  }

  const streak = gamification?.streak;
  const xp = gamification?.xp;
  const goalsWithProgress = goals.filter((g) => g.status === "active" && !g.complete);
  const completedGoals = goals.filter((g) => g.complete);
  const timeOfDay = new Date().getHours();
  const greeting = timeOfDay < 12 ? "morning" : timeOfDay < 18 ? "afternoon" : "evening";

  return (
    <AppShell title="Goals">
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-ember-500/30 bg-ember-500/10 px-4 py-3 mb-5">
          <p className="text-[12.5px] text-ember-400">{error}</p>
          <button onClick={fetchData} className="text-ember-400 hover:text-ember-200"><RotateCcw size={14} /></button>
        </div>
      )}

      {/* ── Gamification Hero ── */}
      <div className="panel p-5 mb-5 relative overflow-hidden">
        {streak && streak.currentStreak >= 3 && (
          <div className="absolute top-0 right-0 text-6xl opacity-10 pointer-events-none select-none">🔥</div>
        )}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="font-display text-[26px] text-paper">
              Good {greeting}!
            </h1>
            <p className="text-[13px] text-mist-500 mt-1">Here's your learning dashboard.</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2.5 text-[13.5px] hover:bg-ember-400 transition-colors">
            <Plus size={15} /> New goal
          </button>
        </div>

        {/* Streak & XP Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-slate-800/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame size={20} className={streak?.currentStreak && streak.currentStreak >= 3 ? "text-ember-400 animate-pulse" : "text-mist-600"} />
              <span className="num text-[28px] text-paper">{streak?.currentStreak ?? 0}</span>
            </div>
            <p className="text-[10px] text-mist-600 uppercase tracking-wider">Day streak</p>
            {streak?.atRisk && (
              <p className="text-[9px] text-ember-400 mt-1 animate-pulse">⚠ Complete today!</p>
            )}
          </div>
          <div className="text-center p-3 rounded-lg bg-slate-800/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap size={20} className="text-gold-400" />
              <span className="num text-[28px] text-paper">{xp?.level ?? 1}</span>
            </div>
            <p className="text-[10px] text-mist-600 uppercase tracking-wider">Level</p>
            {xp && (
              <div className="h-1 rounded-full bg-slate-700 overflow-hidden mt-1 mx-4">
                <div className="h-full bg-gold-500 rounded-full" style={{ width: `${xp.progressPercent}%` }} />
              </div>
            )}
          </div>
          <div className="text-center p-3 rounded-lg bg-slate-800/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy size={20} className="text-gold-400" />
              <span className="num text-[28px] text-paper">{xp?.totalXp ?? 0}</span>
            </div>
            <p className="text-[10px] text-mist-600 uppercase tracking-wider">Total XP</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-slate-800/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target size={20} className="text-moss-400" />
              <span className="num text-[28px] text-paper">{completedGoals.length}</span>
            </div>
            <p className="text-[10px] text-mist-600 uppercase tracking-wider">Done</p>
          </div>
        </div>

        {/* Motivational message */}
        {streak && (
          <div className="mt-3 text-center">
            <p className={clsx("text-[12px] font-medium", streak.atRisk ? "text-ember-400" : "text-moss-400")}>
              {streak.statusMessage}
              {streak.currentStreak > 0 && !streak.atRisk && ` · Best: ${streak.longestStreak} days`}
            </p>
            {streak.currentStreak === 0 && (
              <p className="text-[12px] text-mist-500 mt-1">Start a goal to begin your streak!</p>
            )}
          </div>
        )}
      </div>

      {/* ── Today's Section: Schedule + Focus ── */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-4 mb-5">
        <div className="panel p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-ember-400" />
              <h2 className="text-[13px] font-semibold text-paper">Today's Schedule</h2>
            </div>
            <div className="text-[11px] text-mist-500 font-mono">
              {todayFocus.tasksCompleted}/{todayFocus.totalTasks} done
            </div>
          </div>
          {todaySchedule.length === 0 ? (
            <p className="text-[11.5px] text-mist-600 italic">No topics scheduled for today.</p>
          ) : (
            <div className="space-y-1.5">
              {todaySchedule.map((item) => {
                const goal = goals.find((g) => g.topicId === item.topicId && g.cadence === "DAILY");
                return (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
                    {goal?.complete ? (
                      <CheckCircle2 size={14} className="text-moss-400 shrink-0" />
                    ) : (
                      <Circle size={14} className="text-mist-600 shrink-0" />
                    )}
                    <span className={clsx("flex-1 text-[12px]", goal?.complete ? "text-mist-600 line-through" : "text-mist-200")}>
                      {item.topicTitle}
                    </span>
                    <span className="text-[9px] font-mono text-mist-600">{item.plannedMinutes}m</span>
                    <TimerButton topicId={item.topicId} />
                    {!goal && (
                      <button
                        onClick={() => handleCreateGoalFromSchedule(item)}
                        className="text-[9px] text-ember-400 hover:text-ember-200 shrink-0"
                        title="Create daily goal"
                      >
                        +Goal
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="panel p-4">
          <h2 className="text-[13px] font-semibold text-paper mb-3">Quick Stats</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-mist-500">Active goals</span>
              <span className="text-[13px] font-mono text-paper">{todayFocus.totalTasks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-mist-500">Completed</span>
              <span className="text-[13px] font-mono text-moss-400">{todayFocus.tasksCompleted}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-mist-500">Progress</span>
              <span className="text-[13px] font-mono text-gold-400">
                {todayFocus.totalTasks > 0 ? Math.round((todayFocus.tasksCompleted / todayFocus.totalTasks) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] text-mist-500">Today's sessions</span>
              <span className="text-[13px] font-mono text-ember-400">{todaySchedule.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Goals ── */}
      {goalsWithProgress.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-ember-400" />
            <h2 className="text-[13px] font-semibold text-paper">Active Goals</h2>
            <span className="text-[11px] text-mist-600 font-mono">({goalsWithProgress.length})</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {goalsWithProgress.map((g) => {
              const p = pct(g.progressValue, g.targetValue);
              return (
                <div key={g.id} className="panel p-4 group transition-all hover:border-slate-600">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                      <Target size={16} className="text-mist-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-[13.5px] font-medium text-paper truncate">{g.label}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          {g.priority && <span className={clsx("text-[10px] font-medium", priorityColors[g.priority] || "text-mist-500")}>{g.priority}</span>}
                          <button onClick={() => openEdit(g)} className="p-1 rounded text-mist-500 hover:text-mist-200 hover:bg-slate-700 opacity-0 group-hover:opacity-100"><Pencil size={12} /></button>
                        </div>
                      </div>
                      {g.description && <p className="text-[11.5px] text-mist-500 truncate mb-2">{g.description}</p>}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11.5px] text-mist-500">
                          {g.progressValue}/{g.targetValue} {g.unit || ""}
                        </span>
                        {g.dueDate && <span className="text-[10.5px] text-mist-600">Due {g.dueDate}</span>}
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden mb-2">
                        <div className="h-full rounded-full bg-gradient-to-r from-ember-500 via-gold-500 to-moss-500 transition-all duration-700" style={{ width: `${p}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <TimerButton topicId={g.topicId} />
                        <button onClick={() => handleCompleteNow(g.id)} className="text-[10px] text-moss-400 hover:text-moss-200 opacity-0 group-hover:opacity-100 transition-opacity">
                          Mark complete
                        </button>
                      </div>
                    </div>
                  </div>
                  <GoalChecklist goalId={g.id} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── All Goals by Cadence ── */}
      {goals.length === 0 ? (
        <EmptyState icon={<Target size={22} />} title="No goals yet" body="Set daily, weekly, or monthly targets to keep your learning on track." action={<button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2.5 text-[13.5px] hover:bg-ember-400 transition-colors"><Plus size={15} /> Create goal</button>} />
      ) : (
        <div className="space-y-8">
          {CADENCES.map((cad) => {
            const group = goals.filter((g) => g.cadence === cad.value);
            if (group.length === 0) return null;
            return (
              <div key={cad.value}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="eyebrow">{cad.label} goals</h2>
                  <span className="text-[11px] text-mist-600 font-mono">({group.length})</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {group.map((g) => {
                    const p = pct(g.progressValue, g.targetValue);
                    const done = g.complete;
                    return (
                      <div key={g.id} className={clsx("panel p-4 group transition-all", done ? "border-moss-500/40 bg-moss-500/5" : "")}>
                        <div className="flex items-start gap-4">
                          <div className={clsx("w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all", done ? "bg-moss-500 shadow-lg shadow-moss-500/20" : "bg-slate-700")}>
                            {done ? <Check size={18} className="text-ink-900" /> : <Target size={17} className="text-mist-300" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <p className={clsx("text-[13.5px] font-medium truncate", done ? "text-moss-300" : "text-paper")}>{g.label}</p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {g.priority && <span className={clsx("text-[10px] font-medium", priorityColors[g.priority] || "text-mist-500")}>{g.priority}</span>}
                                <button onClick={() => openEdit(g)} className="p-1 rounded-lg text-mist-500 hover:text-mist-200 hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"><Pencil size={13} /></button>
                              </div>
                            </div>
                            {g.description && <p className="text-[11.5px] text-mist-500 truncate mb-2">{g.description}</p>}
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-[11.5px] text-mist-500">
                                {done ? <span className="text-moss-400">Complete!</span> : `${g.progressValue}/${g.targetValue} ${g.unit || ""}`}
                              </span>
                              {g.dueDate && <span className="text-[10.5px] text-mist-600">Due {g.dueDate}</span>}
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                              <div
                                className={clsx("h-full rounded-full transition-all duration-700", done ? "bg-moss-500" : "bg-gradient-to-r from-ember-500 via-gold-500 to-moss-500")}
                                style={{ width: `${done ? 100 : p}%` }}
                              />
                            </div>
                            {g.topicId && !done && (
                              <div className="mt-2">
                                <TimerButton topicId={g.topicId} />
                              </div>
                            )}
                          </div>
                        </div>
                        {!done && <GoalChecklist goalId={g.id} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Achievements ── */}
      {gamification?.achievements && gamification.achievements.filter((a) => a.earned).length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Medal size={16} className="text-gold-400" />
            <h2 className="text-[14px] font-semibold text-paper">Achievements</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {gamification.achievements.filter((a) => a.earned).map((a) => (
              <div key={a.code} className="flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1.5">
                <span className="text-[14px]">{a.icon}</span>
                <div>
                  <p className="text-[11.5px] text-paper font-medium">{a.title}</p>
                  <p className="text-[9px] text-mist-600">{a.description}</p>
                </div>
                <span className="text-[10px] text-gold-500 font-mono">+{a.xpReward} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <GoalModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchData} goal={editing} />
    </AppShell>
  );
}
