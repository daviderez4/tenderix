# Tenderix

AI Tender Intelligence - מערכת AI לניתוח מכרזים וקבלת החלטות

## ארכיטקטורה

```
frontend/               React 19 + Vite + TypeScript
  src/
    api/                Supabase client + Edge Function calls
    components/         Sidebar, Login
    pages/              Dashboard, GatesPage, CompanyProfilePage
    index.css           Design system (Electric Blue + Dark Gray)

supabase/
  functions/
    _shared/            Supabase admin client, Claude AI client
    gate-analyze/       Gate conditions AI analysis

database/
  schema/               Database schema definitions
  migrations/           SQL migrations
  seeds/                Test data (passing + failing company profiles)
```

## מודולים

| מודול | סטטוס | תיאור |
|-------|--------|-------|
| Dashboard | פעיל | Winning Decision Center - סקירת מכרזים |
| Gatekeeping | פעיל | ניתוח תנאי סף + AI matching |
| Company Profile | פעיל | ניהול פרופיל חברה |
| SOW Analyzer | בפיתוח | ניתוח תכולות ועבודות נסתרות |
| BOQ Heatmap | בפיתוח | מפת חום תמחור |
| Contract Advantage | בפיתוח | ניתוח חוזה |
| Competitive Intel | בפיתוח | מודיעין תחרותי |

## טכנולוגיות

- **Frontend:** React 19 + Vite + TypeScript
- **Backend:** Supabase Edge Functions (Deno/TypeScript)
- **Database:** Supabase PostgreSQL
- **AI:** Claude API (Anthropic)
- **Deploy:** Vercel (frontend) + Supabase (backend)

## התקנה

```bash
# Frontend
cd frontend && npm install && npm run dev

# Edge Functions deploy
npx supabase functions deploy gate-analyze --project-ref rerfjgjwjqodevkvhkxu
```

## Supabase Secrets

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref rerfjgjwjqodevkvhkxu
```
