import { Router } from 'express';
import { widgetCors } from '../middleware/cors.js';
import { createSessionAuth } from '../middleware/sessionAuth.js';
import { parsePageContext } from '../services/contextParser.js';
import { supabase } from '../services/db.js';
import type { SessionStore } from '../services/sessionStore.js';
import type { SessionData } from '../types/index.js';

export function createContextRouter(sessionStore: SessionStore) {
  const router = Router();
  const auth = createSessionAuth(sessionStore);

  router.post('/api/context', widgetCors, auth, async (req, res) => {
    const session: SessionData = (req as any).session;
    const { url, title, elements } = req.body;

    if (!url) {
      res.status(400).json({ error: 'url_required' });
      return;
    }

    // Parse raw DOM data into structured page context
    const pageContext = parsePageContext({ url, title: title || '', elements: elements || [] });

    // Store/update in site_data table (upsert by business_id + url)
    await supabase
      .from('site_data')
      .upsert(
        {
          business_id: session.businessId,
          url: pageContext.url,
          page_title: pageContext.title,
          products: pageContext.products,
          sections: pageContext.sections,
          raw_context: { elements },
          source: 'runtime',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_id,url' },
      );

    res.json(pageContext);
  });

  return router;
}
