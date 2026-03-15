import { Router } from 'express';
import { supabase } from '../services/db.js';
import { publicCors } from '../middleware/cors.js';
import type { SessionStore } from '../services/sessionStore.js';

export function createSessionRouter(sessionStore: SessionStore) {
  const router = Router();

  router.post('/api/session', publicCors, async (req, res) => {
    const { agentId } = req.body;
    if (!agentId) {
      res.status(400).json({ error: 'agent_id_required' });
      return;
    }

    // Look up agent
    const { data: business, error } = await supabase
      .from('businesses')
      .select('id, agent_id, allowed_domains, is_active, status, conversation_count, conversation_limit')
      .eq('agent_id', agentId)
      .single();

    if (error || !business) {
      res.status(404).json({ error: 'agent_not_found' });
      return;
    }

    if (!business.is_active || business.status !== 'active') {
      res.status(403).json({ error: 'agent_inactive' });
      return;
    }

    // Check domain whitelist
    const domains = Array.isArray(business.allowed_domains) ? business.allowed_domains : [];
    if (domains.length > 0) {
      const origin = req.headers.origin || req.headers.referer || '';
      try {
        const requestDomain = new URL(origin).hostname;
        if (!domains.some((d: string) => requestDomain === d || requestDomain.endsWith('.' + d))) {
          res.status(403).json({ error: 'domain_not_allowed' });
          return;
        }
      } catch {
        res.status(403).json({ error: 'domain_not_allowed' });
        return;
      }
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const ua = req.headers['user-agent'] || '';

    const token = sessionStore.create({
      agentId: business.agent_id,
      businessId: business.id,
      visitorIp: ip,
      userAgent: ua,
    });

    res.json({ token });
  });

  return router;
}
