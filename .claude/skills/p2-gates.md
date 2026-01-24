# P2: Gate Conditions Analysis - ניתוח תנאי סף

## Description
עמוד 2 במערכת Tenderix - ליבת המערכת. ניתוח מעמיק של תנאי סף, השוואה לפרופיל חברה, וזיהוי פערים.

## Trigger
- User says "/p2-gates" or "/gates" or "/analyze-gates"
- User asks about "תנאי סף" or "האם אנחנו עומדים?"
- After P1 completion

## Prerequisites
- P1 (Intake) must be completed
- Company profile should exist in system
- Definitions dictionary extracted

## Modules

### 2.0 Company Profile (Required)
פרופיל החברה - התשתית להשוואה.

**Required fields**:
```json
{
  "company": {
    "name": "חברה בע\"מ",
    "registration_number": "123456789",
    "founded_year": 2010,
    "annual_revenue": [
      {"year": 2023, "amount": 50000000},
      {"year": 2022, "amount": 45000000}
    ],
    "employees_count": 150,
    "fields_of_activity": ["אבטחה", "תקשורת"],
    "contractor_classifications": ["סיווג ג-1 בינוי"]
  },
  "certifications": [
    {
      "type": "ISO",
      "number": "9001:2015",
      "valid_until": "2025-12-31",
      "certifying_body": "מכון התקנים"
    }
  ],
  "key_personnel": [
    {
      "name": "יוסי כהן",
      "role": "מהנדס ראשי",
      "education": "B.Sc הנדסת חשמל",
      "experience_years": 15,
      "certifications": ["מהנדס חשמל רשוי"]
    }
  ],
  "projects": [
    {
      "project_id": "uuid",
      "name": "מערכת אבטחה עירייה",
      "client": "עיריית חיפה",
      "start_date": "2020-01-01",
      "end_date": "2021-06-30",
      "completion_type": "delivery", // delivery | final_invoice | warranty_end (עידו)
      "project_type": "installation", // installation | maintenance | combined (עידו)
      "total_value": 15000000,
      "installation_value": 12000000, // (עידו)
      "maintenance_value": 3000000, // (עידו)
      "maintenance_months": 24, // (עידו)
      "role": "main_contractor",
      "percentage": 100,
      "technical_details": {
        "cameras_count": 120,
        "vms_type": "Milestone",
        "integrations": ["בקרת כניסה", "אזעקות"],
        "sla_provided": "99.5%"
      },
      "supporting_documents": ["confirmation_letter.pdf"]
    }
  ],
  "tangent_projects": [ // (אליצח) - פרויקטים משיקים
    {
      "project_id": "uuid",
      "relationship": "sister_company", // sister_company | service_provided | group_project
      "description": "פרויקט של חברת האחות בתחום דומה",
      "can_leverage_for": ["scoring", "experience_claim"]
    }
  ],
  "group_companies": [ // (אליצח)
    {"name": "חברת אם בע\"מ", "relationship": "parent"},
    {"name": "חברת בת בע\"מ", "relationship": "subsidiary"}
  ]
}
```

**עידו**: המאגר דינמי - אם הוזן פרויקט ובמהלך מכרז חודדו פרטים, המידע נשמר לעתיד!

### 2.1 Gate Extraction & Classification
זיהוי כל תנאי וסיווגו.

**Classification types**:
- **GATE**: תנאי סף פוסל - אם לא עומדים = נפסלים
- **ADVANTAGE**: יתרון/ניקוד - משפיע על ניקוד בלבד

**Capability vs Performance**:
- יכולת = הוכחה שמסוגל (צוות, ציוד, נהלים)
- ביצוע = הוכחה היסטורית (עשה בפועל)

**Logic operators**:
- AND: "וגם", "בנוסף"
- OR: "או", "אחד מבין"
- NESTED: "(X או Y) וגם Z"

**Use MCP Tool**: `mcp__gate-extractor__scan_for_conditions`

### 2.2 Quantitative Breakdown (עידו)
פירוק כל דרישה מספרית.

**Extract for each requirement**:
```json
{
  "amount": 50000000,
  "includes_vat": false,
  "per_project_or_cumulative": "single",
  "scope_type": "executed", // ordered | executed | paid
  "role": "main_contractor", // main | sub | share_percentage
  "time_period_years": 5,
  "time_reference": "submission_date",
  "completion_definition": "delivery" // (עידו) delivery | final_invoice | warranty_end
}
```

**עידו**: אם אין הגדרה - להתריע ולהציג אפשרויות לפי מה שמיטיב עם המציע!

### 2.3 Bearer Entity Identification (אליצח + עידו)
מי בדיוק צריך לעמוד בתנאי?

**Options**:
```json
{
  "bearer": "bidder_only", // bidder_only | consortium_any | consortium_all | subcontractor_allowed
  "subcontractor_limit_percent": 30,
  "group_companies_allowed": true,
  "group_for_gates": true, // (אליצח) האם חברות אם/בת לתנאי סף
  "group_for_scoring": true // (אליצח) האם גם לניקוד
}
```

**עידו**: צריך ניתוח מראש האם ניתן להסתמך, ואם כן - במה?

### 2.4 "Similar" Interpretation
פרשנות המושג "פרויקט דומה" לפי מילון טכני.

**Dimensions to check**:
- טכנולוגיה דומה?
- מורכבות דומה?
- אינטגרציות דומות?
- היקפים דומים?
- SLA דומה?
- ייעוד דומה?

**אליצח**: פרשנות מרחיבה - לבדוק האם נכון (מצלמת תנועה = מצלמת אבטחה?)

### 2.5 Dual Interpretation Mechanism
שני "ראשים" לפרשנות.

**HEAD 1 - Legal (משפטי)**:
- איך ועדת מכרזים מפרשת?
- תנאי קשיח / פתוח / תלוי הוכחה?
- Risk level: LOW / MEDIUM / HIGH

**HEAD 2 - Technical (טכני)**:
- מאפיינים נדרשים בפועל?
- ייעוד vs יכולות?
- הגדרה מהמילון הטכני

**Identify "opening clauses"**:
- "ניתן לבצע פיתוחים/התאמות"
- "ניתן להציע פתרון שווה ערך"

**Use MCP Tool**: `mcp__gate-extractor__analyze_conditions`

### 2.6 Company Profile Comparison (עידו)
התאמה בין דרישות לפרופיל וזיהוי פערי מידע.

**Process**:
1. Match each requirement to project/certification in profile
2. Identify information gaps + generate questions
3. If gap filled → update profile for future!
4. Check for duplicates (same project counted twice)

**Output**:
```json
{
  "condition_id": "uuid",
  "status": "MET", // MET | GAP | PARTIAL | UNKNOWN
  "matched_projects": ["project_id_1"],
  "gap_questions": [
    {
      "question": "זוהה פרויקט X אך לא ברור אם קיים רכיב Y. בבקשה לוודא.",
      "if_yes_action": "update_project_profile",
      "if_no_action": "mark_as_gap"
    }
  ]
}
```

### 2.6.5 Optimization: Gates vs Scoring (עידו)
מיקסום הניקוד תוך עמידה מינימלית בתנאי סף.

**Principle**: מינימום לתנאי סף, מקסימום לניקוד

**Check**: האם פרויקטים של תנאי סף נספרים גם בניקוד?

**Strategy**: איזה פרויקט להציג איפה

**אליצח**: כמה מהניקוד קשיח לעומת גמיש?

**עידו**: "בדרך כלל הניקוד הוא על הצגת פרויקטים מעבר למה שהוצג בתנאי הסף"

### 2.7 Clarification Requests (אליצח)
יצירת בקשות הבהרה לסגירת פערים.

**To issuer (נוסח כבקשה!)**:
```
"נבקש לחדד את תנאי הסף כך שיאפשר הסתמכות על קבלן משנה בכל הנוגע לניסיון מסוג X"
```

**To company**:
- השלמת פרטים חסרים בפרופיל

**Priority levels**:
- P1: משנה GO/NO-GO
- P2: משנה רמת סיכון
- P3: מחזק טיעון

**אליצח**: אחרי שמכניסים מענה - לעדכן מה זה שינה!

### 2.7.5 Strategic Questions to Disqualify Competitors (אליצח)
שאלות שמטרתן לצמצם תחרות (בלי לפגוע בנו).

**Identify opportunities**:
- דרישות שאנחנו עומדים בהן ומתחרים לא
- נציגויות ייחודיות שלנו

**Question types**:
- "להבהיר כי נדרשת מערכת מסוג X" (אם אני הנציג)
- "להבהיר שנדרשת מצלמה עם NDAA"

**Justification for issuer**:
- דרישות אבטחה גדולות יותר
- הגנה מתקיפות סייבר
- רזולוציה גבוהה יותר

**Verification**: שלא פוגע בנו!

**אליצח**: "מהותי מאוד - זה חלק גדול מהשכל"

### 2.7.6 Analyze Others' Questions (אליצח)
ניתוח שאלות שלא אנחנו שאלנו.

**Process**:
1. Mark questions we didn't ask
2. Analyze: are they targeting specific competitor?
3. DEEP RESEARCH: who had interest in asking this?
4. If obvious from market - flag it

### 2.8 Required Documents List
לכל תנאי - מה בדיוק צריך לצרף.

**For each document**:
```json
{
  "document_type": "client_confirmation",
  "required_format": "נספח ג",
  "signer": "מנכ\"ל המזמין",
  "format": "original", // original | certified_copy
  "validity_date": "2024-12-31",
  "status": "exists" // exists | missing | needs_renewal
}
```

### 2.9 Assessment & Recommendation
דוח מסכם לכל תנאי סף - עם עקיבות מלאה.

**For each condition**:
1. מה הדרישה אומרת + ציטוט מדויק
2. משמעות משפטית: קשיח/פתוח/תלוי פרשנות
3. משמעות טכנית: מה צריך להתקיים
4. מה בפרופיל תומך + מה חסר
5. טענה אפשרית + מסלולי סגירה
6. מסקנה:

**Status badges**:
- ✅ עומד בוודאות
- ⚠️ עומד + סיכון
- 🔄 בכפוף לאימות
- ❌ לא עומד

**Use MCP Tool**: `mcp__gate-extractor__validate_and_finalize`

### 2.10 Re-Analysis After Clarifications (עידו)
הרצת ניתוח מחודש לאחר קבלת תשובות הבהרה.

**Trigger**: העלאת מסמך הבהרות חדש

**Process**:
1. Re-run all tender documents
2. Compare to previous analysis
3. Report: what changed
4. Alert: if GO/NO-GO changed

## Gap Closure Options (C4)
When a gap exists:
- 🤝 קבלן משנה - אם המכרז מתיר הסתמכות
- 👥 שותפות/קונסורציום
- 📄 מסמך חלופי/משלים
- 🛠️ פיתוח/התאמה (אם המכרז מאפשר)
- 📝 שאלת הבהרה למזמין
- ⛔ חוסם - אין פתרון ריאלי

**אליצח**: אם אפשר להסתמך על ק.משנה - לחזור עם רשימת חברות פוטנציאליות!

**עידו**: אם אין מניעה מפורשת - המערכת תציע (לא חובה) להגיש שאלת הבהרה או לגשת עם שותף.

## MCP Tools Used
- `mcp__gate-extractor__professional_gate_extraction` - Full 4-agent pipeline
- `mcp__gate-extractor__extract_definitions` - Agent 0
- `mcp__gate-extractor__scan_for_conditions` - Agent 1
- `mcp__gate-extractor__analyze_conditions` - Agent 2
- `mcp__gate-extractor__validate_and_finalize` - Agent 3
- `mcp__gate-extractor__save_extracted_conditions` - Save to DB
- `mcp__tenderix__get_gate_conditions` - Retrieve conditions
- `mcp__tenderix__get_gate_summary` - Get summary

## Traceability (C1)
EVERY assertion MUST include:
```
📄 מכרז_2024.pdf | עמ' 12 | סעיף 3.2.1
"המציע יציג ניסיון בלפחות 3 פרויקטים"
```

## Output Format
```json
{
  "tender_id": "uuid",
  "analysis_date": "2024-01-20",
  "overall_status": "CONDITIONAL_GO",
  "confidence": 0.85,
  "conditions": [
    {
      "id": "uuid",
      "text": "...",
      "type": "GATE",
      "category": "EXPERIENCE",
      "status": "MET",
      "matched_projects": ["p1", "p2"],
      "traceability": {
        "source_file": "...",
        "source_page": 12,
        "source_section": "3.2.1",
        "source_quote": "..."
      }
    }
  ],
  "gaps": [...],
  "clarification_requests": [...],
  "strategic_questions": [...],
  "required_documents": [...],
  "recommendation": "GO with clarifications"
}
```

## Invocation
```
/p2-gates
/gates
/analyze-gates tender_id=xxx
נתח את תנאי הסף
האם אנחנו עומדים בתנאים?
```
