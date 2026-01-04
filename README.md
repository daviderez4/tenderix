# Tenderix

מערכת אוטומציה לניתוח ועיבוד מכרזים

## סקירה

Tenderix היא מערכת המשלבת AI ואוטומציה לעיבוד מכרזים, כולל:
- קליטה וניתוח מסמכי מכרז
- זיהוי תנאי סף ודרישות
- הפקת מפרטים טכניים
- ניתוח מתחרים

## מבנה הפרויקט

```
tenderix-dev/
├── config/              # קבצי קונפיגורציה
├── database/
│   ├── schema/          # סכמת DB
│   └── migrations/      # מיגרציות
├── docs/                # תיעוד
├── mcp-server/
│   └── src/             # MCP Server לאינטגרציה עם Claude
├── n8n/
│   ├── workflows/       # תהליכי n8n
│   └── backup/          # גיבויים
├── prompts/
│   ├── core/            # פרומפטים בסיסיים
│   ├── p1-intake/       # שלב 1: קליטת מכרז
│   ├── p2-gates/        # שלב 2: תנאי סף
│   ├── p3-specs/        # שלב 3: מפרטים
│   └── p4-competitors/  # שלב 4: מתחרים
└── scripts/             # סקריפטים
```

## שלבי העיבוד

| שלב | תיאור | תיקייה |
|-----|-------|--------|
| P1 | קליטת מכרז וחילוץ מידע בסיסי | `prompts/p1-intake` |
| P2 | ניתוח תנאי סף (Go/No-Go) | `prompts/p2-gates` |
| P3 | הפקת מפרטים טכניים | `prompts/p3-specs` |
| P4 | ניתוח מתחרים והערכת סיכויים | `prompts/p4-competitors` |

## טכנולוגיות

- **Automation:** n8n
- **AI:** Claude API / OpenAI
- **Database:** Supabase (PostgreSQL)
- **Integration:** MCP Server

## התקנה

```bash
# Clone
git clone <repo-url>
cd tenderix-dev

# Install MCP server dependencies
cd mcp-server && npm install

# Configure
cp config/.env.example config/.env
# Edit .env with your credentials
```

## הרצה

```bash
# Start n8n workflows
# Import workflows from n8n/workflows/

# Start MCP server
cd mcp-server && npm start
```

## רישיון

פרויקט פרטי - כל הזכויות שמורות
