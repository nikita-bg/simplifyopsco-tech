import express from 'express';
import helmet from 'helmet';
import healthRouter from './routes/health.js';
import configRouter from './routes/config.js';
import syncRouter from './routes/sync.js';
import { createSessionRouter } from './routes/session.js';
import { createChatRouter } from './routes/chat.js';
import { createHybridRouter } from './routes/hybrid.js';
import { createVoiceRouter } from './routes/voice.js';
import { createContextRouter } from './routes/context.js';
import { SessionStore } from './services/sessionStore.js';
import { syncAll } from './services/sync/syncEngine.js';
import { config } from './config.js';

export function createApp() {
  const app = express();
  const sessionStore = new SessionStore();

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(healthRouter);
  app.use(configRouter);
  app.use(syncRouter);
  app.use(createSessionRouter(sessionStore));
  app.use(createChatRouter(sessionStore));
  app.use(createHybridRouter(sessionStore));
  app.use(createVoiceRouter(sessionStore));
  app.use(createContextRouter(sessionStore));

  // Expose sessionStore for test helpers
  (app as any).sessionStore = sessionStore;

  return app;
}

// Only start server if this file is run directly (not imported in tests)
const isMainModule = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMainModule) {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Widget backend running on port ${config.port}`);

    // Start product/order sync cron (every 6 hours by default)
    setInterval(() => {
      syncAll().catch(err => console.error('[Sync Cron] Error:', err));
    }, config.syncIntervalMs);
    console.log(`Product sync cron started (interval: ${config.syncIntervalMs / 1000 / 60 / 60}h)`);
  });
}
