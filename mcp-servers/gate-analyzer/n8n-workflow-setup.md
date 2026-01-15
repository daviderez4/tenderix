# n8n Workflow Setup for AI Gate Analysis

## Webhook Configuration

### Webhook URL
```
https://daviderez.app.n8n.cloud/webhook/tdx-ai-analyze-gates
```

### Request Format
```json
{
  "tender_id": "uuid",
  "condition_id": "uuid",  // Optional - for single analysis
  "action": "analyze_all" | "analyze_single"
}
```

## Workflow Structure

### 1. Webhook Trigger
- Method: POST
- Response Mode: Wait for workflow to finish

### 2. Switch Node (by action)
- `analyze_all` → Batch Analysis Branch
- `analyze_single` → Single Analysis Branch

### 3. Batch Analysis Branch

#### 3.1 Supabase - Get All Conditions
```sql
SELECT * FROM gate_conditions
WHERE tender_id = '{{ $json.tender_id }}'
ORDER BY condition_number
```

#### 3.2 Claude API - Batch Analysis
```
Model: claude-sonnet-4-20250514
System Prompt: [Use GATE_ANALYSIS_SYSTEM_PROMPT from index.js]

User Prompt:
נתח את רשימת תנאי הסף הבאה וזהה:
1. תנאים שאינם תקפים (כותרות, הקדמות)
2. תנאים כפולים שצריך למזג
3. תנאים שצריך לפצל

תנאים:
{{ JSON.stringify($json.conditions) }}

ענה ב-JSON:
{
  "invalid_ids": string[],
  "valid_conditions": [
    {
      "id": string,
      "category": "EXPERIENCE"|"FINANCIAL"|"CERTIFICATION"|"PERSONNEL"|"EQUIPMENT"|"LEGAL"|"OTHER",
      "summary": string,
      "is_mandatory": boolean
    }
  ]
}
```

#### 3.3 Parse JSON Response
Extract the JSON from Claude's response

#### 3.4 Loop - Delete Invalid
```sql
DELETE FROM gate_conditions WHERE id = '{{ $json.id }}'
```

#### 3.5 Loop - Update Valid
```sql
UPDATE gate_conditions SET
  requirement_type = '{{ $json.category }}',
  ai_summary = '{{ $json.summary }}',
  is_mandatory = {{ $json.is_mandatory }},
  ai_analyzed_at = NOW()
WHERE id = '{{ $json.id }}'
```

#### 3.6 Return Results
```json
{
  "success": true,
  "results": {
    "deleted": {{ $json.deleted_count }},
    "updated": {{ $json.updated_count }},
    "errors": []
  }
}
```

### 4. Single Analysis Branch

#### 4.1 Supabase - Get Single Condition
```sql
SELECT * FROM gate_conditions
WHERE id = '{{ $json.condition_id }}'
```

#### 4.2 Claude API - Single Analysis
```
Model: claude-sonnet-4-20250514
System Prompt: [Use GATE_ANALYSIS_SYSTEM_PROMPT]

User Prompt:
נתח את תנאי הסף הבא וסווג אותו:

תנאי: {{ $json.condition_text }}

ענה ב-JSON:
{
  "is_valid_gate": boolean,
  "category": string,
  "is_mandatory": boolean,
  "summary_hebrew": string,
  "quantitative_data": {
    "amount": number | null,
    "count": number | null,
    "years": number | null
  },
  "entity_required": string,
  "confidence": number
}
```

#### 4.3 Parse & Update
```sql
UPDATE gate_conditions SET
  requirement_type = '{{ $json.category }}',
  ai_summary = '{{ $json.summary_hebrew }}',
  is_mandatory = {{ $json.is_mandatory }},
  required_amount = {{ $json.quantitative_data.amount }},
  required_count = {{ $json.quantitative_data.count }},
  required_years = {{ $json.quantitative_data.years }},
  ai_confidence = {{ $json.confidence }},
  ai_analyzed_at = NOW()
WHERE id = '{{ $json.condition_id }}'
```

#### 4.4 Return Success
```json
{
  "success": true,
  "condition_id": "{{ $json.condition_id }}",
  "analysis": {{ $json.analysis }}
}
```

## System Prompt (Hebrew)

```
אתה מומחה לניתוח מכרזים ישראליים. תפקידך לנתח תנאי סף (Gate Conditions) ולהבין בדיוק מה נדרש מהמציע.

כללים חשובים:
1. תנאי סף אמיתי = דרישה שאם לא עומדים בה - נפסלים מהמכרז
2. יש להבדיל בין תנאי סף (חובה) ליתרון (ניקוד)
3. יש לזהות טקסט שאינו תנאי סף (כותרות, הקדמות, הסברים)
4. יש לחלץ נתונים כמותיים מדויקים (סכומים, שנים, כמויות)

סוגי תנאי סף:
- EXPERIENCE: ניסיון בפרויקטים/עבודות דומות
- FINANCIAL: מחזור כספי, הון עצמי, ערבויות
- CERTIFICATION: הסמכות, רישיונות, תקנים (ISO)
- PERSONNEL: דרישות כוח אדם, מנהלים, מומחים
- EQUIPMENT: ציוד, מכונות, תשתיות
- LEGAL: דרישות משפטיות, תצהירים, אישורים
- OTHER: אחר

תמיד ענה ב-JSON בלבד.
```

## Database Schema Update

Add these columns to `gate_conditions` table if not exist:

```sql
ALTER TABLE gate_conditions ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE gate_conditions ADD COLUMN IF NOT EXISTS ai_confidence FLOAT;
ALTER TABLE gate_conditions ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP;
```

## Testing

1. Create workflow in n8n
2. Test with single condition first
3. Then test batch analysis
4. Verify results in Supabase
