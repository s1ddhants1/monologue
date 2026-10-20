import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Library · Monologue",
  description: "Browse and manage audiobooks saved to your personal listening library.",
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
