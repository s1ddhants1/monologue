import type {
  HapticsPlugin,
  ImpactStyle as ImpactStyleType,
  NotificationType as NotificationTypeType,
} from "@capacitor/haptics";

let _Haptics: HapticsPlugin | null = null;
let _ImpactStyle: typeof ImpactStyleType | null = null;
let _NotificationType: typeof NotificationTypeType | null = null;

const isBrowser = typeof window !== "undefined";

const readyPromise: Promise<void> = isBrowser
  ? import("@capacitor/haptics")
      .then((mod) => {
        _Haptics = mod.Haptics;
        _ImpactStyle = mod.ImpactStyle;
        _NotificationType = mod.NotificationType;
      })
      .catch(() => {})
  : Promise.resolve();

function vibrateFallback(ms: number) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(ms);
    } catch {}
  }
}

function isHapticsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw =
      localStorage.getItem("voxbay_player_settings") || localStorage.getItem("abb_player_settings");
    if (!raw) return true;
    const settings = JSON.parse(raw) as { hapticsEnabled?: unknown };
    return settings.hapticsEnabled !== false;
  } catch {
    return true;
  }
}

export async function hapticLight(): Promise<void> {
  if (!isHapticsEnabled()) return;
  await readyPromise;
  try {
    if (_Haptics && _ImpactStyle) {
      await _Haptics.impact({ style: _ImpactStyle.Light });
      return;
    }
  } catch {}
  vibrateFallback(25);
}

export async function hapticMedium(): Promise<void> {
  if (!isHapticsEnabled()) return;
  await readyPromise;
  try {
    if (_Haptics && _ImpactStyle) {
      await _Haptics.impact({ style: _ImpactStyle.Medium });
      return;
    }
  } catch {}
  vibrateFallback(45);
}

export async function hapticSuccess(): Promise<void> {
  if (!isHapticsEnabled()) return;
  await readyPromise;
  try {
    if (_Haptics && _NotificationType) {
      await _Haptics.notification({ type: _NotificationType.Success });
      return;
    }
  } catch {}
  vibrateFallback(35);
}

export async function hapticWarning(): Promise<void> {
  if (!isHapticsEnabled()) return;
  await readyPromise;
  try {
    if (_Haptics && _NotificationType) {
      await _Haptics.notification({ type: _NotificationType.Warning });
      return;
    }
  } catch {}
  vibrateFallback(60);
}

export async function hapticLongPress(): Promise<void> {
  if (!isHapticsEnabled()) return;
  await readyPromise;
  try {
    if (_Haptics && _ImpactStyle) {
      await _Haptics.impact({ style: _ImpactStyle.Heavy });
      return;
    }
  } catch {}
  vibrateFallback(50);
}

export async function hapticSelection(): Promise<void> {
  if (!isHapticsEnabled()) return;
  await readyPromise;
  try {
    if (_Haptics) {
      await _Haptics.selectionStart();
      await _Haptics.selectionChanged();
      await _Haptics.selectionEnd();
      return;
    }
  } catch {}
  vibrateFallback(15);
}
