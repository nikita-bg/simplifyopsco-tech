'use client';

/**
 * Business Settings Dashboard
 *
 * Multi-tenant configuration for:
 * - Widget branding & customization
 * - Voice & personality
 * - Working hours
 * - Knowledge base
 * - API keys
 */

import { useEffect, useState } from 'react';

type TabId = 'widget' | 'voice' | 'knowledge' | 'api' | 'billing';

interface BusinessSettings {
  id: string;
  name: string;
  voiceId: string;
  systemPrompt: string;
  branding: {
    color: string;
    logo: string | null;
    position: string;
  };
  workingHours: {
    enabled: boolean;
    timezone: string;
    schedule: Record<string, any>;
  };
  agentId: string | null;
  planTier: string;
  conversationCount: number;
  conversationLimit: number;
  apiKeyPrefix: string;
  isActive: boolean;
  status: string;
}

// ElevenLabs voice library (sample - full list from API)
const VOICE_OPTIONS = [
  { id: 'sarah', name: 'Sarah', description: 'Warm, friendly female voice' },
  { id: 'adam', name: 'Adam', description: 'Professional male voice' },
  { id: 'rachel', name: 'Rachel', description: 'Energetic female voice' },
  { id: 'domi', name: 'Domi', description: 'Confident female voice' },
  { id: 'antoni', name: 'Antoni', description: 'Smooth male voice' },
];

// System prompt templates
const PROMPT_TEMPLATES = {
  ecommerce: `You are a friendly AI sales assistant for this e-commerce store. Help customers find products, answer questions about shipping and returns, and guide them through the checkout process. Be enthusiastic and helpful!`,
  healthcare: `You are a professional medical receptionist AI. Help patients schedule appointments, answer common questions about services, and direct urgent inquiries to staff. Always maintain a calm, reassuring tone.`,
  saas: `You are a knowledgeable product support AI for this SaaS platform. Help users navigate features, troubleshoot issues, and learn how to get the most value from the product. Be patient and educational.`,
  custom: '',
};

export default function SettingsPageNew() {
  const [activeTab, setActiveTab] = useState<TabId>('widget');
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [brandColor, setBrandColor] = useState('#256AF4');
  const [widgetPosition, setWidgetPosition] = useState('bottom-right');
  const [voiceId, setVoiceId] = useState('sarah');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [promptTemplate, setPromptTemplate] = useState<keyof typeof PROMPT_TEMPLATES>('custom');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch('/api/business/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      setSettings(data);

      // Populate form fields
      setBrandColor(data.branding?.color || '#256AF4');
      setWidgetPosition(data.branding?.position || 'bottom-right');
      setVoiceId(data.voiceId || 'sarah');
      setSystemPrompt(data.systemPrompt || '');
    } catch (error) {
      console.error('[Settings] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);

    try {
      const response = await fetch('/api/business/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice_id: voiceId,
          system_prompt: systemPrompt,
          branding: {
            color: brandColor,
            logo: settings?.branding?.logo || null,
            position: widgetPosition,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await fetchSettings(); // Refresh
    } catch (error) {
      console.error('[Settings] Save error:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Failed to load settings. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Widget Settings</h1>
          <p className="text-sm text-slate-400 mt-1">
            Customize your voice AI widget for <strong>{settings.name}</strong>
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Plan</div>
          <div className="text-sm font-semibold text-white capitalize">{settings.planTier}</div>
          <div className="text-xs text-slate-400 mt-1">
            {settings.conversationCount} / {settings.conversationLimit} conversations
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="flex gap-6">
          <TabButton
            active={activeTab === 'widget'}
            onClick={() => setActiveTab('widget')}
            icon="palette"
            label="Widget Branding"
          />
          <TabButton
            active={activeTab === 'voice'}
            onClick={() => setActiveTab('voice')}
            icon="graphic_eq"
            label="Voice & Personality"
          />
          <TabButton
            active={activeTab === 'knowledge'}
            onClick={() => setActiveTab('knowledge')}
            icon="description"
            label="Knowledge Base"
          />
          <TabButton
            active={activeTab === 'api'}
            onClick={() => setActiveTab('api')}
            icon="key"
            label="API Keys"
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'widget' && (
          <WidgetBrandingTab
            color={brandColor}
            setColor={setBrandColor}
            position={widgetPosition}
            setPosition={setWidgetPosition}
          />
        )}

        {activeTab === 'voice' && (
          <VoicePersonalityTab
            voiceId={voiceId}
            setVoiceId={setVoiceId}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            promptTemplate={promptTemplate}
            setPromptTemplate={setPromptTemplate}
          />
        )}

        {activeTab === 'knowledge' && <KnowledgeBaseTab />}

        {activeTab === 'api' && <APIKeysTab apiKeyPrefix={settings.apiKeyPrefix} />}
      </div>

      {/* Save Button */}
      {(activeTab === 'widget' || activeTab === 'voice') && (
        <div className="flex items-center gap-3 pt-4 border-t border-white/10">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
              saved
                ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                : 'bg-primary text-white hover:bg-primary-dark disabled:opacity-50'
            }`}
          >
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
          {saved && <p className="text-xs text-green-400">Settings updated successfully</p>}
        </div>
      )}
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
        active
          ? 'border-primary text-white'
          : 'border-transparent text-slate-400 hover:text-slate-300'
      }`}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// Widget Branding Tab (CONFIG-05)
function WidgetBrandingTab({
  color,
  setColor,
  position,
  setPosition,
}: {
  color: string;
  setColor: (c: string) => void;
  position: string;
  setPosition: (p: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-5">
        <h3 className="text-sm font-semibold text-white">Widget Appearance</h3>

        {/* Color Picker */}
        <div>
          <label className="text-xs text-slate-400 block mb-2">Primary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-12 w-20 rounded-lg cursor-pointer bg-transparent border border-white/10"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#256AF4"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white"
            />
          </div>
          <p className="text-xs text-slate-600 mt-1">
            This color will be used for the widget button and accents
          </p>
        </div>

        {/* Position */}
        <div>
          <label className="text-xs text-slate-400 block mb-2">Widget Position</label>
          <div className="grid grid-cols-2 gap-3">
            {['bottom-right', 'bottom-left', 'top-right', 'top-left'].map((pos) => (
              <button
                key={pos}
                onClick={() => setPosition(pos)}
                className={`py-3 rounded-xl border text-sm font-medium transition-colors ${
                  position === pos
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                {pos.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Logo Upload (placeholder) */}
        <div>
          <label className="text-xs text-slate-400 block mb-2">Logo (64x64px)</label>
          <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center">
            <span className="material-symbols-outlined text-slate-600 text-3xl block mb-2">
              cloud_upload
            </span>
            <p className="text-xs text-slate-500">Click to upload or drag & drop</p>
            <p className="text-xs text-slate-600 mt-1">PNG, JPG up to 2MB</p>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="rounded-2xl border border-white/10 bg-surface-dark p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Preview</h3>
        <div className="relative bg-slate-800 rounded-xl h-64 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">
            Website Preview
          </div>
          <div
            className={`absolute w-16 h-16 rounded-full shadow-2xl flex items-center justify-center ${
              position.includes('bottom') ? 'bottom-4' : 'top-4'
            } ${position.includes('right') ? 'right-4' : 'left-4'}`}
            style={{ backgroundColor: color }}
          >
            <span className="material-symbols-outlined text-white text-2xl">graphic_eq</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Voice & Personality Tab (CONFIG-01 + CONFIG-02)
function VoicePersonalityTab({
  voiceId,
  setVoiceId,
  systemPrompt,
  setSystemPrompt,
  promptTemplate,
  setPromptTemplate,
}: {
  voiceId: string;
  setVoiceId: (v: string) => void;
  systemPrompt: string;
  setSystemPrompt: (p: string) => void;
  promptTemplate: keyof typeof PROMPT_TEMPLATES;
  setPromptTemplate: (t: keyof typeof PROMPT_TEMPLATES) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Voice Selection */}
      <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Voice Selection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {VOICE_OPTIONS.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setVoiceId(voice.id)}
              className={`p-4 rounded-xl border text-left transition-colors ${
                voiceId === voice.id
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{voice.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{voice.description}</p>
                </div>
                <button className="text-slate-400 hover:text-white">
                  <span className="material-symbols-outlined text-lg">play_circle</span>
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Personality Templates */}
      <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Agent Personality</h3>
        <div className="flex gap-2">
          {Object.keys(PROMPT_TEMPLATES).map((key) => (
            <button
              key={key}
              onClick={() => {
                setPromptTemplate(key as keyof typeof PROMPT_TEMPLATES);
                if (key !== 'custom') {
                  setSystemPrompt(PROMPT_TEMPLATES[key as keyof typeof PROMPT_TEMPLATES]);
                }
              }}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                promptTemplate === key
                  ? 'bg-primary text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-2">System Prompt (500 chars max)</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value.slice(0, 500))}
            maxLength={500}
            rows={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="You are a helpful AI assistant..."
          />
          <p className="text-xs text-slate-600 mt-1 text-right">
            {systemPrompt.length} / 500 characters
          </p>
        </div>
      </div>
    </div>
  );
}

// Knowledge Base Tab (CONFIG-04)
function KnowledgeBaseTab() {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4">
      <h3 className="text-sm font-semibold text-white">Knowledge Base</h3>
      <p className="text-xs text-slate-500">
        Upload documents to help your AI answer business-specific questions.
      </p>
      <div className="border-2 border-dashed border-white/10 rounded-xl p-12 text-center">
        <span className="material-symbols-outlined text-slate-600 text-4xl block mb-3">
          cloud_upload
        </span>
        <p className="text-sm text-slate-400 mb-1">Drag & drop files here</p>
        <p className="text-xs text-slate-600">PDF, DOCX, TXT up to 10MB each</p>
        <button className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
          Browse Files
        </button>
      </div>
      <div className="text-xs text-slate-600">
        <p>✓ Files are processed and embedded for vector search</p>
        <p>✓ Knowledge base updates in real-time</p>
      </div>
    </div>
  );
}

// API Keys Tab
function APIKeysTab({ apiKeyPrefix }: { apiKeyPrefix: string }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">API Keys</h3>
        <p className="text-xs text-slate-500">
          Use this API key to embed the widget on your website.
        </p>
        <div>
          <label className="text-xs text-slate-400 block mb-2">Live API Key</label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={apiKeyPrefix}
              readOnly
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-400 font-mono"
            />
            <button className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-400 hover:bg-white/10 transition-colors">
              Copy
            </button>
          </div>
          <p className="text-xs text-red-400 mt-2">
            ⚠️ Never share your API key publicly. It provides full access to your widget.
          </p>
        </div>
        <button className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors">
          Regenerate API Key
        </button>
      </div>

      {/* Embed Code */}
      <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Widget Embed Code</h3>
        <p className="text-xs text-slate-500">
          Copy this code and paste it before the closing <code className="text-primary">&lt;/body&gt;</code> tag
          of your website.
        </p>
        <div className="bg-black/50 border border-white/10 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto">
          <pre>{`<script>
  window.SimplifyOpsConfig = {
    apiKey: '${apiKeyPrefix.replace('...', 'YOUR_FULL_KEY')}',
    position: 'bottom-right'
  };
</script>
<script src="https://simplifyops.tech/widget.js" async></script>`}</pre>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
          Copy Embed Code
        </button>
      </div>
    </div>
  );
}
