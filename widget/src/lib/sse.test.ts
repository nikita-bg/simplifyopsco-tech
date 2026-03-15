import { describe, it, expect } from 'vitest';
import { parseSSE } from './sse';

function makeResponse(chunks: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream);
}

async function collectEvents(res: Response) {
  const events = [];
  for await (const event of parseSSE(res)) {
    events.push(event);
  }
  return events;
}

describe('parseSSE', () => {
  it('parses a single text_delta event', async () => {
    const res = makeResponse([
      'event: text_delta\ndata: {"content":"Hello"}\n\n',
    ]);
    const events = await collectEvents(res);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('text_delta');
    expect(events[0].content).toBe('Hello');
  });

  it('parses multiple events in one chunk', async () => {
    const res = makeResponse([
      'event: text_delta\ndata: {"content":"Hello "}\n\n' +
        'event: text_delta\ndata: {"content":"world"}\n\n' +
        'event: done\ndata: {}\n\n',
    ]);
    const events = await collectEvents(res);
    expect(events).toHaveLength(3);
    expect(events[0].content).toBe('Hello ');
    expect(events[1].content).toBe('world');
    expect(events[2].type).toBe('done');
  });

  it('parses events split across multiple chunks', async () => {
    const res = makeResponse([
      'event: text_delta\n',
      'data: {"content":"Hi"}\n\n',
    ]);
    const events = await collectEvents(res);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('text_delta');
    expect(events[0].content).toBe('Hi');
  });

  it('parses actions event with array', async () => {
    const actions = [
      { type: 'scrollToElement', ref: 'product-1' },
      { type: 'highlightElement', ref: 'product-1' },
    ];
    const res = makeResponse([
      `event: actions\ndata: ${JSON.stringify({ actions })}\n\n`,
    ]);
    const events = await collectEvents(res);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('actions');
    expect(events[0].actions).toEqual(actions);
  });

  it('skips malformed JSON and continues', async () => {
    const res = makeResponse([
      'event: text_delta\ndata: {not valid json}\n\n' +
        'event: done\ndata: {}\n\n',
    ]);
    const events = await collectEvents(res);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('done');
  });

  it('skips events without data line', async () => {
    const res = makeResponse([
      'event: text_delta\n\n',
      'event: done\ndata: {}\n\n',
    ]);
    const events = await collectEvents(res);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('done');
  });

  it('handles empty stream', async () => {
    const res = makeResponse([]);
    const events = await collectEvents(res);
    expect(events).toHaveLength(0);
  });

  it('parses audio_delta event with base64 field', async () => {
    const res = makeResponse([
      'event: audio_delta\ndata: {"audio":"SGVsbG8="}\n\n',
    ]);
    const events = await collectEvents(res);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('audio_delta');
    expect(events[0].audio).toBe('SGVsbG8=');
  });

  it('throws if response has no body', async () => {
    const res = new Response(null, { status: 200 });
    await expect(collectEvents(res)).rejects.toThrow('Response has no body');
  });
});
