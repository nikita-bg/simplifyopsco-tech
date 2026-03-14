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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-heading mb-2">Agent Configuration</h1>
        <p className="text-sm text-muted">No store connected. Complete onboarding first.</p>
      </div>
    );
  }

  /* ---- Render ---- */

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-heading mb-1">Agent Configuration</h1>
        <p className="text-sm text-muted">Customize your AI voice assistant&apos;s behavior and appearance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column: Config sections */}
        <div className="lg:col-span-3 space-y-6">

          {/* Section A: Voice Selection */}
          <section className="glass-card p-6">
            <h2 className="font-semibold text-xs text-white/40 uppercase tracking-widest mb-4">
              Voice Selection
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {voices.map((voice) => {
                const isSelected = config.voice_id === voice.id;
                return (
                  <button
                    key={voice.id}
                    onClick={() => updateConfig({ voice_id: voice.id, voice_name: voice.name })}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#256af4] bg-[#256af4]/10"
                        : "border-white/10 bg-[#0f1115] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">{voice.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayVoice(voice);
                        }}
                        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                        aria-label={`Preview ${voice.name}`}
                      >
                        {playingVoice === voice.id ? (
                          <Pause className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                        voice.gender === "female"
                          ? "bg-pink-500/20 text-pink-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {voice.gender}
                      </span>
                      <span className="text-[10px] text-white/40">{voice.accent}</span>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">{voice.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section B: Greeting Message */}
          <section className="glass-card p-6">
            <h2 className="font-semibold text-xs text-white/40 uppercase tracking-widest mb-4">
              Greeting Message
            </h2>
            <textarea
              value={config.greeting}
              onChange={(e) => {
                if (e.target.value.length <= MAX_GREETING) {
                  updateConfig({ greeting: e.target.value });
                }
              }}
              placeholder="Hi! I can help you find the perfect product."
              rows={3}
              className="w-full bg-[#0f1115] border border-white/10 text-white rounded-xl p-4 text-sm focus:ring-1 focus:ring-[#256af4] focus:border-[#256af4] outline-none transition-colors resize-none"
            />
            <p className="text-xs text-white/30 mt-2 text-right">
              {config.greeting.length} / {MAX_GREETING}
            </p>
          </section>

          {/* Section C: Widget Appearance */}
          <section className="glass-card p-6">
            <h2 className="font-semibold text-xs text-white/40 uppercase tracking-widest mb-4">
              Widget Appearance
            </h2>

            {/* Color */}
            <div className="mb-6">
              <label className="text-xs text-white/60 mb-2 block">Widget Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.widget_color}
                  onChange={(e) => updateConfig({ widget_color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                />
                <div
                  className="w-10 h-10 rounded-lg border border-white/10"
                  style={{ backgroundColor: config.widget_color }}
                />
                <span className="text-sm text-white/50 font-mono">{config.widget_color}</span>
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="text-xs text-white/60 mb-2 block">Widget Position</label>
              <div className="grid grid-cols-2 gap-2 max-w-[240px]">
                {POSITIONS.map((pos) => {
                  const isSelected = config.widget_position === pos.value;
                  return (
                    <button
                      key={pos.value}
                      onClick={() => updateConfig({ widget_position: pos.value })}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#256af4] bg-[#256af4]/10 text-[#256af4]"
                          : "border-white/10 bg-[#0f1115] text-white/50 hover:border-white/20"
                      }`}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Section D: Enable/Disable Toggle */}
          <section className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {config.enabled ? "Agent Active" : "Agent Inactive"}
                </h2>
                <p className="text-xs text-white/40 mt-0.5">
                  When disabled, the widget will not appear on your website.
                </p>
              </div>
              <button
                onClick={() => handleToggleEnabled(!config.enabled)}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 cursor-pointer ${
                  config.enabled ? "bg-green-500" : "bg-white/20"
                }`}
                role="switch"
                aria-checked={config.enabled}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${
                    config.enabled ? "translate-x-5.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Section E: Language */}
          <section className="glass-card p-6">
            <h2 className="font-semibold text-xs text-white/40 uppercase tracking-widest mb-4">
              Language
            </h2>
            <select
              value={config.language}
              onChange={(e) => updateConfig({ language: e.target.value })}
              className="w-full bg-[#0f1115] border border-white/10 text-white rounded-xl p-3 text-sm focus:ring-1 focus:ring-[#256af4] focus:border-[#256af4] outline-none transition-colors cursor-pointer appearance-none"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </section>

          {/* Section F: Personality Preset */}
          <section className="glass-card p-6">
            <h2 className="font-semibold text-xs text-white/40 uppercase tracking-widest mb-4">
              Personality Preset
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((preset) => {
                const isSelected = config.personality_preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => updateConfig({ personality_preset: preset.id })}
                    className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#256af4] bg-[#256af4]/10"
                        : "border-white/10 bg-[#0f1115] hover:border-white/20"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white mb-1">{preset.name}</p>
                    <p className="text-xs text-white/50 leading-relaxed">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section G: Embed Code */}
          <section className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-xs text-white/40 uppercase tracking-widest">
                Embed Code
              </h2>
              <button
                onClick={handleCopyEmbed}
                disabled={!embedCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#256af4]/10 text-[#256af4] text-xs font-medium hover:bg-[#256af4]/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                {copiedEmbed ? (
                  <><Check className="w-3.5 h-3.5" /> Copied!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy Code</>
                )}
              </button>
            </div>
            <p className="text-xs text-white/40 mb-3">
              Paste this code before the <code className="text-[#256af4] font-mono">&lt;/body&gt;</code> tag on your website.
            </p>
            <pre className="bg-[#0f1115] rounded-xl p-4 text-xs text-white/70 font-mono overflow-x-auto border border-white/10">
              {embedCode || "Loading embed code..."}
            </pre>
          </section>

          {/* Save Button */}
          <div className="sticky bottom-4 z-10">
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                dirty
                  ? "bg-[#256af4] text-white hover:bg-[#1d5ad4] shadow-lg shadow-[#256af4]/25"
                  : "bg-white/5 text-white/30 cursor-not-allowed"
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

        {/* Right column: Live Preview */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6">
            <section className="glass-card p-6">
              <h2 className="font-semibold text-xs text-white/40 uppercase tracking-widest mb-4">
                Live Preview
              </h2>

              {/* Mock website with widget */}
              <div className="relative w-full aspect-[3/4] bg-[#0f1115] rounded-xl border border-white/10 overflow-hidden">
                {/* Fake webpage background */}
                <div className="p-4 space-y-3">
                  <div className="w-2/3 h-3 bg-white/5 rounded" />
                  <div className="w-full h-3 bg-white/5 rounded" />
                  <div className="w-5/6 h-3 bg-white/5 rounded" />
                  <div className="w-full h-20 bg-white/5 rounded-lg mt-4" />
                  <div className="w-full h-3 bg-white/5 rounded" />
                  <div className="w-4/5 h-3 bg-white/5 rounded" />
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="h-16 bg-white/5 rounded-lg" />
                    <div className="h-16 bg-white/5 rounded-lg" />
                  </div>
                </div>

                {/* Widget bubble */}
                <div
                  className="absolute flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300"
                  style={{
                    backgroundColor: config.widget_color,
                    ...(config.widget_position.includes("bottom") ? { bottom: "16px" } : { top: "16px" }),
                    ...(config.widget_position.includes("right") ? { right: "16px" } : { left: "16px" }),
                  }}
                >
                  <Mic className="w-6 h-6 text-white" />
                </div>

                {/* Greeting tooltip */}
                <div
                  className="absolute max-w-[180px] p-3 rounded-xl bg-[#181b21] border border-white/10 shadow-xl transition-all duration-300"
                  style={{
                    ...(config.widget_position.includes("bottom")
                      ? { bottom: "80px" }
                      : { top: "80px" }),
                    ...(config.widget_position.includes("right")
                      ? { right: "12px" }
                      : { left: "12px" }),
                  }}
                >
                  <p className="text-[11px] text-white/80 leading-relaxed">
                    {config.greeting || "Hi! I can help you find the perfect product."}
                  </p>
                </div>
              </div>

              {/* Preview metadata */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Voice</span>
                  <span className="text-white/70">{config.voice_name || "Default"}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Position</span>
                  <span className="text-white/70 capitalize">{config.widget_position.replace("-", " ")}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Language</span>
                  <span className="text-white/70">
                    {languages.find((l) => l.code === config.language)?.name || config.language}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Personality</span>
                  <span className="text-white/70 capitalize">
                    {config.personality_preset || "Default"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Status</span>
                  <span className={`flex items-center gap-1.5 ${config.enabled ? "text-green-400" : "text-white/40"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${config.enabled ? "bg-green-400" : "bg-white/30"}`} />
                    {config.enabled ? "Active" : "Inactive"}
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
