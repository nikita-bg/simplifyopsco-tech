import { useState, useCallback, useRef } from 'react';
import { sendHybrid } from '../lib/api';
import { parseSSE } from '../lib/sse';
import type { Message, PageContext, SiteAction } from '../lib/types';

export type HybridPlaybackState = 'idle' | 'streaming' | 'playing' | 'done';

/** Decodes base64 audio chunks and returns a playable Blob URL (audio/mpeg). */
function buildAudioUrl(chunks: string[]): string {
  const bytes = chunks.map((b64) => {
    const binary = atob(b64);
    const buf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
    return buf;
  });

  const total = bytes.reduce((n, b) => n + b.length, 0);
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const b of bytes) {
    combined.set(b, offset);
    offset += b.length;
  }

  return URL.createObjectURL(new Blob([combined], { type: 'audio/mpeg' }));
}

export function useHybrid(token: string | null, pageContext?: PageContext) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [playbackState, setPlaybackState] = useState<HybridPlaybackState>('idle');
  const onActionsRef = useRef<((actions: SiteAction[]) => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

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
      setPlaybackState('streaming');

      const audioChunks: string[] = [];

      try {
        const response = await sendHybrid(token, text, pageContext);

        for await (const event of parseSSE(response)) {
          if (event.type === 'text_delta' && event.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.content }
                  : m
              )
            );
          } else if (event.type === 'audio_delta' && event.audio) {
            audioChunks.push(event.audio);
          } else if (event.type === 'actions' && event.actions) {
            onActionsRef.current?.(event.actions);
          } else if (event.type === 'done') {
            break;
          } else if (event.type === 'error') {
            throw new Error(event.error ?? 'Stream error');
          }
        }

        // Play accumulated audio after streaming completes
        if (audioChunks.length > 0) {
          // Revoke previous blob to avoid memory leaks
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);

          const url = buildAudioUrl(audioChunks);
          blobUrlRef.current = url;

          const audio = new Audio(url);
          audioRef.current = audio;
          setPlaybackState('playing');

          await new Promise<void>((resolve) => {
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.play().catch(() => resolve());
          });
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
        setPlaybackState('done');
      }
    },
    [token, isStreaming, pageContext]
  );

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  return { messages, isStreaming, playbackState, sendMessage, setActionsHandler, stopAudio };
}
