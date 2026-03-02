# 🚀 Quick Start - AI Voice Receptionist

## 📁 Структура на проекта

```
simplifyopsco.tech/
├── main.py                              # FastAPI сървър (стартирай този файл!)
├── models.py                            # Data models
├── config.py                            # Configuration
├── lightrag_service.py                  # LightRAG integration
├── requirements.txt                     # Python dependencies ✅ ИНСТАЛИРАНИ
├── .env                                 # Environment variables (попълни API keys)
├── n8n-workflow-ai-receptionist.json   # n8n workflow за импортиране
├── README.md                            # Пълна документация
├── MCP_SETUP.md                         # MCP servers setup guide
└── QUICKSTART.md                        # Този файл
```

---

## ⚡ Стартиране на FastAPI сървъра (2 команди)

### Вариант 1: Директно с Python

```bash
cd c:\Users\Nikita\Desktop\simplifyopsco.tech
python main.py
```

### Вариант 2: С uvicorn (препоръчително)

```bash
uvicorn main:app --reload
```

**Сървърът ще стартира на:** http://localhost:8000

---

## 🔗 Полезни линкове след стартиране

- **API Documentation (Swagger)**: http://localhost:8000/docs
- **Alternative Docs (ReDoc)**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/

---

## 🧪 Тестване на API

### Test Webhook с curl:

```bash
curl -X POST http://localhost:8000/webhook/elevenlabs ^
  -H "Content-Type: application/json" ^
  -d "{\"client_id\":\"test-client\",\"call_id\":\"test_001\",\"transcript\":\"Hi, I want to make a reservation\",\"intent\":\"booking\",\"lead_name\":\"John Doe\",\"lead_phone\":\"+123456789\",\"lead_email\":\"john@example.com\",\"duration\":60,\"language\":\"en\"}"
```

### Test с PowerShell:

```powershell
$body = @{
    client_id = "test-client"
    call_id = "test_001"
    transcript = "Hi, I want to make a reservation"
    intent = "booking"
    lead_name = "John Doe"
    lead_phone = "+123456789"
    lead_email = "john@example.com"
    duration = 60
    language = "en"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/webhook/elevenlabs" -Method POST -Body $body -ContentType "application/json"
```

---

## ⚙️ Конфигурация

### 1. Попълни .env файла

```env
# ElevenLabs (опционално)
ELEVENLABS_API_KEY=your_key_here

# LightRAG (за analytics)
LIGHTRAG_WORKING_DIR=./lightrag_cache
LIGHTRAG_MODEL_NAME=gpt-4o-mini

# Default CRM settings
DEFAULT_CRM_API_URL=https://your-crm.com/api/leads
DEFAULT_CRM_BEARER_TOKEN=your_bearer_token

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

### 2. Конфигурирай CRM за конкретен клиент

```bash
curl -X POST http://localhost:8000/api/clients/config \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "company-abc",
    "crm_api_url": "https://company-abc-crm.com/api/leads",
    "crm_bearer_token": "abc_token_123",
    "enable_crm_integration": true
  }'
```

---

## 📊 n8n Workflow Setup

### Стъпки:

1. **Отвори n8n** (https://app.n8n.io/ или локално)
2. **Създай нов workflow**
3. **Импортирай**: `n8n-workflow-ai-receptionist.json`
4. **Активирай** workflow-а
5. **Копирай webhook URL** от trigger node
6. **Тествай** с POST request към webhook URL

---

## 🔌 MCP Servers (за напреднали)

### n8n-MCP е вече конфигуриран!

Файлът `~/.claude/mcp.json` е създаден с:
- ✅ **n8n-MCP** - пълна база от знания за 1,084 n8n nodes
- ✅ **Filesystem MCP** - достъп до локални файлове
- ✅ **GitHub MCP** - интеграция с GitHub (добави token)

### Как да активираш:

1. **Рестартирай Claude Code**
2. **Провери**: MCP servers трябва да са видими в статус бара
3. **Използвай**: Просто питай Claude за n8n workflows!

### Допълнителни MCP инсталации:

Виж [MCP_SETUP.md](MCP_SETUP.md) за:
- Stitch MCP (Gemini 1.5 Pro frontend)
- Obsidian Skills
- UI/UX Pro Max
- Claude Mem
- Superpowers
- И още...

---

## 🎯 Типичен Use Case Flow

```
1. ElevenLabs AI Widget → Завършен разговор
2. ElevenLabs → POST /webhook/elevenlabs
3. FastAPI → Обработва данните
4. Ако intent = "booking" → Изпраща към CRM (async)
5. Винаги → Съхранява в LightRAG (async)
6. Response → { success: true, call_id, crm_sent, rag_stored }
```

---

## 📈 Analytics Endpoints

### Получи чести въпроси:

```bash
curl http://localhost:8000/api/analytics/test-client/common-questions?limit=10
```

### Получи lead статистики:

```bash
curl http://localhost:8000/api/analytics/test-client/lead-stats
```

### Custom query:

```bash
curl -X POST "http://localhost:8000/api/analytics/query?client_id=test-client&query=What%20are%20common%20booking%20patterns?&mode=hybrid"
```

---

## 🐛 Troubleshooting

### Port 8000 е зает?

```bash
# Промени порта в .env
PORT=8001

# Или kill процеса (Windows)
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### LightRAG грешки?

1. Провери дали `lightrag_cache/` папката има write permissions
2. Провери `LIGHTRAG_MODEL_NAME` в .env
3. Виж error logs в конзолата

### Python package грешки?

```bash
# Реинсталирай dependencies
pip install --upgrade -r requirements.txt
```

---

## 📞 Следващи стъпки

1. ✅ Стартирай FastAPI: `python main.py`
2. ✅ Отвори Swagger UI: http://localhost:8000/docs
3. ✅ Тествай webhook endpoint
4. ✅ Импортирай n8n workflow
5. ✅ Конфигурирай CRM integration
6. ✅ Тествай с реални ElevenLabs данни

---

## 🎉 Готово!

Имаш production-ready AI Voice Receptionist API!

За въпроси: Виж [README.md](README.md) за пълна документация.
