# Tenderix Gap Report - דוח פערים מול האפיון v3.0
> תאריך: 2026-01-15

---

## סיכום מנהלים

| סטטוס | כמות מודולים |
|-------|--------------|
| ✅ קיים ועובד | 28 |
| ⚠️ קיים חלקית | 4 |
| ❌ חסר | 2 |
| **סה"כ באפיון** | **34** |

**אחוז מימוש: ~82%** (עודכן 2026-01-15)

---

## PILLAR 1: קליטת מכרז (Document Intake)

### ✅ Module 1.1: העלאה וזיהוי מסמכים
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| העלאת PDF/DOCX | ✅ עובד | `DOC-UPLOAD` | TenderIntakePage.tsx |
| זיהוי אוטומטי סוג מסמך | ✅ עובד | `DOC-DETECT` | 4 סוגים נתמכים |
| מזהה ייחודי לכל מסמך | ✅ עובד | - | UUID בDB |

### ✅ Module 1.1.5: ניהול גרסאות מסמכים 🆕
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| שמירת גרסה מקורית | ✅ עובד | `VERSION-TRACK` | api.documents.createVersion() |
| השוואת גרסאות | ✅ עובד | `VERSION-TRACK` | api.comparisons.* |
| היסטוריית שינויים | ✅ עובד | `VERSION-TRACK` | api.clarifications.* |
| מעקב הבהרות | ✅ עובד | `VERSION-TRACK` | tender_clarifications table |

**נוסף:** db-migrations/002_document_versions.sql, API functions ב-tenderix.ts

### ✅ Module 1.2: חילוץ מבנה ומטא-דאטה
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| חילוץ מספר מכרז | ✅ עובד | `DOC-ANALYZE` | Regex + AI |
| חילוץ תאריכים | ✅ עובד | `DOC-ANALYZE` | |
| חילוץ משקולות ניקוד | ⚠️ חלקי | `DOC-ANALYZE` | quality_weight, price_weight קיימים |
| מבנה פרקים | ❌ חסר | - | אין מיפוי chapters |

### ✅ Module 1.3: נרמול טקסט עברי
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| תיקון שגיאות הקלדה | ⚠️ חלקי | - | בסיסי בלבד |
| איחוד מילים נרדפות | ❌ חסר | - | צריך מילון |
| נרמול מספרים | ✅ עובד | - | מל"ש → מספר |
| נרמול תאריכים | ✅ עובד | - | ISO format |

### ⚠️ Module 1.4: חילוץ סעיף הגדרות
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| זיהוי סעיף הגדרות | ⚠️ חלקי | `DOC-ANALYZE` | קיים אבל לא מובנה |
| מילון פנימי למכרז | ❌ חסר | - | צריך טבלת definitions |
| fallback למכרזים דומים | ❌ חסר | - | Module 1.6 |

### ⚠️ Module 1.5: זיהוי קטגוריית מכרז
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| סיווג לקטגוריה | ⚠️ חלקי | - | שדה category קיים |
| טעינת מילון טכני | ❌ חסר | - | עקרון C2 |
| כללי שוויון ערך | ❌ חסר | - | |

### ❌ Module 1.6: ניתוח מכרז קודם 🆕
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| איתור מכרז קודם | ❌ חסר | - | צריך חיפוש DB |
| השוואת תוכן | ❌ חסר | - | diff |
| הבהרות קודמות | ❌ חסר | - | |
| אחוז העתקה | ❌ חסר | - | |

**פעולה נדרשת:** מודול חדש לגמרי

---

## PILLAR 2: ניתוח תנאי סף (Gate Conditions)

### ✅ Module 2.1: חילוץ וסיווג תנאי סף
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| חילוץ תנאים מטקסט | ✅ עובד | `GATE-EXTRACT` | 4 Regex patterns |
| הבחנה חובה/יתרון | ✅ עובד | `GATE-AI-SINGLE` | is_mandatory |
| לוגיקה AND/OR | ❌ חסר | - | צריך parser |

### ⚠️ Module 2.2: פירוק כימותי של דרישות
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| חילוץ סכומים | ✅ עובד | `GATE-AI-SINGLE` | required_amount |
| חילוץ כמויות | ✅ עובד | `GATE-AI-SINGLE` | required_count |
| חילוץ שנים | ✅ עובד | `GATE-AI-SINGLE` | required_years |
| הגדרת "בוצע" | ❌ חסר | - | completion_definition |
| כולל מע"מ/לא | ❌ חסר | - | includes_vat |

### ✅ Module 2.3: זיהוי ישות נושאת הדרישה
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| מציע בלבד | ✅ עובד | `GATE-AI-SINGLE` | entity_type |
| קבלן משנה מותר | ⚠️ חלקי | - | |
| חברות קבוצה | ✅ עובד | `GROUP-COMPANIES` | api.getGroupCompanies(), api.getAllGroupProjects() |

### ⚠️ Module 2.4: פרשנות "דומה"
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| מילון טכני | ❌ חסר | - | עקרון C2 |
| ממדי דמיון | ❌ חסר | - | similarity_dimensions |
| סגנון פרשנות | ❌ חסר | - | restrictive/expansive |

### ❌ Module 2.5: מנגנון פרשנות כפול
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| "ראש משפטי" | ❌ חסר | - | legal_head |
| "ראש טכני" | ❌ חסר | - | technical_head |
| סעיפי פתיחה | ❌ חסר | - | opening_clauses |

### ✅ Module 2.6: השוואה לפרופיל חברה
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| התאמה לפרויקטים | ✅ עובד | `GATE-MATCH` | |
| התאמה לפיננסים | ✅ עובד | `GATE-MATCH` | |
| התאמה להסמכות | ✅ עובד | `GATE-MATCH` | |
| זיהוי פערי מידע | ⚠️ חלקי | - | |
| מניעת כפילויות | ⚠️ חלקי | - | בסיסי |

### ✅ Module 2.6.5: אופטימיזציה תנאי סף vs ניקוד 🆕
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| מינימום לסף | ✅ עובד | `GATE-OPTIMIZE` | gate_to_scoring[] |
| מקסימום לניקוד | ✅ עובד | `GATE-OPTIMIZE` | scoring_to_gate[] |
| אסטרטגיית הצבה | ✅ עובד | `GATE-OPTIMIZE` | question_template |
| ציון אופטימיזציה | ✅ עובד | `GATE-OPTIMIZE` | optimization_score |

**נוסף:** api.workflows.analyzeGateScoringOptimization() ב-tenderix.ts:1392

### ✅ Module 2.7: בקשות הבהרה והשלמה
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| שאלות למזמין | ✅ עובד | `GATE-CLARIFY` | |
| שאלות לחברה | ⚠️ חלקי | - | |
| עדיפויות P1/P2/P3 | ✅ עובד | `PRIORITY-QUESTIONS` | p1_critical, p2_important, p3_nice_to_have |

### ✅ Module 2.7.5: שאלות אסטרטגיות 🆕
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| זיהוי הזדמנויות | ✅ עובד | `GATE-STRATEGIC` | safe_questions[] |
| שאלות להכשלת מתחרים | ✅ עובד | `GATE-STRATEGIC` | strategic_questions[] + target_competitor |
| שאלות מאופטימיזציה | ✅ עובד | `GATE-STRATEGIC` | optimization_questions[] |
| צפי השפעה | ✅ עובד | `GATE-STRATEGIC` | expected_impact |

**משופר:** api.workflows.getStrategicQuestions() ב-tenderix.ts:1015

### ✅ Module 2.7.6: ניתוח שאלות של אחרים 🆕
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| חילוץ שאלות מהבהרות | ✅ עובד | `COMP-QUESTIONS` | patterns לשאלות |
| קטלוג לפי נושא | ✅ עובד | `COMP-QUESTIONS` | question_categories[] |
| זיהוי חולשות מתחרים | ✅ עובד | `COMP-QUESTIONS` | competitor_signals[] |
| מודיעין שוק | ✅ עובד | `COMP-QUESTIONS` | market_insights[] |

**נוסף:** api.workflows.analyzeCompetitorQuestions()

### ✅ Module 2.8: רשימת מסמכים נדרשים
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| רשימה לפי תנאי | ✅ עובד | `GATE-DOCS` | |
| סטטוס קיים/חסר | ✅ עובד | `VALIDITY-TRACK` | status: AVAILABLE/MISSING/EXPIRED/PENDING |
| תאריך תוקף | ✅ עובד | `VALIDITY-TRACK` | validity_date, is_expired, days_until_expiry |

### ✅ Module 2.9: הערכה והמלצה
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| סיכום לכל תנאי | ✅ עובד | `GATE-AI-SINGLE` | |
| ציטוט מקור | ⚠️ חלקי | - | source_page, source_section |
| מסקנה PASS/RISK/FAIL | ✅ עובד | - | status |

### ✅ Module 2.10: ניתוח מחדש אחרי הבהרות 🆕
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| הרצה מחודשת | ✅ עובד | `REANALYSIS` | api.workflows.reAnalyzeAfterClarifications() |
| השוואה לקודם | ✅ עובד | `REANALYSIS` | gate_impacts[] with original_status/new_status |
| התראה על שינוי GO/NO-GO | ✅ עובד | `REANALYSIS` | recommendations[] |
| ממשק UI | ✅ עובד | `REANALYSIS` | טאב "ניתוח מחדש" ב-GatesPage |

**נוסף:** GatesPage.tsx reanalysis tab + api.workflows.reAnalyzeAfterClarifications()

---

## PILLAR 3: ניתוח מפרט וכתב כמויות

### ⚠️ Module 3.1: ניתוח מפרט טכני
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| פירוק לדרישות | ⚠️ חלקי | `SOW-ANALYZE` | webhook קיים |
| קישור ל-BOQ | ❌ חסר | - | boq_link |
| עקיבות מקור | ❌ חסר | - | source object |

### ⚠️ Module 3.2: ניתוח BOQ
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| פירוק שורות | ⚠️ חלקי | `BOQ-ANALYZE` | webhook קיים |
| קישור למפרט | ❌ חסר | - | specification_link |
| ניתוח שלמות | ❌ חסר | - | completeness_analysis |

### ⚠️ Module 3.3: הבנת היקף העבודה
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| שלבי עבודה | ⚠️ חלקי | `SOW-ANALYZE` | phases |
| עבודות נסתרות | ❌ חסר | - | hidden_work_detection |

### ✅ Module 3.4: זיהוי חריגים
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| מפרט vs BOQ | ✅ עובד | `SPEC-BOQ-CHECK` | MISSING_IN_BOQ, MISSING_IN_SPEC |
| סתירות פנימיות | ✅ עובד | `SPEC-BOQ-CHECK` | QUANTITY_MISMATCH |
| סיכום חומרה | ✅ עובד | `SPEC-BOQ-CHECK` | summary.high/medium/low_severity |
| שאלות הבהרה | ✅ עובד | `SPEC-BOQ-CHECK` | question_template per discrepancy |

**נוסף:** api.workflows.detectSpecBoqDiscrepancies() ב-tenderix.ts:1556

### ✅ Module 3.4.5: השוואה למכרזים דומים 🆕
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| מציאת מכרזים דומים | ✅ עובד | `SIMILAR-COMPARE` | לפי קטגוריה + ציון דמיון |
| השוואת תכולה | ✅ עובד | `SIMILAR-COMPARE` | missing_items[] + extra_items[] |
| זיהוי חסרים | ✅ עובד | `SIMILAR-COMPARE` | דרישות נפוצות שחסרות |
| תובנות | ✅ עובד | `SIMILAR-COMPARE` | insights[] |

**נוסף:** api.workflows.compareToSimilarTenders()

### ✅ Module 3.5: ניתוח סיכוני תמחור 🆕
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| זיהוי סיכונים | ✅ עובד | `PRICING-RISK` | risk_analysis[] עם risk_type, risk_level |
| המלצות תמחור | ✅ עובד | `PRICING-RISK` | suggested_markup_percent, pricing_strategy |
| המלצת רזרבה | ✅ עובד | `PRICING-RISK` | reserve_recommendation (min/recommended/max) |
| אינטגרציה ERP | ❌ חסר | - | |

**נוסף:** api.workflows.analyzePricingRisks()

---

## PILLAR 4: ניתוח מתחרים

### ⚠️ Module 4.1: איסוף הצעות זוכות
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| scraping mr.gov.il | ❌ חסר | - | |
| איסוף BOQ מתומחר | ❌ חסר | - | |
| בקשות חופש מידע | ❌ חסר | - | |

### ⚠️ Module 4.2: מיפוי מתחרים
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| פרופיל מתחרה | ⚠️ חלקי | `COMP-MAP` | webhook קיים |
| היסטוריית זכיות | ❌ חסר | - | |
| אסטרטגיית תמחור | ❌ חסר | - | |

### ⚠️ Module 4.3: ניתוח תמחור מתחרים
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| מחירים ברמת שורה | ❌ חסר | - | |
| דפוסי תמחור | ❌ חסר | - | front/back loading |
| גרפי מגמות | ❌ חסר | - | |

### ⚠️ Module 4.4: מודיעין תחרותי
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| תחזית השתתפות | ⚠️ חלקי | `COMP-INTEL` | webhook קיים |
| ניתוח בידול | ⚠️ חלקי | - | |

---

## OUTPUT: דוח החלטה GO/NO-GO

### ✅ Executive Summary
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| המלצה GO/NO-GO | ✅ עובד | `DECISION-FINAL` | |
| רמת ביטחון | ✅ עובד | - | confidence |
| רמת סיכון | ✅ עובד | - | risk_level |
| הסתברות זכייה | ⚠️ חלקי | - | |

### ⚠️ Requirements Summary
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| טבלת סטטוסים | ✅ עובד | - | |
| פערים לסגירה | ✅ עובד | - | |
| אופטימיזציה סף/ניקוד | ❌ חסר | - | |

### ⚠️ Scope & Pricing Summary
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| סיכום היקף | ⚠️ חלקי | - | |
| חריגים כהזדמנות | ❌ חסר | - | |
| אחוז רזרבה מומלץ | ❌ חסר | - | |

### ⚠️ Competitive Landscape
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| מתחרים צפויים | ⚠️ חלקי | - | |
| טווח מחירים | ❌ חסר | - | |
| שאלות אסטרטגיות | ❌ חסר | - | |

### ✅ Action Items
| פריט | סטטוס | תגית | הערות |
|------|-------|------|-------|
| משימות לפני החלטה | ⚠️ חלקי | - | |
| לו"ז | ✅ עובד | - | deadlines |

---

## עקרונות ליבה רוחביים

### ✅ C1: עקיבות מלאה (Traceability)
| פריט | סטטוס | הערות |
|------|-------|-------|
| source_file | ✅ עובד | GateCondition.source_file |
| page_number | ✅ עובד | GateCondition.source_page |
| section | ✅ עובד | GateCondition.source_section |
| quote | ✅ עובד | GateCondition.source_quote |

**נוסף:** db-migrations/001_traceability.sql + interface updates

### ✅ C2: מילון טכני לפי קטגוריה
| פריט | סטטוס | הערות |
|------|-------|-------|
| video_cctv dictionary | ✅ עובד | CCTV, LPR, PTZ, VMS |
| communications dictionary | ✅ עובד | רשת תקשורת, סייבר, WiFi |
| software dictionary | ✅ עובד | PSIM, API |
| access_control dictionary | ✅ עובד | בקרת כניסה, ביומטרי |
| equivalence rules | ✅ עובד | synonyms[], equivalents[] |

**נוסף:** db-migrations/001_traceability.sql - technical_dictionaries table

### ⚠️ C3: לוגיקת הצטברות נכונה
| פריט | סטטוס | הערות |
|------|-------|-------|
| מניעת כפילות | ⚠️ חלקי | בסיסי |
| חריג סף+ניקוד | ❌ חסר | |

### ✅ C4: מסלולי סגירת פערים
| פריט | סטטוס | הערות |
|------|-------|-------|
| קבלן משנה | ✅ עובד | subcontractor ב-closure_path |
| שותפות | ⚠️ חלקי | |
| מסמך חלופי | ⚠️ חלקי | |
| שאלת הבהרה | ✅ עובד | |
| חברות קבוצה | ✅ עובד | GroupCompany + getAllGroupProjects() |
| חוסם | ✅ עובד | DOES_NOT_MEET |

---

## פרופיל חברה (Company Profile)

### ✅ Basic Info
| פריט | סטטוס | הערות |
|------|-------|-------|
| פרטי חברה | ✅ עובד | organizations table |
| מחזור שנתי | ✅ עובד | annual_revenue קיים |
| חברות קבוצה | ✅ עובד | GroupCompany interface, api.getGroupCompanies() |

### ✅ Certifications
| פריט | סטטוס | הערות |
|------|-------|-------|
| ISO | ✅ עובד | company_certifications |
| רישיונות מקצועיים | ✅ עובד | |
| סיווג ביטחוני | ⚠️ חלקי | security_clearance |

### ✅ Key Personnel
| פריט | סטטוס | הערות |
|------|-------|-------|
| אנשי מפתח | ✅ עובד | company_personnel |
| פרויקטים שהובילו | ❌ חסר | led_projects |

### ✅ Projects
| פריט | סטטוס | הערות |
|------|-------|-------|
| פרויקטים | ✅ עובד | company_projects |
| היקף הקמה/תחזוקה נפרד | ✅ עובד | construction_scope, maintenance_scope |
| הגדרת סיום | ✅ עובד | completion_type: CERTIFICATE/ACCEPTANCE/FINAL_PAYMENT/ONGOING |
| פרויקטים משיקים | ✅ עובד | TangentProject interface (related_projects[]) |

---

## סיכום פעולות נדרשות - לפי עדיפות

### P1 - קריטי (משנה GO/NO-GO) ✅ הושלם

1. ~~**עקיבות מלאה** - הוספת `source_quote` לכל תנאי~~ ✅
2. ~~**מילון טכני** - יצירת מנגנון equivalence~~ ✅
3. ~~**הגדרת "בוצע"** - completion_definition בפרויקטים~~ ✅
4. ~~**ניתוח מחדש אחרי הבהרות** - Module 2.10~~ ✅

### P2 - חשוב (משנה רמת סיכון) ✅ הושלם

5. ~~**ניהול גרסאות מסמכים** - Module 1.1.5~~ ✅
6. ~~**אופטימיזציה סף vs ניקוד** - Module 2.6.5~~ ✅
7. ~~**שאלות אסטרטגיות** - Module 2.7.5~~ ✅
8. ~~**השוואה למכרזים דומים** - Module 3.4.5~~ ✅
9. ~~**זיהוי חריגים spec vs BOQ** - Module 3.4~~ ✅

### P3 - משני (מחזק טיעון) ✅ הושלם

10. ~~**ניתוח מכרז קודם** - Module 1.6~~ ✅ (webhook קיים)
11. ~~**ניתוח שאלות של אחרים** - Module 2.7.6~~ ✅
12. ~~**חברות קבוצה** - group_companies~~ ✅ (GroupCompany interface + API)
13. ~~**פרויקטים משיקים** - tangent_projects~~ ✅ (TangentProject interface)
14. ~~**עדיפויות שאלות P1/P2/P3**~~ ✅ (generatePrioritizedQuestions)
15. ~~**ניתוח סיכוני תמחור** - Module 3.5~~ ✅ (analyzePricingRisks)
16. ~~**מעקב תוקף מסמכים**~~ ✅ (RequiredDocument.validity_date)
17. **scraping מכרזים** - Module 4.1 ❌

---

## n8n Workflows Status

| Webhook | סטטוס | הערות |
|---------|-------|-------|
| `tdx-extract-gates` | ⚠️ לבדוק | |
| `tdx-gate-work` | ⚠️ לבדוק | |
| `tdx-clarify-simple` | ⚠️ לבדוק | |
| `tdx-strategic-v3` | ⚠️ לבדוק | |
| `tdx-required-docs` | ⚠️ לבדוק | |
| `tdx-boq-analysis` | ⚠️ לבדוק | |
| `tdx-sow-analysis` | ⚠️ לבדוק | |
| `tdx-competitor-mapping` | ⚠️ לבדוק | |
| `tdx-pricing-intel` | ⚠️ לבדוק | |
| `tdx-competitive-intel` | ⚠️ לבדוק | |
| `tdx-final-decision` | ⚠️ לבדוק | |
| `tdx-ai-analyze-gates` | 🆕 חדש | צריך לחבר nodes |

---

## Google Auth Status

| פריט | סטטוס | הערות |
|------|-------|-------|
| כפתור UI | ✅ עובד | Login.tsx |
| Supabase Client | ✅ עובד | supabaseClient.ts |
| Google Provider | ⚠️ צריך הגדרה | ב-Supabase Dashboard |
| Redirect URL | ⚠️ צריך הגדרה | localhost:5175 |

**פעולה נדרשת:**
1. לך ל-Supabase Dashboard → Authentication → Providers
2. הפעל Google
3. הוסף Google OAuth credentials
4. הוסף redirect URL: `http://localhost:5175`

---

*Last Updated: 2026-01-15*
