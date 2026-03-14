"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, Copy, Check, Mic, Save, Loader2,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { apiFetch } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VoiceOption {
  id: string;
  name: string;
  preview_url: string;
  gender: string;
  accent: string;
  description: string;
}

interface PersonalityPreset {
  id: string;
  name: string;
  description: string;
}

interface LanguageOption {
  code: string;
  name: string;
}

interface AgentConfig {
  voice_id: string | null;
  voice_name: string | null;
  greeting: string;
  widget_color: string;
  widget_position: string;
  enabled: boolean;
  language: string;
  personality_preset: string | null;
  agent_status: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const POSITIONS = [
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
] as const;

const MAX_GREETING = 500;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AgentConfigPage() {
  const { storeId } = useStore();

  /* Data */
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [presets, setPresets] = useState<PersonalityPreset[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [embedCode, setEmbedCode] = useState("");

  /* UI state */
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const originalConfigRef = useRef<AgentConfig | null>(null);

  /* ---- Fetchers ---- */

  const fetchConfig = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await apiFetch(`/api/agent/config/${storeId}`);
      if (res.ok) {
        const data: AgentConfig = await res.json();
        setConfig(data);
        originalConfigRef.current = { ...data };
      }
    } catch {
      /* ignore */
    }
  }, [storeId]);

  const fetchVoices = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/voices`);
      if (res.ok) {
        const data = await res.json();
        setVoices(data.voices || []);
        setLanguages(data.languages || []);
        setPresets(
          (data.personality_presets || []).map(
            (p: PersonalityPreset & { system_prompt?: string }) => ({
              id: p.id,
              name: p.name,
              description: p.description,
            })
          )
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchEmbedCode = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await apiFetch(`/api/agent/embed-code/${storeId}`);
      if (res.ok) {
        const data = await res.json();
        setEmbedCode(data.embed_code || "");
      }
    } catch {
      /* ignore */
    }
  }, [storeId]);

  /* ---- Effects ---- */

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchConfig(), fetchVoices(), fetchEmbedCode()]);
      setLoading(false);
    };
    load();
  }, [fetchConfig, fetchVoices, fetchEmbedCode]);

  /* Cleanup audio on unmount */
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  /* ---- Helpers ---- */

  const updateConfig = (partial: Partial<AgentConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...partial } : prev));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!storeId || !config || !dirty) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      const orig = originalConfigRef.current;
      if (!orig) return;

      if (config.voice_id !== orig.voice_id) body.voice_id = config.voice_id;
      if (config.greeting !== orig.greeting) body.greeting = config.greeting;
      if (config.widget_color !== orig.widget_color) body.widget_color = config.widget_color;
      if (config.widget_position !== orig.widget_position) body.widget_position = config.widget_position;
      if (config.language !== orig.language) body.language = config.language;
      if (config.personality_preset !== orig.personality_preset) body.personality_preset = config.personality_preset;

      if (Object.keys(body).length > 0) {
        const res = await apiFetch(`/api/agent/config/${storeId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const updated: AgentConfig = await res.json();
          setConfig(updated);
          originalConfigRef.current = { ...updated };
        }
      }

      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!storeId) return;
    updateConfig({ enabled });
    try {
      const res = await apiFetch(`/api/agent/config/${storeId}`, {
        method: "PUT",
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        const updated: AgentConfig = await res.json();
        setConfig(updated);
        originalConfigRef.current = { ...updated };
        setDirty(false);
      }
    } catch {
      /* revert on error */
      setConfig((prev) => (prev ? { ...prev, enabled: !enabled } : prev));
    }
  };

  const handlePlayVoice = (voice: VoiceOption) => {
    /* Stop any currently playing */
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingVoice === voice.id) {
      setPlayingVoice(null);
      return;
    }

    const audio = new Audio(voice.preview_url);
    audioRef.current = audio;
    setPlayingVoice(voice.id);

    audio.play().catch(() => setPlayingVoice(null));
    audio.onended = () => {
      setPlayingVoice(null);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setPlayingVoice(null);
      audioRef.current = null;
    };
  };

  const handleCopyEmbed = async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  /* ---- Loading ---- */

  if (loading) {
    return (
      <div className="max-w-[1200px] pb-10 animate-pulse">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="h-7 w-48 bg-white/5 rounded-lg mb-2" />
            <div className="h-4 w-64 bg-white/5 rounded-md" />
          </div>
          <div className="h-10 w-32 bg-white/5 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-panel rounded-xl border border-edge p-5 h-16" />
            <div className="bg-panel rounded-xl border border-edge p-6 h-48" />
            <div className="bg-panel rounded-xl border border-edge p-6 h-32" />
          </div>
          <div className="lg:col-span-2">
            <div className="bg-panel rounded-xl border border-edge p-6 h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="max-w-[1200px]">
        <h1 className="text-2xl font-bold text-heading mb-2">Agent Configuration</h1>
        <p className="text-sm text-muted">No store connected. Complete onboarding first.</p>
      </div>
    );
  }

  /* ---- Render ---- */

  return (
    <div className="max-w-[1200px] pb-10">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading mb-1">Agent Configuration</h1>
          <p className="text-sm text-muted">Customize your AI voice assistant&apos;s behavior and appearance</p>
        </div>
        <div className="flex justify-end sticky top-0 md:static z-20">
             <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                dirty
                  ? "bg-primary text-white hover:bg-primary/90 shadow-sm"
                  : "bg-white/5 text-muted cursor-not-allowed border border-edge"
              }`}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : saved ? (
                <><Check className="w-4 h-4" /> Saved!</>
              ) : (
                <><Save className="w-4 h-4" /> Save Changes</>
              )}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Left column: Config sections */}
        <div className="lg:col-span-3 space-y-6">

          {/* Section D: Enable/Disable Toggle */}
          <section className="bg-panel rounded-xl border border-edge p-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-heading">
                  {config.enabled ? "Agent is Active" : "Agent is Disabled"}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  When disabled, the widget will not appear on your website.
                </p>
              </div>
              <button
                onClick={() => handleToggleEnabled(!config.enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer border ${
                  config.enabled ? "bg-success border-success text-white" : "bg-canvas border-edge"
                }`}
                role="switch"
                aria-checked={config.enabled}
              >
                <span
                  className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform duration-200 ${
                    config.enabled ? "translate-x-6" : "translate-x-[2px]"
                  }`}
                />
              </button>
          </section>

          {/* Section A: Voice Selection */}
          <section className="bg-panel rounded-xl border border-edge p-6">
            <h2 className="font-semibold text-xs text-muted uppercase tracking-wider mb-4">
              Voice Selection
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {voices.map((voice) => {
                const isSelected = config.voice_id === voice.id;
                return (
                  <button
                    key={voice.id}
                    onClick={() => updateConfig({ voice_id: voice.id, voice_name: voice.name })}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer outline-none focus:ring-2 focus:ring-primary/50 flex flex-col ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-edge bg-canvas hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 w-full">
                      <span className={`text-sm font-semibold truncate pr-2 ${isSelected ? "text-primary" : "text-heading"}`}>{voice.name}</span>
                       <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayVoice(voice);
                          }}
                          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                              playingVoice === voice.id ? "bg-primary text-white" : "bg-white/5 hover:bg-white/10 text-heading"
                          }`}
                          aria-label={`Preview ${voice.name}`}
                        >
                          {playingVoice === voice.id ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5" />
                          )}
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        voice.gender === "female"
                          ? "bg-pink-500/10 text-pink-400 border-pink-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {voice.gender}
                      </span>
                      <span className="text-[11px] font-medium text-muted">{voice.accent}</span>
                    </div>
                    <p className="text-[13px] text-muted leading-relaxed flex-1">{voice.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section B: Greeting Message */}
          <section className="bg-panel rounded-xl border border-edge p-6">
            <div className="flex items-center justify-between mb-4">
                 <h2 className="font-semibold text-xs text-muted uppercase tracking-wider">
                  Greeting Message
                </h2>
                <span className={`text-xs ${config.greeting.length > 400 ? "text-warning" : "text-muted"}`}>
                  {config.greeting.length} / {MAX_GREETING}
                </span>
            </div>
            <textarea
              value={config.greeting}
              onChange={(e) => {
                if (e.target.value.length <= MAX_GREETING) {
                  updateConfig({ greeting: e.target.value });
                }
              }}
              placeholder="Hi! I can help you find the perfect product."
              rows={3}
              className="w-full bg-canvas border border-edge text-heading rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors resize-none placeholder-faint"
            />
          </section>

          {/* Configuration Grid: Language, Preset, Appearance */}
          <div className="grid sm:grid-cols-2 gap-6">
             {/* Section E: Language */}
            <section className="bg-panel rounded-xl border border-edge p-6 flex flex-col">
              <h2 className="font-semibold text-xs text-muted uppercase tracking-wider mb-4">
                Language
              </h2>
              <div className="relative flex-1 flex flex-col justify-center">
                  <select
                    value={config.language}
                    onChange={(e) => updateConfig({ language: e.target.value })}
                    className="w-full bg-canvas border border-edge text-heading rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors cursor-pointer appearance-none"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
              </div>
            </section>

             {/* Section C: Widget Appearance */}
             <section className="bg-panel rounded-xl border border-edge p-6">
                 <h2 className="font-semibold text-xs text-muted uppercase tracking-wider mb-4">
                  Widget Appearance
                </h2>

                <div className="space-y-4">
                    {/* Color */}
                    <div>
                      <label className="text-xs font-medium text-muted mb-2 block">Brand Color</label>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                            <input
                            type="color"
                            value={config.widget_color}
                            onChange={(e) => updateConfig({ widget_color: e.target.value })}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                            />
                            <div
                            className="w-10 h-10 rounded-lg border border-edge shadow-sm flex items-center justify-center bg-canvas"
                            >
                                <div className="w-6 h-6 rounded border border-black/10 shadow-sm" style={{ backgroundColor: config.widget_color }} />
                            </div>
                        </div>
                        <span className="text-sm font-medium text-heading uppercase font-mono bg-canvas px-2.5 py-1.5 rounded-md border border-edge">{config.widget_color}</span>
                      </div>
                    </div>

                    {/* Position */}
                    <div>
                      <label className="text-xs font-medium text-muted mb-2 block">Position</label>
                      <select
                        value={config.widget_position}
                        onChange={(e) => updateConfig({ widget_position: e.target.value })}
                        className="w-full bg-canvas border border-edge text-heading rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors cursor-pointer appearance-none"
                        >
                            {POSITIONS.map((pos) => (
                                <option key={pos.value} value={pos.value}>{pos.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>
          </div>

          {/* Section F: Personality Preset */}
          <section className="bg-panel rounded-xl border border-edge p-6">
            <h2 className="font-semibold text-xs text-muted uppercase tracking-wider mb-4">
              Personality Preset
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((preset) => {
                const isSelected = config.personality_preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => updateConfig({ personality_preset: preset.id })}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer outline-none focus:ring-2 focus:ring-primary/50 ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-edge bg-canvas hover:border-white/20"
                    }`}
                  >
                    <p className={`text-sm font-semibold mb-1 ${isSelected ? "text-primary" : "text-heading"}`}>{preset.name}</p>
                    <p className="text-xs text-muted leading-relaxed">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section G: Embed Code */}
          <section className="bg-panel rounded-xl border border-edge p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-xs text-muted uppercase tracking-wider">
                Installation Code
              </h2>
              <button
                onClick={handleCopyEmbed}
                disabled={!embedCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {copiedEmbed ? (
                  <><Check className="w-3.5 h-3.5" /> Copied!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy Code</>
                )}
              </button>
            </div>
            <p className="text-sm text-muted mb-4">
              Paste this code right before the closing <code className="text-primary font-mono text-xs px-1.5 py-0.5 bg-primary/5 rounded border border-primary/20">&lt;/body&gt;</code> tag of your website.
            </p>
            <div className="bg-canvas rounded-lg pr-4 pl-0 py-4 text-xs font-mono overflow-auto border border-edge shadow-inner relative flex">
                <div className="w-10 shrink-0 text-right pr-4 text-faint select-none">1<br/>2</div>
               <pre className="text-muted leading-relaxed">
                 {embedCode || "Loading embed code..."}
              </pre>
            </div>
          </section>
        </div>

        {/* Right column: Live Preview */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-[90px]">
            <section className="bg-panel rounded-xl border border-edge p-6">
              <h2 className="font-semibold text-xs text-muted uppercase tracking-wider mb-4">
                Live Preview
              </h2>

              {/* Mock website with widget */}
              <div className="relative w-full aspect-[3/4] bg-canvas rounded-xl border border-edge overflow-hidden mb-5">
                {/* Fake webpage background */}
                <div className="p-4 space-y-3 opacity-30 pointer-events-none">
                  <div className="w-1/3 h-5 bg-muted rounded" />
                  <div className="w-full h-4 bg-muted/50 rounded mt-4" />
                  <div className="w-5/6 h-4 bg-muted/50 rounded" />
                  <div className="w-full h-24 bg-muted/30 rounded-lg mt-6" />
                  <div className="w-full h-4 bg-muted/50 rounded mt-6" />
                  <div className="w-4/5 h-4 bg-muted/50 rounded" />
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className="h-20 bg-muted/30 rounded-lg" />
                    <div className="h-20 bg-muted/30 rounded-lg" />
                  </div>
                </div>

                {/* Widget bubble */}
                <div
                  className="absolute flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-300"
                  style={{
                    backgroundColor: config.widget_color,
                    ...(config.widget_position.includes("bottom") ? { bottom: "16px" } : { top: "16px" }),
                    ...(config.widget_position.includes("right") ? { right: "16px" } : { left: "16px" }),
                  }}
                >
                  <Mic className="w-5 h-5 text-white" />
                  {/* Ripple effect */}
                  <div className="absolute inset-0 rounded-full bg-white/30 animate-ping opacity-20" />
                </div>

                {/* Greeting tooltip */}
                <div
                  className="absolute max-w-[180px] p-4 rounded-xl bg-panel border border-edge shadow-2xl transition-all duration-300 flex"
                  style={{
                    ...(config.widget_position.includes("bottom")
                      ? { bottom: "76px" }
                      : { top: "76px" }),
                    ...(config.widget_position.includes("right")
                      ? { right: "12px" }
                      : { left: "12px" }),
                  }}
                >
                  <p className="text-[12px] text-heading leading-relaxed font-medium">
                    {config.greeting || "Hi! I can help you find the perfect product."}
                  </p>
                </div>
              </div>

              {/* Preview metadata */}
              <div className="bg-canvas border border-edge rounded-lg p-4 space-y-2.5">
                  <h3 className="text-xs font-semibold text-heading uppercase tracking-wider pb-2 border-b border-edge mb-2">Configuration Summary</h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted font-medium">Voice</span>
                  <span className="text-heading font-semibold">{config.voice_name || "Default"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted font-medium">Position</span>
                  <span className="text-heading font-semibold capitalize bg-white/5 px-2 py-0.5 rounded border border-edge text-xs tracking-wide">{config.widget_position.replace("-", " ")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted font-medium">Language</span>
                  <span className="text-heading font-semibold">
                    {languages.find((l) => l.code === config.language)?.name || config.language}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted font-medium">Personality</span>
                  <span className="text-heading font-semibold capitalize">
                    {config.personality_preset || "Default"}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
