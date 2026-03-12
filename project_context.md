# 🧠 Project Context & Architecture: AI Voice Shopping Assistant (simplifyopsco)

Този файл съдържа цялостна информация за архитектурата, структурата и основните компоненти на проекта. Създаден е, за да служи като бърза справка и контекст при по-нататъшна разработка.

## 🏢 Общ преглед (Overview)

Проектът представлява **AI Voice Shopping Assistant (Vocalize AI)** — интелигентен гласов асистент за онлайн магазини (Shopify и други платформи). Той приема разговори чрез ElevenLabs, анализира ги с OpenAI, интегрира се със системите на магазина (продукти, поръчки, колички) и предоставя Analytics Dashboard.

Проектът е структуриран като **Monorepo** с 3 основни слоя:
1. **`backend/`** - FastAPI (Python) сървър (Core логика, Webhooks, AI, Analytics)
2. **`frontend/`** - Next.js (React) приложение (Клиентски Dashboard / Admin Panel)
3. **`ai-voice-shopping-assistant/`** - Shopify App (Remix + Prisma) & Theme App Extension

---

## 📂 Файлова структура и Компоненти

### 1. `backend/` (FastAPI Cървър)
Това е сърцето на логиката. Обработва комуникацията между AI гласа, магазина и базата данни.
- **`main.py`**: Главният entry point. Дефинира API endpoints (CORS, Shopify OAuth endpoints, Webhook-ове за ElevenLabs, GDPR endpoints, Dashboard статистики, Widget Installation API).
- **`database.py`**: Управление на връзката с базата данни (най-вероятно PostgreSQL / Neon).
- **`models.py`**: Pydantic модели за валидация на данните (Payloads, Webhooks, DashboardStats).
- **`shopify_service.py`**: Логика за комуникация с Shopify API (синхронизация на каталога с продукти, инсталация на app-а).
- **`recommendation_engine.py`**: AI логика за търсене и препоръчване на продукти въз основа на запитванията на клиентите.
- **`security_middleware.py`**: Защити, ratelimiting и санитаризация на входните данни.
- Използва се и LightRAG (за знания и търсене из документите), както е описано в първоначалния root `README.md`.

### 2. `frontend/` (Next.js Dashboard)
Това е потребителският интерфейс (B2B SaaS Dashboard), където собствениците на магазини влизат, за да гледат анализи.
- **Технологичен стак**: Next.js 16 (App/Pages router), React 19, Tailwind CSS v4, Framer Motion, Recharts.
- Използва `@elevenlabs/react` за интеграции с ElevenLabs.
- Основната му цел е да визуализира данните, идващи от `backend/main.py` (`/api/dashboard/stats`).

### 3. `ai-voice-shopping-assistant/` (Shopify App)
Специализирано приложение за Shopify екосистемата, базирано на официалния Remix template на Shopify.
- **Технологичен стак**: Shopify App Bridge, Remix, React Router v7, Prisma, Vite.
- **`app/` (Remix routes)**: Логика за Shopify Admin страницата на приложението.
- **`extensions/ai-voice-widget/`**: Shopify Theme App Extension — това е същинският уиджет (бутонът за гласово обаждане), който се визуализира в онлайн магазина на крайните клиенти.

---

## 🔄 Потоци на информация (Data Flows)

### Как работи гласовото обаждане:
1. Клиентът натиска уиджета в магазина (инсталиран чрез Shopify Theme Extension или обикновен `<script>` таг).
2. Започва разговор през ElevenLabs Conversational AI.
3. След края на разговора, ElevenLabs изпраща Webhook към `backend` (`POST /webhook/elevenlabs/post-call`).
4. `main.py` приема записа (transcript), подава го към OpenAI (`gpt-4o-mini`) за анализ на намерението (Intent, Sentiment, Purchase Intent, споменати продукти).
5. Данните се записват в базата данни.

### Инсталация на Widget:
- **За Shopify**: Търговецът инсталира Remix App-а, OAuth минава през `backend` (`/shopify/auth` и `/shopify/callback`), продуктите се синхронизират автоматично. Уиджетът се пуска през Theme App Extensions.
- **За други сайтове (Non-Shopify)**: Next.js Frontend-а има `/install` страница. `backend` предоставя `<script>` таг (embed code) чрез `POST /api/install`, който търговецът слага в сайта си. Приложението сервира `widget-embed.js` файла директно от `backend/`.

---

## ⚙️ Технологии и Зависимости
- **База данни**: PostgreSQL (управлявана с Prisma в Shopify app-а и с raw asyncpg/SQLAlchemy в Python backend-а).
- **Сървъри/Хостинг**: Railway configuration (`railway.json`, `Procfile`) и Vercel (`netlify.toml` / Next.js Vercel deploy).
- **AI/LLMs**: OpenAI API за анализ на транскрипции, ElevenLabs за гласов синтез/разпознаване.

## 🚀 Важни команди за разработка

- **Backend стартиране**:
  ```bash
  cd backend
  uvicorn main:app --reload --port 8000
  ```
- **Frontend стартиране**:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
- **Shopify App стартиране**:
  ```bash
  cd ai-voice-shopping-assistant
  npm run dev
  ```

Този документ предоставя фундаменталния контекст и трябва да служи като отправна точка при добавяне на нови функционалности или дебъгване на грешки в екосистемата.
