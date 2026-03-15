import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { ProductCard } from './ProductCard';
import { ComparisonView } from './ComparisonView';
import { useHybrid } from '../hooks/useHybrid';
import { useBridge } from '../hooks/useBridge';
import type { PageContext, ProductCardData, Session, SiteAction } from '../lib/types';

interface Props {
  session: Session;
  pageContext?: PageContext;
  welcomeMessage?: string;
}

export function HybridView({ session, pageContext, welcomeMessage }: Props) {
  const { executeActions } = useBridge();
  const {
    messages,
    isStreaming,
    playbackState,
    sendMessage,
    setActionsHandler,
    stopAudio,
  } = useHybrid(session.token, pageContext);

  const [input, setInput] = useState('');
  const [productCard, setProductCard] = useState<ProductCardData | null>(null);
  const [comparison, setComparison] = useState<ProductCardData[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Wire bridge actions — intercept widget-internal overlay actions
  useEffect(() => {
    setActionsHandler((actions: SiteAction[]) => {
      const external: SiteAction[] = [];
      for (const action of actions) {
        if (action.type === 'showProductCard' && action.product) {
          setProductCard(action.product);
        } else if (action.type === 'showComparison' && action.products) {
          setComparison(action.products);
        } else {
          external.push(action);
        }
      }
      if (external.length) executeActions(external);
    });
  }, [executeActions, setActionsHandler]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Stop audio when component unmounts (e.g. user switches mode)
  useEffect(() => {
    return () => stopAudio();
  }, [stopAudio]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    sendMessage(text);
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const isPlaying = playbackState === 'playing';

  return (
    <div className="so-chat">
      <div className="so-messages" role="log" aria-live="polite">
        {messages.length === 0 && (
          <p className="so-empty">
            {welcomeMessage ?? 'Hi! Type a message and I\'ll reply with voice.'}
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {productCard && (
        <ProductCard product={productCard} onClose={() => setProductCard(null)} />
      )}

      {comparison && (
        <ComparisonView products={comparison} onClose={() => setComparison(null)} />
      )}

      {/* Audio playback indicator */}
      {isPlaying && (
        <div className="so-audio-indicator" aria-live="polite">
          <span className="so-audio-dot" />
          <span className="so-audio-dot" />
          <span className="so-audio-dot" />
          <span className="so-audio-label">Speaking...</span>
        </div>
      )}

      <div className="so-input-area">
        <textarea
          ref={textareaRef}
          className="so-input"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={isStreaming || isPlaying}
          aria-label="Message input"
        />
        <button
          className="so-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isStreaming || isPlaying}
          aria-label="Send message"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
