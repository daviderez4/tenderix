/**
 * Hebrew Prompt Templates
 *
 * Specialized prompts for Hebrew tender document processing
 */

import { PromptTemplate, promptEngine, wrapInTags, section } from './templates';

// ==================== System Prompts ====================

export const HEBREW_SYSTEM_PROMPTS = {
  /**
   * Base system prompt for Hebrew document analysis
   */
  documentAnalyzer: `אתה מומחה לניתוח מסמכי מכרזים בעברית.

תפקידך:
- לנתח מסמכי מכרז בשפה העברית
- לחלץ מידע מדויק ומובנה
- לזהות תנאי סף, דרישות והגדרות
- להבין הקשרים משפטיים ועסקיים

כללים חשובים:
1. השב תמיד בעברית (אלא אם נדרש אחרת)
2. שמור על דיוק - אל תמציא מידע
3. ציין רמת ביטחון כשיש ספק
4. התייחס להקשר המשפטי הישראלי
5. זהה מונחים טכניים וקצר אותם נכון`,

  /**
   * System prompt for gate condition extraction
   */
  gateExtractor: `אתה מומחה לזיהוי תנאי סף במכרזים ישראליים.

מומחיות:
- זיהוי תנאי סף (פוסלים) לעומת תנאי ניקוד (יתרון)
- הבנת דרישות ניסיון, תעודות ואישורים
- זיהוי דרישות פיננסיות (מחזורים, ערבויות)
- הבנת דרישות כוח אדם מקצועי

סוגי תנאי סף:
1. ניסיון - פרויקטים קודמים, שנות ותק
2. פיננסי - מחזורים, ערבויות, ביטוחים
3. הסמכות - ISO, רישיונות, סיווגים
4. כוח אדם - תפקידים, ניסיון, הסמכות
5. משפטי - אישורי מסים, רישום חברות`,

  /**
   * System prompt for BOQ analysis
   */
  boqAnalyzer: `אתה מומחה לניתוח כתבי כמויות (BOQ) במכרזים.

מומחיות:
- זיהוי סעיפי כמויות ומחירים
- הבנת יחידות מידה בעברית
- זיהוי סיכונים בתמחור
- הבנת מבנה כתב כמויות ישראלי

יחידות מידה נפוצות:
- יח' = יחידה
- מ"ר = מטר רבוע
- מ"א = מטר אורך
- קומפ' = קומפלט
- פאוש' = פאושלי`,

  /**
   * System prompt for competitor analysis
   */
  competitorAnalyzer: `אתה מומחה למודיעין תחרותי בשוק המכרזים הישראלי.

מומחיות:
- זיהוי מתחרים פוטנציאליים
- הערכת יתרונות וחסרונות
- ניתוח אסטרטגיות תמחור
- הבנת דינמיקות שוק`,
};

// ==================== Prompt Templates ====================

/**
 * Template for extracting tender metadata
 */
export const metadataExtractionTemplate: PromptTemplate = {
  name: 'metadata-extraction',
  description: 'Extract metadata from tender documents',
  outputFormat: 'json',
  template: `נתח את מסמך המכרז הבא וחלץ את המידע הבא:

${wrapInTags('{{documentText}}', 'document')}

חלץ את השדות הבאים (אם קיימים):
- מספר מכרז
- שם המכרז
- גוף מזמין
- תאריך פרסום
- מועד אחרון להגשה
- מועד אחרון להבהרות
- סכום ערבות
- תקופת התקשרות
- משקל מחיר (%)
- משקל איכות (%)
- קטגוריה/תחום

{{#if additionalFields}}
שדות נוספים לחילוץ:
{{#each additionalFields}}
- {{this}}
{{/each}}
{{/if}}

החזר את התוצאה בפורמט JSON בלבד:
\`\`\`json
{
  "tender_number": "מספר המכרז או null",
  "tender_name": "שם המכרז",
  "issuing_body": "שם הגוף המזמין",
  "publish_date": "תאריך בפורמט YYYY-MM-DD או null",
  "submission_deadline": "תאריך ושעה או null",
  "clarification_deadline": "תאריך או null",
  "guarantee_amount": "סכום הערבות כמספר או null",
  "contract_period": "תקופה בחודשים כמספר או null",
  "price_weight": "משקל מחיר כמספר או null",
  "quality_weight": "משקל איכות כמספר או null",
  "category": "קטגוריה או null",
  "confidence": 0.0-1.0
}
\`\`\``,
  variables: [
    { name: 'documentText', type: 'string', required: true },
    { name: 'additionalFields', type: 'array', required: false },
  ],
};

/**
 * Template for extracting gate conditions
 */
export const gateConditionsTemplate: PromptTemplate = {
  name: 'gate-conditions',
  description: 'Extract gate conditions from tender documents',
  outputFormat: 'json',
  template: `נתח את מסמך המכרז וחלץ את כל תנאי הסף (תנאים מוקדמים להשתתפות):

${wrapInTags('{{documentText}}', 'document')}

לכל תנאי סף, זהה:
1. מספר הסעיף במכרז
2. תיאור התנאי המלא
3. האם זה תנאי סף (פוסל) או תנאי יתרון (ניקוד)
4. סוג הדרישה (ניסיון, פיננסי, הסמכה, כוח אדם, אחר)
5. כמות/סכום נדרש (אם רלוונטי)
6. תקופה נדרשת (שנים)
7. האם ניתן להסתמך על קבלן משנה

החזר מערך JSON:
\`\`\`json
{
  "conditions": [
    {
      "number": "מספר הסעיף",
      "text": "תיאור התנאי המלא",
      "type": "GATE או ADVANTAGE",
      "requirement_type": "EXPERIENCE|FINANCIAL|CERTIFICATION|PERSONNEL|OTHER",
      "entity_type": "COMPANY|PROJECT|PERSONNEL|CERTIFICATION",
      "required_amount": null,
      "required_count": null,
      "required_years": null,
      "can_use_subcontractor": false,
      "source_section": "מיקום במסמך",
      "confidence": 0.0-1.0
    }
  ],
  "total_conditions": 0,
  "mandatory_count": 0
}
\`\`\``,
  variables: [
    { name: 'documentText', type: 'string', required: true },
  ],
};

/**
 * Template for tender definitions
 */
export const definitionsTemplate: PromptTemplate = {
  name: 'definitions',
  description: 'Extract definitions from tender documents',
  outputFormat: 'json',
  template: `חלץ את כל ההגדרות מפרק ההגדרות במכרז:

${wrapInTags('{{documentText}}', 'document')}

לכל הגדרה:
1. המונח המוגדר
2. ההגדרה המלאה
3. האם ההגדרה מגבילה, מרחיבה או ניטרלית
4. השלכות אפשריות על המציע

החזר JSON:
\`\`\`json
{
  "definitions": [
    {
      "term": "המונח",
      "definition": "ההגדרה המלאה",
      "interpretation": "RESTRICTIVE|EXPANSIVE|NEUTRAL",
      "implications": "השלכות אפשריות"
    }
  ]
}
\`\`\``,
  variables: [
    { name: 'documentText', type: 'string', required: true },
  ],
};

/**
 * Template for risk analysis
 */
export const riskAnalysisTemplate: PromptTemplate = {
  name: 'risk-analysis',
  description: 'Analyze risks in tender documents',
  outputFormat: 'json',
  template: `נתח את הסיכונים במכרז הבא:

${wrapInTags('{{documentText}}', 'document')}

{{#if companyProfile}}
פרופיל החברה המציעה:
${wrapInTags('{{companyProfile}}', 'company')}
{{/if}}

זהה:
1. סיכונים טכניים
2. סיכונים פיננסיים
3. סיכונים חוזיים
4. סיכונים תפעוליים
5. סיכונים משפטיים

לכל סיכון ציין:
- תיאור הסיכון
- חומרה (HIGH/MEDIUM/LOW)
- סבירות
- דרכי הקטנה

החזר JSON:
\`\`\`json
{
  "risks": [
    {
      "category": "קטגוריה",
      "description": "תיאור הסיכון",
      "severity": "HIGH|MEDIUM|LOW",
      "probability": "HIGH|MEDIUM|LOW",
      "mitigation": "דרכי הקטנה",
      "source": "מקור במסמך"
    }
  ],
  "overall_risk_level": "HIGH|MEDIUM|LOW",
  "recommendation": "המלצה כללית"
}
\`\`\``,
  variables: [
    { name: 'documentText', type: 'string', required: true },
    { name: 'companyProfile', type: 'string', required: false },
  ],
};

/**
 * Template for clarification questions
 */
export const clarificationQuestionsTemplate: PromptTemplate = {
  name: 'clarification-questions',
  description: 'Generate clarification questions for a tender',
  outputFormat: 'json',
  template: `צור שאלות הבהרה רלוונטיות למכרז:

${wrapInTags('{{documentText}}', 'document')}

{{#if gateConditions}}
תנאי הסף שזוהו:
{{#each gateConditions}}
- {{text}}
{{/each}}
{{/if}}

{{#if gaps}}
פערים שזוהו:
{{#each gaps}}
- {{this}}
{{/each}}
{{/if}}

צור שאלות הבהרה:
1. שאלות טכניות - להבנת הדרישות
2. שאלות אסטרטגיות - להרחבת אפשרויות
3. שאלות הגנתיות - לסגירת פערים

החזר JSON:
\`\`\`json
{
  "questions": [
    {
      "number": 1,
      "text": "נוסח השאלה",
      "type": "TECHNICAL|STRATEGIC|DEFENSIVE",
      "purpose": "מטרת השאלה",
      "expected_benefit": "התועלת הצפויה",
      "priority": "HIGH|MEDIUM|LOW",
      "related_section": "סעיף במכרז"
    }
  ]
}
\`\`\``,
  variables: [
    { name: 'documentText', type: 'string', required: true },
    { name: 'gateConditions', type: 'array', required: false },
    { name: 'gaps', type: 'array', required: false },
  ],
};

// ==================== Register Templates ====================

export function registerHebrewTemplates(): void {
  promptEngine.register(metadataExtractionTemplate);
  promptEngine.register(gateConditionsTemplate);
  promptEngine.register(definitionsTemplate);
  promptEngine.register(riskAnalysisTemplate);
  promptEngine.register(clarificationQuestionsTemplate);
}

// Auto-register on import
registerHebrewTemplates();

// ==================== Helper Functions ====================

/**
 * Get system prompt by name
 */
export function getSystemPrompt(name: keyof typeof HEBREW_SYSTEM_PROMPTS): string {
  return HEBREW_SYSTEM_PROMPTS[name];
}

/**
 * Create Hebrew analysis prompt
 */
export function createAnalysisPrompt(
  documentText: string,
  task: string,
  context?: Record<string, unknown>
): string {
  return `
${section('משימה', task)}

${section('מסמך', wrapInTags(documentText, 'document'))}

${context ? section('הקשר נוסף', Object.entries(context)
  .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
  .join('\n')) : ''}
`.trim();
}
