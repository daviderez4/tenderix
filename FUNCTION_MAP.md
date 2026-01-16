# Tenderix Function Map - מפת פונקציות
> תגיות ייחודיות לכל פונקציה לצורך תקשורת מהירה

---

## Quick Reference - חיפוש מהיר

| תגית | תיאור | קובץ:שורה |
|------|-------|-----------|
| `GATE-EXTRACT` | חילוץ תנאי סף מטקסט | tenderix.ts:390 |
| `GATE-MATCH` | התאמת תנאים לפרופיל חברה | tenderix.ts:554 |
| `GATE-AI-SINGLE` | ניתוח AI של תנאי בודד | gate-analyzer/index.js:135 |
| `GATE-AI-ALL` | ניתוח AI של כל התנאים | gate-analyzer/index.js:216 |
| `DOC-UPLOAD` | העלאת מסמך | TenderIntakePage.tsx:56 |
| `DOC-PDF` | חילוץ טקסט מPDF | TenderIntakePage.tsx:134 |
| `DOC-ANALYZE` | ניתוח מטאדאטה | tenderix.ts:1226 |
| `LOGIN-GOOGLE` | כניסה עם גוגל | Login.tsx:57 |

---

## PILLAR 1: Document Intake - קליטת מסמכים

### `DOC-UPLOAD` - העלאת קובץ
```
File: frontend/src/pages/TenderIntakePage.tsx:56
Function: TenderIntakePage()
```
- מטפל בהעלאת קבצי מכרז (PDF/DOCX)
- קורא ל: `DOC-PDF`, `DOC-ANALYZE`

### `DOC-PDF` - חילוץ טקסט מPDF
```
File: frontend/src/pages/TenderIntakePage.tsx:134
Function: extractTextFromPDF(file)
```
- משתמש ב-PDF.js
- מגבלה: 30 עמודים מקסימום
- שומר טקסט ב-localStorage

### `DOC-ANALYZE` - ניתוח מטאדאטה
```
File: frontend/src/api/tenderix.ts:1226
Function: api.workflows.analyzeDocument(documentText, fileName)
```
- מחלץ: מספר מכרז, שם, גוף מפרסם, תאריכים
- Regex + AI enhancement (optional)
- Webhook: `tdx-sow-analysis`

### `DOC-DETECT` - זיהוי סוג מסמך
```
File: frontend/src/pages/TenderIntakePage.tsx:180
Function: detectDocumentType(filename)
```
- מזהה: הזמנה להציע, מפרט, כתב כמויות, חוזה

---

## PILLAR 2: Gate Conditions - תנאי סף

### `GATE-EXTRACT` - חילוץ תנאי סף
```
File: frontend/src/api/tenderix.ts:390
Function: api.workflows.extractGates(tenderId, tenderText)
```
- 4 תבניות Regex לעברית
- שומר עד 30 תנאים ב-DB
- Webhook (optional): `tdx-extract-gates`

**בעיות נפוצות:**
- תנאים כפולים
- כותרות מזוהות כתנאים
- חסרים סוגי דרישות

### `GATE-MATCH` - התאמה לפרופיל
```
File: frontend/src/api/tenderix.ts:554
Function: api.workflows.matchGates(tenderId, orgId)
```
- בודק: פרויקטים, פיננסים, הסמכות
- מחזיר: MEETS / PARTIALLY_MEETS / DOES_NOT_MEET
- Webhook (optional): `tdx-gate-work`

### `GATE-AI-SINGLE` - ניתוח AI תנאי בודד
```
File: mcp-servers/gate-analyzer/index.js:135
Function: analyzeSingleGate(conditionId)
MCP Tool: analyze_single_gate
```
- קורא תנאי מDB
- קורא ל-Claude לסיווג
- מעדכן: category, summary, is_mandatory, confidence
- מחלץ נתונים כמותיים (סכומים, שנים, כמויות)

### `GATE-AI-ALL` - ניתוח AI batch
```
File: mcp-servers/gate-analyzer/index.js:216
Function: analyzeAllGates(tenderId)
MCP Tool: analyze_all_gates
```
- מנתח כל התנאים בבת אחת
- מוחק תנאים לא תקפים (כותרות)
- מזהה כפילויות
- מעדכן DB עם תוצאות

### `GATE-CLASSIFY` - סיווג תנאי
```
File: mcp-servers/gate-analyzer/index.js:317
Function: classifyGate(conditionText)
MCP Tool: classify_gate
```
- סיווג בלי שמירה ל-DB
- קטגוריות: EXPERIENCE, FINANCIAL, CERTIFICATION, PERSONNEL, EQUIPMENT, LEGAL

### `GATE-MERGE` - בדיקת מיזוג
```
File: mcp-servers/gate-analyzer/index.js:344
Function: checkMerge(condition1Text, condition2Text)
MCP Tool: check_merge
```
- בודק אם שני תנאים צריכים להתמזג

### `GATE-SUMMARY` - תמצות תנאי
```
File: mcp-servers/gate-analyzer/index.js:373
Function: summarizeRequirement(conditionText)
MCP Tool: summarize_requirement
```
- מתמצת למשפט אחד בעברית פשוטה

### `GATE-STATS` - סטטיסטיקות
```
File: mcp-servers/gate-analyzer/index.js:400
Function: getGateStats(tenderId)
MCP Tool: get_gate_stats
```
- ספירה לפי סוג, חובה/יתרון, נותח/לא נותח

### `GATE-CLARIFY` - שאלות הבהרה
```
File: frontend/src/api/tenderix.ts:763
Function: api.workflows.getClarifications(tenderId, orgId)
```
- מייצר שאלות לשאול את המזמין
- Webhook: `tdx-clarify-simple`

### `GATE-STRATEGIC` - שאלות אסטרטגיות
```
File: frontend/src/api/tenderix.ts:851
Function: api.workflows.getStrategicQuestions(tenderId, orgId)
```
- שאלות ליתרון תחרותי
- Webhook: `tdx-strategic-v3`

### `GATE-DOCS` - מסמכים נדרשים
```
File: frontend/src/api/tenderix.ts:923
Function: api.workflows.getRequiredDocs(tenderId, orgId)
```
- רשימת מסמכים להגשה
- Webhook: `tdx-required-docs`

---

## PILLAR 3: Detailed Analysis - ניתוח מפורט

### `BOQ-ANALYZE` - ניתוח כתב כמויות
```
File: frontend/src/api/tenderix.ts:1031
Function: api.workflows.analyzeBOQ(tenderId, boqText)
```
- Webhook: `tdx-boq-analysis`
- מחלץ פריטים, כמויות, סיכונים

### `SOW-ANALYZE` - ניתוח היקף עבודה
```
File: frontend/src/api/tenderix.ts:1050
Function: api.workflows.analyzeSOW(tenderId, sowText)
```
- Webhook: `tdx-sow-analysis`
- מחלץ deliverables, שלבים, סיכונים

---

## PILLAR 4: Competition & Decision - תחרות והחלטה

### `COMP-MAP` - מיפוי מתחרים
```
File: frontend/src/api/tenderix.ts:1068
Function: api.workflows.mapCompetitors(tenderId, orgId)
```
- Webhook: `tdx-competitor-mapping`

### `COMP-PRICE` - מודיעין תמחור
```
File: frontend/src/api/tenderix.ts:1083
Function: api.workflows.getPricingIntel(tenderId, orgId)
```
- Webhook: `tdx-pricing-intel`

### `COMP-INTEL` - מודיעין תחרותי
```
File: frontend/src/api/tenderix.ts:1099
Function: api.workflows.getCompetitiveIntel(tenderId, orgId)
```
- Webhook: `tdx-competitive-intel`

### `DECISION-FINAL` - החלטת GO/NO-GO
```
File: frontend/src/api/tenderix.ts:1114
Function: api.workflows.getFinalDecision(tenderId, orgId)
```
- Webhook: `tdx-final-decision`
- מחזיר: GO / NO-GO / CONDITIONAL

---

## Database API - פעולות DB

### `DB-TENDER-*` - פעולות מכרז
```
File: frontend/src/api/tenderix.ts:242-268
```
| תגית | Function | תיאור |
|------|----------|-------|
| `DB-TENDER-LIST` | api.tenders.list() | רשימת מכרזים |
| `DB-TENDER-GET` | api.tenders.get(id) | מכרז בודד |
| `DB-TENDER-CREATE` | api.tenders.create(data) | יצירת מכרז |
| `DB-TENDER-UPDATE` | api.tenders.update(id, data) | עדכון |
| `DB-TENDER-DELETE` | api.tenders.delete(id) | מחיקה |

### `DB-GATE-*` - פעולות תנאי סף
```
File: frontend/src/api/tenderix.ts:270-289
```
| תגית | Function | תיאור |
|------|----------|-------|
| `DB-GATE-LIST` | api.gates.list(tenderId) | רשימת תנאים |
| `DB-GATE-SUMMARY` | api.gates.getSummary(tenderId) | סיכום סטטוסים |
| `DB-GATE-CREATE` | api.gates.create(data) | יצירת תנאי |
| `DB-GATE-UPDATE` | api.gates.update(id, data) | עדכון תנאי |

### `DB-COMPANY-*` - פרופיל חברה
```
File: frontend/src/api/tenderix.ts:321-373
```
| תגית | Function | תיאור |
|------|----------|-------|
| `DB-COMPANY-PROJECTS` | api.company.getProjects(orgId) | פרויקטים |
| `DB-COMPANY-FINANCIALS` | api.company.getFinancials(orgId) | דוחות כספיים |
| `DB-COMPANY-CERTS` | api.company.getCertifications(orgId) | הסמכות |
| `DB-COMPANY-PERSONNEL` | api.company.getPersonnel(orgId) | כ"א |

---

## Authentication - אימות

### `LOGIN-GOOGLE` - כניסה עם גוגל
```
File: frontend/src/components/Login.tsx:57
Function: handleGoogleLogin()
```
- משתמש ב-Supabase OAuth
- Redirect back לאפליקציה

### `LOGIN-LOCAL` - כניסה מקומית
```
File: frontend/src/components/Login.tsx:46
Function: handleSubmit()
```
- משתמשים קשיחים: david/partner/demo

### `AUTH-SESSION` - בדיקת session
```
File: frontend/src/components/Login.tsx:23
Function: checkSession()
```
- בודק Supabase session בטעינה

---

## Configuration - הגדרות

### `CONFIG-SESSION` - ניהול session
```
File: frontend/src/api/config.ts:21-86
```
| תגית | Function | תיאור |
|------|----------|-------|
| `CONFIG-ORG-ID` | getSessionOrgId() | מזהה ארגון ל-session |
| `CONFIG-TENDER-ID` | getCurrentTenderId() | מכרז נוכחי |
| `CONFIG-SET-TENDER` | setCurrentTender(id, name) | קביעת מכרז פעיל |
| `CONFIG-TEXT-CACHE` | setTenderExtractedText() | שמירת טקסט לניתוח |

---

## NEW v3.0 MODULES - מודולים חדשים

### `VERSION-TRACK` - ניהול גרסאות מסמכים (Module 1.1.5)
```
File: frontend/src/api/tenderix.ts:480-550
Functions: api.clarifications.*, api.comparisons.*, api.documents.getVersions()
```
- ניהול הבהרות מכרז
- השוואת גרסאות מסמכים
- מעקב שינויים בין גרסאות

### `GATE-OPTIMIZE` - אופטימיזציה סף vs ניקוד (Module 2.6.5)
```
File: frontend/src/api/tenderix.ts:1392
Function: api.workflows.analyzeGateScoringOptimization(tenderId, orgId)
```
- מזהה תנאי סף להמרה לניקוד
- מזהה תנאי ניקוד להחמרה לסף
- מייצר שאלות אסטרטגיות

### `SPEC-BOQ-CHECK` - זיהוי חריגים spec vs BOQ (Module 3.4)
```
File: frontend/src/api/tenderix.ts:1556
Function: api.workflows.detectSpecBoqDiscrepancies(tenderId, specText, boqText)
```
- מזהה פריטים חסרים בכתב כמויות
- מזהה אי-התאמות בכמויות
- מייצר שאלות הבהרה

### `PREVIOUS-TENDER` - ניתוח מכרז קודם (Module 1.6)
```
File: frontend/src/api/tenderix.ts:1297
Function: api.workflows.analyzePreviousTender(tenderId)
```
- משווה למכרז קודם באותו נושא
- מזהה שינויים ותובנות

### `REANALYSIS` - ניתוח מחדש אחרי הבהרות (Module 2.10)
```
File: frontend/src/api/tenderix.ts:1340
Function: api.workflows.reAnalyzeAfterClarifications(tenderId, orgId, clarificationText)
```
- מנתח השפעת הבהרות על תנאי סף
- מעדכן סטטוסים
- מייצר שאלות המשך

### `SIMILAR-COMPARE` - השוואה למכרזים דומים (Module 3.4.5)
```
File: frontend/src/api/tenderix.ts
Function: api.workflows.compareToSimilarTenders(tenderId, category)
```
- מוצא מכרזים דומים לפי קטגוריה
- מזהה דרישות חסרות (נפוצות במכרזים דומים)
- מזהה דרישות ייחודיות
- ציון דמיון לכל מכרז

### `COMP-QUESTIONS` - ניתוח שאלות מתחרים (Module 2.7.6)
```
File: frontend/src/api/tenderix.ts
Function: api.workflows.analyzeCompetitorQuestions(tenderId, clarificationDoc)
```
- מחלץ שאלות ממסמכי הבהרה
- מקטלג לפי נושא (ניסיון/פיננסי/טכני)
- מזהה חולשות מתחרים
- מייצר תובנות שוק

### `GROUP-COMPANIES` - חברות קבוצה (C4)
```
File: frontend/src/api/tenderix.ts
Functions: api.getGroupCompanies(orgId), api.addGroupCompany(), api.getAllGroupProjects()
```
- ניהול חברות בת/אחיות
- צירוף ניסיון ודוחות כספיים של חברות קשורות
- בדיקת עמידה בתנאי סף באמצעות הקבוצה

### `TANGENT-PROJECTS` - פרויקטים משיקים
```
File: frontend/src/api/tenderix.ts
Interface: TangentProject
```
- קישור פרויקטים דומים
- ציון דמיון לפרויקטים קודמים
- סוגי קשר: SIMILAR_SCOPE, SAME_CLIENT, SAME_TECHNOLOGY, CONTINUATION

### `VALIDITY-TRACK` - מעקב תוקף מסמכים
```
File: frontend/src/api/tenderix.ts
Interface: RequiredDocument (validity_date, is_expired, days_until_expiry)
Function: api.checkCertificationValidity(orgId)
```
- מעקב תוקף אישורים והסמכות
- התראה על מסמכים שפג תוקפם
- חישוב ימים עד פקיעה

### `PRICING-RISK` - ניתוח סיכוני תמחור (Module 3.5)
```
File: frontend/src/api/tenderix.ts
Function: api.workflows.analyzePricingRisks(tenderId, boqItems)
```
- ניתוח סיכונים בכתב כמויות
- המלצות markup לפי פריט
- אסטרטגיית תמחור כוללת
- המלצת רזרבה (min/recommended/max)

### `PRIORITY-QUESTIONS` - שאלות עם עדיפויות (Module 2.7)
```
File: frontend/src/api/tenderix.ts
Function: api.workflows.generatePrioritizedQuestions(tenderId, orgId)
```
- P1: שאלות קריטיות (משנות GO/NO-GO)
- P2: שאלות חשובות (משפיעות על ניקוד/תמחור)
- P3: שאלות משניות (שיפור הצעה)

---

## n8n Webhooks - רשימה מלאה

| Webhook | תגית | תיאור |
|---------|------|-------|
| `tdx-extract-gates` | `GATE-EXTRACT` | חילוץ תנאי סף |
| `tdx-gate-work` | `GATE-MATCH` | התאמת תנאים |
| `tdx-clarify-simple` | `GATE-CLARIFY` | שאלות הבהרה |
| `tdx-strategic-v3` | `GATE-STRATEGIC` | שאלות אסטרטגיות |
| `tdx-required-docs` | `GATE-DOCS` | מסמכים נדרשים |
| `tdx-boq-analysis` | `BOQ-ANALYZE` | ניתוח כתב כמויות |
| `tdx-sow-analysis` | `SOW-ANALYZE` | ניתוח היקף |
| `tdx-competitor-mapping` | `COMP-MAP` | מיפוי מתחרים |
| `tdx-pricing-intel` | `COMP-PRICE` | מודיעין תמחור |
| `tdx-competitive-intel` | `COMP-INTEL` | מודיעין תחרותי |
| `tdx-final-decision` | `DECISION-FINAL` | החלטה סופית |
| `tdx-ai-analyze-gates` | `GATE-AI-ALL` | ניתוח AI (n8n חדש) |

---

## Usage Examples - דוגמאות שימוש

### "יש בעיה בחילוץ תנאי סף"
→ בדוק `GATE-EXTRACT` (tenderix.ts:390)

### "הניתוח AI לא עובד"
→ בדוק `GATE-AI-ALL` (gate-analyzer/index.js:216)
→ בדוק n8n workflow `tdx-ai-analyze-gates`

### "הטקסט לא מחולץ מPDF"
→ בדוק `DOC-PDF` (TenderIntakePage.tsx:134)

### "הכניסה עם גוגל לא עובדת"
→ בדוק `LOGIN-GOOGLE` (Login.tsx:57)
→ בדוק Supabase Auth settings

### "המתחרים לא מופיעים"
→ בדוק `COMP-MAP` (tenderix.ts:1068)
→ בדוק webhook `tdx-competitor-mapping`

### "ההחלטה GO/NO-GO לא מופיעה"
→ בדוק `DECISION-FINAL` (tenderix.ts:1114)
→ בדוק webhook `tdx-final-decision`

---

## File Index - אינדקס קבצים

| קובץ | פונקציות עיקריות |
|------|-----------------|
| `tenderix.ts` | כל ה-API + Workflows |
| `config.ts` | הגדרות + session |
| `supabaseClient.ts` | Auth functions |
| `Login.tsx` | כניסה + Google OAuth |
| `TenderIntakePage.tsx` | העלאת מסמכים |
| `GatesPage.tsx` | ניהול תנאי סף |
| `AnalysisPage.tsx` | BOQ + SOW |
| `CompetitorsPage.tsx` | מתחרים |
| `DecisionPage.tsx` | GO/NO-GO |
| `Dashboard.tsx` | מסך ראשי |
| `gate-analyzer/index.js` | MCP Server לניתוח AI |

---

*Last Updated: 2026-01-15*
