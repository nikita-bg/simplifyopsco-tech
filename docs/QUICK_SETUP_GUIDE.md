# ⚡ Бърз Setup Guide - Първи Път

**За:** Никита - AI Voice Receptionist проект
**Дата:** 2026-03-10
**Цел:** Първоначална настройка на всички инструменти

---

## 📋 CHECKLIST - КАКВО ТРЯБВА ДА НАПРАВИШ:

### ✅ ВЕЧЕ ГОТОВО:
- [x] Supabase CLI (използвай с `npx supabase`)
- [x] Skill Creator (сега се инсталира)
- [x] GSD Framework (v1.22.0)
- [x] NotebookLM Skill
- [x] Obsidian Skills
- [x] Vercel CLI (v50.13.2)
- [x] Playwright CLI (v1.58.0)
- [x] GitHub CLI (v2.86.0)
- [x] Firecrawl CLI (v1.9.8)
- [x] Excalidraw Skill
- [x] Neon MCP (добавен в mcp.json)

### ⚠️ ОСТАВА ДА НАПРАВИШ:

#### 1. Довърши Skill Creator инсталацията (СЕГА!)
В терминала който се е отворил:
- [ ] Използвай `Space` за да селектираш "skill-creator"
- [ ] Натисни `Enter` за да инсталираш

#### 2. Вземи GitHub Token (5 минути)
- [ ] Отвори: https://github.com/settings/tokens
- [ ] "Generate new token (classic)"
- [ ] Scopes: `repo`, `workflow`, `read:org`
- [ ] Копирай token-а
- [ ] Отвори: `C:\Users\Nikita\.claude\mcp.json`
- [ ] Намери секцията `"github"`
- [ ] Постави token-а в `GITHUB_PERSONAL_ACCESS_TOKEN`

```json
"github": {
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxxx"  // Твоят token тук
  }
}
```

#### 3. Вземи Gemini API Key (5 минути)
- [ ] Отвори: https://aistudio.google.com/apikey
- [ ] "Create API Key"
- [ ] Копирай ключа
- [ ] Отвори: `C:\Users\Nikita\.claude\mcp.json`
- [ ] Намери секцията `"gemini"`
- [ ] Постави ключа в `GOOGLE_API_KEY`

```json
"gemini": {
  "env": {
    "GOOGLE_API_KEY": "AIzaSyxxxxxxxxxxxxx"  // Твоят ключ тук
  }
}
```

#### 4. Вземи Neon API Key (5 минути) - ПРЕПОРЪЧВАМ!
**Вместо Supabase, използвай Neon за проекта!**

- [ ] Отвори: https://console.neon.tech/app/settings/api-keys
- [ ] "Generate new API key"
- [ ] Копирай ключа
- [ ] Отвори: `C:\Users\Nikita\.claude\mcp.json`
- [ ] Намери секцията `"Neon"`
- [ ] Постави ключа в `NEON_API_KEY`

```json
"Neon": {
  "env": {
    "NEON_API_KEY": "neon_xxx"  // Твоят ключ тук
  }
}
```

#### 5. Рестартирай Claude Code (ЗАДЪЛЖИТЕЛНО!)
- [ ] Затвори Claude Code напълно
- [ ] Отвори отново
- [ ] MCP servers ще се заредят автоматично

#### 6. Vercel Login (2 минути)
```bash
vercel login
# Избери метод (GitHub, Email, etc.)
# Логни се през браузъра
```

#### 7. NotebookLM Login (2 минути)
```bash
npx notebooklm-cli login
# Отваря браузър
# Логни се с Google акаунт
```

#### 8. Firecrawl API Key (5 минути)
- [ ] Отвори: https://www.firecrawl.dev/
- [ ] "Get API Key"
- [ ] Регистрирай се
- [ ] Копирай API key от: https://www.firecrawl.dev/app/api-keys
- [ ] В терминала:
```bash
firecrawl auth
# Постави API ключа
```

---

## 🎯 ЗАЩО ВСЕКИ API KEY:

| API Key | Защо е нужен | Използване в проекта |
|---------|--------------|----------------------|
| **GitHub Token** | За git operations с Claude Code | Push, PR, Issues |
| **Gemini API** | За генериране на изображения/видео | UI mockups, promotional materials |
| **Neon API** | За PostgreSQL база данни (вместо Supabase) | Call data storage, analytics |
| **Firecrawl API** | За web scraping | CRM data extraction, research |

---

## 🚀 СЛЕД SETUP - ТЕСТВАЙ:

### Тест 1: MCP Servers
След рестарт на Claude Code, питай:
```
"List all available MCP servers"
```
Трябва да видиш: n8n, gemini, stitch, github, Neon, filesystem

### Тест 2: Neon Database
```
"Create a new Neon project called 'ai-voice-receptionist'"
```

### Тест 3: GitHub CLI
```bash
gh auth status
```

### Тест 4: Vercel
```bash
vercel whoami
```

### Тест 5: NotebookLM
```bash
npx notebooklm-cli list
```

---

## 💡 ТВОЯТ AI VOICE RECEPTIONIST STACK:

След setup, ще имаш:

### Backend:
- ✅ **FastAPI** - вече написан
- ✅ **Neon PostgreSQL** - за call data
- ✅ **LightRAG** - за analytics

### Automation:
- ✅ **n8n-MCP** - workflow automation
- ✅ **Firecrawl** - CRM scraping
- ✅ **NotebookLM** - data analysis

### Development:
- ✅ **GitHub CLI** - git operations
- ✅ **Vercel CLI** - deployment
- ✅ **GSD Framework** - project management

### AI Tools:
- ✅ **Gemini** - multimodal AI
- ✅ **Skill Creator** - custom skills
- ✅ **Excalidraw** - diagrams

---

## 🆘 АКО НЕЩО НЕ РАБОТИ:

### GitHub Token не работи:
```bash
# Провери статус:
gh auth status

# Refresh login:
gh auth login
```

### MCP Servers не се зареждат:
1. Провери `~/.claude/mcp.json` за грешки в JSON
2. Рестартирай Claude Code
3. Провери дали има грешки в: Help → View Logs

### Neon API не работи:
- Провери дали API ключът е валиден: https://console.neon.tech/app/settings/api-keys
- Провери дали си го поставил правилно в `mcp.json`

---

## 📞 ПОМОЩ:

Ако имаш въпроси:
1. Провери [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)
2. Провери [VIDEO_ANALYSIS.md](./VIDEO_ANALYSIS.md)
3. Питай Claude Code директно!

---

**ВАЖНО:** След като довършиш всички стъпки, рестартирай Claude Code за да заредят всички MCP servers!

**Готово!** След това можеш да започнеш да използваш AI Voice Receptionist проекта с всички инструменти! 🎉
