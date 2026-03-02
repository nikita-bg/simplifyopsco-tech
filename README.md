# 🤖 AI Voice Receptionist - B2B SaaS

Production-ready FastAPI приложение за AI Voice Receptionist с CRM интеграция и LightRAG analytics.

## 📋 Съдържание

- [Phase 1: n8n Workflow](#phase-1-n8n-workflow)
- [Phase 2: FastAPI Приложение](#phase-2-fastapi-приложение)
- [Инсталация](#инсталация)
- [Конфигурация](#конфигурация)
- [Стартиране](#стартиране)
- [API Endpoints](#api-endpoints)
- [Архитектура](#архитектура)

---

## 🔄 Phase 1: n8n Workflow

### Импортиране на n8n Workflow

1. Отвори n8n
2. Създай нов workflow
3. Импортирай файла `n8n-workflow-ai-receptionist.json`

### Workflow Логика

```
[ElevenLabs Webhook]
    → [Process Data]
    → [AI Routing Decision]
        ├─ [Booking Intent] → [Send to CRM API]
        └─ [Other Intent] → [Skip CRM]
    → [Prepare for LightRAG]
    → [Insert into LightRAG]
    → [Return Response]
```

**Ключови features:**
- ✅ Webhook trigger за ElevenLabs данни
- ✅ AI-базиран routing (booking/reservation intent detection)
- ✅ Generic CRM API connector с dynamic URLs и tokens
- ✅ LightRAG knowledge graph integration
- ✅ Analytics tracking по client_id

---

## 🚀 Phase 2: FastAPI Приложение

Конвертирана версия на n8n workflow в production-ready Python код.

### Технологичен Stack

- **FastAPI** - Modern async web framework
- **httpx** - Async HTTP client за CRM интеграция
- **LightRAG** - Knowledge graph за analytics
- **Pydantic** - Data validation
- **uvicorn** - ASGI сървър

---

## 📦 Инсталация

### Изисквания

- Python 3.10+
- pip

### Стъпки

1. **Клонирай или навигирай до проекта**
   ```bash
   cd c:\Users\Nikita\Desktop\simplifyopsco.tech
   ```

2. **Инсталирай зависимостите**
   ```bash
   pip install -r requirements.txt
   ```

3. **Създай .env файл**
   ```bash
   cp .env.example .env
   ```

4. **Редактирай .env файла** с твоите API keys и конфигурация

---

## ⚙️ Конфигурация

### Environment Variables (.env)

```env
# ElevenLabs API key (опционално)
ELEVENLABS_API_KEY=your_api_key_here

# LightRAG настройки
LIGHTRAG_WORKING_DIR=./lightrag_cache
LIGHTRAG_MODEL_NAME=gpt-4o-mini

# Default CRM настройки
DEFAULT_CRM_API_URL=https://your-crm.com/api/leads
DEFAULT_CRM_BEARER_TOKEN=your_default_token

# Сървър
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

### Per-Client Configuration

За всеки клиент можеш да конфигурираш специфични CRM настройки:

```bash
curl -X POST http://localhost:8000/api/clients/config \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "company-abc",
    "crm_api_url": "https://company-abc-crm.com/api/leads",
    "crm_bearer_token": "abc_token_123",
    "enable_crm_integration": true,
    "booking_keywords": ["booking", "reservation", "meeting"]
  }'
```

---

## 🏃 Стартиране

### Локално (Development)

```bash
# Вариант 1: Директно с Python
python main.py

# Вариант 2: С uvicorn (за повече контрол)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Production

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Сървърът ще стартира на: **http://localhost:8000**

---

## 🔌 API Endpoints

### Core Webhook

#### `POST /webhook/elevenlabs`
Приема webhook от ElevenLabs widget след край на разговор.

**Request Body:**
```json
{
  "client_id": "company-xyz",
  "call_id": "call_12345",
  "transcript": "Hello, I'd like to book a table for 4 people...",
  "intent": "booking",
  "lead_name": "John Doe",
  "lead_phone": "+1234567890",
  "lead_email": "john@example.com",
  "duration": 120,
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Call processed successfully",
  "call_id": "call_12345",
  "crm_sent": true,
  "rag_stored": true
}
```

---

### Client Configuration

#### `POST /api/clients/config`
Създава/обновява client конфигурация.

#### `GET /api/clients/{client_id}/config`
Взима конфигурацията за клиент.

---

### Analytics (LightRAG)

#### `GET /api/analytics/{client_id}/common-questions`
Извлича най-често задаваните въпроси.

**Параметри:**
- `limit` (optional, default=10) - Брой въпроси

**Response:**
```json
{
  "client_id": "company-xyz",
  "common_questions": [
    "What are your opening hours?",
    "Do you have tables available?",
    "Can I book for tomorrow?"
  ]
}
```

#### `GET /api/analytics/{client_id}/lead-stats`
Статистики за lead qualification.

#### `POST /api/analytics/query`
Custom analytics query.

**Request:**
```json
{
  "client_id": "company-xyz",
  "query": "What percentage of calls ended in bookings?",
  "mode": "hybrid"
}
```

---

## 🏗️ Архитектура

### Файлова Структура

```
simplifyopsco.tech/
├── main.py                              # FastAPI приложение
├── models.py                            # Pydantic модели
├── config.py                            # Configuration settings
├── lightrag_service.py                  # LightRAG integration
├── requirements.txt                     # Python dependencies
├── .env                                 # Environment variables
├── .env.example                         # Environment template
├── n8n-workflow-ai-receptionist.json   # n8n workflow за импортиране
├── lightrag_cache/                      # LightRAG storage (auto-created)
└── README.md                            # Тази документация
```

### Data Flow

```
1. ElevenLabs Widget → POST /webhook/elevenlabs
2. FastAPI обработва payload → ProcessedCallData
3. AI Routing → Проверка за booking intent (regex)
4. Ако booking → Async CRM API call (httpx)
5. Всеки call → LightRAG knowledge graph
6. Response → { success, call_id, crm_sent, rag_stored }
```

### Background Tasks

- **CRM Integration**: Изпълнява се асинхронно във фонов режим (не блокира response)
- **LightRAG Insert**: Също асинхронно за бързина

---

## 🧪 Тестване

### Test Webhook Локално

```bash
curl -X POST http://localhost:8000/webhook/elevenlabs \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "test-client",
    "call_id": "test_001",
    "transcript": "Hi, I want to make a reservation for dinner",
    "intent": "booking",
    "lead_name": "Test User",
    "lead_phone": "+123456789",
    "lead_email": "test@example.com",
    "duration": 60,
    "language": "en"
  }'
```

### API Documentation

FastAPI автоматично генерира Swagger UI:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🔐 Security Notes

⚠️ **Production Checklist:**

1. **CORS**: Промени `allow_origins=["*"]` на конкретни домейни
2. **Authentication**: Добави API key authentication за endpoints
3. **HTTPS**: Винаги използвай SSL в production
4. **Rate Limiting**: Добави rate limiting за webhook endpoint
5. **Secrets**: Никога не commit-вай .env файла с реални credentials

---

## 📊 LightRAG Analytics

LightRAG автоматично създава knowledge graph от всички call данни:

- **Per-client tracking**: Всеки client има изолирани данни
- **Intent analysis**: Следене на user intents
- **Lead qualification**: Анализ на conversion rates
- **Common questions**: Автоматично извличане на FAQ patterns

---

## 🛠️ Troubleshooting

### Порт 8000 е зает

```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Или промени порта в .env
PORT=8001
```

### LightRAG не записва данни

1. Провери дали `lightrag_cache/` папката съществува и има write permissions
2. Провери `LIGHTRAG_MODEL_NAME` - трябва валиден OpenAI model
3. Виж logs в конзолата за error messages

---

## 📞 Поддръжка

За въпроси и проблеми:
- GitHub Issues
- Email: support@simplifyops.co

---

## 📝 Лиценз

MIT License - използвай свободно за твоите B2B проекти!

---

**Готово!** 🎉 Имаш production-ready AI Voice Receptionist API.
