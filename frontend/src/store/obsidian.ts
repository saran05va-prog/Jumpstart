import { create } from "zustand";
import { api } from "../lib/api";
import type { UserSettingsResponse } from "../lib/types";

interface ObsidianState {
  settings: UserSettingsResponse | null;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  saveVaultName: (name: string) => Promise<void>;
}

export const useObsidianStore = create<ObsidianState>((set) => ({
  settings: null,
  loading: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const res = await api.get<UserSettingsResponse>("/settings/obsidian");
      set({ settings: res });
    } catch {
      // silent
    } finally {
      set({ loading: false });
    }
  },

  saveVaultName: async (name: string) => {
    await api.put("/settings/obsidian", { vaultName: name });
    set((s) => ({
      settings: s.settings
        ? { ...s.settings, obsidianVaultName: name }
        : { id: null, obsidianVaultName: name, dailyStudyHours: 2, obsidianVaultPath: null, syncEnabled: false, lastSyncAt: null, notesStoragePath: null },
    }));
  },
}));
