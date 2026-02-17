/**
 * Definition Extraction Prompts
 * מערכת חילוץ הגדרות ממכרזים
 *
 * Phase 1: Extract tender-specific definitions
 * Phase 2: Link definitions to gate conditions
 * Phase 3: Resolve gate conditions using definitions
 */

// ============================================
// SYSTEM PROMPT: Definition Extraction Expert
// ============================================

export const DEFINITION_EXTRACTION_SYSTEM_PROMPT = `אתה מומחה משפטי-טכני בפרשנות מכרזים ישראליים.

תפקידך המרכזי: לזהות ולחלץ את כל ההגדרות (Definitions) שבמסמכי המכרז שמשפיעות על פרשנות תנאי הסף.

## למה זה קריטי?
כל מכרז מגדיר מושגים בצורה ייחודית. למשל:
- "פרויקט דומה" יכול להיות "פרויקט בתחום אבטחה אלקטרונית בהיקף 5 מיליון ₪+"
- "פרויקט תחבורתי" יכול להיות "פרויקט בתחום תחבורה ציבורית בלבד (לא כולל כבישים)"
- "ניסיון" יכול להיות "ביצוע בפועל ב-5 השנים האחרונות"

## מה לחפש:
1. **סעיף הגדרות מפורש** - בדרך כלל בתחילת המכרז
2. **הגדרות משולבות בתנאי סף** - "על המציע להציג פרויקט דומה, דהיינו..."
3. **הגדרות במפרט** - "לצורך סעיף זה, פרויקט = ..."
4. **הגדרות במונחי המכרז** - "המציע" = כולל/לא כולל ק.משנה
5. **מגבלות כמותיות מוגדרות** - "היקף" = סכום שהוזמן/שבוצע/ששולם
6. **הגדרות זמן** - "5 השנים האחרונות" = מיום הגשת ההצעה/מיום פרסום
7. **הגדרות גיאוגרפיות** - "בארץ"/"בחו"ל"/"בישראל בלבד"

## כללים:
- חלץ את ההגדרה המדויקת, לא פרשנות שלך
- ציין במדויק מאיפה ההגדרה (עמוד, סעיף, ציטוט)
- סמן האם ההגדרה מצמצמת או מרחיבה
- אם אין הגדרה מפורשת למונח - ציין "אין הגדרה מפורשת" + הצע מה ההגדרה הסבירה

ענה תמיד ב-JSON מובנה.`;

// ============================================
// PROMPT: Extract All Definitions
// ============================================

export const EXTRACT_DEFINITIONS_PROMPT = `נתח את מסמך המכרז הבא וחלץ את כל ההגדרות הרלוונטיות לתנאי הסף.

## מסמך המכרז:
{document_text}

## תנאי הסף שזוהו (אם יש):
{gate_conditions_text}

## הנחיות:
1. חפש סעיף "הגדרות" / "פרשנות" / "מונחים"
2. חפש הגדרות משולבות בתוך תנאי הסף עצמם
3. לכל הגדרה, חלץ:
   - את המונח המוגדר
   - את ההגדרה המדויקת (ציטוט!)
   - מה ההגדרה כוללת (includes)
   - מה ההגדרה לא כוללת (excludes)
   - מגבלות כמותיות (סכום, כמות, שנים)
   - סוג הפרשנות (מצמצמת/מרחיבה/ניטרלית)

## פלט נדרש (JSON):
{
  "definitions": [
    {
      "term": "string - המונח (למשל: 'פרויקט דומה')",
      "definition_text": "string - ההגדרה המדויקת כפי שמופיעה במכרז",
      "category": "PROJECT_TYPE | FINANCIAL | EXPERIENCE | PERSONNEL | CERTIFICATION | SCOPE | TIME_PERIOD | ENTITY | OTHER",
      "interpretation_type": "RESTRICTIVE | EXPANSIVE | NEUTRAL",

      "includes": ["מה כן נכלל בהגדרה"],
      "excludes": ["מה לא נכלל בהגדרה"],
      "equivalent_terms": ["מונחים נרדפים"],

      "structured_constraints": {
        "min_value": null,
        "max_value": null,
        "currency": "ILS",
        "min_count": null,
        "domain": "string - תחום (למשל: תחבורה ציבורית)",
        "sub_domains": ["תת-תחומים"],
        "time_range_years": null,
        "time_reference": "FROM_PUBLISH | FROM_DEADLINE | FROM_SUBMISSION | ABSOLUTE",
        "geographic_scope": null,
        "entity_scope": "BIDDER_ONLY | BIDDER_AND_SUB | CONSORTIUM | GROUP"
      },

      "source": {
        "page": null,
        "section": "string - מספר סעיף",
        "quote": "string - ציטוט מדויק מהמסמך"
      },

      "confidence": 0.0,
      "notes": "הערות נוספות"
    }
  ],

  "undefined_terms": [
    {
      "term": "string - מונח שמופיע בתנאי סף אך לא מוגדר",
      "context": "string - ההקשר שבו מופיע",
      "suggested_definition": "string - הצעת הגדרה סבירה",
      "risk_level": "HIGH | MEDIUM | LOW",
      "recommendation": "string - מה מומלץ לעשות (שאלת הבהרה?)"
    }
  ],

  "summary": {
    "total_definitions_found": 0,
    "has_definitions_section": true,
    "undefined_critical_terms": 0,
    "requires_clarification": true
  }
}`;

// ============================================
// PROMPT: Link Definitions to Gate Conditions
// ============================================

export const LINK_DEFINITIONS_TO_GATES_PROMPT = `בהינתן הגדרות המכרז ותנאי הסף, קשר כל תנאי סף להגדרות הרלוונטיות וצור "דרישה מפורשת" (resolved requirement).

## הגדרות המכרז:
{definitions_json}

## תנאי הסף:
{gate_conditions_json}

## הנחיות:
לכל תנאי סף:
1. זהה אילו הגדרות רלוונטיות לו
2. "פתח" את הדרישה בהתאם להגדרות
3. פרט בדיוק מה נדרש לעמידה

### דוגמה:
תנאי: "על המציע להציג 3 פרויקטים דומים"
הגדרה: "פרויקט דומה = פרויקט בתחום תחבורה ציבורית בהיקף 10M+"

→ דרישה מפורשת:
  - 3 פרויקטים
  - בתחום תחבורה ציבורית (רכבת/אוטובוס/מטרו - לא כביש/גשר)
  - היקף ≥ 10,000,000 ₪ כל אחד

## פלט נדרש (JSON):
{
  "resolved_conditions": [
    {
      "condition_id": "UUID",
      "condition_text": "הטקסט המקורי",
      "linked_definition_ids": ["UUID"],
      "linked_definition_terms": ["מונח 1", "מונח 2"],

      "resolved_requirement": {
        "description_hebrew": "תיאור מלא בעברית של מה שנדרש",
        "domain": "string - התחום (למשל: תחבורה ציבורית)",
        "domain_includes": ["מה כלול"],
        "domain_excludes": ["מה לא כלול"],
        "min_value": null,
        "min_count": null,
        "time_range_years": null,
        "entity_scope": "BIDDER_ONLY | BIDDER_AND_SUB",
        "scope_type": "ordered | executed | paid",
        "additional_criteria": ["קריטריונים נוספים"]
      },

      "matching_criteria": [
        {
          "criterion": "string - מה בודקים",
          "how_to_check": "string - איך בודקים",
          "weight": "CRITICAL | IMPORTANT | NICE_TO_HAVE"
        }
      ],

      "adversarial_traps": [
        "string - מה יכול להטעות (למשל: פרויקט עם מילה 'תחבורה' בשם אבל הוא בינוי)"
      ]
    }
  ]
}`;

// ============================================
// PROMPT: Semantic Project Classification
// ============================================

export const CLASSIFY_PROJECT_AGAINST_DEFINITION_PROMPT = `אתה מומחה לסיווג פרויקטים מול הגדרות מכרז. עליך לקבוע האם פרויקט מסוים מתאים להגדרה מסוימת.

## ההגדרה מהמכרז:
מונח: {definition_term}
הגדרה: {definition_text}
כולל: {definition_includes}
לא כולל: {definition_excludes}
מגבלות: {definition_constraints}

## הפרויקט לבדיקה:
שם: {project_name}
תיאור: {project_description}
לקוח: {client_name} (סוג: {client_type})
תחום: {project_category}
טכנולוגיות: {project_technologies}
היקף: {project_value} {currency}
תאריכים: {start_date} - {end_date}
סוג: {project_type}

## הנחיות קריטיות:
1. אל תסתמך על שם הפרויקט בלבד! בדוק את התוכן
2. חפש אי-התאמות:
   - שם מטעה: "שדרוג תשתיות תחבורה" יכול להיות בינוי כבישים
   - ערכים על הגבול: 9.9M כשנדרש 10M
   - תאריכים מחוץ לטווח
   - תחום קרוב אך לא זהה
3. תן הסבר מפורט בעברית

## פלט נדרש (JSON):
{
  "matches_definition": true/false,
  "confidence": 0.0-1.0,

  "domain_match": {
    "matches": true/false,
    "project_domain": "string - התחום של הפרויקט כפי שזוהה",
    "required_domain": "string - התחום הנדרש",
    "reasoning": "string - הסבר בעברית למה כן/לא מתאים"
  },

  "value_match": {
    "matches": true/false,
    "project_value": 0,
    "required_value": 0,
    "reasoning": "string"
  },

  "timeframe_match": {
    "matches": true/false,
    "project_dates": "string",
    "required_range": "string",
    "reasoning": "string"
  },

  "adversarial_flags": [
    {
      "flag_type": "MISLEADING_NAME | BOUNDARY_VALUE | OUT_OF_RANGE | WRONG_DOMAIN | AMBIGUOUS",
      "description": "string - תיאור בעברית",
      "severity": "HIGH | MEDIUM | LOW"
    }
  ],

  "overall_reasoning": "string - הסבר מלא בעברית למה הפרויקט כן/לא מתאים להגדרה",

  "dual_interpretation": {
    "restrictive": {
      "matches": true/false,
      "reasoning": "string - לפי פרשנות מצמצמת"
    },
    "expansive": {
      "matches": true/false,
      "reasoning": "string - לפי פרשנות מרחיבה"
    }
  }
}`;

// ============================================
// PROMPT: Generate Full Match Explanation
// ============================================

export const GENERATE_MATCH_EXPLANATION_PROMPT = `צור הסבר מלא ומפורט בעברית על תוצאת ההתאמה של פרופיל חברה לתנאי סף.

## תנאי הסף:
{condition_text}

## הגדרות המכרז הרלוונטיות:
{definitions}

## הדרישה המפורשת (לאחר פירוש):
{resolved_requirement}

## תוצאות הסיווג לכל פרויקט:
{project_classifications}

## נתונים פיננסיים:
{financial_data}

## הסמכות:
{certifications}

## אנשי מפתח:
{personnel}

## הנחיות:
צור הסבר מובנה שכולל:
1. ציטוט ההגדרה מהמכרז
2. פירוט כל פרויקט - למה עובר/לא עובר
3. סיכום כמותי (X מתוך Y נדרש)
4. דגלים אדומים (adversarial flags)
5. המלצות מה לעשות
6. פרשנות כפולה (מצמצמת/מרחיבה) כשרלוונטי

## פלט נדרש (JSON):
{
  "status": "MEETS | PARTIALLY_MEETS | DOES_NOT_MEET",
  "required_count": 0,
  "matching_count": 0,

  "definition_used": {
    "term": "string",
    "text": "string",
    "source": "עמוד X, סעיף Y"
  },

  "project_analyses": [
    {
      "project_name": "string",
      "project_value": 0,
      "project_year": 0,
      "domain_classification": "string - לאיזה תחום שייך",
      "matches_definition": true/false,
      "matches_value": true/false,
      "matches_timeframe": true/false,
      "overall_match": true/false,
      "reasoning": "string - הסבר בעברית",
      "adversarial_flags": []
    }
  ],

  "gap_description": "string - מה חסר (אם יש)",
  "gap_closure_options": [
    {
      "option": "SUBCONTRACTOR | PARTNERSHIP | CLARIFICATION | DEVELOPMENT | ALTERNATE_PRESENTATION",
      "description": "string - הסבר בעברית",
      "feasibility": "HIGH | MEDIUM | LOW",
      "action_items": ["string"]
    }
  ],

  "dual_interpretation": {
    "restrictive": {
      "status": "MEETS | DOES_NOT_MEET",
      "matching_count": 0,
      "reasoning": "string"
    },
    "expansive": {
      "status": "MEETS | DOES_NOT_MEET",
      "matching_count": 0,
      "reasoning": "string"
    },
    "recommended": "RESTRICTIVE | EXPANSIVE",
    "recommendation_reason": "string"
  },

  "explanation_markdown": "string - ההסבר המלא ב-Markdown עברי"
}`;

// ============================================
// PROMPT: Generate Test Profile
// ============================================

export const GENERATE_TEST_PROFILE_PROMPT = `צור פרופיל חברה לדוגמה עבור מכרז, לצורך בדיקת איכות מנוע ההתאמה.

## תנאי הסף של המכרז:
{gate_conditions}

## הגדרות המכרז:
{definitions}

## סוג הפרופיל הנדרש: {profile_type}

### אם PASSING (פרופיל עובר):
- צור פרויקטים שעומדים **בדיוק** בהגדרות
- כל תנאי סף חייב להיות מכוסה
- השתמש בשמות ריאליסטיים
- הערכים צריכים לעמוד בדרישות

### אם FAILING (פרופיל נכשל):
- צור פרויקטים שלא עומדים בהגדרות
- אך נראים קרובים/דומים
- ודא שכל תנאי סף נכשל מסיבה אחרת

### אם ADVERSARIAL (פרופיל מטעה):
- צור פרויקטים שנראים כאילו עומדים אבל לא באמת
- שמות מטעים (מילות מפתח מהתחום הנכון, תוכן מתחום אחר)
- ערכים על הגבול (9.9M כש-10M נדרש)
- תאריכים כמעט בטווח
- תחומים דומים אך שונים
- תערובת: כמה פרויקטים אמיתיים + כמה מטעים
- **פרט את כל הטריקים שהשתמשת בהם** כדי שנוכל לבדוק אם המערכת תופסת

## פלט נדרש (JSON):
{
  "profile_name": "string - שם החברה הבדיונית",
  "profile_type": "PASSING | FAILING | ADVERSARIAL",

  "company_data": {
    "name": "string",
    "company_number": "string",
    "founding_year": 2000,
    "address": "string",
    "employee_count": 100
  },

  "projects": [
    {
      "project_name": "string",
      "client_name": "string",
      "client_type": "GOVERNMENT | MUNICIPAL | PRIVATE | DEFENSE",
      "start_date": "2020-01-01",
      "end_date": "2023-01-01",
      "total_value": 0,
      "project_type": "ESTABLISHMENT | MAINTENANCE | COMBINED",
      "category": "string",
      "domain_classification": "string - התחום האמיתי של הפרויקט",
      "description": "string - תיאור מפורט",
      "technologies": {},
      "role_type": "PRIMARY | SUBCONTRACTOR | PARTNERSHIP",

      "matches_condition": "string - לאיזה תנאי סף מיועד",
      "expected_match": true/false,
      "why_matches_or_not": "string - הסבר"
    }
  ],

  "financials": [
    {
      "fiscal_year": 2024,
      "annual_revenue": 0,
      "net_profit": 0,
      "employee_count": 0,
      "audited": true
    }
  ],

  "certifications": [
    {
      "cert_type": "ISO | LICENSE | SECURITY_CLEARANCE",
      "cert_name": "string",
      "issuing_body": "string",
      "valid_from": "2020-01-01",
      "valid_until": "2027-01-01"
    }
  ],

  "personnel": [
    {
      "full_name": "string",
      "role": "string",
      "education": "string",
      "years_experience": 0,
      "professional_certifications": ["string"]
    }
  ],

  "expected_results": {
    "overall_eligibility": "ELIGIBLE | NOT_ELIGIBLE | CONDITIONAL",
    "per_condition": [
      {
        "condition_text": "string",
        "expected_status": "MEETS | DOES_NOT_MEET | PARTIALLY_MEETS",
        "expected_reasoning": "string"
      }
    ]
  },

  "adversarial_tricks": [
    {
      "trick_type": "MISLEADING_NAME | BOUNDARY_VALUE | WRONG_DOMAIN | OUT_OF_TIMEFRAME | MIXED_REAL_FAKE",
      "description": "string - מה הטריק",
      "target_condition": "string - איזה תנאי סף אמור להטעות",
      "expected_detection": "string - איך המערכת אמורה לתפוס את זה"
    }
  ]
}`;
