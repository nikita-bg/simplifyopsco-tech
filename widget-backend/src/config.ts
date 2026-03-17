export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  widgetOrigin: process.env.WIDGET_ORIGIN || 'http://localhost:5173',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || String(6 * 60 * 60 * 1000), 10), // 6 hours
};
