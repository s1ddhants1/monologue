"use client";

import React, { useState } from "react";
import {
  Check,
  AlertCircle,
  Globe,
  Monitor,
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Loader2,
} from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldContent,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useUIStore } from "@/stores/ui-store";
import { useSettingsStore } from "../stores";
import { hapticLight, hapticSuccess } from "@/lib/capacitor";
import type { AIProvider } from "@/types";

export function StreamingSettingsModal() {
  const isSettingsOpen = useUIStore((s) => s.isSettingsOpen);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  const [bridgeStatus, setBridgeStatus] = useState<"idle" | "checking" | "online" | "offline">(
    "idle",
  );
  const [aiStatus, setAiStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [aiMessage, setAiMessage] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const testBridgeConnection = async () => {
    void hapticLight();
    setBridgeStatus("checking");
    try {
      const res = await fetch(`${settings.bridgeUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        void hapticSuccess();
        setBridgeStatus("online");
      } else {
        setBridgeStatus("offline");
      }
    } catch {
      setBridgeStatus("offline");
    }
  };

  const testAiConnection = async () => {
    void hapticLight();
    if (!settings.aiApiKey.trim()) {
      setAiStatus("invalid");
      setAiMessage("Please enter an API key first");
      return;
    }

    setAiStatus("checking");
    setAiMessage("");
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "validate",
          byok: {
            provider: settings.aiProvider,
            apiKey: settings.aiApiKey.trim(),
            model: settings.aiModel,
            baseURL: settings.aiBaseUrl || undefined,
          },
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok) {
        void hapticSuccess();
        setAiStatus("valid");
        setAiMessage(data?.message || "AI model credentials valid!");
      } else {
        setAiStatus("invalid");
        setAiMessage(data?.error || "Validation failed");
      }
    } catch {
      setAiStatus("invalid");
      setAiMessage("Network error validating AI credentials");
    }
  };

  const handleProviderSelect = (provider: AIProvider) => {
    void hapticLight();
    const defaultModel =
      provider === "groq" ? "whisper-large-v3" : provider === "openai" ? "whisper-1" : "whisper-1";

    const defaultUrl =
      provider === "groq"
        ? "https://api.groq.com/openai/v1"
        : provider === "openai"
          ? "https://api.openai.com/v1"
          : "";

    updateSettings({
      aiProvider: provider,
      aiModel: defaultModel,
      aiBaseUrl: defaultUrl,
    });
    setAiStatus("idle");
    setAiMessage("");
  };

  return (
    <Dialog open={isSettingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="border-b border-border pb-3 text-left">
          <DialogTitle className="text-base font-semibold text-foreground">
            Playback &amp; Streaming Settings
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure audio player, BYOK AI transcription, and streaming preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2 pr-1">
          <FieldGroup>
            <div className="space-y-3">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Playback Engine
              </span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Card
                  onClick={() => {
                    void hapticLight();
                    updateSettings({ streamingMode: "browser" });
                  }}
                  className={`flex min-h-[110px] cursor-pointer flex-col justify-between gap-0 rounded-xl border p-4 transition-all ${
                    settings.streamingMode === "browser"
                      ? "bg-chrome-raised border-primary text-foreground"
                      : "border-chrome-divider bg-chrome-control text-muted-foreground hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Globe size={18} className="text-primary" />
                    <span>In-Browser WebTorrent</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Streams directly in your browser with zero companion dependencies.
                  </p>
                  {settings.streamingMode === "browser" && (
                    <span className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <Check size={14} /> Active Engine
                    </span>
                  )}
                </Card>

                <Card
                  onClick={() => {
                    void hapticLight();
                    updateSettings({ streamingMode: "bridge" });
                  }}
                  className={`flex min-h-[110px] cursor-pointer flex-col justify-between gap-0 rounded-xl border p-4 transition-all ${
                    settings.streamingMode === "bridge"
                      ? "bg-chrome-raised border-primary text-foreground"
                      : "border-chrome-divider bg-chrome-control text-muted-foreground hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Monitor size={18} className="text-primary" />
                    <span>Companion Node Bridge</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Connects to local companion process for maximum TCP/UDP speed.
                  </p>
                  {settings.streamingMode === "bridge" && (
                    <span className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <Check size={14} /> Active Engine
                    </span>
                  )}
                </Card>
              </div>
            </div>

            {settings.streamingMode === "bridge" && (
              <Field className="border-chrome-divider bg-chrome-subtle space-y-2 rounded-xl border p-4">
                <FieldLabel
                  htmlFor="bridge-url-input"
                  className="text-xs font-semibold text-foreground"
                >
                  Companion Bridge URL
                </FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="bridge-url-input"
                    type="text"
                    value={settings.bridgeUrl}
                    onChange={(e) => updateSettings({ bridgeUrl: e.target.value })}
                    placeholder="http://localhost:8888"
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={testBridgeConnection}
                    disabled={bridgeStatus === "checking"}
                  >
                    {bridgeStatus === "checking" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Ping"
                    )}
                  </Button>
                </div>
                {bridgeStatus === "online" && (
                  <Alert className="border-emerald-500/30 bg-emerald-950/20 py-2 text-emerald-400">
                    <Check size={14} />
                    <AlertDescription className="font-mono text-xs text-emerald-400">
                      Connected to companion bridge!
                    </AlertDescription>
                  </Alert>
                )}
                {bridgeStatus === "offline" && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle size={14} />
                    <AlertDescription className="font-mono text-xs">
                      Bridge offline. Run: node scripts/stream-bridge.mjs
                    </AlertDescription>
                  </Alert>
                )}
              </Field>
            )}
          </FieldGroup>

          <Separator />

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                <Sparkles size={14} className="text-primary" />
                <span>AI Audio Transcription (BYOK)</span>
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">ai-sdk.dev</span>
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <Field>
                <FieldLabel className="mb-2 block text-xs font-medium text-foreground">
                  AI Provider
                </FieldLabel>
                <ToggleGroup
                  value={[settings.aiProvider]}
                  onValueChange={(val) => {
                    if (val[0]) handleProviderSelect(val[0] as AIProvider);
                  }}
                  className="grid w-full grid-cols-3 gap-2"
                >
                  {(["openai", "groq", "custom"] as const).map((prov) => (
                    <ToggleGroupItem
                      key={prov}
                      value={prov}
                      role="button"
                      className="cursor-pointer rounded-xl text-xs capitalize"
                    >
                      {prov}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel className="flex items-center gap-1 text-xs font-medium text-foreground">
                  <Key size={13} className="text-primary" />
                  <span>API Key</span>
                </FieldLabel>
                <InputGroup className="font-mono text-xs">
                  <InputGroupInput
                    type={showApiKey ? "text" : "password"}
                    placeholder={settings.aiProvider === "groq" ? "gsk_..." : "sk-..."}
                    value={settings.aiApiKey}
                    onChange={(e) => {
                      updateSettings({ aiApiKey: e.target.value });
                      setAiStatus("idle");
                    }}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                      aria-label={showApiKey ? "Hide API key" : "Show API key"}
                    >
                      {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldDescription className="text-[11px] text-muted-foreground">
                  Your key never leaves your browser except to query your selected AI endpoint.
                </FieldDescription>
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel className="text-xs font-medium text-foreground">Model Name</FieldLabel>
                <Input
                  type="text"
                  placeholder="whisper-1"
                  value={settings.aiModel}
                  onChange={(e) => {
                    updateSettings({ aiModel: e.target.value });
                    setAiStatus("idle");
                  }}
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
                      size="xs"
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
              </Field>

              {(settings.aiProvider === "custom" || settings.aiProvider === "groq") && (
                <Field className="space-y-1.5">
                  <FieldLabel className="text-xs font-medium text-foreground">
                    Custom Base URL
                  </FieldLabel>
                  <Input
                    type="text"
                    placeholder="https://api.openai.com/v1"
                    value={settings.aiBaseUrl}
                    onChange={(e) => updateSettings({ aiBaseUrl: e.target.value })}
                    className="font-mono text-xs"
                  />
                </Field>
              )}

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={testAiConnection}
                  disabled={aiStatus === "checking"}
                  className="cursor-pointer"
                >
                  {aiStatus === "checking" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Validate Key"
                  )}
                </Button>

                {aiStatus === "valid" && (
                  <span className="flex items-center gap-1 font-mono text-xs text-emerald-400">
                    <Check size={14} /> {aiMessage || "Key valid!"}
                  </span>
                )}
                {aiStatus === "invalid" && (
                  <span className="flex max-w-[200px] items-center gap-1 truncate font-mono text-xs text-rose-400">
                    <AlertCircle size={14} /> {aiMessage || "Invalid key"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3 pt-1">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Playback Preferences
            </span>

            <Field
              orientation="horizontal"
              className="border-chrome-divider bg-chrome-control cursor-pointer justify-between rounded-xl border p-3.5"
            >
              <FieldContent>
                <FieldTitle className="text-sm font-semibold text-foreground">
                  Auto-Advance Multi-Part Chapters
                </FieldTitle>
                <FieldDescription className="text-xs text-muted-foreground">
                  Automatically transition to the next part when current track finishes
                </FieldDescription>
              </FieldContent>
              <Switch
                checked={settings.autoAdvanceTracks}
                onCheckedChange={(checked) => {
                  void hapticLight();
                  updateSettings({ autoAdvanceTracks: checked });
                }}
              />
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="default"
              onClick={() => {
                void hapticSuccess();
                setSettingsOpen(false);
              }}
            >
              Save &amp; Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
