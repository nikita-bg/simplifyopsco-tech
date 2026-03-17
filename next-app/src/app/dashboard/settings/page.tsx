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

type TabId = 'widget' | 'voice' | 'hours' | 'knowledge' | 'api' | 'integrations';

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
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(false);
  const [timezone, setTimezone] = useState('UTC');
  const [schedule, setSchedule] = useState<Record<string, { open: string; close: string }>>({
    monday: { open: '09:00', close: '17:00' },
    tuesday: { open: '09:00', close: '17:00' },
    wednesday: { open: '09:00', close: '17:00' },
    thursday: { open: '09:00', close: '17:00' },
    friday: { open: '09:00', close: '17:00' },
    saturday: { open: '10:00', close: '14:00' },
    sunday: { open: '10:00', close: '14:00' },
  });

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
      setWorkingHoursEnabled(data.workingHours?.enabled || false);
      setTimezone(data.workingHours?.timezone || 'UTC');
      if (data.workingHours?.schedule) {
        setSchedule(data.workingHours.schedule);
      }
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
          working_hours: {
            enabled: workingHoursEnabled,
            timezone: timezone,
            schedule: schedule,
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
            active={activeTab === 'hours'}
            onClick={() => setActiveTab('hours')}
            icon="schedule"
            label="Working Hours"
          />
          <TabButton
            active={activeTab === 'knowledge'}
            onClick={() => setActiveTab('knowledge')}
            icon="description"
            label="Knowledge Base"
          />
          <TabButton
            active={activeTab === 'integrations'}
            onClick={() => setActiveTab('integrations')}
            icon="extension"
            label="Integrations"
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

        {activeTab === 'hours' && (
          <WorkingHoursTab
            enabled={workingHoursEnabled}
            setEnabled={setWorkingHoursEnabled}
            timezone={timezone}
            setTimezone={setTimezone}
            schedule={schedule}
            setSchedule={setSchedule}
          />
        )}

        {activeTab === 'knowledge' && <KnowledgeBaseTab />}

        {activeTab === 'integrations' && <IntegrationsTab />}

        {activeTab === 'api' && <APIKeysTab apiKeyPrefix={settings.apiKeyPrefix} />}
      </div>

      {/* Save Button */}
      {(activeTab === 'widget' || activeTab === 'voice' || activeTab === 'hours') && (
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

// Working Hours Tab (CONFIG-03)
function WorkingHoursTab({
  enabled,
  setEnabled,
  timezone,
  setTimezone,
  schedule,
  setSchedule,
}: {
  enabled: boolean;
  setEnabled: (e: boolean) => void;
  timezone: string;
  setTimezone: (tz: string) => void;
  schedule: Record<string, { open: string; close: string }>;
  setSchedule: (s: Record<string, { open: string; close: string }>) => void;
}) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney',
  ];

  function updateDaySchedule(day: string, field: 'open' | 'close', value: string) {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        [field]: value,
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Enable Toggle */}
      <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Working Hours</h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure when your AI assistant is available. Outside hours, visitors will see a
              "closed" message.
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled ? 'bg-primary' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Timezone */}
      {enabled && (
        <>
          <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Timezone</h3>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz} className="bg-slate-900">
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {/* Schedule */}
          <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Weekly Schedule</h3>
            <div className="space-y-3">
              {days.map((day) => (
                <div key={day} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-slate-400 capitalize">{day}</div>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={schedule[day]?.open || '09:00'}
                      onChange={(e) => updateDaySchedule(day, 'open', e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-slate-600">to</span>
                    <input
                      type="time"
                      value={schedule[day]?.close || '17:00'}
                      onChange={(e) => updateDaySchedule(day, 'close', e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-4">
              💡 Tip: Set the same hours for all weekdays using "Copy to all days" button
            </p>
          </div>

          {/* Closed Message Preview */}
          <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Outside Hours Message</h3>
            <div className="bg-slate-800 border border-white/10 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-slate-400 text-xl">
                  schedule
                </span>
                <div>
                  <p className="text-sm text-white">We're currently closed</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Our AI assistant is available {schedule.monday?.open || '09:00'} -{' '}
                    {schedule.monday?.close || '17:00'} ({timezone})
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Please leave a message and we'll get back to you during business hours.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Integrations Tab
function IntegrationsTab() {
  const [status, setStatus] = useState<{
    connected: boolean;
    platform: string | null;
    shopDomain: string | null;
    productCount: number;
    orderCount: number;
    lastSync: { completedAt: string; productsSynced: number; ordersSynced: number } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [shopDomain, setShopDomain] = useState('');
  const [wooUrl, setWooUrl] = useState('');
  const [wooKey, setWooKey] = useState('');
  const [wooSecret, setWooSecret] = useState('');
  const [wooConnecting, setWooConnecting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/integrations/status');
      const data = await res.json();
      setStatus(data);
    } catch {
      console.error('Failed to fetch integration status');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/integrations/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          text: `Synced ${data.productsSynced} products, ${data.ordersSynced} orders.`,
        });
        fetchStatus();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Sync failed.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error during sync.' });
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect your store? All synced products and orders will be deleted.')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/integrations/disconnect', { method: 'POST' });
      setFeedback({ type: 'success', text: 'Store disconnected.' });
      fetchStatus();
    } catch {
      setFeedback({ type: 'error', text: 'Failed to disconnect.' });
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleWooConnect(e: React.FormEvent) {
    e.preventDefault();
    setWooConnecting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/integrations/woocommerce/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl: wooUrl, consumerKey: wooKey, consumerSecret: wooSecret }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', text: 'WooCommerce connected!' });
        setWooUrl('');
        setWooKey('');
        setWooSecret('');
        fetchStatus();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Connection failed.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'Network error.' });
    } finally {
      setWooConnecting(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading integration status...</div>;
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          feedback.type === 'success'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {feedback.text}
        </div>
      )}

      {status?.connected ? (
        <>
          {/* Connected Status */}
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-400">check_circle</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white capitalize">{status.platform} Connected</p>
                  <p className="text-xs text-slate-400">{status.shopDomain}</p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>

          {/* Sync Status */}
          <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Sync Status</h3>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-lg ${syncing ? 'animate-spin' : ''}`}>
                  sync
                </span>
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{status.productCount}</p>
                <p className="text-xs text-slate-500 mt-1">Products</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{status.orderCount}</p>
                <p className="text-xs text-slate-500 mt-1">Orders</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-sm font-medium text-white">
                  {status.lastSync
                    ? new Date(status.lastSync.completedAt).toLocaleString()
                    : 'Never'}
                </p>
                <p className="text-xs text-slate-500 mt-1">Last Sync</p>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Auto-sync runs every 6 hours. Use "Sync Now" to update immediately.
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Connect Shopify */}
          <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#95BF47]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#95BF47]">shopping_bag</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Connect Shopify</h3>
                <p className="text-xs text-slate-500">Sync products and orders from your Shopify store</p>
              </div>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                placeholder="mystore.myshopify.com"
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <a
                href={shopDomain ? `/api/integrations/shopify/install?shop=${encodeURIComponent(shopDomain)}` : '#'}
                className={`px-4 py-2 bg-[#95BF47] text-white rounded-lg text-sm font-medium hover:bg-[#7ea83a] transition-colors ${
                  !shopDomain ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                Install App
              </a>
            </div>
          </div>

          {/* Connect WooCommerce */}
          <form onSubmit={handleWooConnect} className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#9B5C8F]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#9B5C8F]">storefront</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Connect WooCommerce</h3>
                <p className="text-xs text-slate-500">Sync products and orders from your WooCommerce store</p>
              </div>
            </div>
            <div className="space-y-3">
              <input
                type="url"
                value={wooUrl}
                onChange={(e) => setWooUrl(e.target.value)}
                placeholder="https://mystore.com"
                required
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={wooKey}
                  onChange={(e) => setWooKey(e.target.value)}
                  placeholder="Consumer Key"
                  required
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  type="password"
                  value={wooSecret}
                  onChange={(e) => setWooSecret(e.target.value)}
                  placeholder="Consumer Secret"
                  required
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={wooConnecting}
              className="px-4 py-2 bg-[#9B5C8F] text-white rounded-lg text-sm font-medium hover:bg-[#845075] transition-colors disabled:opacity-50"
            >
              {wooConnecting ? 'Connecting...' : 'Connect WooCommerce'}
            </button>
          </form>

          {/* Manual Products */}
          <div className="rounded-2xl border border-white/10 bg-surface-dark p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">edit_note</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Manual Products</h3>
                <p className="text-xs text-slate-500">Add products manually without connecting a store</p>
              </div>
            </div>
            <a
              href="/dashboard/products"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Go to Products
            </a>
          </div>
        </>
      )}
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
