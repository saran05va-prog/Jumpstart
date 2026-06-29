import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";

export type TimerPhase = "idle" | "focusing" | "break" | "longBreak";

export const FOCUS_DURATION = 25 * 60;
export const BREAK_DURATION = 5 * 60;
export const LONG_BREAK_DURATION = 15 * 60;
export const POMODOROS_BEFORE_LONG_BREAK = 4;

export const BREAK_SUGGESTIONS = [
  "Stand up and stretch your arms, neck and back.",
  "Look 20 feet away for 20 seconds — the 20-20-20 rule.",
  "Drink a glass of water and refill your bottle.",
  "Take 5 deep breaths: in through the nose, out through the mouth.",
  "Walk around the room for a minute or two.",
  "Close your eyes for 30 seconds and let them rest.",
];

export function durationForPhase(phase: TimerPhase): number {
  if (phase === "focusing") return FOCUS_DURATION;
  if (phase === "break") return BREAK_DURATION;
  if (phase === "longBreak") return LONG_BREAK_DURATION;
  return 0;
}

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function randomSuggestion(): string {
  return BREAK_SUGGESTIONS[Math.floor(Math.random() * BREAK_SUGGESTIONS.length)];
}

interface TimerState {
  phase: TimerPhase;
  secondsLeft: number;
  pomodoroCount: number;
  todayFocusMinutes: number;
  focusDate: string;
  breakPending: boolean;
  breakSuggestion: string;
  lastFocusCompletedAt: number | null;
  topicId: number | null;
  roadmapId: number | null;

  startFocus: (topicId?: number | null, roadmapId?: number | null) => void;
  startBreak: () => void;
  skipBreak: () => void;
  tick: () => void;
  reset: () => void;
  ensureDay: () => void;
  logFocusSession: () => Promise<void>;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      phase: "idle",
      secondsLeft: 0,
      pomodoroCount: 0,
      todayFocusMinutes: 0,
      focusDate: todayKey(),
      breakPending: false,
      breakSuggestion: randomSuggestion(),
      lastFocusCompletedAt: null,
      topicId: null,
      roadmapId: null,

      ensureDay: () => {
        const today = todayKey();
        if (get().focusDate !== today) {
          set({ focusDate: today, todayFocusMinutes: 0, pomodoroCount: 0 });
        }
      },

      startFocus: (topicId = null, roadmapId = null) => {
        get().ensureDay();
        set({
          phase: "focusing",
          secondsLeft: FOCUS_DURATION,
          topicId: topicId ?? null,
          roadmapId: roadmapId ?? null,
          breakPending: false,
        });
      },

      startBreak: () => {
        const { phase } = get();
        if (phase !== "break" && phase !== "longBreak") return;
        set({ breakPending: false });
      },

      skipBreak: () => {
        set({
          phase: "idle",
          secondsLeft: 0,
          breakPending: false,
          breakSuggestion: randomSuggestion(),
        });
      },

      tick: () => {
        const { phase, secondsLeft, breakPending } = get();
        if (breakPending || phase === "idle") return;

        get().ensureDay();

        if (secondsLeft <= 1) {
          if (phase === "focusing") {
            get().logFocusSession();
            const newCount = get().pomodoroCount + 1;
            const isLong = newCount % POMODOROS_BEFORE_LONG_BREAK === 0;
            set({
              pomodoroCount: newCount,
              todayFocusMinutes: get().todayFocusMinutes + FOCUS_DURATION / 60,
              phase: isLong ? "longBreak" : "break",
              secondsLeft: isLong ? LONG_BREAK_DURATION : BREAK_DURATION,
              breakPending: true,
              breakSuggestion: randomSuggestion(),
              lastFocusCompletedAt: Date.now(),
            });
          } else {
            const wasLong = phase === "longBreak";
            set({
              phase: "idle",
              secondsLeft: 0,
              breakPending: false,
              breakSuggestion: randomSuggestion(),
              pomodoroCount: wasLong ? 0 : get().pomodoroCount,
            });
          }
          return;
        }

        set({ secondsLeft: secondsLeft - 1 });
      },

      reset: () => {
        set({
          phase: "idle",
          secondsLeft: 0,
          breakPending: false,
          topicId: null,
          roadmapId: null,
          breakSuggestion: randomSuggestion(),
        });
      },

      logFocusSession: async () => {
        try {
          const { topicId, roadmapId } = get();
          await api.post("/sessions", {
            sessionDate: todayKey(),
            minutes: FOCUS_DURATION / 60,
            topicId: topicId ?? undefined,
            roadmapId: roadmapId ?? undefined,
            note: "Pomodoro focus session",
          });
        } catch (err) {
          console.error("Failed to log focus session", err);
        }
      },
    }),
    {
      name: "jumpstart_timer_store",
      partialize: (s) => ({
        pomodoroCount: s.pomodoroCount,
        todayFocusMinutes: s.todayFocusMinutes,
        focusDate: s.focusDate,
      }),
    },
  ),
);
