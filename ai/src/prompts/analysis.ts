/**
 * Analysis Prompts
 *
 * Prompts for analyzing tender documents and making decisions
 */

import { PromptTemplate, promptEngine, wrapInTags, section } from './templates';

/**
 * GO/NO-GO Decision Analysis
 */
export const goNoGoTemplate: PromptTemplate = {
  name: 'go-nogo-decision',
  description: 'Analyze tender for GO/NO-GO decision',
  outputFormat: 'json',
  template: `בצע ניתוח GO/NO-GO למכרז:

${section('מידע על המכרז', wrapInTags('{{tenderSummary}}', 'tender'))}

${section('תנאי סף', wrapInTags('{{gateConditions}}', 'gates'))}

${section('פרופיל החברה', wrapInTags('{{companyProfile}}', 'company'))}

{{#if competitorAnalysis}}
${section('ניתוח מתחרים', wrapInTags('{{competitorAnalysis}}', 'competitors'))}
{{/if}}

נתח:
1. עמידה בתנאי סף - האם עומדים בכל התנאים?
2. יתרון תחרותי - מה היתרונות והחסרונות?
3. סיכונים - מה הסיכונים העיקריים?
4. רווחיות - האם המכרז רווחי?
5. אסטרטגיה - האם מתאים לאסטרטגיית החברה?

החזר JSON:
\`\`\`json
{
  "recommendation": "GO|NO_GO|CONDITIONAL",
  "confidence": 0.0-1.0,
  "gate_eligibility": {
    "meets_all": true,
    "total_conditions": 0,
    "met_conditions": 0,
    "blocking_conditions": []
  },
  "competitive_position": {
    "strengths": ["יתרון1", "יתרון2"],
    "weaknesses": ["חסרון1"],
    "win_probability": 0.0-1.0
  },
  "risks": {
    "high": [],
    "medium": [],
    "low": []
  },
  "financial_assessment": {
    "estimated_value": 0,
    "expected_margin": 0,
    "roi_assessment": "HIGH|MEDIUM|LOW"
  },
  "strategic_fit": {
    "aligns_with_strategy": true,
    "market_positioning": "",
    "future_opportunities": []
  },
  "conditions_for_go": [],
  "action_items": [],
  "summary": "סיכום ההמלצה"
}
\`\`\``,
  variables: [
    { name: 'tenderSummary', type: 'string', required: true },
    { name: 'gateConditions', type: 'string', required: true },
    { name: 'companyProfile', type: 'string', required: true },
    { name: 'competitorAnalysis', type: 'string', required: false },
  ],
};

/**
 * Gate Condition Matching
 */
export const gateMatchingTemplate: PromptTemplate = {
  name: 'gate-matching',
  description: 'Match company assets against gate conditions',
  outputFormat: 'json',
  template: `בדוק התאמה בין נכסי החברה לתנאי הסף:

${section('תנאי הסף', wrapInTags('{{gateCondition}}', 'condition'))}

${section('נכסי החברה', `
פרויקטים:
${wrapInTags('{{projects}}', 'projects')}

אנשי מפתח:
${wrapInTags('{{personnel}}', 'personnel')}

הסמכות:
${wrapInTags('{{certifications}}', 'certifications')}

נתונים פיננסיים:
${wrapInTags('{{financials}}', 'financials')}
`)}

בדוק:
1. האם יש התאמה מלאה, חלקית, או אין התאמה?
2. מה הראיות התומכות?
3. האם נדרשת פרשנות מרחיבה?
4. מה הפערים ואיך לסגור אותם?

החזר JSON:
\`\`\`json
{
  "match_status": "FULL|PARTIAL|NONE",
  "confidence": 0.0-1.0,
  "matching_assets": [
    {
      "asset_type": "PROJECT|PERSONNEL|CERTIFICATION|FINANCIAL",
      "asset_id": "",
      "asset_name": "",
      "match_score": 0.0-1.0,
      "justification": ""
    }
  ],
  "interpretation_required": false,
  "interpretation_basis": "",
  "gap_analysis": {
    "has_gap": false,
    "gap_description": "",
    "closure_options": [
      {
        "option": "SUBCONTRACTOR|PARTNERSHIP|DEVELOP|CLARIFICATION",
        "feasibility": "HIGH|MEDIUM|LOW",
        "description": ""
      }
    ]
  },
  "evidence_summary": "",
  "recommendation": ""
}
\`\`\``,
  variables: [
    { name: 'gateCondition', type: 'string', required: true },
    { name: 'projects', type: 'string', required: true },
    { name: 'personnel', type: 'string', required: true },
    { name: 'certifications', type: 'string', required: true },
    { name: 'financials', type: 'string', required: true },
  ],
};

/**
 * Pricing Strategy Analysis
 */
export const pricingStrategyTemplate: PromptTemplate = {
  name: 'pricing-strategy',
  description: 'Analyze and recommend pricing strategy',
  outputFormat: 'json',
  template: `נתח את אסטרטגיית התמחור למכרז:

${section('כתב הכמויות', wrapInTags('{{boqSummary}}', 'boq'))}

${section('מידע על המכרז', wrapInTags('{{tenderInfo}}', 'tender'))}

{{#if competitorPricing}}
${section('מחירי מתחרים היסטוריים', wrapInTags('{{competitorPricing}}', 'competitors'))}
{{/if}}

{{#if marketPricing}}
${section('מחירי שוק', wrapInTags('{{marketPricing}}', 'market'))}
{{/if}}

נתח:
1. מחיר מינימום - עלות + מרווח מינימלי
2. מחיר מקסימום - גג שוק
3. מחיר מומלץ - נקודת מתוקה
4. סעיפים בעייתיים - סיכוני תמחור
5. הזדמנויות - "הוט מאני"

החזר JSON:
\`\`\`json
{
  "pricing_recommendation": {
    "minimum_price": 0,
    "maximum_price": 0,
    "recommended_price": 0,
    "expected_margin": 0,
    "win_probability_at_recommended": 0.0-1.0
  },
  "price_sensitivity": {
    "price_weight": 0,
    "quality_weight": 0,
    "price_impact_analysis": ""
  },
  "risky_items": [
    {
      "item": "",
      "risk_type": "QUANTITY|SPEC|MARKET",
      "recommended_action": ""
    }
  ],
  "opportunities": [
    {
      "item": "",
      "opportunity_type": "",
      "potential_gain": 0
    }
  ],
  "scenarios": [
    {
      "name": "שמרני|מאוזן|אגרסיבי",
      "price": 0,
      "margin": 0,
      "win_probability": 0.0-1.0
    }
  ],
  "summary": ""
}
\`\`\``,
  variables: [
    { name: 'boqSummary', type: 'string', required: true },
    { name: 'tenderInfo', type: 'string', required: true },
    { name: 'competitorPricing', type: 'string', required: false },
    { name: 'marketPricing', type: 'string', required: false },
  ],
};

/**
 * Competitor Analysis
 */
export const competitorAnalysisTemplate: PromptTemplate = {
  name: 'competitor-analysis',
  description: 'Analyze competitors for a tender',
  outputFormat: 'json',
  template: `נתח את המתחרים הפוטנציאליים למכרז:

${section('פרטי המכרז', wrapInTags('{{tenderInfo}}', 'tender'))}

${section('מתחרים ידועים', wrapInTags('{{knownCompetitors}}', 'competitors'))}

{{#if historicalBids}}
${section('הצעות היסטוריות', wrapInTags('{{historicalBids}}', 'history'))}
{{/if}}

נתח לכל מתחרה:
1. סבירות השתתפות
2. יתרונות וחסרונות
3. אסטרטגיית תמחור צפויה
4. איך להתמודד מולו

החזר JSON:
\`\`\`json
{
  "competitors": [
    {
      "name": "",
      "participation_likelihood": "HIGH|MEDIUM|LOW",
      "strengths": [],
      "weaknesses": [],
      "expected_strategy": "",
      "estimated_price_range": {
        "low": 0,
        "high": 0
      },
      "counter_strategy": "",
      "threat_level": "HIGH|MEDIUM|LOW"
    }
  ],
  "market_dynamics": {
    "competition_level": "HIGH|MEDIUM|LOW",
    "expected_bidders": 0,
    "market_trend": ""
  },
  "our_position": {
    "strengths_vs_competitors": [],
    "weaknesses_vs_competitors": [],
    "differentiation_opportunities": []
  },
  "recommended_strategy": ""
}
\`\`\``,
  variables: [
    { name: 'tenderInfo', type: 'string', required: true },
    { name: 'knownCompetitors', type: 'string', required: true },
    { name: 'historicalBids', type: 'string', required: false },
  ],
};

/**
 * Document Classification
 */
export const documentClassificationTemplate: PromptTemplate = {
  name: 'document-classification',
  description: 'Classify tender document type',
  outputFormat: 'json',
  template: `סווג את סוג המסמך:

${wrapInTags('{{documentText}}', 'document')}

סוגי מסמכים אפשריים:
- INVITATION - הזמנה להציע הצעות
- SPECS - מפרט טכני
- BOQ - כתב כמויות
- CONTRACT - חוזה התקשרות
- CLARIFICATIONS - מסמך הבהרות
- FORMS - טפסים ונספחים
- APPENDIX - נספח כללי
- UNKNOWN - לא ניתן לזהות

החזר JSON:
\`\`\`json
{
  "document_type": "סוג המסמך",
  "confidence": 0.0-1.0,
  "sub_type": "תת-סוג אם רלוונטי",
  "key_indicators": ["מה גרם לזיהוי"],
  "summary": "תקציר קצר של תוכן המסמך"
}
\`\`\``,
  variables: [
    { name: 'documentText', type: 'string', required: true },
  ],
};

// Register templates
export function registerAnalysisTemplates(): void {
  promptEngine.register(goNoGoTemplate);
  promptEngine.register(gateMatchingTemplate);
  promptEngine.register(pricingStrategyTemplate);
  promptEngine.register(competitorAnalysisTemplate);
  promptEngine.register(documentClassificationTemplate);
}

registerAnalysisTemplates();
