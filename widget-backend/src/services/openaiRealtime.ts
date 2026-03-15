import OpenAI from 'openai';
import { config } from '../config.js';

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export interface RealtimeSessionConfig {
  ephemeralKey: string;
  sessionId: string;
  expiresAt: number;
}

const SITE_CONTROL_TOOLS = [
  {
    type: 'function' as const,
    name: 'scrollToElement',
    description: 'Scroll to an element on the page',
    parameters: {
      type: 'object',
      properties: { ref: { type: 'string', description: 'Element reference ID' } },
      required: ['ref'],
    },
  },
  {
    type: 'function' as const,
    name: 'highlightElement',
    description: 'Highlight an element on the page',
    parameters: {
      type: 'object',
      properties: { ref: { type: 'string', description: 'Element reference ID' } },
      required: ['ref'],
    },
  },
  {
    type: 'function' as const,
    name: 'navigateTo',
    description: 'Navigate to a URL on the same domain',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string', description: 'URL to navigate to (same-origin only)' } },
      required: ['url'],
    },
  },
  {
    type: 'function' as const,
    name: 'showProductCard',
    description: 'Show a floating product card overlay',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'string' },
        imageUrl: { type: 'string' },
        ref: { type: 'string' },
      },
      required: ['name', 'ref'],
    },
  },
  {
    type: 'function' as const,
    name: 'openContactForm',
    description: 'Open the contact form on the page',
    parameters: { type: 'object', properties: {} },
  },
];

/**
 * Creates an OpenAI Realtime ephemeral session key.
 * The ephemeral key is short-lived (1 minute) and used by the client
 * to connect directly to the OpenAI Realtime API via WebRTC.
 */
export async function createRealtimeSession(
  systemPrompt: string,
  voice: string = 'verse',
): Promise<RealtimeSessionConfig> {
  // OpenAI Realtime API: create ephemeral session
  const response = await openai.beta.realtime.sessions.create({
    model: 'gpt-4o-realtime-preview',
    voice: voice as any,
    instructions: systemPrompt,
    tools: SITE_CONTROL_TOOLS,
    tool_choice: 'auto',
    input_audio_format: 'pcm16',
    output_audio_format: 'pcm16',
    input_audio_transcription: { model: 'whisper-1' },
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500,
    },
  });

  return {
    ephemeralKey: response.client_secret.value,
    sessionId: (response as any).id ?? 'session',
    expiresAt: response.client_secret.expires_at,
  };
}
