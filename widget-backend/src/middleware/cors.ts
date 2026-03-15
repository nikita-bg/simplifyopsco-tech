import cors from 'cors';
import { config } from '../config.js';

// Public endpoints — allow any origin
export const publicCors = cors({ origin: '*' });

// Widget-only endpoints — only allow widget iframe origin
export const widgetCors = cors({
  origin: config.widgetOrigin,
  credentials: false,
});
