# ✅ Setup Checklist - Ръчни стъпки за инструменти

Този файл съдържа checklist на всички ръчни стъпки които трябва да направиш за да работят всички MCP servers и CLI инструменти.

---

## 🔴 ЗАДЪЛЖИТЕЛНИ СТЪПКИ:

### 1. Supabase CLI
- [ ] Инсталирай Scoop (ако нямаш)
- [ ] Инсталирай Supabase CLI чрез Scoop
- [ ] Изпълни `supabase login` в терминала
- [ ] Вземи API key от https://app.supabase.com/account/tokens
- [ ] Добави Supabase skill чрез `/plugin` в Claude Code

### 2. Skill Creator Skill
- [ ] Отвори Claude Code терминал
- [ ] Напиши `/plugin`
- [ ] Потърси "skill creator"
- [ ] Натисни Install

### 3. NotebookLM Authentication
- [ ] Изпълни `npx notebooklm-cli login`
- [ ] Логни се в Google акаунта си през браузъра
- [ ] Разреши permissions
- [ ] Провери с `npx notebooklm-cli list-notebooks`

### 4. Firecrawl API Key
- [ ] Регистрирай се в https://www.firecrawl.dev/
- [ ] Вземи API key от https://www.firecrawl.dev/app/api-keys
- [ ] Изпълни `firecrawl auth` и постави ключа
- [ ] Тествай с `firecrawl scrape https://example.com`

### 5. API Keys в mcp.json
- [ ] **Gemini API Key:**
  - Отвори https://aistudio.google.com/apikey
  - Създай API key
  - Постави в `mcp.json` → `gemini.env.GOOGLE_API_KEY`

- [ ] **GitHub Token:**
  - Отвори https://github.com/settings/tokens
  - Generate new token (classic)
  - Scopes: `repo`, `workflow`, `read:org`
  - Постави в `mcp.json` → `github.env.GITHUB_PERSONAL_ACCESS_TOKEN`

- [ ] **Neon API Key:**
  - Отвори https://console.neon.tech/app/settings/api-keys
  - Generate new API key
  - Постави в `mcp.json` → `Neon.env.NEON_API_KEY`

### 6. Obsidian Setup
- [ ] Изтегли Obsidian от https://obsidian.md/download
- [ ] Инсталирай програмата
- [ ] Създай нов vault (напр. "Claude-Notes")
- [ ] Запомни локацията (напр. `C:\Users\Nikita\Obsidian-Vault`)
- [ ] Кажи на Claude Code да следва Obsidian конвенции

### 7. Vercel Login
- [ ] Изпълни `vercel login` в терминала
- [ ] Избери метод за login (GitHub/Email)
- [ ] Логни се през браузъра
- [ ] Провери с `vercel whoami`

### 8. Playwright Skills
- [ ] Изпълни `npx playwright-cli install-skills`
- [ ] Или клонирай skill repo ръчно

---

## 🧪 ФИНАЛНА ПРОВЕРКА:

След като завършиш всички горни стъпки, изпълни тези команди за да провериш дали всичко работи:

```bash
# Провери CLI инструменти
supabase --version
vercel --version
gh --version
playwright --version
firecrawl --version

# Провери NotebookLM
npx notebooklm-cli list-notebooks

# Провери MCP servers (рестартирай Claude Code първо!)
# След рестарт, питай Claude:
# "List all available MCP servers and their status"

# Провери skills
# В Claude Code напиши:
# "/skills list"
```

---

## 📝 ВАЖНИ БЕЛЕЖКИ:

### След попълване на API keys:
⚠️ **ЗАДЪЛЖИТЕЛНО РЕСТАРТИРАЙ CLAUDE CODE** за да заредят новите MCP конфигурации!

### Локации на важни файлове:
- **MCP Config:** `C:\Users\Nikita\.claude\mcp.json`
- **Skills Directory:** `C:\Users\Nikita\.claude\skills\`
- **Project:** `C:\Users\Nikita\Desktop\simplifyopsco.tech\`

### За проекта AI Voice Receptionist:
За **production**, попълни и тези environment variables в `.env`:
```env
# LightRAG (за analytics)
OPENAI_API_KEY=your_openai_key_here

# CRM Integration
DEFAULT_CRM_API_URL=https://your-crm.com/api/leads
DEFAULT_CRM_BEARER_TOKEN=your_token_here

# ElevenLabs (опционално)
ELEVENLABS_API_KEY=your_api_key_here
```

---

## ✅ СТАТУС НА ИНСТРУМЕНТИ:

### Вече инсталирани и работещи:
- ✅ n8n-MCP (v2.35.5)
- ✅ Gemini MCP (v1.0.31) - NEEDS API KEY
- ✅ Stitch MCP (v0.4.0) - HAS API KEY
- ✅ Neon MCP - NEEDS API KEY
- ✅ GSD Framework (v1.22.0)
- ✅ Vercel CLI (v50.13.2) - NEEDS LOGIN
- ✅ GitHub CLI (v2.86.0) - NEEDS TOKEN
- ✅ Playwright CLI (v1.58.0)
- ✅ Firecrawl CLI (v1.9.8) - NEEDS API KEY
- ✅ Excalidraw Diagram Skill
- ✅ NotebookLM Skill - NEEDS LOGIN
- ✅ Obsidian Skills
- ✅ Claude Mem
- ✅ Superpowers
- ✅ UI/UX Pro Max

### Изискват ръчна инсталация:
- ⚠️ Supabase CLI - следвай стъпките по-горе
- ⚠️ Skill Creator Skill - използвай `/plugin`

---

**Последна актуализация:** 2026-03-10
**Проект:** AI Voice Receptionist - simplifyopsco.tech
