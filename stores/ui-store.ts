import { create } from "zustand";

interface UIState {
  isTracklistOpen: boolean;
  isFullscreenOpen: boolean;
  setTracklistOpen: (open: boolean) => void;
  setFullscreenOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isTracklistOpen: false,
  isFullscreenOpen: false,
  setTracklistOpen: (open) => set({ isTracklistOpen: open }),
  setFullscreenOpen: (open) => set({ isFullscreenOpen: open }),
}));
