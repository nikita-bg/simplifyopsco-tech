# 🔌 MCP Servers Setup - Инструкции за инсталация

Този файл съдържа инструкции за инсталиране на препоръчаните MCP servers и Claude Code skills.

## 📋 Какво е MCP?

Model Context Protocol (MCP) - стандарт за свързване на LLM модели с външни инструменти и системи.

---

## 🛠️ Инсталация на MCP Servers

### 1. **n8n-MCP** (За n8n workflow автоматизация)

Дава на Claude дълбоко познание на всички 1,084 n8n nodes за построяване на production-ready workflows.

#### Инсталация:

```bash
# Глобална инсталация
npm install -g czlonkowski-n8n-mcp

# Или използвай npx (без инсталация)
npx czlonkowski-n8n-mcp
```

#### Конфигурация в Claude Code:

Добави в `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["-y", "czlonkowski-n8n-mcp"]
    }
  }
}
```

#### Проверка:

```bash
npx -y czlonkowski-n8n-mcp --help
```

---

### 2. **Gemini MCP** ✅ ИНСТАЛИРАН (За frontend с Gemini 1.5 Pro)

Интеграция с Google Gemini API за multimodal AI, image/video generation.

#### Инсталация:

```bash
npm install -g @fre4x/gemini
```

✅ **Вече инсталиран!** (v1.0.31)

#### Конфигурация:

```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["-y", "@fre4x/gemini"],
      "env": {
        "GOOGLE_API_KEY": "your_gemini_api_key_here"
      }
    }
  }
}
```

✅ **Вече конфигуриран в `~/.claude/mcp.json`!**

---

### 3. **Stitch MCP** ✅ ИНСТАЛИРАН (AI-powered UI/UX Design Tool)

Google Stitch - AI инструмент за UI/UX дизайн и frontend генериране (като Figma).

#### Инсталация:

```bash
npm install -g @_davideast/stitch-mcp
```

✅ **Вече инсталиран!** (v0.4.0 - официална версия)

#### Конфигурация с API Key (препоръчано):

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["-y", "@_davideast/stitch-mcp", "proxy"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "your_project_id",
        "STITCH_API_KEY": "your_stitch_api_key"
      }
    }
  }
}
```

✅ **Вече конфигуриран в `~/.claude/mcp.json` с API key!**

**Как да вземеш Stitch API Key:**

1. Отвори [Google AI Studio](https://aistudio.google.com/apikey)
2. Създай нов API key за Stitch
3. Копирай API ключа
4. Добави го в `~/.claude/mcp.json` като `STITCH_API_KEY`

**Алтернативни методи за authentication:**

- `STITCH_API_KEY` - Директен API key (без gcloud) ✅ Използван
- `STITCH_ACCESS_TOKEN` - Pre-existing access token
- `STITCH_USE_SYSTEM_GCLOUD` - Използва system gcloud configuration

**Възможности:**
- 🎨 AI-генериране на UI компоненти
- 📐 Дизайн система като Figma
- 🚀 Директно frontend code generation
- 🔗 Интеграция с Google Cloud
- 📱 Responsive design generation

---

## 🎯 Препоръчани Claude Code Skills

### 3. **Obsidian Skills** (7K+ stars)

AI-powered second brain с Obsidian интеграция.

#### Инсталация:

```bash
git clone https://github.com/kepano/obsidian-skills.git ~/.claude/skills/obsidian-skills
```

#### Активиране:

```bash
claude skill install obsidian-skills
```

---

### 4. **UI/UX Pro Max Skill** (16K+ stars)

50+ UI styles, 97 color palettes, 57 font pairings.

#### Инсталация:

```bash
git clone https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git ~/.claude/skills/ui-ux-pro-max
```

---

### 5. **Claude Mem** (20K+ stars)

Persistent memory за Claude Code - автоматично capture на контекст.

#### Инсталация:

```bash
npm install -g @thedotmack/claude-mem

# Или git clone
git clone https://github.com/thedotmack/claude-mem.git ~/.claude/skills/claude-mem
```

---

### 6. **GSD (Get Shit Done)** Framework

Spec-driven development с verification.

#### Инсталация (One-command):

```bash
npx get-shit-done-cc
```

#### Или permanent:

```bash
npm install -g get-shit-done-cc
```

---

### 7. **Superpowers** (28K+ stars)

Auto-enforces brainstorming, planning, TDD, code review.

#### Инсталация:

```bash
git clone https://github.com/obra/superpowers.git ~/.claude/skills/superpowers

# Активиране
claude skill install superpowers
```

---

### 8. **Awesome Claude Code** (20K+ stars)

Master directory на всички Claude Code skills.

#### Reference:

```bash
# Просто запази линка за справка
# https://github.com/hesreallyhim/awesome-claude-code
```

---

## 🔧 Пълна MCP Конфигурация

Създай файл `~/.claude/mcp.json` със следното съдържание:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["-y", "czlonkowski-n8n-mcp"],
      "description": "n8n workflow automation with 1,084 nodes"
    },
    "stitch": {
      "command": "stitch-mcp",
      "env": {
        "GOOGLE_API_KEY": "${GOOGLE_API_KEY}"
      },
      "description": "Google Gemini 1.5 Pro frontend generation"
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\Users\\Nikita\\Desktop"],
      "description": "Local filesystem access"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      },
      "description": "GitHub integration"
    }
  }
}
```

---

## 🚀 Бърз Setup (Copy-Paste)

### За Windows PowerShell:

```powershell
# Създай MCP config директория
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude"

# Създай празен mcp.json ако не съществува
if (-not (Test-Path "$env:USERPROFILE\.claude\mcp.json")) {
    @"
{
  "mcpServers": {}
}
"@ | Out-File -FilePath "$env:USERPROFILE\.claude\mcp.json" -Encoding UTF8
}

# Инсталирай n8n-MCP
npm install -g czlonkowski-n8n-mcp

# Провери инсталацията
npx -y czlonkowski-n8n-mcp --help
```

### За Git Bash / WSL:

```bash
# Създай config
mkdir -p ~/.claude
echo '{"mcpServers":{}}' > ~/.claude/mcp.json

# Инсталирай n8n-MCP
npm install -g czlonkowski-n8n-mcp

# Инсталирай skills
mkdir -p ~/.claude/skills
cd ~/.claude/skills

# Clone популярни skills
git clone https://github.com/kepano/obsidian-skills.git
git clone https://github.com/thedotmack/claude-mem.git
git clone https://github.com/obra/superpowers.git
```

---

## ✅ Проверка на инсталацията

### Провери дали MCP servers работят:

```bash
# n8n-MCP
npx -y czlonkowski-n8n-mcp --version

# Провери списъка на налични tools
npx @modelcontextprotocol/inspector npx -y czlonkowski-n8n-mcp
```

### Провери Claude skills:

```bash
# Листни инсталирани skills
claude skills list

# Виж статус
claude status
```

---

## 📝 Environment Variables

Създай `.env` файл или добави в system environment:

```env
# Google Gemini API (за Stitch MCP)
GOOGLE_API_KEY=your_gemini_api_key_here

# GitHub Token (за GitHub MCP)
GITHUB_TOKEN=your_github_token_here

# OpenAI (за LightRAG)
OPENAI_API_KEY=your_openai_key_here
```

### Windows Environment Variables:

```powershell
# PowerShell - задай permanent env vars
[System.Environment]::SetEnvironmentVariable('GOOGLE_API_KEY', 'your_key', 'User')
[System.Environment]::SetEnvironmentVariable('GITHUB_TOKEN', 'your_token', 'User')
```

---

## 🐛 Troubleshooting

### MCP Server не стартира:

1. Провери Node.js версия: `node --version` (трябва >=18)
2. Изчисти npm cache: `npm cache clean --force`
3. Рестартирай Claude Code

### Skill не се зарежда:

1. Провери пътя: `ls ~/.claude/skills/`
2. Провери permissions
3. Рестартирай Claude

### n8n-MCP не работи:

```bash
# Реинсталирай
npm uninstall -g czlonkowski-n8n-mcp
npm install -g czlonkowski-n8n-mcp

# Или използвай npx (без инсталация)
npx -y czlonkowski-n8n-mcp
```

---

## 📚 Допълнителни ресурси

- **MCP Documentation**: https://modelcontextprotocol.io/
- **Claude Code Docs**: https://docs.anthropic.com/claude-code
- **n8n MCP GitHub**: https://github.com/czlonkowski/n8n-mcp
- **Awesome Claude Code**: https://github.com/hesreallyhim/awesome-claude-code

---

## 🎉 Следващи стъпки

След инсталация:

1. ✅ Рестартирай Claude Code
2. ✅ Провери дали MCP servers са налични: `claude mcp list`
3. ✅ Тествай с команда: `/n8n create workflow`
4. ✅ За frontend: Използвай Stitch MCP с Gemini
5. ✅ Активирай skills: `claude skill enable superpowers`

---

**Готово!** 🚀 Сега имаш пълен setup с n8n-MCP, Stitch, и топ Claude Code skills!
