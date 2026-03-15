import type { SSEEvent } from './types';

/**
 * Async generator that parses a Server-Sent Events stream from a fetch Response.
 * Yields one SSEEvent per dispatched event (event line + data line + blank line).
 */
export async function* parseSSE(response: Response): AsyncGenerator<SSEEvent> {
  if (!response.body) throw new Error('Response has no body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process all complete events (separated by blank lines)
      const events = buffer.split('\n\n');
      // Last element may be incomplete — keep it in the buffer
      buffer = events.pop() ?? '';

      for (const rawEvent of events) {
        if (!rawEvent.trim()) continue;

        let eventType: string | null = null;
        let dataStr: string | null = null;

        for (const line of rawEvent.split('\n')) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            dataStr = line.slice(6).trim();
          }
        }

        if (!eventType || !dataStr) continue;

        try {
          const data = JSON.parse(dataStr) as Record<string, unknown>;
          yield { type: eventType as SSEEvent['type'], ...data } as SSEEvent;
        } catch {
          // skip malformed JSON — stream continues
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
