import { useState, useEffect } from 'react';
import { WidgetHeader } from './components/WidgetHeader';
import { ChatView } from './components/ChatView';
import { useSession } from './hooks/useSession';
import { getAgentConfig } from './lib/api';
import type { AgentConfig, ChatMode, PageContext } from './lib/types';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const agentId = params.get('agent') ?? '';
  const initialMode = (params.get('mode') as ChatMode | null) ?? 'chat';

  const [mode, setMode] = useState<ChatMode>(initialMode);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);

  const { session, isReady, error } = useSession(agentId);

  // Load agent config (public endpoint, no auth needed)
  useEffect(() => {
    if (!agentId) return;
    getAgentConfig(agentId)
      .then(setConfig)
      .catch(() => {
        // Fallback config if backend unreachable
        setConfig({
          agentId,
          businessName: 'AI Assistant',
          primaryColor: '#6366f1',
          defaultMode: initialMode,
          welcomeMessage: 'Hi! How can I help you today?',
        });
      });
  }, [agentId, initialMode]);

  // Notify parent window of readiness and listen for pageContext
  useEffect(() => {
    window.parent.postMessage({ type: 'so:ready' }, '*');

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'so:pageContext') {
        setPageContext(event.data.context as PageContext);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!agentId) {
    return <div className="so-error">Missing ?agent= parameter</div>;
  }

  if (!isReady && !error) {
    return <div className="so-loading">Connecting...</div>;
  }

  if (error) {
    return <div className="so-error">Failed to connect: {error}</div>;
  }

  return (
    <div
      className="so-widget"
      style={
        { '--so-primary': config?.primaryColor ?? '#6366f1' } as React.CSSProperties
      }
    >
      <WidgetHeader config={config} mode={mode} onModeChange={setMode} />
      <main className="so-content">
        {mode === 'chat' && (
          <ChatView
            session={session!}
            pageContext={pageContext ?? undefined}
            welcomeMessage={config?.welcomeMessage}
          />
        )}
        {mode === 'hybrid' && (
          <div className="so-view">
            <p>Voice responses — coming in Task 21</p>
          </div>
        )}
        {mode === 'voice' && (
          <div className="so-view">
            <p>Live voice — coming in Task 21</p>
          </div>
        )}
      </main>
    </div>
  );
}
