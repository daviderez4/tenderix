# P3: Specs & BOQ Analysis - ניתוח מפרט וכתב כמויות

## Description
עמוד 3 במערכת Tenderix - ניתוח מפרט טכני, כתב כמויות, וזיהוי חריגים והזדמנויות.

## Trigger
- User says "/p3-specs" or "/specs" or "/boq"
- User asks about "מפרט" or "כתב כמויות" or "תמחור"
- After P2 completion

## Prerequisites
- P1 (Intake) completed
- P2 (Gates) completed
- Tender category identified

## Modules

### 3.1 Technical Specification Analysis (עידו)
פירוק המפרט הטכני לדרישות מובנות.

**Structure breakdown**:
- דרישות כלליות (תקנים, SLA)
- דרישות טכניות (לפי סוג הפרויקט)
- דרישות ביצוע (לו"ז, מסירה)

**For each requirement**:
```json
{
  "id": "uuid",
  "description": "מצלמת IP ברזולוציה של 4MP",
  "type": "mandatory", // mandatory | optional | advantage
  "linked_boq_items": ["item_1", "item_2"],
  "traceability": {
    "source_file": "מפרט_טכני.pdf",
    "source_page": 15,
    "source_section": "5.2.1"
  }
}
```

**עידו - Smart Gap Detection**:
If spec mentions "הצבת עמודים" but NOT "כבילה/חפירה" → Cross-check with BOQ.
If BOQ doesn't include it = **Potential Exception!**

### 3.2 BOQ Breakdown (אליצח)
פירוק כל שורה בכתב הכמויות.

**For each BOQ line**:
```json
{
  "item_id": "1.2.3",
  "description": "אספקה והתקנת מצלמת IP 4MP",
  "unit": "יחידה",
  "quantity": 50,
  "category": "supply", // supply | work | service | maintenance
  "linked_spec_requirements": ["req_1", "req_2"],
  "description_completeness": 0.8,
  "notes": "חסר פירוט סוג עדשה"
}
```

**אליצח**:
- אפשרות להזנה ידנית
- התאמת מבנה - סעיפים או פרקים

### 3.3 Work Scope Understanding
מיפוי Work Breakdown Structure.

**Work phases**:
- תכנון והנדסה
- אספקה
- ביצוע והתקנה
- הרצה ומסירה
- תחזוקה ושירות

**Identify "hidden work"**:
Phrases like "כל העבודות הנדרשות להשלמה" = risk!

**Output**:
```json
{
  "work_phases": [
    {
      "phase": "installation",
      "items": [...],
      "estimated_percentage": 60
    }
  ],
  "hidden_work_alerts": [
    {
      "text": "כל העבודות הנדרשות להשלמה",
      "location": "סעיף 4.5",
      "risk_level": "HIGH"
    }
  ]
}
```

### 3.4 Discrepancies & Anomalies (אליצח + עידו)
מציאת סתירות, חוסרים והזדמנויות.

**Types of discrepancies**:
- מפרט ↔ BOQ (4MP vs 2MP)
- מפרט ↔ חוזה
- סתירות פנימיות

**אליצח - במפרט ולא ב-BOQ**:
= **סיכון!** נדרש לתמחור אבל לא מקבלים כסף

**אליצח - לא במפרט ולא ב-BOQ אבל נדרש**:
= **שכחו!** להציף

**עידו - Strategic Opportunity**:
אם המציע ידע שיש חריגים בסבירות גבוהה והתמחור שלהם - הוא יוכל לתת הנחות גדולות יותר בכתב הכמויות ולהגדיל סיכויי זכיה, כי **החריגים יכסו על ההנחות**!

**Output**:
```json
{
  "discrepancies": [
    {
      "type": "spec_boq_mismatch",
      "spec_says": "מצלמה 4MP",
      "boq_says": "מצלמה 2MP",
      "location_spec": "עמ' 15 סעיף 5.2",
      "location_boq": "סעיף 1.2.3",
      "risk_level": "MEDIUM",
      "recommendation": "לברר בשאלת הבהרה"
    }
  ],
  "in_spec_not_in_boq": [
    {
      "item": "כבילת עמודים",
      "spec_location": "עמ' 20",
      "risk": "תמחור ללא תשלום",
      "estimated_cost": 50000
    }
  ],
  "missing_from_both": [
    {
      "item": "חיבורי חשמל לעמודים",
      "reason_needed": "נדרש לתפקוד המערכת",
      "action": "להציף בשאלת הבהרה"
    }
  ],
  "exceptions_opportunity": [
    {
      "likely_exception": "שינוי מיקום מצלמות",
      "probability": 0.8,
      "our_pricing_advantage": 15000
    }
  ]
}
```

### 3.4.5 Comparison to Similar Tenders (אליצח)
בדיקת התכולה מול 2 מכרזים דומים.

**Definition of "similar tender"**:
- קנה מידה דומה
- לקוח מאותו סוג (רשות/ממשלתי/קבלן)
- אותו נושא בפירוט דומה

**Checks**:
- מה שכחו?
- מה שונה?
- סעיף סעיף - מה לא כתוב ונדרש?

**אליצח**: "לשים לב בהיקף העבודה לקחת סעיף סעיף ולבדוק מול מכרזים אחרים דומים - לראות מה לא כתוב ולסמן האם נדרש או לא, אם כן מה התמחור שלו"

**Output**:
```json
{
  "similar_tenders_analyzed": [
    {
      "tender_number": "2023/100",
      "issuer": "עיריית חיפה",
      "similarity_score": 0.85
    }
  ],
  "missing_items": [
    {
      "item": "UPS לחדר שרתים",
      "in_tender_A": true,
      "in_tender_B": true,
      "in_current": false,
      "needed": true,
      "estimated_cost": 25000
    }
  ],
  "different_specs": [
    {
      "item": "מצלמות",
      "tender_A": "4MP",
      "tender_B": "4MP",
      "current": "2MP",
      "note": "ייתכן שטעות?"
    }
  ]
}
```

### 3.5 Pricing Risk Analysis & Recommendations (אליצח)
זיהוי וסיווג סיכונים כספיים + המלצות תמחור.

**Risk levels**:
- 🔴 **HIGH**: סעיפים עם "כל הנדרש", קנסות לא מוגבלים
- 🟡 **MEDIUM**: כמויות לא ברורות, אחריות מורחבת
- 🟢 **LOW**: סעיפים סטנדרטיים

**Recommendations**:
- % רזרבה מומלץ
- סעיפים לתמחור מפורט
- סעיפים פאושליים

**Smart Pricing Integration** (אליצח):
- אינטגרציה עם ERP הארגון
- השלמה מנתוני שוק (מחירונים, מכרזים קודמים)
- המלצת מחיר על בסיס שילוב המקורות

**Output**:
```json
{
  "risk_summary": {
    "high_risk_items": 3,
    "medium_risk_items": 8,
    "low_risk_items": 45,
    "total_risk_exposure": 150000
  },
  "pricing_recommendations": {
    "reserve_percentage": 10,
    "detailed_pricing_items": ["1.2.3", "2.4.5"],
    "lump_sum_items": ["general_conditions"],
    "strategy": "balanced" // conservative | balanced | aggressive
  },
  "price_sources": [
    {
      "item": "מצלמת IP 4MP",
      "erp_price": 2500,
      "market_price": 2800,
      "historical_tender_price": 2600,
      "recommended_price": 2650,
      "confidence": 0.9
    }
  ],
  "pricing_notes": "המלצה על תמחור שמרני בשל 3 סעיפים מסוכנים"
}
```

## Traceability (C1)
Every assertion MUST include source reference:
```
📄 מפרט_טכני.pdf | עמ' 15 | סעיף 5.2.1
"מצלמת IP ברזולוציה של לפחות 4 מגה פיקסל"
```

## MCP Tools Used
- `mcp__tenderix__get_boq_items` - Get BOQ from database
- `mcp__tenderix__trigger_n8n_workflow` - Trigger pricing workflow

## Workflow Integration
After P3 completes, automatically trigger P4 (Competitors):
```
/p4-competitors tender_id={tender_id}
```

## Output Format
```json
{
  "tender_id": "uuid",
  "analysis_date": "2024-01-20",
  "spec_requirements_count": 150,
  "boq_items_count": 85,
  "discrepancies_found": 12,
  "high_risk_items": 3,
  "exceptions_opportunity_value": 75000,
  "recommended_reserve_percentage": 10,
  "pricing_strategy": "balanced",
  "details": {
    "spec_analysis": {...},
    "boq_analysis": {...},
    "discrepancies": [...],
    "similar_tenders_comparison": {...},
    "risk_analysis": {...},
    "pricing_recommendations": {...}
  }
}
```

## Language
Hebrew primary, English for technical terms and measurements

## Invocation
```
/p3-specs
/specs
/boq
נתח את המפרט הטכני
בדוק את כתב הכמויות
מה הסיכונים בתמחור?
```
