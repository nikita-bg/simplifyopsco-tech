import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';

const genai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const SITE_CONTROL_FUNCTIONS = [
  { name: 'scrollToElement', description: 'Scroll to an element on the page', parameters: { type: 'object' as const, properties: { ref: { type: 'string' as const } }, required: ['ref'] } },
  { name: 'highlightElement', description: 'Highlight an element', parameters: { type: 'object' as const, properties: { ref: { type: 'string' as const } }, required: ['ref'] } },
  { name: 'navigateTo', description: 'Navigate to URL (same-origin only)', parameters: { type: 'object' as const, properties: { url: { type: 'string' as const } }, required: ['url'] } },
  { name: 'showProductCard', description: 'Show product card popup', parameters: { type: 'object' as const, properties: { name: { type: 'string' as const }, price: { type: 'string' as const }, imageUrl: { type: 'string' as const }, ref: { type: 'string' as const } }, required: ['name', 'ref'] } },
  { name: 'openContactForm', description: 'Open the contact form', parameters: { type: 'object' as const, properties: {} } },
  { name: 'showComparison', description: 'Compare products side by side', parameters: { type: 'object' as const, properties: { products: { type: 'array' as const, items: { type: 'object' as const } } }, required: ['products'] } },
];

export interface ChatEvent {
  type: 'text_delta' | 'actions' | 'done';
  content?: string;
  actions?: Array<{ type: string; [key: string]: unknown }>;
}

export async function* streamChat(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'model'; content: string }>,
): AsyncGenerator<ChatEvent> {
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }],
  }));

  const response = await genai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: SITE_CONTROL_FUNCTIONS }],
    },
  });

  const actions: Array<{ type: string; [key: string]: unknown }> = [];

  for await (const chunk of response) {
    if (chunk.candidates?.[0]?.content?.parts) {
      for (const part of chunk.candidates[0].content.parts) {
        if (part.text) {
          yield { type: 'text_delta', content: part.text };
        }
        if (part.functionCall) {
          actions.push({
            type: part.functionCall.name as string,
            ...(part.functionCall.args as Record<string, unknown>),
          });
        }
      }
    }
  }

  if (actions.length > 0) {
    yield { type: 'actions', actions };
  }
  yield { type: 'done' };
}
