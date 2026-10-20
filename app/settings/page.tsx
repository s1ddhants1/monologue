import type { Metadata } from "next";
import { SettingsView } from "@/features/settings";

export const metadata: Metadata = {
  title: "Settings · Monologue",
  description: "Configure appearance, playback, streaming engine, and application preferences.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
