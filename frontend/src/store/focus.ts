import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";

interface FocusState {
  isActive: boolean;
  topicId: number | null;
  roadmapId: number | null;
  startTime: number | null;
  duration: number; // in seconds
  timeLeft: number;
  mode: "FOCUS" | "BREAK";

  startFocus: (topicId: number | null, roadmapId: number | null) => void;
  stopFocus: () => void;
  toggleTimer: () => void;
  stopTimer: () => void;
  tick: () => Promise<void>;
  setDuration: (seconds: number) => void;
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      isActive: false,
      topicId: null,
      roadmapId: null,
      startTime: null,
      duration: 25 * 60,
      timeLeft: 25 * 60,
      mode: "FOCUS",

      startFocus: (topicId, roadmapId) => {
        set({
          isActive: true,
          topicId,
          roadmapId,
          startTime: Date.now(),
          timeLeft: get().duration,
          mode: "FOCUS",
        });
      },

      stopFocus: () => {
        set({
          isActive: false,
          topicId: null,
          roadmapId: null,
          startTime: null,
          timeLeft: get().duration,
        });
      },

      toggleTimer: () => {
        set((s) => ({ isActive: !s.isActive }));
      },

      stopTimer: () => {
        get().stopFocus();
      },

      tick: async () => {
        const { timeLeft, isActive, topicId, roadmapId, duration, mode } = get();
        if (!isActive) return;

        if (timeLeft <= 1) {
          // Timer finished
          set({ isActive: false, timeLeft: 0 });

          if (mode === "FOCUS") {
            // Log study session
            try {
              await api.post("/sessions", {
                sessionDate: new Date().toISOString().split("T")[0],
                minutes: duration / 60,
                topicId: topicId || undefined,
                roadmapId: roadmapId || undefined,
                note: "Completed focus session"
              });
            } catch (err) {
              console.error("Failed to log study session", err);
            }
          }
          return;
        }

        set({ timeLeft: timeLeft - 1 });
      },

      setDuration: (seconds) => {
        set({ duration: seconds, timeLeft: seconds });
      },
    }),
    {
      name: "jumpstart_focus_store",
    }
  )
);