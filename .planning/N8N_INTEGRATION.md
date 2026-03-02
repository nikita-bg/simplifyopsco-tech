# n8n RAG Workflow Integration

## Webhook Endpoints

### 1. Voice Agent RAG (ElevenLabs → n8n → Supabase)
- **URL**: `https://n8n.thenebulaai.io/webhook/dcf62ee0-bf2b-4d45-9d6b-f370df80033f`
- **Method**: POST
- **Purpose**: ElevenLabs voice agent calls this when it needs knowledge_base tool answers
- **Uses**: GPT-4.1-mini + Supabase Vector Store (`documents` table)
- **Memory**: Buffer window per `call_id`

### 2. Chat RAG Agent (Website Chat → n8n → Supabase + Google Sheets)
- **URL**: `https://simplifyopsco.app.n8n.cloud/webhook/1dca5027-cb48-4d82-8a51-9cc6c1585606`
- **Method**: POST
- **Body**: `{ sessionId, message, username, name }`
- **Uses**: GPT-4.1-mini + Supabase Vector Store (`documents` table)
- **Memory**: Buffer window per `sessionId`
- **System prompt**: Leo (SimplifyOps Co. AI business assistant)
- **Post-processing**: Lead scoring → Google Sheets (`Lead class id`)

### 3. Google Drive Auto-Sync
- **Folder**: `1OqlU38yt3x-UD6RvbMKyC85SoTeZAg63` ("Knowledge Base")
- **Trigger**: Every minute on file update
- **File types**: wav (→ transcribe), jpeg/png (→ GPT-4o analyze), pdf/docx (→ direct embed)
- **Target**: Supabase `documents` vector store with OpenAI embeddings

### 4. Manual Knowledge Base Insert
- **Trigger**: Manual test workflow
- **Flow**: Set fields → Supabase Vector Store insert

## Supabase Vector Store
- **Table**: `documents` (used by n8n langchain vector store nodes)
- **Embeddings**: OpenAI (default model)
- **Credentials**: Supabase account `8NbRObArLWaBviyD`

## Environment Variables Needed
```
N8N_CHAT_WEBHOOK_URL=https://simplifyopsco.app.n8n.cloud/webhook/1dca5027-cb48-4d82-8a51-9cc6c1585606
```
