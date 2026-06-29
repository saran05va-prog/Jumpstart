import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Flame,
  Timer,
  Coffee,
  Zap,
  Target,
  Bot,
  X,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import confetti from "canvas-confetti";
import clsx from "clsx";
import {
  useTimerStore,
  durationForPhase,
  type TimerPhase,
} from "../../store/timer";
import { toast } from "../../store/toast";
import { clamp } from "../../lib/utils";

const BTN = 56;
const ITEM = 44;
const RADIUS = 94;
const LONG_PRESS_MS = 500;
const DRAG_THRESHOLD = 8;
const POS_KEY = "assistive_touch_position";

interface Pos {
  x: number;
  y: number;
}

function clampPos(x: number, y: number): Pos {
  const maxX = window.innerWidth - BTN;
  const maxY = window.innerHeight - BTN;
  return {
    x: clamp(x, 4, Math.max(4, maxX - 4)),
    y: clamp(y, 4, Math.max(4, maxY - 4)),
  };
}

function defaultPos(): Pos {
  const isMobile = window.innerWidth < 768;
  return clampPos(
    window.innerWidth - BTN - (isMobile ? 16 : 24),
    window.innerHeight - BTN - (isMobile ? 88 : 24),
  );
}

function loadPos(): Pos {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Pos;
      if (typeof p.x === "number" && typeof p.y === "number") {
        return clampPos(p.x, p.y);
      }
    }
  } catch {
    // ignore
  }
  return defaultPos();
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const phaseLabel: Record<TimerPhase, string> = {
  idle: "Ready to focus",
  focusing: "Focus",
  break: "Break",
  longBreak: "Long break",
};

const phaseEmoji: Record<TimerPhase, string> = {
  idle: "✦",
  focusing: "🍅",
  break: "☕",
  longBreak: "🌙",
};

const toneWrap: Record<string, string> = {
  ember: "bg-ember-500 text-ink-900 hover:bg-ember-400 shadow-glow",
  moss: "bg-moss-500 text-ink-900 hover:bg-moss-400",
  gold: "bg-gold-500 text-ink-900 hover:bg-gold-400",
  mist: "bg-slate-700 text-mist-100 hover:bg-slate-600",
};

export default function AssistiveTouch() {
  const navigate = useNavigate();

  const phase = useTimerStore((s) => s.phase);
  const secondsLeft = useTimerStore((s) => s.secondsLeft);
  const breakPending = useTimerStore((s) => s.breakPending);
  const breakSuggestion = useTimerStore((s) => s.breakSuggestion);
  const pomodoroCount = useTimerStore((s) => s.pomodoroCount);
  const todayFocusMinutes = useTimerStore((s) => s.todayFocusMinutes);
  const lastFocusCompletedAt = useTimerStore((s) => s.lastFocusCompletedAt);

  const startFocus = useTimerStore((s) => s.startFocus);
  const startBreak = useTimerStore((s) => s.startBreak);
  const skipBreak = useTimerStore((s) => s.skipBreak);
  const reset = useTimerStore((s) => s.reset);
  const ensureDay = useTimerStore((s) => s.ensureDay);
  const tick = useTimerStore((s) => s.tick);

  const [position, setPosition] = useState<Pos>(() => loadPos());
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [activeMinutes, setActiveMinutes] = useState(0);
  const [showWarn, setShowWarn] = useState(false);

  const startRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const movedRef = useRef(false);
  const longPressFiredRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const warnedRef = useRef(false);

  /* ── Central 1s tick ── */
  useEffect(() => {
    ensureDay();
    const i = window.setInterval(() => tick(), 1000);
    return () => window.clearInterval(i);
  }, [tick, ensureDay]);

  /* ── Re-clamp position on resize ── */
  useEffect(() => {
    function onResize() {
      setPosition((p) => clampPos(p.x, p.y));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ── Activity tracking for the 90-min break warning ── */
  useEffect(() => {
    let throttle = 0;
    const onAct = () => {
      const now = Date.now();
      if (now - throttle > 5000) {
        throttle = now;
        lastActivityRef.current = now;
      }
    };
    window.addEventListener("mousemove", onAct);
    window.addEventListener("keydown", onAct);
    return () => {
      window.removeEventListener("mousemove", onAct);
      window.removeEventListener("keydown", onAct);
    };
  }, []);

  useEffect(() => {
    const i = window.setInterval(() => {
      const st = useTimerStore.getState();
      const recentlyActive = Date.now() - lastActivityRef.current < 60000;
      if (
        recentlyActive &&
        st.phase !== "break" &&
        st.phase !== "longBreak" &&
        !st.breakPending
      ) {
        setActiveMinutes((m) => m + 1);
      }
    }, 60000);
    return () => window.clearInterval(i);
  }, []);

  /* reset active minutes when a break is taken */
  useEffect(() => {
    if ((phase === "break" || phase === "longBreak") && !breakPending) {
      setActiveMinutes(0);
      warnedRef.current = false;
      setShowWarn(false);
    }
  }, [phase, breakPending]);

  useEffect(() => {
    const shouldWarn = activeMinutes >= 90 && phase !== "break" && phase !== "longBreak";
    setShowWarn(shouldWarn);
    if (shouldWarn && !warnedRef.current) {
      warnedRef.current = true;
      toast.show("You've been focused for 90 min. Your brain needs a break!", {
        tone: "default",
        duration: 6000,
      });
    }
  }, [activeMinutes, phase]);

  /* ── Completion celebration: confetti + notification + toast ── */
  useEffect(() => {
    if (!lastFocusCompletedAt) return;
    confetti({ particleCount: 130, spread: 80, origin: { y: 0.7 } });
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Pomodoro complete! 🍅", {
          body: "You just built something great. 25 focused minutes.",
        });
      } catch {
        // ignore
      }
    }
    toast.success("You just built something great. 25 focused minutes.");
  }, [lastFocusCompletedAt]);

  /* ── Fan-menu action handlers ── */
  const handleStartFocus = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    ensureDay();
    startFocus();
    setMenuOpen(false);
    setPanelOpen(true);
    toast.show("Focus session started. You've got this! 🔥");
  }, [ensureDay, startFocus]);

  const handleManualBreak = useCallback(() => {
    const st = useTimerStore.getState();
    if (st.breakPending) {
      startBreak();
      setMenuOpen(false);
      toast.show(`Enjoy your break. ${st.breakSuggestion}`);
    } else if (st.phase === "break" || st.phase === "longBreak") {
      toast.show("You're already on a break — enjoy it!");
    } else {
      toast.show("Start a focus session first, then earn your break. ☕");
    }
  }, [startBreak]);

  const fanItems = [
    { icon: Timer, label: "Pomodoro", tone: "ember", onClick: handleStartFocus },
    { icon: Coffee, label: "Break", tone: "moss", onClick: handleManualBreak },
    {
      icon: Zap,
      label: "Quick Note",
      tone: "gold",
      onClick: () => {
        setMenuOpen(false);
        navigate("/app/notes");
      },
    },
    {
      icon: Target,
      label: "Daily Goal",
      tone: "ember",
      onClick: () => {
        setMenuOpen(false);
        navigate("/app/goals");
      },
    },
    {
      icon: Bot,
      label: "AI Help",
      tone: "moss",
      onClick: () => {
        setMenuOpen(false);
        toast.show("AI help is on the way — stay tuned! 🤖");
      },
    },
  ];

  const allFan = [
    ...fanItems,
    { icon: X, label: "Close", tone: "mist", onClick: () => setMenuOpen(false) },
  ];

  /* fan arc direction: open away from the screen edge */
  const cx = position.x + BTN / 2;
  const openLeft = cx > window.innerWidth / 2;
  const n = allFan.length;
  const base = openLeft ? 170 : 10;
  const dir = openLeft ? -1 : 1;
  const span = 120;

  /* ── Pointer logic: tap / long-press / drag ── */
  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, px: position.x, py: position.y };
    movedRef.current = false;
    longPressFiredRef.current = false;
    longPressTimer.current = window.setTimeout(() => {
      if (!movedRef.current) {
        longPressFiredRef.current = true;
        setMenuOpen(true);
        setPanelOpen(false);
      }
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!startRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (!movedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      movedRef.current = true;
      clearLongPress();
      setDragging(true);
      setMenuOpen(false);
    }
    if (movedRef.current) {
      setPosition(clampPos(startRef.current.px + dx, startRef.current.py + dy));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    clearLongPress();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (movedRef.current) {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(position));
      } catch {
        // ignore
      }
      setDragging(false);
    } else if (!longPressFiredRef.current) {
      setPanelOpen((v) => !v);
      setMenuOpen(false);
    }
    startRef.current = null;
  };

  /* ── Derived display state ── */
  const isFocus = phase === "focusing";
  const isBreak = phase === "break" || phase === "longBreak";
  const warning = showWarn && !isBreak && !breakPending;

  const gradient = warning
    ? "from-gold-400 to-gold-600"
    : isBreak || breakPending
      ? "from-moss-400 to-moss-600"
      : "from-ember-400 to-ember-600";

  const total = durationForPhase(phase);
  const progress = total > 0 ? ((total - secondsLeft) / total) * 100 : 0;
  const ringColor = isFocus ? "#E8743B" : isBreak ? "#4C7A5E" : "transparent";
  const trackColor = "#1C262B";

  const ringR = (BTN - 8) / 2;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - (progress / 100) * ringC;

  const showCountdown = isFocus || (isBreak && !breakPending);
  const panelBelow = position.y < 230;
  const PANEL_W = 244;
  const panelLeftOffset = clamp(
    BTN / 2 - PANEL_W / 2,
    8 - position.x,
    window.innerWidth - PANEL_W - 8 - position.x,
  );

  return (
    <>
      {/* outside-click catcher */}
      {(menuOpen || panelOpen) && (
        <div
          className="fixed inset-0 z-[109]"
          onClick={() => {
            setMenuOpen(false);
            setPanelOpen(false);
          }}
        />
      )}

      {/* break-warning tooltip */}
      {warning && (
        <div
          className="fixed z-[111] pointer-events-none"
          style={{
            left: clamp(position.x - 168, 8, window.innerWidth - 196),
            top: position.y - 46,
          }}
        >
          <div className="rounded-lg border border-gold-500/50 bg-gold-600/20 backdrop-blur px-3 py-2 text-[11.5px] text-gold-400 shadow-panel whitespace-nowrap">
            90 min focused — your brain needs a break!
          </div>
        </div>
      )}

      {/* floating time chip */}
      {showCountdown && !menuOpen && (
        <div
          className="fixed z-[111] pointer-events-none"
          style={{ left: position.x, top: position.y + BTN + 8 }}
        >
          <div
            className={clsx(
              "mx-auto w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-mono tabular-nums shadow-panel",
              isFocus
                ? "border-ember-500/40 bg-ember-700/30 text-ember-400"
                : "border-moss-500/40 bg-moss-700/30 text-moss-400",
            )}
            style={{ marginLeft: BTN / 2 - 18 }}
          >
            {fmt(secondsLeft)}
          </div>
        </div>
      )}

      <div
        className="fixed z-[110]"
        style={{ left: position.x, top: position.y, width: BTN, height: BTN }}
      >
        {/* Fan menu items */}
        <AnimatePresence>
          {menuOpen &&
            allFan.map((item, i) => {
              const angle = base + dir * ((span * i) / (n - 1));
              const rad = (angle * Math.PI) / 180;
              const ox = RADIUS * Math.cos(rad);
              const oy = -RADIUS * Math.sin(rad);
              const left = BTN / 2 + ox - ITEM / 2;
              const top = BTN / 2 + oy - ITEM / 2;
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.3, left: BTN / 2 - ITEM / 2, top: BTN / 2 - ITEM / 2 }}
                  animate={{ opacity: 1, scale: 1, left, top }}
                  exit={{ opacity: 0, scale: 0.3, left: BTN / 2 - ITEM / 2, top: BTN / 2 - ITEM / 2 }}
                  transition={{ duration: 0.2, delay: i * 0.035, ease: "easeOut" }}
                  onClick={item.onClick}
                  title={item.label}
                  className={clsx(
                    "absolute flex items-center justify-center rounded-full transition-colors",
                    toneWrap[item.tone],
                  )}
                  style={{ width: ITEM, height: ITEM }}
                >
                  <Icon size={19} strokeWidth={2.2} />
                </motion.button>
              );
            })}
        </AnimatePresence>

        {/* Quick-timer panel */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ opacity: 0, y: panelBelow ? -8 : 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute w-[244px] panel p-4 z-[112]"
              style={{
                left: panelLeftOffset,
                [panelBelow ? "top" : "bottom"]: BTN + 14,
              } as React.CSSProperties}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-mist-700">
                  {phaseEmoji[phase]} {phaseLabel[phase]}
                </span>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="text-mist-500 hover:text-mist-100 transition-colors"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="text-center mb-3">
                <p className="num text-[34px] text-paper leading-none">
                  {breakPending ? "Break?" : fmt(secondsLeft)}
                </p>
                {breakPending && (
                  <p className="text-[12px] text-moss-400 mt-2 leading-snug px-1">
                    {breakSuggestion}
                  </p>
                )}
              </div>

              {/* progress bar */}
              <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden mb-4">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all duration-1000",
                    isFocus ? "bg-ember-500" : isBreak ? "bg-moss-500" : "bg-slate-600",
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* actions */}
              <div className="flex flex-col gap-2">
                {phase === "idle" && !breakPending && (
                  <button
                    onClick={handleStartFocus}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-medium px-3 py-2 text-[13px] hover:bg-ember-400 transition-colors"
                  >
                    <Play size={15} /> Start Focus · 25 min
                  </button>
                )}
                {isFocus && (
                  <button
                    onClick={() => {
                      reset();
                      toast.show("Session reset. Your progress is safe.");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 text-mist-100 px-3 py-2 text-[13px] hover:border-slate-500 hover:bg-slate-800 transition-colors"
                  >
                    <RotateCcw size={15} /> Reset Session
                  </button>
                )}
                {breakPending && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        startBreak();
                        toast.show(`Break on. ${breakSuggestion}`);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-moss-500 text-ink-900 font-medium px-3 py-2 text-[13px] hover:bg-moss-400 transition-colors"
                    >
                      <Coffee size={15} /> Start Break
                    </button>
                    <button
                      onClick={() => {
                        skipBreak();
                        toast.show("Break skipped — back to it!");
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-600 text-mist-300 px-3 py-2 text-[13px] hover:bg-slate-800 transition-colors"
                    >
                      <SkipForward size={15} />
                    </button>
                  </div>
                )}
                {isBreak && !breakPending && (
                  <button
                    onClick={() => {
                      skipBreak();
                      toast.show("Break ended. Ready for another round? 🔥");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 text-mist-100 px-3 py-2 text-[13px] hover:border-slate-500 hover:bg-slate-800 transition-colors"
                  >
                    <SkipForward size={15} /> Skip Break
                  </button>
                )}
              </div>

              {/* footer stats */}
              <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-[11px] text-mist-500">
                <span className="font-mono uppercase tracking-wider">
                  🍅 {pomodoroCount} today
                </span>
                <span className="font-mono tabular-nums">
                  {todayFocusMinutes} min focused
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The button */}
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            clearLongPress();
            setDragging(false);
            startRef.current = null;
          }}
          className={clsx(
            "relative rounded-full bg-gradient-to-br shadow-glow touch-none select-none",
            "flex items-center justify-center transition-transform",
            gradient,
            isFocus && "animate-pulseRing",
            (breakPending || warning) && "animate-bounce",
            dragging && "cursor-grabbing scale-105",
            !dragging && "cursor-grab",
          )}
          style={{ width: BTN, height: BTN }}
          aria-label="Assistive touch — focus timer and quick actions"
        >
          {/* SVG progress ring */}
          <svg
            width={BTN}
            height={BTN}
            className="absolute inset-0 -rotate-90 pointer-events-none"
          >
            {(isFocus || isBreak) && (
              <>
                <circle
                  cx={BTN / 2}
                  cy={BTN / 2}
                  r={ringR}
                  fill="none"
                  stroke={trackColor}
                  strokeWidth={3}
                />
                <circle
                  cx={BTN / 2}
                  cy={BTN / 2}
                  r={ringR}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth={3}
                  strokeDasharray={ringC}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.9s linear" }}
                />
              </>
            )}
          </svg>

          {/* center icon / number */}
          <span className="relative z-10 flex items-center justify-center">
            {breakPending ? (
              <Coffee size={22} className="text-ink-900" strokeWidth={2.4} />
            ) : isFocus ? (
              <Timer size={22} className="text-ink-900" strokeWidth={2.4} />
            ) : isBreak ? (
              <Coffee size={22} className="text-ink-900" strokeWidth={2.4} />
            ) : warning ? (
              <Coffee size={22} className="text-ink-900" strokeWidth={2.4} />
            ) : (
              <Flame size={24} className="text-ink-900" strokeWidth={2.5} />
            )}
          </span>
        </button>
      </div>
    </>
  );
}
