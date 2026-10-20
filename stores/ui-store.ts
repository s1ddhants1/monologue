import { create } from "zustand";

interface UIState {
  isTracklistOpen: boolean;
  isSettingsOpen: boolean;
  isSidebarOpen: boolean;
  isFullscreenOpen: boolean;
  setTracklistOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setFullscreenOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isTracklistOpen: false,
  isSettingsOpen: false,
  isSidebarOpen: false,
  isFullscreenOpen: false,
  setTracklistOpen: (open) => set({ isTracklistOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setSidebarOpen: (open) =>
    set((state) => ({
      isSidebarOpen: typeof open === "function" ? open(state.isSidebarOpen) : open,
    })),
  setFullscreenOpen: (open) => set({ isFullscreenOpen: open }),
}));
