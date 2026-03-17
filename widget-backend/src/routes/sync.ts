/**
 * Sync API Route
 * POST /api/sync/trigger — manual sync trigger for a business.
 */
import { Router } from 'express';
import { supabase } from '../services/db.js';
import { syncBusiness } from '../services/sync/syncEngine.js';

const router = Router();

router.post('/api/sync/trigger', async (req, res) => {
  const { businessId } = req.body;

  if (!businessId) {
    res.status(400).json({ error: 'businessId required' });
    return;
  }

  // Verify business exists
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .single();

  if (!business) {
    res.status(404).json({ error: 'Business not found' });
    return;
  }

  try {
    const result = await syncBusiness(businessId);
    res.json(result);
  } catch (err: any) {
    console.error('[Sync Trigger] Error:', err);
    res.status(500).json({ error: 'Sync failed', message: err.message });
  }
});

export default router;
