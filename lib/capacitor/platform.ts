import { Capacitor } from "@capacitor/core";

export const isServer = typeof window === "undefined";

export function isNativePlatform(): boolean {
  if (isServer) return false;
  return Capacitor.isNativePlatform();
}

export function getPlatform(): "android" | "ios" | "web" {
  if (isServer) return "web";
  return Capacitor.getPlatform() as "android" | "ios" | "web";
}

export function isIos(): boolean {
  if (isServer) return false;
  return getPlatform() === "ios" || /iPad|iPhone|iPod/.test(navigator.userAgent || "");
}

export function isAndroid(): boolean {
  if (isServer) return false;
  return getPlatform() === "android" || /Android/i.test(navigator.userAgent || "");
}
