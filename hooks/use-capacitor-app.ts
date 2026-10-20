"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isNativePlatform } from "@/lib/capacitor/platform";
import { hapticLight } from "@/lib/capacitor/haptics";
import { useUIStore } from "@/stores/ui-store";

export function useCapacitorApp() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !isNativePlatform()) return;

    const cleanupFunctions: (() => void)[] = [];

    async function initCapacitorApp() {
      try {
        const { App } = await import("@capacitor/app");

        const backButtonListener = await App.addListener("backButton", ({ canGoBack }) => {
          const {
            isTracklistOpen,
            isSettingsOpen,
            isSidebarOpen,
            isFullscreenOpen,
            setTracklistOpen,
            setSettingsOpen,
            setSidebarOpen,
            setFullscreenOpen,
          } = useUIStore.getState();

          if (isFullscreenOpen) {
            hapticLight();
            setFullscreenOpen(false);
            return;
          }

          if (isTracklistOpen) {
            hapticLight();
            setTracklistOpen(false);
            return;
          }

          if (isSettingsOpen) {
            hapticLight();
            setSettingsOpen(false);
            return;
          }

          if (isSidebarOpen) {
            hapticLight();
            setSidebarOpen(false);
            return;
          }

          if (canGoBack && pathname !== "/") {
            router.back();
            return;
          }

          App.exitApp();
        });
        cleanupFunctions.push(() => backButtonListener.remove());

        const appStateListener = await App.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) {
            try {
              window.dispatchEvent(new Event("monologue:app-background"));
            } catch {}
          }
        });
        cleanupFunctions.push(() => appStateListener.remove());

        const urlOpenListener = await App.addListener("appUrlOpen", (event) => {
          try {
            const urlObj = new URL(event.url);
            const path = urlObj.pathname + urlObj.search;
            if (path) {
              router.push(path);
            }
          } catch {}
        });
        cleanupFunctions.push(() => urlOpenListener.remove());
      } catch (err) {
        console.warn("[Capacitor App] Lifecycle setup notice:", err);
      }
    }

    void initCapacitorApp();

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [router, pathname]);
}
