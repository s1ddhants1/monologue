import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AudioPlayerProvider, BottomAudioBar } from "@/features/player";
import { AppHeader, CapacitorLifecycleListener, AppOverlays } from "@/components/layouts";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monologue · Audiobook Player",
  description:
    "Stream and download unabridged audiobooks with chapter cues, multi-part playback, and offline downloads.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0b0b0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      data-theme="monochrome"
    >
      <body className="min-h-full bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
        <AudioPlayerProvider>
          <TooltipProvider>
            <CapacitorLifecycleListener />
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset className="min-w-0 [scrollbar-gutter:stable] overflow-x-hidden bg-background md:h-dvh md:scroll-pt-[76px] md:overflow-y-auto">
                <div className="relative mx-auto w-full max-w-7xl min-w-0 flex-1 px-3 pb-[calc(var(--player-bar-height-mobile,100px)+20px)] sm:px-5 md:px-7 md:pb-[calc(var(--player-bar-height-desktop,84px)+24px)] lg:px-8">
                  <AppHeader />
                  {children}
                </div>
              </SidebarInset>
              <BottomAudioBar />
              <AppOverlays />
            </SidebarProvider>
          </TooltipProvider>
        </AudioPlayerProvider>
      </body>
    </html>
  );
}
