'use client';

/**
 * Voice Widget Embed Component
 *
 * Embeddable version of VoiceWidget that runs inside iframe
 * Fetches business config and applies branding
 */

import { useConversation } from '@elevenlabs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface WidgetConfig {
  businessId: string;
  businessName: string;
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
  planTier: string;
  conversationCount: number;
  conversationLimit: number;
  wsEndpoint: string;
}

export function VoiceWidgetEmbed() {
  const searchParams = useSearchParams();
  const apiKey = searchParams.get('api_key');

  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<Date | null>(null);
  const messagesRef = useRef<Message[]>([]);

  // Fetch widget configuration
  useEffect(() => {
    if (!apiKey) {
      setError('Missing API key');
      return;
    }

    async function fetchConfig() {
      try {
        const response = await fetch(`/api/widget/config?api_key=${apiKey}`);

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to load widget configuration');
          return;
        }

        const data = await response.json();
        setConfig(data);

        // Notify parent that widget is ready
        window.parent.postMessage({ type: 'widget:ready' }, '*');
      } catch (err) {
        console.error('[Widget] Config fetch error:', err);
        setError('Failed to connect to server');
      }
    }

    fetchConfig();
  }, [apiKey]);

  // Listen for messages from parent window
  useEffect(() => {
    function handleParentMessage(event: MessageEvent) {
      const { type } = event.data;

      switch (type) {
        case 'widget:expanded':
          setIsExpanded(true);
          break;
        case 'widget:minimized':
          setIsExpanded(false);
          if (voiceState !== 'idle') {
            stopConversation();
          }
          break;
      }
    }

    window.addEventListener('message', handleParentMessage);
    return () => window.removeEventListener('message', handleParentMessage);
  }, [voiceState]);

  // Web automation tools (same as VoiceWidget)
  const clientTools = {
    scrollToSection: async ({ sectionId }: { sectionId: string }) => {
      // Send command to parent window (customer's site)
      window.parent.postMessage(
        { type: 'widget:scrollToSection', data: { sectionId } },
        '*'
      );
      return `Scrolling to section: ${sectionId}`;
    },
    navigateTo: async ({ path }: { path: string }) => {
      window.parent.postMessage(
        { type: 'widget:navigateTo', data: { path } },
        '*'
      );
      return `Navigating to ${path}`;
    },
    highlightElement: async ({ selector }: { selector: string }) => {
      window.parent.postMessage(
        { type: 'widget:highlightElement', data: { selector } },
        '*'
      );
      return `Highlighted element: ${selector}`;
    },
  };

  const conversation = useConversation({
    clientTools,
    onConnect: () => {
      setVoiceState('listening');
      sessionStartRef.current = new Date();
    },
    onDisconnect: () => {
      // Log conversation to API
      if (messagesRef.current.length > 0 && sessionStartRef.current && config) {
        const duration = Math.round((Date.now() - sessionStartRef.current.getTime()) / 1000);
        fetch(`/api/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey || '',
          },
          body: JSON.stringify({
            business_id: config.businessId,
            messages: messagesRef.current,
            duration,
          }),
        }).catch((err) => console.error('[Widget] Failed to log conversation:', err));
      }
      setVoiceState('idle');
      sessionStartRef.current = null;
      messagesRef.current = [];
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }
      setInputVolume(0);
      setOutputVolume(0);
    },
    onMessage: (message) => {
      const msg: Message = {
        role: message.source === 'user' ? 'user' : 'assistant',
        text: message.message,
        timestamp: new Date(),
      };
      setMessages((prev) => {
        const updated = [...prev, msg];
        messagesRef.current = updated;
        return updated;
      });
    },
    onModeChange: (mode) => {
      if (mode.mode === 'speaking') {
        setVoiceState('speaking');
      } else {
        setVoiceState('listening');
      }
    },
    onError: (error) => {
      console.error('[Widget] Error:', error);
      setVoiceState('idle');
      window.parent.postMessage({ type: 'widget:error', data: { error } }, '*');
    },
  });

  // Poll volume levels
  useEffect(() => {
    if (voiceState !== 'idle' && voiceState !== 'connecting') {
      volumeIntervalRef.current = setInterval(() => {
        setInputVolume(conversation.getInputVolume());
        setOutputVolume(conversation.getOutputVolume());
      }, 100);
    }
    return () => {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }
    };
  }, [voiceState, conversation]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startConversation = useCallback(async () => {
    if (!config) return;

    setVoiceState('connecting');
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from server with API key authentication
      const tokenRes = await fetch(`/api/voice/token?api_key=${apiKey}`);
      const tokenData = await tokenRes.json();

      if (tokenData.signedUrl) {
        await conversation.startSession({
          signedUrl: tokenData.signedUrl,
        });
      } else {
        setError('Failed to get voice token');
        setVoiceState('idle');
      }
    } catch (error) {
      console.error('[Widget] Failed to start:', error);
      setVoiceState('idle');
      setError('Microphone access denied or unavailable');
    }
  }, [conversation, config, apiKey]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    setVoiceState('idle');
  }, [conversation]);

  const toggleExpand = useCallback(() => {
    // Notify parent to toggle expansion
    window.parent.postMessage({ type: 'widget:toggle' }, '*');
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-500/10">
        <div className="text-center p-6">
          <span className="material-symbols-outlined text-red-500 text-4xl mb-2">error</span>
          <p className="text-red-500 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const primaryColor = config.branding.color || '#256AF4';
  const activeVolume = voiceState === 'speaking' ? outputVolume : inputVolume;

  // Minimized button view
  if (!isExpanded) {
    return (
      <div
        className="flex items-center justify-center w-full h-full cursor-pointer"
        onClick={toggleExpand}
        style={{ background: 'transparent' }}
      >
        <div
          className="w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110"
          style={{ backgroundColor: primaryColor }}
        >
          <span className="material-symbols-outlined text-white text-3xl">
            {voiceState !== 'idle' ? 'graphic_eq' : 'mic'}
          </span>
        </div>
      </div>
    );
  }

  // Expanded widget view
  return (
    <div className="w-full h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`,
              }}
            >
              <span className="material-symbols-outlined text-white text-xl">graphic_eq</span>
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-900 ${
                voiceState === 'idle'
                  ? 'bg-slate-500'
                  : voiceState === 'connecting'
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-green-400'
              }`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{config.businessName}</p>
            <p className="text-xs text-slate-400">
              {voiceState === 'idle'
                ? 'Click to start'
                : voiceState === 'connecting'
                ? 'Connecting...'
                : voiceState === 'listening'
                ? 'Listening...'
                : 'Speaking...'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleExpand}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Waveform */}
      <div className="px-5 py-6 flex items-center justify-center">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full blur-xl transition-all duration-200"
            style={{
              backgroundColor: `${primaryColor}33`,
              transform: `scale(${1 + activeVolume * 1.5})`,
              opacity: voiceState === 'idle' ? 0 : 0.6,
            }}
          />
          <div
            className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
              voiceState === 'idle'
                ? 'bg-slate-800 border border-white/10'
                : voiceState === 'connecting'
                ? 'bg-slate-800 border border-yellow-500/30 animate-pulse'
                : 'border border-white/20'
            }`}
            style={{
              background:
                voiceState !== 'idle' && voiceState !== 'connecting'
                  ? `linear-gradient(135deg, ${primaryColor}cc, ${primaryColor}99)`
                  : undefined,
            }}
          >
            {voiceState !== 'idle' && voiceState !== 'connecting' ? (
              <div className="flex items-center gap-1 h-12">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                  const height = Math.max(
                    8,
                    activeVolume * 60 * (0.5 + 0.5 * Math.sin(Date.now() / 200 + i))
                  );
                  return (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-white/80 transition-all duration-100"
                      style={{ height: `${Math.min(48, height)}px` }}
                    />
                  );
                })}
              </div>
            ) : voiceState === 'connecting' ? (
              <span className="material-symbols-outlined text-yellow-400 text-3xl animate-spin">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined text-slate-500 text-3xl">mic</span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-3 min-h-0">
        {messages.length === 0 && voiceState === 'idle' && (
          <div className="text-center text-slate-500 text-sm py-8">
            <span className="material-symbols-outlined text-3xl mb-2 block opacity-40">
              record_voice_over
            </span>
            Start a conversation to get help
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'text-white rounded-br-md'
                  : 'bg-white/5 text-slate-200 border border-white/5 rounded-bl-md'
              }`}
              style={{
                backgroundColor: msg.role === 'user' ? primaryColor : undefined,
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Button */}
      <div className="px-5 py-4 border-t border-white/10">
        {voiceState === 'idle' ? (
          <button
            onClick={startConversation}
            className="w-full py-3 rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2 shadow-lg"
            style={{
              backgroundColor: primaryColor,
            }}
          >
            <span className="material-symbols-outlined text-xl">mic</span>
            Start Conversation
          </button>
        ) : (
          <button
            onClick={stopConversation}
            className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30 transition-all flex items-center justify-center gap-2 border border-red-500/20"
          >
            <span className="material-symbols-outlined text-xl">stop_circle</span>
            End Conversation
          </button>
        )}
      </div>
    </div>
  );
}
