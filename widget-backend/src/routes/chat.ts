import { Router } from 'express';
import { widgetCors } from '../middleware/cors.js';
import { createSessionAuth } from '../middleware/sessionAuth.js';
import { streamChat } from '../services/gemini.js';
import { buildSystemPrompt } from '../services/promptBuilder.js';
import { supabase } from '../services/db.js';
import { canStartConversation, startConversation } from '../services/conversation.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { searchProducts, getTopProducts } from '../services/productSearch.js';
import { lookupOrder } from '../services/orderLookup.js';
import type { SessionStore } from '../services/sessionStore.js';
import type { SessionData } from '../types/index.js';

export function createChatRouter(sessionStore: SessionStore) {
  const router = Router();
  const auth = createSessionAuth(sessionStore);

  router.post('/api/chat', widgetCors, auth, rateLimiter, async (req, res) => {
    const session: SessionData = (req as any).session;
    const { message, pageContext, history = [] } = req.body;

    if (!message) {
      res.status(400).json({ error: 'message_required' });
      return;
    }

    // Check conversation limit (only on first message of new conversation)
    if (!session.conversationId) {
      const allowed = await canStartConversation(session.businessId);
      if (!allowed) {
        res.status(429).json({ error: 'conversation_limit_reached' });
        return;
      }

      const conv = await startConversation(session.businessId, (req as any).sessionToken);
      if (conv) {
        session.conversationId = conv.conversationId;
        sessionStore.update((req as any).sessionToken, { conversationId: conv.conversationId });
      }
    }

    // Get system prompt and check for store connection
    const [businessResult, connectionResult, productsResult] = await Promise.all([
      supabase.from('businesses').select('system_prompt').eq('id', session.businessId).single(),
      supabase.from('store_connections').select('platform').eq('business_id', session.businessId).eq('is_active', true).maybeSingle(),
      getTopProducts(session.businessId, 20),
    ]);

    const business = businessResult.data;
    const hasOrderLookup = !!connectionResult.data && connectionResult.data.platform !== 'manual';

    const systemPrompt = buildSystemPrompt(
      business?.system_prompt || 'You are a helpful AI sales assistant.',
      null,
      pageContext || null,
      productsResult.length > 0 ? productsResult : undefined,
      hasOrderLookup,
    );

    // Build message history for Gemini
    const messages = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role === 'user' ? 'user' as const : 'model' as const,
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // Server-side function handler for searchProducts and lookupOrder
    const serverFunctionHandler = async (name: string, args: Record<string, unknown>) => {
      if (name === 'searchProducts') {
        const query = args.query as string;
        const results = await searchProducts(session.businessId, query);
        return results.map(p => ({
          title: p.title,
          price: p.price ? `$${p.price}` : null,
          description: p.description?.slice(0, 200),
          image: p.images[0] || null,
          url: p.productUrl,
        }));
      }
      if (name === 'lookupOrder') {
        const result = await lookupOrder(
          session.businessId,
          args.email as string | undefined,
          args.orderNumber as string | undefined,
        );
        if (!result) return { found: false, message: 'No order found with those details.' };
        return {
          found: true,
          orderNumber: result.orderNumber,
          status: result.status,
          trackingNumber: result.trackingNumber,
          trackingUrl: result.trackingUrl,
          items: result.lineItems.map(li => li.title).join(', '),
          total: result.totalPrice ? `$${result.totalPrice}` : null,
          orderDate: result.orderDate,
          shippedAt: result.shippedAt,
        };
      }
      return { error: 'Unknown function' };
    };

    // SSE streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      let fullResponse = '';

      for await (const event of streamChat(systemPrompt, messages, serverFunctionHandler)) {
        if (event.type === 'text_delta') {
          fullResponse += event.content;
          res.write(`event: text_delta\ndata: ${JSON.stringify({ content: event.content })}\n\n`);
        } else if (event.type === 'actions') {
          res.write(`event: actions\ndata: ${JSON.stringify({ actions: event.actions })}\n\n`);
        } else if (event.type === 'done') {
          res.write(`event: done\ndata: {}\n\n`);
        }
      }

      // Save messages to DB (fire-and-forget)
      if (session.conversationId) {
        supabase.from('messages').insert([
          { conversation_id: session.conversationId, role: 'user', content: message },
          { conversation_id: session.conversationId, role: 'assistant', content: fullResponse },
        ]);
      }
    } catch {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'ai_error' })}\n\n`);
    }

    res.end();
  });

  return router;
}
