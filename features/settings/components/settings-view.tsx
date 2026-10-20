"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Search,
  X,
  Check,
  RotateCcw,
  Download,
  ExternalLink,
  Key,
  Eye,
  EyeOff,
  Sparkles,
} from "@/components/icons";
import { useSettingsStore } from "../stores";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hapticLight, openExternalUrl } from "@/lib/capacitor";

export type SettingsTabId = "audio" | "transcription" | "about";

interface SettingItemDefinition {
  id: string;
  tab: SettingsTabId;
  label: string;
  description: string;
  component: React.ReactNode;
}

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("audio");
  const [searchQuery, setSearchQuery] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const resetSettings = useSettingsStore((s) => s.resetSettings);

  const handleResetSettings = useCallback(() => {
    void hapticLight();
    resetSettings();
    toast.info("Settings Reset", {
      description: "All preferences and configurations have been restored to defaults.",
    });
  }, [resetSettings]);

  const handleExportSettings = useCallback(() => {
    void hapticLight();
    try {
      const dataStr =
        "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "monologue-settings.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Settings Exported", {
        description: "Downloaded monologue-settings.json",
      });
    } catch {
      toast.error("Export Failed", {
        description: "Could not export settings file.",
      });
    }
  }, [settings]);

  const allItems: SettingItemDefinition[] = useMemo(
    () => [
      {
        id: "playback-speed",
        tab: "audio",
        label: "Default Playback Speed",
        description: "Initial narration speed for audio playback",
        component: (
          <select
            id="playback-speed-select"
            aria-label="Default Playback Speed"
            className="bg-chrome-control hover:bg-chrome-control-hover h-8 cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs text-foreground transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            value={settings.defaultPlaybackRate}
            onChange={(e) => {
              void hapticLight();
              updateSettings({ defaultPlaybackRate: parseFloat(e.target.value) });
            }}
          >
            <option value="0.75">0.75x</option>
            <option value="1">1.0x (Normal)</option>
            <option value="1.2">1.2x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="1.75">1.75x</option>
            <option value="2">2.0x</option>
          </select>
        ),
      },
      {
        id: "skip-forward",
        tab: "audio",
        label: "Skip Forward Interval",
        description: "Amount of seconds to jump forward when pressing skip forward",
        component: (
          <select
            id="skip-forward-select"
            aria-label="Skip Forward Interval"
            className="bg-chrome-control hover:bg-chrome-control-hover h-8 cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs text-foreground transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            value={settings.skipForwardSeconds}
            onChange={(e) => {
              void hapticLight();
              updateSettings({ skipForwardSeconds: parseInt(e.target.value, 10) });
            }}
          >
            <option value="10">10 seconds</option>
            <option value="15">15 seconds</option>
            <option value="30">30 seconds</option>
            <option value="45">45 seconds</option>
            <option value="60">60 seconds</option>
          </select>
        ),
      },
      {
        id: "skip-backward",
        tab: "audio",
        label: "Skip Backward Interval",
        description: "Amount of seconds to jump backward when pressing skip backward",
        component: (
          <select
            id="skip-backward-select"
            aria-label="Skip Backward Interval"
            className="bg-chrome-control hover:bg-chrome-control-hover h-8 cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs text-foreground transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            value={settings.skipBackwardSeconds}
            onChange={(e) => {
              void hapticLight();
              updateSettings({ skipBackwardSeconds: parseInt(e.target.value, 10) });
            }}
          >
            <option value="5">5 seconds</option>
            <option value="10">10 seconds</option>
            <option value="15">15 seconds</option>
            <option value="30">30 seconds</option>
          </select>
        ),
      },
      {
        id: "sleep-timer",
        tab: "audio",
        label: "Default Sleep Timer",
        description: "Preset timer duration when activating sleep countdown",
        component: (
          <select
            id="sleep-timer-select"
            aria-label="Default Sleep Timer"
            className="bg-chrome-control hover:bg-chrome-control-hover h-8 cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs text-foreground transition-all outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            value={settings.defaultSleepTimer}
            onChange={(e) => {
              void hapticLight();
              updateSettings({ defaultSleepTimer: parseInt(e.target.value, 10) });
            }}
          >
            <option value="0">Off</option>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        ),
      },
      {
        id: "ai-transcription",
        tab: "transcription",
        label: "AI Audio Transcription (BYOK)",
        description: "Configure your API key and provider to enable word-synchronized transcripts",
        component: (
          <div className="bg-chrome-control/50 mt-3 flex w-full max-w-lg flex-col gap-3 rounded-xl border border-border p-4">
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-foreground">AI Provider</span>
              <div className="grid grid-cols-3 gap-2">
                {(["openai", "groq", "custom"] as const).map((prov) => (
                  <Button
                    key={prov}
                    type="button"
                    variant={settings.aiProvider === prov ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      void hapticLight();
                      updateSettings({
                        aiProvider: prov,
                        aiModel:
                          prov === "groq"
                            ? "whisper-large-v3"
                            : prov === "openai"
                              ? "whisper-1"
                              : settings.aiModel,
                      });
                    }}
                    className="cursor-pointer rounded-xl text-xs capitalize"
                  >
                    {prov}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-xs font-medium text-foreground">
                  <Key size={13} className="text-primary" />
                  API Key
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="h-auto cursor-pointer items-center gap-1 p-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                >
                  {showApiKey ? <EyeOff size={12} /> : <Eye size={12} />}
                  <span>{showApiKey ? "Hide" : "Show"}</span>
                </Button>
              </div>
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder={settings.aiProvider === "groq" ? "gsk_..." : "sk-..."}
                value={settings.aiApiKey}
                onChange={(e) => updateSettings({ aiApiKey: e.target.value })}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Your key never leaves your browser except to query your selected AI endpoint.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Model Name</label>
              <Input
                type="text"
                placeholder="whisper-1"
                value={settings.aiModel}
                onChange={(e) => updateSettings({ aiModel: e.target.value })}
                className="font-mono text-xs"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground">Presets:</span>
                {(settings.aiProvider === "groq"
                  ? ["whisper-large-v3", "whisper-large-v3-turbo"]
                  : ["whisper-1", "gpt-4o-transcribe"]
                ).map((m) => (
                  <Button
                    key={m}
                    type="button"
                    variant={settings.aiModel === m ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => {
                      void hapticLight();
                      updateSettings({ aiModel: m });
                    }}
                    className="h-6 cursor-pointer rounded-md px-2 font-mono text-[10px]"
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>

            {settings.aiProvider === "custom" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Base URL</label>
                <Input
                  type="text"
                  placeholder="https://api.openai.com/v1"
                  value={settings.aiBaseUrl}
                  onChange={(e) => updateSettings({ aiBaseUrl: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            )}

            {settings.aiApiKey.trim() ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Check size={14} />
                <span>AI transcription configured and active</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles size={14} className="text-primary" />
                <span>Enter an API key to enable transcript controls in the player</span>
              </div>
            )}
          </div>
        ),
      },
      {
        id: "about-monologue",
        tab: "about",
        label: "About Monologue",
        description:
          "Open-source, privacy-respecting, ad-free audiobook player inspired by Monochrome",
        component: (
          <Badge
            variant="outline"
            className="border-white/10 bg-white/10 font-mono text-xs font-medium text-foreground"
          >
            v1.0.0
          </Badge>
        ),
      },
      {
        id: "source-code",
        tab: "about",
        label: "Source Code",
        description: "View source code, report issues, or contribute on GitHub",
        component: (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void openExternalUrl("https://github.com/s1ddhants1/monologue")}
          >
            <ExternalLink size={16} />
            <span>Open GitHub</span>
          </Button>
        ),
      },
      {
        id: "export-settings",
        tab: "about",
        label: "Export All Settings",
        description: "Download your current app settings as a JSON configuration file",
        component: (
          <Button type="button" variant="secondary" size="sm" onClick={handleExportSettings}>
            <Download size={16} />
            <span>Export JSON</span>
          </Button>
        ),
      },
      {
        id: "reset-defaults",
        tab: "about",
        label: "Reset to Factory Defaults",
        description: "Restore all preferences and streaming configurations to default values",
        component: (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleResetSettings}
            className="transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400"
          >
            <RotateCcw size={16} />
            <span>Reset Settings</span>
          </Button>
        ),
      },
    ],
    [settings, handleExportSettings, handleResetSettings, showApiKey, updateSettings],
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return allItems.filter((item) => item.tab === activeTab);
    }
    return allItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q),
    );
  }, [allItems, activeTab, searchQuery]);

  return (
    <div className="animate-fade-in mx-auto w-full max-w-[860px] px-3 py-2 sm:px-6 sm:py-6">
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Settings
      </h1>

      <form
        className="my-3 mb-4.5 flex w-full max-w-[760px] items-center"
        onSubmit={(e) => e.preventDefault()}
        role="search"
      >
        <InputGroup className="bg-chrome-control focus-within:bg-chrome-control-hover hover:bg-chrome-control-hover h-10 w-full rounded-lg border-border transition-all focus-within:border-ring">
          <InputGroupAddon align="inline-start">
            <Search size={18} className="text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            id="settings-search-input"
            placeholder="Search settings..."
            className="text-xs text-foreground placeholder:text-muted-foreground sm:text-sm"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                title="Clear search"
                aria-label="Clear search"
                onClick={() => {
                  void hapticLight();
                  setSearchQuery("");
                }}
                className="cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </form>

      {!searchQuery && (
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            void hapticLight();
            setActiveTab(val as SettingsTabId);
          }}
          className="w-full"
        >
          <TabsList
            variant="line"
            className="mb-6 w-full justify-start overflow-x-auto"
            aria-label="Settings categories"
          >
            <TabsTrigger
              value="audio"
              onClick={() => {
                void hapticLight();
                setActiveTab("audio");
              }}
            >
              Audio
            </TabsTrigger>
            <TabsTrigger
              value="transcription"
              onClick={() => {
                void hapticLight();
                setActiveTab("transcription");
              }}
            >
              Transcription
            </TabsTrigger>
            <TabsTrigger
              value="about"
              onClick={() => {
                void hapticLight();
                setActiveTab("about");
              }}
            >
              About
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {searchQuery && (
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {filteredItems.length === 1
              ? `Found 1 matching setting for "${searchQuery}"`
              : `Found ${filteredItems.length} matching settings for "${searchQuery}"`}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="h-auto cursor-pointer p-0 text-xs text-primary hover:bg-transparent hover:underline"
          >
            Show all
          </Button>
        </div>
      )}

      <div className="w-full max-w-[760px]">
        {filteredItems.length === 0 ? (
          <Empty className="py-16 text-center">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search size={24} className="text-muted-foreground" />
              </EmptyMedia>
              <EmptyTitle>No settings match your search</EmptyTitle>
              <EmptyDescription>
                Try searching for speed, timer, transcription, or reset.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {filteredItems.map((item) => {
              const isFullWidthComponent = item.id === "ai-transcription";

              if (isFullWidthComponent) {
                return (
                  <div key={item.id} className="flex flex-col py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-foreground sm:text-sm">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground sm:text-xs">
                        {item.description}
                      </span>
                    </div>
                    {item.component}
                  </div>
                );
              }

              return (
                <div key={item.id} className="flex min-w-0 items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-xs font-medium text-foreground sm:text-sm">
                      {item.label}
                    </span>
                    <span className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
                      {item.description}
                    </span>
                  </div>
                  <div className="shrink-0">{item.component}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
