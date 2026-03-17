import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';

const genai = new GoogleGenAI({ apiKey: config.geminiApiKey });

// Functions that execute on the client (widget bridge)
const CLIENT_FUNCTIONS = [
  { name: 'scrollToElement', description: 'Scroll to an element on the page', parameters: { type: 'object' as const, properties: { ref: { type: 'string' as const } }, required: ['ref'] } },
  { name: 'highlightElement', description: 'Highlight an element', parameters: { type: 'object' as const, properties: { ref: { type: 'string' as const } }, required: ['ref'] } },
  { name: 'navigateTo', description: 'Navigate to URL (same-origin only)', parameters: { type: 'object' as const, properties: { url: { type: 'string' as const } }, required: ['url'] } },
  { name: 'showProductCard', description: 'Show product card popup with image, price, and buy button', parameters: { type: 'object' as const, properties: { name: { type: 'string' as const }, price: { type: 'string' as const }, image: { type: 'string' as const }, ctaUrl: { type: 'string' as const }, ctaText: { type: 'string' as const } }, required: ['name'] } },
  { name: 'openContactForm', description: 'Open the contact form', parameters: { type: 'object' as const, properties: {} } },
  { name: 'showComparison', description: 'Compare products side by side', parameters: { type: 'object' as const, properties: { products: { type: 'array' as const, items: { type: 'object' as const, properties: { name: { type: 'string' as const }, price: { type: 'string' as const }, image: { type: 'string' as const } }, required: ['name', 'price'] } } }, required: ['products'] } },
];

// Functions that execute server-side (need DB queries)
const SERVER_FUNCTIONS = [
  { name: 'searchProducts', description: 'Search the product catalog by query. Returns matching products with details.', parameters: { type: 'object' as const, properties: { query: { type: 'string' as const, description: 'Search query for products' } }, required: ['query'] } },
  { name: 'lookupOrder', description: 'Look up order status by customer email and/or order number.', parameters: { type: 'object' as const, properties: { email: { type: 'string' as const, description: 'Customer email address' }, orderNumber: { type: 'string' as const, description: 'Order number (e.g. #1001)' } } } },
];

const ALL_FUNCTIONS = [...CLIENT_FUNCTIONS, ...SERVER_FUNCTIONS];
const SERVER_FUNCTION_NAMES = new Set(SERVER_FUNCTIONS.map(f => f.name));

export interface ChatEvent {
  type: 'text_delta' | 'actions' | 'done';
  content?: string;
  actions?: Array<{ type: string; [key: string]: unknown }>;
}

/**
 * Handler for server-side function calls.
 * Must be provided by the caller (chat route) to execute DB queries.
 */
export type ServerFunctionHandler = (
  name: string,
  args: Record<string, unknown>
) => Promise<unknown>;

export async function* streamChat(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'model'; content: string }>,
  serverFunctionHandler?: ServerFunctionHandler,
): AsyncGenerator<ChatEvent> {
  const contents: any[] = messages.map(m => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }],
  }));

  const clientActions: Array<{ type: string; [key: string]: unknown }> = [];

  // Function calling loop: Gemini may call server functions, we execute and feed back
  let iteration = 0;
  const MAX_ITERATIONS = 3; // Prevent infinite loops

  while (iteration < MAX_ITERATIONS) {
    iteration++;

    const response = await genai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: ALL_FUNCTIONS as any }],
      },
    });

    let hasServerFunctionCall = false;
    const serverFunctionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

    for await (const chunk of response) {
      if (chunk.candidates?.[0]?.content?.parts) {
        for (const part of chunk.candidates[0].content.parts) {
          if (part.text) {
            yield { type: 'text_delta', content: part.text };
          }
          if (part.functionCall) {
            const fnName = part.functionCall.name as string;
            const fnArgs = (part.functionCall.args || {}) as Record<string, unknown>;

            if (SERVER_FUNCTION_NAMES.has(fnName) && serverFunctionHandler) {
              // Server-side function — execute and feed back to Gemini
              hasServerFunctionCall = true;
              serverFunctionCalls.push({ name: fnName, args: fnArgs });
            } else {
              // Client-side function — pass through to widget
              clientActions.push({ type: fnName, ...fnArgs });
            }
          }
        }
      }
    }

    if (!hasServerFunctionCall) {
      // No more server function calls — we're done
      break;
    }

    // Execute server functions and add results to conversation
    // First, add the model's function call to contents
    const modelParts: any[] = [];
    for (const fc of serverFunctionCalls) {
      modelParts.push({ functionCall: { name: fc.name, args: fc.args } });
    }
    contents.push({ role: 'model', parts: modelParts });

    // Then add function responses
    const responseParts: any[] = [];
    for (const fc of serverFunctionCalls) {
      try {
        const result = await serverFunctionHandler(fc.name, fc.args);
        responseParts.push({
          functionResponse: {
            name: fc.name,
            response: { result },
          },
        });
      } catch (err: any) {
        responseParts.push({
          functionResponse: {
            name: fc.name,
            response: { error: err.message || 'Function execution failed' },
          },
        });
      }
    }
    contents.push({ role: 'user', parts: responseParts });

    // Continue loop — Gemini will process the function results
  }

  if (clientActions.length > 0) {
    yield { type: 'actions', actions: clientActions };
  }
  yield { type: 'done' };
}
