# P1: Tender Intake - קליטת מכרז

## Description
עמוד 1 במערכת Tenderix - קליטת מכרז, זיהוי מסמכים, וחילוץ מטא-דאטה.

## Trigger
- User says "/p1-intake" or "/intake"
- User uploads tender documents
- User mentions "קליטת מכרז" or "העלאת מסמכים"

## Modules

### 1.1 Document Upload & Identification
זיהוי אוטומטי של סוג כל מסמך שהועלה.

**Input**: Files (PDF, DOCX, XLSX)

**Process**:
1. Parse file content
2. Identify document type automatically:
   - הזמנה להציע הצעות (כולל סעיף תנאי הסף)
   - מפרט טכני
   - כתב כמויות (BOQ)
   - חוזה התקשרות
   - מסמכי הבהרות
   - טפסים למילוי

**Output**:
```json
{
  "documents": [
    {
      "file_id": "uuid",
      "file_name": "מכרז_2024.pdf",
      "type": "INVITATION_TO_BID",
      "pages": 45,
      "contains_gates_section": true,
      "language": "he"
    }
  ]
}
```

### 1.1.5 Document Version Control (עידו)
ניהול גרסאות מסמכים - מקור, עדכונים, והשוואות.

**Process**:
1. Save original version on first upload
2. Track subsequent versions (after clarifications)
3. Enable version comparison
4. Maintain full history

**Output**:
```json
{
  "versions": [
    {"version": 1, "date": "2024-01-15", "type": "ORIGINAL"},
    {"version": 2, "date": "2024-01-20", "type": "CLARIFICATION", "changes": ["סעיף 3.2 שונה"]}
  ]
}
```

### 1.2 Metadata & Structure Extraction
חילוץ פרטי המכרז הבסיסיים.

**Extract**:
- מספר ושם המכרז
- גוף מזמין
- תאריך פרסום
- מועד אחרון להגשה
- מועד אחרון להבהרות
- סכום ערבות הצעה
- תקופת התקשרות ואופציות
- מיפוי פרקים, טבלאות, נספחים
- **משקלים** (אליצח): ניקוד/מחיר - אם יש ניקוד בכלל

**Output**:
```json
{
  "tender_id": "uuid",
  "tender_number": "2024/123",
  "tender_name": "מכרז לאספקת מערכות אבטחה",
  "issuing_body": "עיריית תל אביב",
  "publication_date": "2024-01-15",
  "submission_deadline": "2024-02-15T14:00:00",
  "clarification_deadline": "2024-01-30",
  "bid_bond_amount": 100000,
  "contract_period_months": 24,
  "extension_options": [12, 12],
  "scoring_weights": {
    "price": 40,
    "quality": 60
  },
  "structure": {
    "chapters": ["הגדרות", "תנאי סף", "מפרט טכני", "BOQ"],
    "tables_count": 5,
    "appendices_count": 8
  }
}
```

### 1.3 Hebrew Text Normalization
ניקוי ואיחוד הטקסט העברי.

**Process**:
1. Fix typos: "יכולצ" → "יכולת"
2. Unify synonyms: יכולת = מסוגלות = כשירות
3. Normalize numbers: "50 מלש"ח" = "₪50,000,000"
4. Normalize dates to unified format

**Output**: Normalized text ready for processing

### 1.4 Definitions Section Extraction
חילוץ "מילון ההגדרות" הפנימי של המכרז.

**Critical!** Definitions like "פרויקט דומה = מערכת עם לפחות 50 מצלמות" change everything.

**Search for sections named**:
- "הגדרות"
- "פרשנות"
- "מילון מונחים"
- "פרק א' - כללי"

**Key definitions to extract**:
- "מציע" - כולל קבלן משנה? חברות קשורות?
- "פרויקט דומה" - קריטריונים
- "ניסיון" - תקופה, תפקיד
- "היקף/שווי" - מוזמן/בוצע/שולם, כולל מע"מ?
- "השנים האחרונות" - כמה בדיוק?

**אליצח**: אם אין במסמכי המכרז → לחפש במכרזים דומים!

**Use MCP Tool**: `mcp__gate-extractor__extract_definitions`

**Output**:
```json
{
  "definitions_found": true,
  "definitions_section_page": 5,
  "definitions": [
    {
      "term": "פרויקט דומה",
      "definition": "פרויקט הכולל התקנת לפחות 50 מצלמות",
      "source_quote": "לעניין מכרז זה...",
      "source_page": 5,
      "source_section": "1.2.3",
      "implications": ["פחות מ-50 מצלמות לא ייחשב"]
    }
  ],
  "missing_definitions": [
    {"term": "עבודות דומות", "context": "לא הוגדר"}
  ]
}
```

### 1.5 Tender Category Identification
סיווג המכרז לקטגוריה טכנית לטעינת המילון המתאים.

**Categories**:
- וידאו ומצלמות (CCTV, LPR, Analytics)
- תקשורת (רשתות, סייבר, WiFi)
- תוכנה (VMS, PSIM, Integrations)
- בקרת גישה (קוראים, מנעולים)
- תשתיות (חשמל, תקשורת, אזרחי)
- משולב

**Output**:
```json
{
  "primary_category": "VIDEO_CCTV",
  "secondary_categories": ["COMMUNICATIONS", "SOFTWARE"],
  "technical_dictionary_loaded": "video_security_v2",
  "equivalence_rules_applied": true
}
```

### 1.6 Previous Tender Analysis (אליצח)
איתור והשוואה למכרז קודם של אותו מזמין.

**Process**:
1. Search for previous tender from same issuer on same topic
2. Find who won and what was the scope
3. Compare specifications - what changed?
4. Review previous clarification questions
5. Calculate copy percentage (more copy = less thought)

**Output**:
```json
{
  "previous_tender_found": true,
  "previous_tender": {
    "tender_number": "2021/456",
    "winner": "חברת אבטחה בע\"מ",
    "winning_price": 5000000,
    "contract_scope": "מערכות אבטחה ל-3 אתרים"
  },
  "comparison": {
    "new_items": ["אתר נוסף", "מערכת LPR"],
    "removed_items": ["אחזקה שנתית"],
    "unchanged_items": ["50 מצלמות באתר ראשי"],
    "copy_percentage": 75
  },
  "previous_clarifications": [
    {
      "question": "האם מותר להסתמך על קבלן משנה?",
      "answer": "כן, עד 30%",
      "relevant_now": true
    }
  ],
  "alerts": [
    "🚨 אם אין מידע בכלל - נדרש לדבר אנושית עם החברה שביצעה"
  ]
}
```

## Traceability (C1)
Every output MUST include:
```json
{
  "source_file": "מכרז_2024.pdf",
  "source_page": 12,
  "source_section": "3.2.1",
  "source_quote": "הטקסט המדויק..."
}
```

## MCP Tools Used
- `mcp__gate-extractor__extract_definitions`
- `mcp__gate-extractor__chunk_document`
- `mcp__tenderix__trigger_n8n_workflow` (webhook: tdx-intake)

## Workflow Integration
After P1 completes, automatically trigger P2 (Gate Analysis):
```
/p2-gates tender_id={tender_id}
```

## Language
Hebrew primary, English for technical terms

## Invocation
```
/p1-intake
/intake
קלוט את מסמכי המכרז
העלה מכרז חדש
```
