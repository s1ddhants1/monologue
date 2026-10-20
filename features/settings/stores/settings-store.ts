import { create } from "zustand";
import { DEFAULT_SETTINGS, type PlayerSettings } from "@/types";

interface SettingsState {
  settings: PlayerSettings;
  updateSettings: (newSettings: Partial<PlayerSettings>) => void;
  resetSettings: () => void;
}

function applyDOMSettings(settings: PlayerSettings) {
  if (typeof document === "undefined") return;
  try {
    if (settings.disableBlur) {
      document.documentElement.classList.add("disable-blur-effects");
    } else {
      document.documentElement.classList.remove("disable-blur-effects");
    }
    if (settings.theme) {
      document.documentElement.setAttribute("data-theme", settings.theme);
    }
  } catch {}
}

function loadSettings(): PlayerSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const saved =
      localStorage.getItem("voxbay_player_settings") || localStorage.getItem("abb_player_settings");
    if (saved) {
      const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      applyDOMSettings(parsed);
      return parsed;
    }
  } catch {}
  applyDOMSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: loadSettings(),
  updateSettings: (newSettings) =>
    set((state) => {
      const merged = { ...state.settings, ...newSettings };
      try {
        localStorage.setItem("voxbay_player_settings", JSON.stringify(merged));
      } catch {}
      applyDOMSettings(merged);
      return { settings: merged };
    }),
  resetSettings: () =>
    set(() => {
      try {
        localStorage.setItem("voxbay_player_settings", JSON.stringify(DEFAULT_SETTINGS));
      } catch {}
      applyDOMSettings(DEFAULT_SETTINGS);
      return { settings: DEFAULT_SETTINGS };
    }),
}));
