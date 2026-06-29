import { useState, useRef, useEffect } from "react";
import { Check, Flame, Lock, Triangle, ArrowRight, FileText, MoreVertical, Edit3, Timer, Eye, Clock, Play, Pause, Square } from "lucide-react";
import clsx from "clsx";
import type { TopicResponse, TimerStatusResponse } from "../../lib/types";
import { api } from "../../lib/api";
import Button from "../ui/Button";
import { useFloatingTimerStore } from "../../store/floatingTimerStore";

const STATUS_LABEL: Record<string, string> = {
  DONE: "Completed",
  CURRENT: "In progress",
  UPCOMING: "Up next",
  LOCKED: "Locked",
};

function Marker({ status }: { status: string }) {
  if (status === "DONE") {
    return (
      <div className="relative w-9 h-9 rounded-full bg-moss-500 ring-4 ring-ink-800 flex items-center justify-center">
        <Check size={16} className="text-ink-900" strokeWidth={3} />
      </div>
    );
  }
  if (status === "CURRENT") {
    return (
      <div className="relative w-9 h-9">
        <span className="absolute inset-0 rounded-full border-2 border-ember-500/50 animate-pulseRing" />
        <div className="relative w-9 h-9 rounded-full bg-ember-500 ring-4 ring-ink-800 flex items-center justify-center">
          <Flame size={16} className="text-ink-900" strokeWidth={2.5} />
        </div>
      </div>
    );
  }
  if (status === "LOCKED") {
    return (
      <div className="w-9 h-9 rounded-full bg-ink-800 ring-4 ring-ink-800 border-2 border-dashed border-slate-600 flex items-center justify-center opacity-70">
        <Lock size={13} className="text-mist-700" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-slate-800 ring-4 ring-ink-800 border-2 border-mist-500 flex items-center justify-center">
      <span className="w-2 h-2 rounded-full bg-mist-300" />
    </div>
  );
}

function DifficultyMarks({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Difficulty ${level} of 3`}>
      {[1, 2, 3].map((n) => (
        <Triangle key={n} size={9} className={n <= level ? "text-ember-400 fill-ember-400" : "text-slate-600 fill-slate-600"} />
      ))}
    </span>
  );
}

function TopicTimer({ topicId, topicName }: { topicId: number; topicName: string }) {
  const ftStore = useFloatingTimerStore();
  const isActive = ftStore.topicId === topicId;
  const isOtherActive = ftStore.status !== "IDLE" && !isActive;
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isActive && ftStore.status === "RUNNING") {
      intervalRef.current = setInterval(() => {
        setElapsed(ftStore.displaySeconds);
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isActive, ftStore.status, ftStore.displaySeconds]);

  useEffect(() => {
    if (isActive) {
      setElapsed(ftStore.displaySeconds);
    } else {
      setElapsed(0);
    }
  }, [isActive, ftStore.displaySeconds]);

  const fmt = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;

  return (
    <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
      <Clock size={11} className="text-mist-500" />
      <span className="font-mono text-[10.5px] text-mist-500">{fmt(elapsed)}</span>
      {isActive && ftStore.status === "RUNNING" ? (
        <>
          <button onClick={() => ftStore.pauseTimer()} className="p-0.5 text-mist-600 hover:text-gold-400 transition-colors"><Pause size={10} /></button>
          <button onClick={() => ftStore.stopTimer()} className="p-0.5 text-mist-600 hover:text-ember-400 transition-colors"><Square size={10} /></button>
        </>
      ) : isActive && ftStore.status === "PAUSED" ? (
        <button onClick={() => ftStore.startTimer(topicId, topicName)} className="p-0.5 text-mist-600 hover:text-moss-400 transition-colors"><Play size={10} /></button>
      ) : (
        <button
          onClick={() => ftStore.startTimer(topicId, topicName)}
          disabled={isOtherActive}
          className={clsx("p-0.5 transition-colors", isOtherActive ? "text-mist-700 cursor-not-allowed" : "text-mist-600 hover:text-moss-400")}
          title={isOtherActive ? "Pause current timer first" : "Start timer"}
        >
          <Play size={10} />
        </button>
      )}
    </div>
  );
}

function KebabMenu({
  topic,
  onEdit,
  onViewResources,
}: {
  topic: TopicResponse;
  onEdit?: (t: TopicResponse) => void;
  onViewResources?: (t: TopicResponse) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen(!open)} className="p-1 rounded-lg text-mist-500 hover:text-mist-200 hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100" aria-label="Menu">
        <MoreVertical size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-slate-700 bg-ink-900 shadow-lg py-1 animate-rise">
          <button onClick={() => { onEdit?.(topic); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-mist-200 hover:bg-slate-700 transition-colors"><Edit3 size={13} /> Edit topic</button>
          <button onClick={() => { onViewResources?.(topic); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-mist-200 hover:bg-slate-700 transition-colors"><Eye size={13} /> View resources</button>
        </div>
      )}
    </div>
  );
}

function TopicCard({
  topic,
  cumulativeHours,
  align,
  onClick,
  resourceCount,
  onEdit,
  onViewResources,
}: {
  topic: TopicResponse;
  cumulativeHours: number;
  align: "left" | "right";
  onClick?: () => void;
  resourceCount?: number;
  onEdit?: (t: TopicResponse) => void;
  onViewResources?: (t: TopicResponse) => void;
}) {
  const locked = topic.status === "LOCKED";
  return (
    <div
      onClick={onClick}
      className={clsx(
        "panel px-4 py-3.5 transition-colors group",
        topic.status === "CURRENT" && "border-ember-500/40 shadow-glow",
        locked && "opacity-60",
        onClick && "cursor-pointer hover:border-slate-600",
        align === "left" ? "md:text-right" : "md:text-left"
      )}
    >
      <div className={clsx("flex items-center gap-2 mb-1.5", align === "left" && "md:flex-row-reverse")}>
        <span className={clsx("eyebrow", topic.status === "DONE" && "text-moss-400", topic.status === "CURRENT" && "text-ember-400")}>
          {STATUS_LABEL[topic.status] ?? topic.status}
        </span>
        <span className="font-mono text-[10.5px] text-mist-700">· mile {cumulativeHours}h</span>
        <div className="ml-auto">
          <KebabMenu topic={topic} onEdit={onEdit} onViewResources={onViewResources} />
        </div>
      </div>

      <h3 className="text-[14.5px] font-semibold text-paper leading-snug mb-2">{topic.title}</h3>

      <div className={clsx("flex items-center gap-3 text-[11.5px] text-mist-500 flex-wrap", align === "left" && "md:flex-row-reverse")}>
        <DifficultyMarks level={topic.difficulty} />
        <span className="font-mono">{topic.estHours}h est.</span>
        {resourceCount !== undefined && resourceCount > 0 && (
          <span className="font-mono flex items-center gap-1 text-mist-600"><FileText size={10} /> {resourceCount}</span>
        )}
      </div>

      {topic.milestoneLabel && <span className="inline-flex mt-2 items-center rounded-full bg-gold-500/10 border border-gold-500/30 px-2 py-0.5 text-[10px] text-gold-400">{topic.milestoneLabel}</span>}

      <TopicTimer topicId={topic.id} topicName={topic.title} />

      {topic.status === "CURRENT" && (
        <div className={clsx("mt-3", align === "left" && "md:flex md:justify-end")}>
          <Button variant="primary" size="sm" icon={<ArrowRight size={13} />} onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
            Continue topic
          </Button>
        </div>
      )}
    </div>
  );
}

export default function TrailMap({
  topics,
  onTopicClick,
  topicResourceCounts,
  onTopicEdit,
  onViewResources,
}: {
  topics: TopicResponse[];
  onTopicClick?: (topic: TopicResponse) => void;
  topicResourceCounts?: Record<number, number>;
  onTopicEdit?: (topic: TopicResponse) => void;
  onViewResources?: (topic: TopicResponse) => void;
}) {
  let cumulative = 0;
  const withCumulative = topics.map((t) => {
    cumulative += t.estHours;
    return { ...t, cumulativeHours: cumulative };
  });

  return (
    <div className="relative">
      <div className="absolute left-5 md:left-1/2 top-2 bottom-2 w-0 border-l-2 border-dashed border-slate-600 md:-translate-x-1/2" />

      <div className="space-y-7">
        {withCumulative.map((topic, i) => {
          const isLeft = i % 2 === 1;
          return (
            <div key={topic.id} className="relative pl-12 md:pl-0 md:grid md:grid-cols-2 md:gap-10">
              <div className="absolute left-5 md:left-1/2 top-0 md:-translate-x-1/2 z-10">
                <Marker status={topic.status} />
              </div>

              {isLeft ? (
                <TopicCard
                  topic={topic}
                  cumulativeHours={topic.cumulativeHours}
                  align="left"
                  onClick={onTopicClick ? () => onTopicClick(topic) : undefined}
                  resourceCount={topicResourceCounts?.[topic.id]}
                  onEdit={onTopicEdit}
                  onViewResources={onViewResources}
                />
              ) : (
                <div />
              )}
              {isLeft ? (
                <div />
              ) : (
                <TopicCard
                  topic={topic}
                  cumulativeHours={topic.cumulativeHours}
                  align="right"
                  onClick={onTopicClick ? () => onTopicClick(topic) : undefined}
                  resourceCount={topicResourceCounts?.[topic.id]}
                  onEdit={onTopicEdit}
                  onViewResources={onViewResources}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
