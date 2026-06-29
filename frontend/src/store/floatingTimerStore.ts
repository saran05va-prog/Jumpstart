import { create } from "zustand";
import { api } from "../lib/api";
import type { TimerStatusDTO, TimerSessionResponse } from "../lib/types";

interface FloatingTimerState {
  topicId: number | null;
  topicName: string;
  status: "RUNNING" | "PAUSED" | "STOPPED" | "IDLE";
  accumulatedSeconds: number;
  serverStartTime: string | null;
  displaySeconds: number;

  startTimer: (topicId: number, topicName: string) => Promise<void>;
  pauseTimer: () => Promise<void>;
  stopTimer: () => Promise<void>;
  syncFromServer: () => Promise<void>;
  setFromServerStatus: (dto: TimerStatusDTO) => void;
  updateDisplay: () => void;
}

let displayInterval: ReturnType<typeof setInterval> | null = null;

function startDisplayTick(store: FloatingTimerState) {
  if (displayInterval) clearInterval(displayInterval);
  displayInterval = setInterval(() => {
    useFloatingTimerStore.getState().updateDisplay();
  }, 1000);
}

function stopDisplayTick() {
  if (displayInterval) {
    clearInterval(displayInterval);
    displayInterval = null;
  }
}

export const useFloatingTimerStore = create<FloatingTimerState>((set, get) => ({
  topicId: null,
  topicName: "",
  status: "IDLE",
  accumulatedSeconds: 0,
  serverStartTime: null,
  displaySeconds: 0,

  setFromServerStatus: (dto: TimerStatusDTO) => {
    set({
      topicId: dto.topicId,
      topicName: dto.topicTitle,
      status: dto.status as "RUNNING" | "PAUSED" | "STOPPED",
      accumulatedSeconds: dto.accumulatedSeconds,
      serverStartTime: dto.serverStartTime,
    });
    if (dto.status === "RUNNING" && dto.serverStartTime) {
      const elapsed = dto.accumulatedSeconds + Math.floor(
        (Date.now() - new Date(dto.serverStartTime).getTime()) / 1000
      );
      set({ displaySeconds: elapsed });
      startDisplayTick(get());
    } else {
      set({ displaySeconds: dto.accumulatedSeconds });
      stopDisplayTick();
    }
  },

  syncFromServer: async () => {
    try {
      const dto = await api.get<TimerStatusDTO>("/timer/active");
      if (dto.status === "RUNNING" || dto.status === "PAUSED") {
        get().setFromServerStatus(dto);
      } else if (get().status !== "IDLE") {
        set({ status: "IDLE", topicId: null, topicName: "", accumulatedSeconds: 0, displaySeconds: 0, serverStartTime: null });
        stopDisplayTick();
      }
    } catch {
      // No active timer - that's fine
    }
  },

  startTimer: async (topicId: number, topicName: string) => {
    try {
      const res = await api.post<TimerStatusDTO>(`/topics/${topicId}/timer/start`, {});
      set({
        topicId,
        topicName,
        status: "RUNNING",
        serverStartTime: res.serverStartTime,
        accumulatedSeconds: 0,
        displaySeconds: 0,
      });
      startDisplayTick(get());
    } catch (e) {
      console.error("Failed to start timer", e);
    }
  },

  pauseTimer: async () => {
    const { topicId } = get();
    if (!topicId) return;
    try {
      const res = await api.post<TimerStatusDTO>(`/topics/${topicId}/timer/pause`, {});
      set({
        status: "PAUSED",
        serverStartTime: null,
        accumulatedSeconds: res.accumulatedSeconds,
        displaySeconds: res.accumulatedSeconds,
      });
      stopDisplayTick();
    } catch (e) {
      console.error("Failed to pause timer", e);
    }
  },

  stopTimer: async () => {
    const { topicId } = get();
    if (!topicId) return;
    try {
      await api.post(`/topics/${topicId}/timer/stop`, {});
      set({ status: "IDLE", topicId: null, topicName: "", accumulatedSeconds: 0, displaySeconds: 0, serverStartTime: null });
      stopDisplayTick();
    } catch (e) {
      console.error("Failed to stop timer", e);
    }
  },

  updateDisplay: () => {
    const { status, serverStartTime, accumulatedSeconds } = get();
    if (status === "RUNNING" && serverStartTime) {
      const elapsed = accumulatedSeconds + Math.floor(
        (Date.now() - new Date(serverStartTime).getTime()) / 1000
      );
      set({ displaySeconds: elapsed });
    }
  },
}));
