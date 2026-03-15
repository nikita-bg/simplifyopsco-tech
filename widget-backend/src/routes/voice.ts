import { Router } from 'express';
import { widgetCors } from '../middleware/cors.js';
import { createSessionAuth } from '../middleware/sessionAuth.js';
import { createRealtimeSession } from '../services/openaiRealtime.js';
import { buildSystemPrompt } from '../services/promptBuilder.js';
import { supabase } from '../services/db.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import type { SessionStore } from '../services/sessionStore.js';
import type { SessionData } from '../types/index.js';

export function createVoiceRouter(sessionStore: SessionStore) {
  const router = Router();
  const auth = createSessionAuth(sessionStore);

  // POST /api/voice/token
  // Returns an OpenAI Realtime ephemeral key for WebRTC voice session.
  // The widget uses this key to connect directly to OpenAI Realtime API.
  router.post('/api/voice/token', widgetCors, auth, rateLimiter, async (req, res) => {
    const session: SessionData = (req as any).session;
    const { pageContext, voice = 'verse' } = req.body;

    // Get business system prompt
    const { data: business } = await supabase
      .from('businesses')
      .select('system_prompt, conversation_count, conversation_limit')
      .eq('id', session.businessId)
      .single();

    if (!business) {
      res.status(404).json({ error: 'business_not_found' });
      return;
    }

    // Check conversation limit
    if (business.conversation_count >= business.conversation_limit) {
      res.status(429).json({ error: 'conversation_limit_reached' });
      return;
    }

    const systemPrompt = buildSystemPrompt(
      business.system_prompt || 'You are a helpful AI sales assistant.',
      null,
      pageContext || null,
    );

    try {
      const sessionConfig = await createRealtimeSession(systemPrompt, voice);

      res.json({
        ephemeralKey: sessionConfig.ephemeralKey,
        sessionId: sessionConfig.sessionId,
        expiresAt: sessionConfig.expiresAt,
      });
    } catch {
      res.status(500).json({ error: 'realtime_session_failed' });
    }
  });

  return router;
}
