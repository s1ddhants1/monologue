import { isNativePlatform } from "./platform";

let capBrowser: typeof import("@capacitor/browser").Browser | null = null;

async function getCapBrowser() {
  if (typeof window === "undefined") return null;
  if (capBrowser) return capBrowser;

  try {
    const mod = await import("@capacitor/browser");
    capBrowser = mod.Browser;
    return capBrowser;
  } catch {
    return null;
  }
}

export async function openExternalUrl(url: string, target: string = "_blank"): Promise<void> {
  if (typeof window === "undefined" || !url) return;

  if (isNativePlatform()) {
    const browser = await getCapBrowser();
    if (browser) {
      try {
        await browser.open({
          url,
          presentationStyle: "popover",
        });
        return;
      } catch (err) {
        console.warn("[Capacitor Browser] Fallback to window.open:", err);
      }
    }
  }

  window.open(url, target, "noopener,noreferrer");
}

export async function closeExternalBrowser(): Promise<void> {
  if (!isNativePlatform()) return;
  const browser = await getCapBrowser();
  if (browser) {
    try {
      await browser.close();
    } catch {}
  }
}
