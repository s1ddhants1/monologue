"use client";

import { useCapacitorApp } from "@/hooks/use-capacitor-app";

export function CapacitorLifecycleListener() {
  useCapacitorApp();
  return null;
}
