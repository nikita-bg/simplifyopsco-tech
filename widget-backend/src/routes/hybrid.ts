import { Router } from 'express';
import { widgetCors } from '../middleware/cors.js';
import { createSessionAuth } from '../middleware/sessionAuth.js';
import { streamChat } from '../services/gemini.js';
import { streamTts } from '../services/openaiTts.js';
import { buildSystemPrompt } from '../services/promptBuilder.js';
import { supabase } from '../services/db.js';
import { canStartConversation, startConversation } from '../services/conversation.js';
import type { SessionStore } from '../services/sessionStore.js';
import type { SessionData } from '../types/index.js';

export function createHybridRouter(sessionStore: SessionStore) {
  const router = Router();
  const auth = createSessionAuth(sessionStore);

  router.post('/api/chat/hybrid', widgetCors, auth, async (req, res) => {
    const session: SessionData = (req as any).session;
    const { message, pageContext, history = [], voice = 'nova' } = req.body;

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

    const { data: business } = await supabase
      .from('businesses')
      .select('system_prompt')
      .eq('id', session.businessId)
      .single();

    const systemPrompt = buildSystemPrompt(
      business?.system_prompt || 'You are a helpful AI sales assistant.',
      null,
      pageContext || null,
    );

    const messages = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role === 'user' ? 'user' as const : 'model' as const,
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // SSE streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      let fullResponse = '';

      // Create an async generator that yields only text deltas from Gemini
      async function* textDeltas() {
        for await (const event of streamChat(systemPrompt, messages)) {
          if (event.type === 'text_delta' && event.content) {
            yield event.content;
          } else if (event.type === 'actions') {
            res.write(`event: actions\ndata: ${JSON.stringify({ actions: event.actions })}\n\n`);
          }
        }
      }

      // Stream TTS chunks — each yields text + audio together
      for await (const chunk of streamTts(textDeltas(), voice)) {
        fullResponse += chunk.text;

        res.write(`event: text_delta\ndata: ${JSON.stringify({ content: chunk.text })}\n\n`);

        if (chunk.audioBase64) {
          res.write(`event: audio_delta\ndata: ${JSON.stringify({ audio: chunk.audioBase64 })}\n\n`);
        }
      }

      res.write(`event: done\ndata: {}\n\n`);

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
