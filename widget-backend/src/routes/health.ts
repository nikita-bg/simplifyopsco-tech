import { Router } from 'express';

const router = Router();

const startTime = Date.now();

router.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

export default router;
