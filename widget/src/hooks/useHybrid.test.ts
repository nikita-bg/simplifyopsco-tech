import { describe, it, expect } from 'vitest';

/**
 * Tests for the pure audio chunk assembly logic extracted from useHybrid.
 * The hook itself requires browser AudioContext/Audio — tested in E2E (Task 23).
 */

function buildAudioBytes(chunks: string[]): Uint8Array {
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
  return combined;
}

describe('audio chunk assembly', () => {
  it('decodes a single base64 chunk', () => {
    const text = 'Hello';
    const b64 = btoa(text);
    const result = buildAudioBytes([b64]);
    expect(result).toHaveLength(text.length);
    expect(String.fromCharCode(...result)).toBe(text);
  });

  it('concatenates multiple chunks in order', () => {
    const chunks = ['Hello', ' ', 'World'].map(btoa);
    const result = buildAudioBytes(chunks);
    expect(String.fromCharCode(...result)).toBe('Hello World');
  });

  it('handles empty chunk list', () => {
    const result = buildAudioBytes([]);
    expect(result).toHaveLength(0);
  });

  it('preserves binary data exactly', () => {
    const bytes = new Uint8Array([0, 128, 255, 1, 127]);
    const b64 = btoa(String.fromCharCode(...bytes));
    const result = buildAudioBytes([b64]);
    expect(Array.from(result)).toEqual(Array.from(bytes));
  });
});
