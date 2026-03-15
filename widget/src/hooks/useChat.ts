import { useState, useCallback, useRef } from 'react';
import { sendChat } from '../lib/api';
import { parseSSE } from '../lib/sse';
import type { Message, PageContext, SiteAction } from '../lib/types';

export function useChat(token: string | null, pageContext?: PageContext) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const onActionsRef = useRef<((actions: SiteAction[]) => void) | null>(null);

  const setActionsHandler = useCallback(
    (handler: (actions: SiteAction[]) => void) => {
      onActionsRef.current = handler;
    },
    []
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!token || isStreaming) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };

      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        const response = await sendChat(token, text, pageContext);

        for await (const event of parseSSE(response)) {
          if (event.type === 'text_delta' && event.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.content }
                  : m
              )
            );
          } else if (event.type === 'actions' && event.actions) {
            onActionsRef.current?.(event.actions);
          } else if (event.type === 'done') {
            break;
          } else if (event.type === 'error') {
            throw new Error(event.error ?? 'Stream error');
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: 'Sorry, something went wrong. Please try again.',
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        );
        setIsStreaming(false);
      }
    },
    [token, isStreaming, pageContext]
  );

  return { messages, isStreaming, sendMessage, setActionsHandler };
}
