import { create } from "zustand";

export type ToastTone = "default" | "success" | "error";

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, opts?: { tone?: ToastTone; duration?: number }) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, opts) => {
    const id = nextId++;
    const tone = opts?.tone ?? "default";
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    const duration = opts?.duration ?? 4200;
    window.setTimeout(() => get().dismiss(id), duration);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  show: (msg: string, opts?: { tone?: ToastTone; duration?: number }) =>
    useToastStore.getState().push(msg, opts),
  success: (msg: string) =>
    useToastStore.getState().push(msg, { tone: "success" }),
  error: (msg: string) =>
    useToastStore.getState().push(msg, { tone: "error" }),
};
