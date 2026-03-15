import { Router } from 'express';
import { supabase } from '../services/db.js';
import { publicCors } from '../middleware/cors.js';
import type { AgentConfig } from '../types/index.js';

const router = Router();

// In-memory cache: agentId -> { data, expiresAt }
const cache = new Map<string, { data: AgentConfig; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

router.get('/api/config/:agentId', publicCors, async (req, res) => {
  const { agentId } = req.params;

  // Check cache
  const cached = cache.get(agentId);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.data);
    return;
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('agent_id, name, default_mode, welcome_message, branding, allowed_domains, is_active, status')
    .eq('agent_id', agentId)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'agent_not_found' });
    return;
  }

  if (!data.is_active || data.status !== 'active') {
    res.status(403).json({ error: 'agent_inactive' });
    return;
  }

  const agentConfig: AgentConfig = {
    agentId: data.agent_id,
    businessName: data.name,
    defaultMode: data.default_mode,
    welcomeMessage: data.welcome_message,
    branding: data.branding || { color: '#256AF4', logo: null, position: 'bottom-right' },
    allowedDomains: Array.isArray(data.allowed_domains) ? data.allowed_domains : [],
  };

  cache.set(agentId, { data: agentConfig, expiresAt: Date.now() + CACHE_TTL });
  res.json(agentConfig);
});

export default router;
