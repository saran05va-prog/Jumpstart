import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Flame, Clock, Target, Zap, Loader2, RotateCcw,
  Play, BookOpen, Plus, Route as RouteIcon, FolderGit2, Sparkles,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Heatmap from "../components/ui/Heatmap";
import WeeklyBar from "../components/charts/WeeklyBar";
import { Pill } from "../components/ui/Tag";
import { api, ApiError } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { useTimerStore } from "../store/timer";
import { toast } from "../store/toast";
import {
  type DashboardResponse,
  type TopicResponse,
  type RoadmapResponse,
  type ResourceResponse,
  type PageResponse,
  colorThemeToTone,
} from "../lib/types";
import { colorMap, relativeTime } from "../lib/utils";
import Button from "../components/ui/Button";

/* 30 daily-rotating quotes for the hero (index = day-of-year % 30) */
const MOTIVATIONAL_QUOTES = [
  "The only way to learn a new programming language is by writing programs in it. — Dennis Ritchie",
  "Code is like humor. When you have to explain it, it's bad. — Cory House",
  "First, solve the problem. Then, write the code. — John Johnson",
  "Experience is the name everyone gives to their mistakes. — Oscar Wilde",
  "Programming is the art of telling another human being what one wants the computer to do. — Donald Knuth",
  "Simplicity is the soul of efficiency. — Austin Freeman",
  "Every great developer you know got there by solving problems they were unqualified to solve. — Patrick McKenzie",
  "Mastery is not a destination, it's a journey. Keep going.",
  "Small steps every day lead to big results.",
  "Your potential is endless. Go do what you were created to do.",
  "Don't stop until you're proud.",
  "Focus on being productive instead of busy.",
  "The secret of getting ahead is getting started. — Mark Twain",
  "Believe you can and you're halfway there. — Theodore Roosevelt",
  "Your only limit is your mind.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Dream bigger. Do bigger.",
  "Don't decrease the goal. Increase the effort.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
  "Little things make big days.",
  "It's going to be hard, but hard does not mean impossible.",
  "Don't wait for opportunity. Create it.",
  "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
  "The key to success is to focus on goals, not obstacles.",
  "Dream it. Believe it. Build it.",
];

/* 10 engineering quotes for the footer (rotates daily) */
const ENGINEERING_QUOTES = [
  "The best way to predict the future is to invent it. — Alan Kay",
  "Any fool can write code that a computer can understand. Good programmers write code that humans can understand. — Martin Fowler",
  "Talk is cheap. Show me the code. — Linus Torvalds",
  "Programs must be written for people to read, and only incidentally for machines to execute. — Harold Abelson",
  "Make it work, make it right, make it fast. — Kent Beck",
  "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away. — Antoine de Saint-Exupéry",
  "Walking on water and developing software from a specification are easy if both are frozen. — Edward V. Berard",
  "The most important property of a program is whether it accomplishes the intention of its user. — C.A.R. Hoare",
  "A complex system that works is invariably found to have evolved from a simple system that worked. — John Gall",
  "There are only two hard things in computer science: cache invalidation and naming things. — Phil Karlton",
];

function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 1000 / 60 / 60 / 24);
}

const activityIcon = (type: string) => {
  if (type === "SESSION") return { Icon: Clock, tone: "ember" as const };
  if (type === "PROJECT") return { Icon: FolderGit2, tone: "gold" as const };
  return { Icon: Zap, tone: "moss" as const };
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [nextTopic, setNextTopic] = useState<TopicResponse | null>(null);
  const [resourceCount, setResourceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const startFocus = useTimerStore((s) => s.startFocus);
  const todayFocusMinutes = useTimerStore((s) => s.todayFocusMinutes);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [d, roadmaps, resourcesPage] = await Promise.all([
        api.get<DashboardResponse>("/dashboard"),
        api.get<{ items: RoadmapResponse[] }>("/roadmaps?size=10"),
        api.get<PageResponse<ResourceResponse>>("/resources?size=100"),
      ]);
      setData(d);

      // find next topic across the first roadmaps
      let found: TopicResponse | null = null;
      let matchedResources = 0;
      for (const rm of roadmaps.items) {
        try {
          const topics = await api.get<TopicResponse[]>(`/roadmaps/${rm.id}/topics`);
          const next =
            topics.find((t) => t.status === "IN_PROGRESS") ||
            topics.find((t) => t.status === "NOT_STARTED");
          if (next) {
            found = next;
            matchedResources = resourcesPage.items.filter(
              (r) => r.topicId === next.id,
            ).length;
            break;
          }
        } catch {
          // skip this roadmap
        }
      }
      setNextTopic(found);
      setResourceCount(matchedResources);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't connect — your progress is safe.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const displayName = authUser?.name ?? "User";
  const firstName = displayName.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const timeEmoji = hour < 12 ? "☀️" : hour < 18 ? "🌤️" : "🌙";

  const doy = dayOfYear();
  const quote = MOTIVATIONAL_QUOTES[doy % MOTIVATIONAL_QUOTES.length];
  const footerQuote = ENGINEERING_QUOTES[doy % ENGINEERING_QUOTES.length];

  if (loading) {
    return (
      <AppShell title="Dashboard">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-ember-400" />
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Dashboard">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-[14px] text-ember-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-[13px] text-mist-100 hover:bg-slate-800"
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      </AppShell>
    );
  }

  if (!data) return null;

  const streak = data.currentStreak;
  const currentRoadmap = data.roadmapProgress[0] ?? null;
  const topRoadmaps = data.roadmapProgress.slice(0, 4);

  function handleStartFocus() {
    startFocus(nextTopic?.id ?? null, nextTopic?.roadmapId ?? null);
    toast.show("Focus session started. You've got this! 🔥");
  }

  const pomodoros = nextTopic
    ? Math.max(1, Math.round(nextTopic.estHours * 2))
    : 0;

  return (
    <AppShell title="Dashboard">
      {/* ── 2.1 Hero Greeting Banner ── */}
      <div className="panel p-6 md:p-8 mb-8 overflow-hidden relative animate-rise">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Sparkles size={120} className="text-ember-500" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h1 className="font-display text-[26px] md:text-[32px] text-paper">
              {greeting}, {firstName}! {timeEmoji}
            </h1>
            {streak > 2 && (
              <div
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full bg-ember-500 text-ink-900 font-bold text-[13px]",
                  streak > 3 && "animate-pulseRing",
                )}
              >
                <Flame size={14} /> {streak}-day streak
              </div>
            )}
          </div>
          <p className="text-[15px] md:text-[16px] text-mist-400 max-w-2xl italic mb-5">
            “{quote}”
          </p>

          {/* current roadmap with % bar */}
          {currentRoadmap ? (
            <Link
              to={`/app/roadmaps/${currentRoadmap.id}`}
              className="block max-w-xl rounded-xl border border-slate-700 bg-slate-900/50 p-4 hover:border-slate-500 transition-colors group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <RouteIcon size={15} className="text-ember-400 shrink-0" />
                  <span className="text-[13px] text-mist-300 truncate group-hover:text-paper transition-colors">
                    {currentRoadmap.title}
                  </span>
                </div>
                <span className="text-[12px] font-mono text-mist-400 shrink-0">
                  {currentRoadmap.progressPercent}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all duration-1000",
                    colorMap[colorThemeToTone(currentRoadmap.colorTheme)].bg,
                  )}
                  style={{ width: `${currentRoadmap.progressPercent}%` }}
                />
              </div>
            </Link>
          ) : (
            <Link
              to="/app/roadmaps"
              className="block max-w-xl rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4 text-center hover:border-slate-500 transition-colors"
            >
              <span className="text-[13px] text-mist-500">
                Your roadmap awaits its first destination —{" "}
                <span className="text-ember-400 font-medium">create one</span>
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* ── 2.3 Stats Row (4 cards) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Flame size={22} />}
          iconClass={streak > 0 ? "text-ember-400" : "text-mist-700"}
          value={streak}
          label="Current Streak"
          suffix={streak === 1 ? "day" : "days"}
        />
        <StatCard
          icon={<Clock size={22} />}
          iconClass="text-moss-400"
          value={todayFocusMinutes}
          label="Focus Minutes Today"
          suffix="min"
          live
        />
        <StatCard
          icon={<Zap size={22} />}
          iconClass="text-gold-400"
          value={data.completedTopics}
          label="Topics Mastered"
          suffix={data.completedTopics === 1 ? "topic" : "topics"}
        />
        <StatCard
          icon={<Target size={22} />}
          iconClass="text-ember-400"
          value={data.goalsOnTrack}
          label="Goals On Track"
          suffix={`of ${data.totalGoals}`}
        />
      </div>

      {/* ── 2.2 Today's Mission + 2.5 Recent Activity ── */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        {/* Today's Mission Card */}
        <div className="lg:col-span-2 panel p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gold-500" />
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[14px] font-bold text-mist-700 uppercase tracking-widest">
                Today's Mission
              </h2>
              <Pill tone="gold">Priority</Pill>
            </div>
            {nextTopic ? (
              <>
                <h3 className="text-[22px] font-display text-paper mb-2">
                  {nextTopic.title}
                </h3>
                <p className="text-[14px] text-mist-500 mb-6 line-clamp-2">
                  {nextTopic.description ||
                    "Start this topic to move closer to mastery."}
                </p>
                <div className="flex items-center gap-6 text-[13px] text-mist-400 mb-8">
                  <span className="flex items-center gap-2">
                    <Clock size={14} /> {pomodoros} Pomodoros
                  </span>
                  <span className="flex items-center gap-2">
                    <BookOpen size={14} /> {resourceCount}{" "}
                    {resourceCount === 1 ? "Resource" : "Resources"}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-[14px] text-mist-500 mb-8 italic">
                No active topics right now. Pick a roadmap to set today's mission —
                every great developer started with a single topic.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              icon={<Play size={16} />}
              disabled={!nextTopic}
              onClick={handleStartFocus}
            >
              Start Focus Session
            </Button>
            <Button
              variant="ghost"
              disabled={!nextTopic}
              icon={<BookOpen size={16} />}
              onClick={() => navigate("/app/resources")}
            >
              View Resources
            </Button>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="panel p-6">
          <h2 className="text-[14px] font-bold text-mist-700 uppercase tracking-widest mb-6">
            Recent Activity
          </h2>
          {data.recentActivity.length === 0 ? (
            <p className="text-[13px] text-mist-500 italic">
              Your journey begins with the first step. Log a session to see it here.
            </p>
          ) : (
            <div className="space-y-5 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {data.recentActivity.slice(0, 10).map((a, i) => {
                const { Icon, tone } = activityIcon(a.type);
                const cm = colorMap[tone];
                return (
                  <div key={i} className="flex gap-4 relative z-10">
                    <div
                      className={clsx(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-4 border-slate-900",
                        cm.bg,
                      )}
                    >
                      <Icon size={10} className="text-ink-900" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13.5px] text-paper font-medium leading-tight">
                        {a.title}
                      </p>
                      <p className="text-[12px] text-mist-500 mt-1">{a.subtitle}</p>
                      <p className="text-[10px] font-mono text-mist-700 mt-1 uppercase">
                        {relativeTime(a.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 2.4 Active Roadmaps Strip ── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-mist-700 uppercase tracking-widest">
            Active Roadmaps
          </h2>
          <Link to="/app/roadmaps" className="text-[12px] text-ember-400 hover:underline">
            View All
          </Link>
        </div>
        {topRoadmaps.length === 0 ? (
          <Link
            to="/app/roadmaps"
            className="block panel border-dashed border-slate-700 p-8 text-center text-mist-500 hover:text-mist-200 hover:border-slate-500 transition-colors"
          >
            <Plus size={22} className="mx-auto mb-2" />
            <span className="text-[13px]">Your first roadmap awaits — start building your path</span>
          </Link>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
            {topRoadmaps.map((r) => {
              const tone = colorThemeToTone(r.colorTheme);
              const cm = colorMap[tone];
              const topicsLeft = Math.max(
                0,
                Math.round(r.topicCount * (1 - r.progressPercent / 100)),
              );
              return (
                <Link
                  key={r.id}
                  to={`/app/roadmaps/${r.id}`}
                  className="min-w-[280px] panel p-5 hover:border-slate-500 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-bold text-mist-600 uppercase">
                      {topicsLeft === 0 ? "Complete" : `${topicsLeft} left`}
                    </span>
                    <Pill tone={tone}>{r.progressPercent}%</Pill>
                  </div>
                  <h3 className="text-[16px] font-display text-paper mb-4 group-hover:text-ember-400 transition-colors">
                    {r.title}
                  </h3>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all duration-1000",
                        cm.bg,
                      )}
                      style={{ width: `${r.progressPercent}%` }}
                    />
                  </div>
                </Link>
              );
            })}
            <Link
              to="/app/roadmaps"
              className="min-w-[200px] panel border-dashed border-slate-700 p-5 flex flex-col items-center justify-center text-center text-mist-500 hover:text-mist-200 hover:border-slate-500 transition-colors"
            >
              <Plus size={20} className="mb-2" />
              <span className="text-[13px] font-medium">Add Roadmap</span>
            </Link>
          </div>
        )}
      </div>

      {/* Study Activity + Weekly Progress */}
      <div className="grid lg:grid-cols-2 gap-8 mb-4">
        <div className="panel p-6">
          <h2 className="text-[14px] font-bold text-mist-700 uppercase tracking-widest mb-6">
            Study Activity
          </h2>
          <Heatmap data={data.activityHeatmap} />
        </div>
        <div className="panel p-6">
          <h2 className="text-[14px] font-bold text-mist-700 uppercase tracking-widest mb-6">
            Weekly Progress
          </h2>
          <WeeklyBar data={data.weeklyHours} />
        </div>
      </div>

      {/* ── 2.6 Motivational Footer ── */}
      <div className="mt-10 py-12 border-t border-slate-800 text-center">
        <p className="text-[14px] text-mist-500 mb-2 italic max-w-2xl mx-auto">
          “{footerQuote}”
        </p>
        <p className="text-[12px] text-mist-700 font-mono uppercase tracking-widest mt-3">
          You're doing great, {firstName}. Mastery is just a few focus sessions away.
        </p>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon,
  iconClass,
  value,
  label,
  suffix,
  live,
}: {
  icon: React.ReactNode;
  iconClass: string;
  value: number;
  label: string;
  suffix: string;
  live?: boolean;
}) {
  return (
    <div className="panel p-5 flex flex-col items-center justify-center text-center">
      <div className={clsx("mb-2", iconClass)}>
        {icon}
        {live && (
          <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-moss-400 animate-flicker align-middle" />
        )}
      </div>
      <p className="num text-[24px] text-paper">{value}</p>
      <p className="text-[11px] text-mist-500 uppercase tracking-wider font-bold mt-0.5">
        {label}
      </p>
      <p className="text-[10px] text-mist-700 mt-0.5">{suffix}</p>
    </div>
  );
}
