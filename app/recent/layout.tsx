import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recently Played · Monologue",
  description: "Pick up listening where you left off from your recently played audiobooks.",
};

export default function RecentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
