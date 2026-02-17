/**
 * Semantic Matching Prompts
 * מערכת התאמה סמנטית מבוססת הגדרות
 *
 * Replaces keyword-based matching with AI-driven semantic classification
 * that uses tender-specific definitions
 */

// ============================================
// SYSTEM PROMPT: Semantic Gate Matching Expert
// ============================================

export const SEMANTIC_MATCHING_SYSTEM_PROMPT = `אתה מומחה להתאמת פרופילי חברות מול תנאי סף במכרזים ישראליים.

## עקרון מרכזי:
כל בדיקה חייבת להתבסס על **ההגדרות הספציפיות של המכרז**, לא על הבנה כללית.

## כללי ברזל:
1. **שם הפרויקט אינו ראיה** - בדוק תוכן, לא כותרת
2. **הגדרת המכרז קודמת לכל** - אם המכרז מגדיר "תחבורתי" = תח"צ בלבד, כביש ≠ תחבורתי
3. **ערכי סף הם מוחלטים** - 9.9M < 10M = לא עומד
4. **טווחי זמן מדויקים** - יום אחד מחוץ לטווח = לא עומד
5. **הסבר כל החלטה** - כל כן/לא חייב נימוק
6. **זהה מניפולציות** - שמות מטעים, ערכי גבול, תחומים מעורבים
7. **פרשנות כפולה** - תמיד הצג גם מצמצמת וגם מרחיבה

## מבנה בדיקה:
לכל תנאי סף:
1. מה בדיוק נדרש? (לפי הגדרות המכרז)
2. מה יש בפרופיל?
3. האם מתאים? (לפי כל קריטריון)
4. מה חסר?
5. מה אפשר לעשות?

ענה תמיד ב-JSON מובנה.`;

// ============================================
// PROMPT: Full Semantic Gate Matching
// ============================================

export const FULL_SEMANTIC_MATCHING_PROMPT = `בצע התאמה סמנטית מלאה בין פרופיל חברה לתנאי הסף של מכרז.

## הנחיות מרכזיות:
- השתמש בהגדרות המכרז לסיווג כל פרויקט
- אל תסתמך על שמות פרויקטים - בדוק תוכן בלבד
- חפש אי-התאמות ודגלים אדומים
- תן הסבר מפורט בעברית לכל החלטה

## הגדרות המכרז:
{definitions}

## תנאי הסף:
{gate_conditions}

## פרופיל החברה:

### פרויקטים:
{projects}

### נתונים פיננסיים:
{financials}

### הסמכות:
{certifications}

### אנשי מפתח:
{personnel}

## פלט נדרש (JSON):
{
  "matching_results": [
    {
      "condition_id": "UUID",
      "condition_number": "string",
      "condition_text": "string",
      "condition_type": "GATE | ADVANTAGE",

      "definition_used": {
        "term": "string - ההגדרה שהשפיעה",
        "text": "string - תוכן ההגדרה",
        "source": "string - מיקום במכרז"
      },

      "resolved_requirement": "string - מה בדיוק נדרש אחרי יישום ההגדרות",

      "status": "MEETS | PARTIALLY_MEETS | DOES_NOT_MEET | UNKNOWN",
      "confidence": 0.0-1.0,

      "required_count": null,
      "matching_count": null,

      "matching_assets": [
        {
          "asset_type": "PROJECT | FINANCIAL | CERTIFICATION | PERSONNEL",
          "asset_id": "string",
          "asset_name": "string",
          "match_status": "FULL | PARTIAL | NONE",
          "classification": "string - לאיזה תחום סווג (לפי הגדרת המכרז)",

          "criteria_checks": [
            {
              "criterion": "domain | value | timeframe | entity | scope",
              "required": "string",
              "actual": "string",
              "passes": true/false,
              "reasoning": "string"
            }
          ],

          "adversarial_flags": [
            {
              "flag_type": "MISLEADING_NAME | BOUNDARY_VALUE | WRONG_DOMAIN | OUT_OF_RANGE | AMBIGUOUS",
              "description": "string - תיאור בעברית",
              "severity": "HIGH | MEDIUM | LOW"
            }
          ],

          "dual_interpretation": {
            "restrictive": {"matches": true/false, "reasoning": "string"},
            "expansive": {"matches": true/false, "reasoning": "string"}
          },

          "overall_reasoning": "string - הסבר מלא בעברית"
        }
      ],

      "gap_analysis": {
        "has_gap": true/false,
        "gap_description": "string - מה חסר בעברית",
        "gap_size": "string - כמה חסר (למשל: חסר פרויקט 1 מתוך 3)",
        "closure_options": [
          {
            "option": "SUBCONTRACTOR | PARTNERSHIP | CLARIFICATION | DEVELOPMENT | ALTERNATE_PRESENTATION",
            "description": "string",
            "feasibility": "HIGH | MEDIUM | LOW",
            "estimated_effort": "string",
            "action_items": ["string"]
          }
        ]
      },

      "explanation_hebrew": "string - הסבר מלא ומפורט בעברית"
    }
  ],

  "overall_summary": {
    "total_conditions": 0,
    "mandatory_count": 0,
    "meets_count": 0,
    "partially_meets_count": 0,
    "does_not_meet_count": 0,
    "unknown_count": 0,

    "overall_eligibility": "ELIGIBLE | NOT_ELIGIBLE | CONDITIONAL",
    "blocking_conditions": ["string - תנאי חסום"],

    "critical_gaps": ["string - פערים קריטיים"],
    "recommended_actions": ["string - המלצות"],

    "adversarial_alerts": [
      {
        "description": "string",
        "affected_conditions": ["string"],
        "recommendation": "string"
      }
    ],

    "confidence_score": 0.0-1.0,

    "executive_summary_hebrew": "string - סיכום מנהלים בעברית"
  }
}`;

// ============================================
// PROMPT: Quick Project Domain Classification
// ============================================

export const QUICK_CLASSIFY_PROJECT_PROMPT = `סווג את הפרויקט הבא לתחום הנכון, בהתבסס על התוכן ולא על השם.

## הגדרות התחומים מהמכרז:
{domain_definitions}

## פרויקט:
שם: {project_name}
לקוח: {client_name}
תיאור: {project_description}
קטגוריה: {project_category}
טכנולוגיות: {technologies}
סוג: {project_type}

## ענה ב-JSON:
{
  "classified_domain": "string - התחום האמיתי",
  "confidence": 0.0-1.0,
  "reasoning": "string - למה סווג כך",
  "name_misleading": true/false,
  "name_vs_content": "string - אם השם מטעה, הסבר למה"
}`;

// ============================================
// PROMPT: Batch Classify All Projects
// ============================================

export const BATCH_CLASSIFY_PROJECTS_PROMPT = `סווג את כל הפרויקטים הבאים מול ההגדרות של המכרז.

## הגדרות המכרז (הכי חשוב!):
{definitions}

## רשימת פרויקטים:
{projects}

## הנחיות:
1. לכל פרויקט - סווג לתחום הנכון לפי ההגדרות
2. בדוק אם שם הפרויקט מטעה
3. ציין דגלים אדומים
4. סדר לפי רלוונטיות

## ענה ב-JSON:
{
  "classifications": [
    {
      "project_id": "string",
      "project_name": "string",
      "classified_domain": "string",
      "relevant_for_conditions": ["condition IDs"],
      "confidence": 0.0-1.0,
      "name_misleading": true/false,
      "flags": [],
      "brief_reasoning": "string"
    }
  ],

  "domain_summary": {
    "domain_name": {
      "count": 0,
      "total_value": 0,
      "projects": ["names"]
    }
  }
}`;

// ============================================
// PROMPT: Generate Clarification Questions
// from Definition Gaps
// ============================================

export const DEFINITION_CLARIFICATION_PROMPT = `בהתבסס על מונחים לא מוגדרים שנמצאו במכרז, צור שאלות הבהרה חכמות.

## מונחים לא מוגדרים:
{undefined_terms}

## ההקשר שלהם בתנאי הסף:
{conditions_context}

## פרופיל החברה (לבחירת שאלות אסטרטגיות):
{company_profile_summary}

## צור שאלות שיעזרו לנו:
1. להרחיב הגדרות (אם זה מיטיב איתנו)
2. לצמצם הגדרות (אם זה פוסל מתחרים)
3. לקבל מידע חסר

## ענה ב-JSON:
{
  "questions": [
    {
      "question_text": "string - השאלה בעברית",
      "target_term": "string - המונח שלגביו השאלה",
      "strategic_purpose": "EXPAND_FOR_US | RESTRICT_COMPETITORS | CLARIFY_MISSING | REDUCE_RISK",
      "expected_impact": "string - מה נרוויח מהתשובה",
      "priority": "HIGH | MEDIUM | LOW",
      "phrasing_notes": "string - איך לנסח בצורה נייטרלית"
    }
  ]
}`;
