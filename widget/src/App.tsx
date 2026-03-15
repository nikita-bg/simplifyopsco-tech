import { useState, useEffect } from 'react';
import type { AgentConfig, ChatMode } from './lib/types';

function ChatPlaceholder() {
  return (
    <div className="so-view so-chat-view">
      <p>Chat mode — coming in Task 20</p>
    </div>
  );
}

function HybridPlaceholder() {
  return (
    <div className="so-view so-hybrid-view">
      <p>Hybrid mode — coming in Task 21</p>
    </div>
  );
}

function VoicePlaceholder() {
  return (
    <div className="so-view so-voice-view">
      <p>Voice mode — coming in Task 21</p>
    </div>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const agentId = params.get('agent') ?? '';
  const initialMode = (params.get('mode') as ChatMode | null) ?? 'chat';

  const [mode, setMode] = useState<ChatMode>(initialMode);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [ready, setReady] = useState(false);

  // Notify parent window that widget is ready and listen for pageContext
  useEffect(() => {
    window.parent.postMessage({ type: 'so:ready' }, '*');

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'so:pageContext') {
        // pageContext stored in session hook (Task 20)
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Load agent config (backend call wired in Task 20 via useSession)
  useEffect(() => {
    if (!agentId) return;

    setConfig({
      agentId,
      businessName: 'SimplifyOps',
      primaryColor: '#6366f1',
      defaultMode: initialMode,
      welcomeMessage: 'Hi! How can I help you today?',
    });
    setReady(true);
  }, [agentId, initialMode]);

  if (!agentId) {
    return <div className="so-error">Missing ?agent= parameter</div>;
  }

  if (!ready) {
    return <div className="so-loading">Loading...</div>;
  }

  return (
    <div
      className="so-widget"
      style={{ '--so-primary': config?.primaryColor } as React.CSSProperties}
    >
      <header className="so-header">
        <span className="so-business-name">{config?.businessName}</span>
        <div className="so-mode-toggle">
          {(['chat', 'hybrid', 'voice'] as ChatMode[]).map((m) => (
            <button
              key={m}
              className={`so-mode-btn${mode === m ? ' so-mode-btn--active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </header>
      <main className="so-content">
        {mode === 'chat' && <ChatPlaceholder />}
        {mode === 'hybrid' && <HybridPlaceholder />}
        {mode === 'voice' && <VoicePlaceholder />}
      </main>
    </div>
  );
}
