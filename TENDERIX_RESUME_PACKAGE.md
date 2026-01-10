# 🔄 TENDERIX - חבילת המשכיות לקלוד קוד
## העתק והדבק את כל הקובץ הזה כשפותחים סשן חדש

---

# 📋 פקודת המשך (RESUME PROMPT)

```
אני דוד, ממשיך לפתח את Tenderix - מערכת מודיעין מכרזים.

## מצב נוכחי:
- התקדמות: 6% (2 מתוך 31 מודולים)
- Workflow פעיל: Tenderix V6 - Step 1-2 בלבד
- DB: מוכן (27 טבלאות ב-Supabase)

## מה עובד:
✅ קליטת מסמכים (Webhook + OCR + Claude)
✅ שמירה ב-Supabase

## מה לא עובד / לא קיים:
❌ Step 3: Gate Conditions (נכשל/נמחק)
❌ כל שאר 29 המודולים

## המשימה הבאה:
[ראה סעיף "משימה נוכחית" למטה]

## כללי עבודה:
1. תמיד לבנות מחדש, לא לתקן
2. n8n + Supabase = REST API בלבד
3. כל output חייב עקיבות (קובץ, עמוד, סעיף, ציטוט)
4. לעדכן את קובץ ה-PROGRESS אחרי כל שלב

בבקשה קרא את המפרט המצורף והמשך מהמשימה הנוכחית.
```

---

# 🎯 משימה נוכחית

## סטטוס: לא התחיל ❌

## משימה: בניית Step 3 - Gate Conditions Analysis

### מה צריך לבנות:
1. **Workflow חדש** ב-n8n: `Tenderix V6 - Step 3: Gate Conditions`
2. **Trigger:** Execute Workflow (נקרא מ-Step 1-2)
3. **Input:** tender_id + document_id

### מודולים לממש (לפי סדר):
- [ ] 2.1 חילוץ תנאי סף מהמסמך
- [ ] 2.6 השוואה לפרופיל חברה
- [ ] 2.9 הערכה והמלצה (PASS/RISK/FAIL)

### Output נדרש:
```json
{
  "tender_id": "xxx",
  "gate_conditions": [
    {
      "id": "gc_001",
      "requirement": "ניסיון ב-3 פרויקטים",
      "source": {
        "file": "מכרז_2024.pdf",
        "page": 12,
        "section": "3.2.1",
        "quote": "המציע יציג ניסיון..."
      },
      "status": "PASS|RISK|FAIL",
      "matching_projects": ["proj_001", "proj_002"],
      "gap_closure": null
    }
  ]
}
```

---

# 📊 מצב התקדמות מלא

## תשתית ✅
- [x] Supabase Project: `rerfjgjwjqodevkvhkxu`
- [x] n8n Workspace: `daviderez.app.n8n.cloud`
- [x] MCP Server
- [x] 27 טבלאות DB
- [x] Test Company: "לקט מערכות החשמל"

## Workflows
- [x] **V6 Step 1-2** (ID: `n7fe42jlTv3zPCZ2`) ✅
- [ ] V6 Step 3: Gate Conditions ❌
- [ ] V6 Step 4: BOQ Analysis ❌
- [ ] V6 Step 5: Competitor Analysis ❌

## מודולים לפי עמוד

### עמוד 1: קליטה (2/7)
- [x] 1.1 העלאה וזיהוי
- [ ] 1.1.5 ניהול גרסאות 🆕
- [x] 1.2 חילוץ מטא-דאטה (חלקי)
- [ ] 1.3 נרמול עברי
- [ ] 1.4 חילוץ הגדרות
- [ ] 1.5 זיהוי קטגוריה
- [ ] 1.6 מכרז קודם 🆕

### פרופיל חברה (1/1)
- [x] 2.0 טבלאות DB קיימות

### עמוד 2: תנאי סף (0/11)
- [ ] 2.1 חילוץ וסיווג
- [ ] 2.2 פירוק כימותי
- [ ] 2.3 ישות נושאת דרישה
- [ ] 2.4 פרשנות "דומה"
- [ ] 2.5 פרשנות כפולה
- [ ] 2.6 השוואה לפרופיל
- [ ] 2.6.5 אופטימיזציה 🆕
- [ ] 2.7 בקשות הבהרה
- [ ] 2.7.5 שאלות אסטרטגיות 🆕
- [ ] 2.7.6 ניתוח שאלות אחרים 🆕
- [ ] 2.8 רשימת מסמכים
- [ ] 2.9 הערכה והמלצה
- [ ] 2.10 Re-Analysis 🆕

### עמוד 3: מפרט (0/6)
- [ ] 3.1-3.5 + 3.4.5

### עמוד 4: מתחרים (0/4)
- [ ] 4.1-4.4

---

# 🔧 פרטים טכניים

## כתובות
```
Supabase URL:    https://rerfjgjwjqodevkvhkxu.supabase.co
n8n Workspace:   https://daviderez.app.n8n.cloud
Webhook:         https://daviderez.app.n8n.cloud/webhook/tender-upload
MCP Server:      https://daviderez.app.n8n.cloud/mcp-server/http
```

## Workflow קיים
```
ID: n7fe42jlTv3zPCZ2
Name: Tenderix V6 - Step 1-2: Reception & Structure
Status: Active ✅
Nodes: Webhook, Google Vision OCR, Claude, Supabase
```

## טבלאות מרכזיות
```sql
organizations        -- פרופיל חברה
company_projects     -- פרויקטים
tenders             -- מכרזים
tender_documents    -- מסמכים
gate_conditions     -- תנאי סף (ריק)
boq_items           -- כתב כמויות (ריק)
competitors         -- מתחרים (ריק)
```

---

# ⚙️ עקרונות ליבה (חובה!)

## 1. עקיבות מלאה
כל output חייב:
```
📄 [שם קובץ] | עמ' [X] | סעיף [Y]
"[ציטוט מדויק]"
```

## 2. מילון טכני
פרשנות לפי **יכולות** לא לפי שמות.
מצלמת תנועה = מצלמת אבטחה (אם יש יכולות דומות)

## 3. לוגיקת הצטברות
- פרויקט לא נספר פעמיים לאותה דרישה
- פרויקט **כן** נספר גם לסף וגם לניקוד

## 4. מסלולי סגירת פערים
🤝 קבלן משנה | 👥 שותפות | 📄 מסמך חלופי | 📝 שאלת הבהרה | ⛔ חוסם

---

# 📝 כללי פיתוח

1. **n8n + Supabase = REST API בלבד** (לא Postgres ישיר)
2. **Merge Nodes** אחרי HTTP requests מקבילים
3. **ביטויים:** `={{ $json.field }}`
4. **עברית:** UTF-8
5. **תמיד לבנות מחדש** - לא לתקן workflow שבור

---

# 📚 קבצי מפרט

## קובץ ראשי:
`TENDERIX_COMPLETE_SPEC.md` - 31 מודולים + כל הציטוטים

## קבצים בפרויקט:
- `/mnt/project/tenderix_system_architecture_v3.html` - האפיון המקורי
- `/mnt/project/Tenderix_n8n_Supabase_Spec.docx` - מפרט טכני

---

# 🔄 היסטוריית סשנים

## 2026-01-08 (היום)
- [x] יצירת TENDERIX_COMPLETE_SPEC.md
- [x] ניתוח פערים (6% התקדמות)
- [x] יצירת חבילת המשכיות
- [ ] **הבא:** בניית Step 3

## 2025-12-25
- [x] V6 Step 1-2 עובד
- [x] Webhook פעיל

## 2025-12-24
- [x] DB Schema מלא

---

# ✅ צ'קליסט לפני סיום סשן

לפני שמסיימים סשן, לוודא:
- [ ] עדכון "משימה נוכחית" בקובץ הזה
- [ ] עדכון רשימת ה-checkboxes
- [ ] שמירת הקובץ המעודכן
- [ ] ייצוא לגוגל דרייב / מקומי

---

# 🚀 איך להמשיך

## אופציה A: העתק-הדבק
1. פתח סשן חדש בקלוד
2. העתק את כל הקובץ הזה
3. הדבק ואמור: "המשך מהמשימה הנוכחית"

## אופציה B: העלאת קבצים
1. העלה: `TENDERIX_RESUME_PACKAGE.md` (הקובץ הזה)
2. העלה: `TENDERIX_COMPLETE_SPEC.md`
3. אמור: "המשך מהמשימה הנוכחית"

## אופציה C: קיצור
```
המשך Tenderix. 
מצב: 6%, Step 3 לא קיים.
משימה: בנה Step 3 - Gate Conditions.
קרא את המפרט המצורף.
```

---

**עודכן:** 2026-01-08 | **גרסה:** 1.0
