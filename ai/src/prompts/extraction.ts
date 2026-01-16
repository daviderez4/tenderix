/**
 * Extraction Prompts
 *
 * Prompts for extracting structured data from tender documents
 */

import { PromptTemplate, promptEngine, wrapInTags } from './templates';

/**
 * Extract specific field from document
 */
export const fieldExtractionTemplate: PromptTemplate = {
  name: 'field-extraction',
  description: 'Extract a specific field from document',
  outputFormat: 'json',
  template: `חלץ את השדה "{{fieldName}}" מהמסמך הבא:

${wrapInTags('{{documentText}}', 'document')}

{{#if fieldDescription}}
תיאור השדה: {{fieldDescription}}
{{/if}}

{{#if examples}}
דוגמאות לערכים תקינים:
{{#each examples}}
- {{this}}
{{/each}}
{{/if}}

החזר JSON:
\`\`\`json
{
  "field": "{{fieldName}}",
  "value": "הערך שנמצא או null",
  "confidence": 0.0-1.0,
  "source_text": "הטקסט המקורי שממנו חולץ"
}
\`\`\``,
  variables: [
    { name: 'documentText', type: 'string', required: true },
    { name: 'fieldName', type: 'string', required: true },
    { name: 'fieldDescription', type: 'string', required: false },
    { name: 'examples', type: 'array', required: false },
  ],
};

/**
 * Extract dates from document
 */
export const dateExtractionTemplate: PromptTemplate = {
  name: 'date-extraction',
  description: 'Extract all dates from document',
  outputFormat: 'json',
  template: `חלץ את כל התאריכים החשובים מהמסמך:

${wrapInTags('{{documentText}}', 'document')}

זהה תאריכים עבור:
- מועד פרסום
- מועד אחרון לשאלות הבהרה
- מועד אחרון להגשה
- מועד פתיחת מעטפות
- תקופת התקשרות
- תאריכי אופציה
- תאריכים אחרים רלוונטיים

החזר JSON:
\`\`\`json
{
  "dates": [
    {
      "type": "סוג התאריך",
      "date": "YYYY-MM-DD",
      "time": "HH:MM או null",
      "description": "תיאור",
      "source_text": "הטקסט המקורי"
    }
  ],
  "timeline": {
    "publish_date": "YYYY-MM-DD או null",
    "clarification_deadline": "YYYY-MM-DD או null",
    "submission_deadline": "YYYY-MM-DDTHH:MM או null",
    "opening_date": "YYYY-MM-DD או null"
  }
}
\`\`\``,
  variables: [
    { name: 'documentText', type: 'string', required: true },
  ],
};

/**
 * Extract amounts and financials
 */
export const financialExtractionTemplate: PromptTemplate = {
  name: 'financial-extraction',
  description: 'Extract financial information from document',
  outputFormat: 'json',
  template: `חלץ את כל המידע הפיננסי מהמסמך:

${wrapInTags('{{documentText}}', 'document')}

זהה:
- ערך משוער של המכרז
- סכומי ערבויות (הצעה, ביצוע)
- דרישות מחזור
- דרישות ביטוח
- תנאי תשלום
- הצמדות ועדכוני מחירים
- קנסות ופיצויים

החזר JSON:
\`\`\`json
{
  "estimated_value": {
    "amount": null,
    "currency": "ILS",
    "source_text": ""
  },
  "guarantees": [
    {
      "type": "TENDER|PERFORMANCE|ADVANCE",
      "amount": 0,
      "percentage": null,
      "validity_months": null
    }
  ],
  "revenue_requirements": {
    "annual_minimum": null,
    "years_required": null
  },
  "insurance_requirements": [
    {
      "type": "סוג הביטוח",
      "amount": 0
    }
  ],
  "payment_terms": {
    "advance_percentage": null,
    "milestone_percentage": null,
    "final_percentage": null,
    "payment_days": null
  },
  "indexation": {
    "type": "סוג ההצמדה",
    "details": ""
  },
  "penalties": [
    {
      "type": "סוג הקנס",
      "amount": null,
      "percentage": null,
      "conditions": ""
    }
  ]
}
\`\`\``,
  variables: [
    { name: 'documentText', type: 'string', required: true },
  ],
};

/**
 * Extract personnel requirements
 */
export const personnelExtractionTemplate: PromptTemplate = {
  name: 'personnel-extraction',
  description: 'Extract personnel requirements from document',
  outputFormat: 'json',
  template: `חלץ את דרישות כוח האדם מהמכרז:

${wrapInTags('{{documentText}}', 'document')}

לכל תפקיד נדרש, זהה:
- שם התפקיד
- דרישות השכלה
- דרישות ניסיון (שנים, תחומים)
- הסמכות נדרשות
- האם חובה או יתרון
- אחוז משרה נדרש

החזר JSON:
\`\`\`json
{
  "positions": [
    {
      "title": "שם התפקיד",
      "quantity": 1,
      "is_mandatory": true,
      "education": {
        "degree": "תואר נדרש",
        "field": "תחום לימוד"
      },
      "experience": {
        "years": 0,
        "domains": ["תחום1", "תחום2"],
        "specific_requirements": ""
      },
      "certifications": ["הסמכה1", "הסמכה2"],
      "availability": "FULL_TIME|PART_TIME|AS_NEEDED",
      "can_be_subcontractor": false,
      "source_section": "מיקום במסמך"
    }
  ],
  "total_required": 0,
  "key_positions": ["תפקידים קריטיים"]
}
\`\`\``,
  variables: [
    { name: 'documentText', type: 'string', required: true },
  ],
};

/**
 * Extract experience requirements
 */
export const experienceExtractionTemplate: PromptTemplate = {
  name: 'experience-extraction',
  description: 'Extract experience requirements from document',
  outputFormat: 'json',
  template: `חלץ את דרישות הניסיון מהמכרז:

${wrapInTags('{{documentText}}', 'document')}

לכל דרישת ניסיון, זהה:
- תיאור הדרישה
- מספר פרויקטים נדרש
- היקף כספי מינימלי
- תקופה (שנים אחורה)
- סוג לקוחות (ממשלתי, עירוני, פרטי)
- האם ניתן להסתמך על שותף/קבלן משנה

החזר JSON:
\`\`\`json
{
  "experience_requirements": [
    {
      "description": "תיאור הדרישה",
      "project_count": 0,
      "min_value": null,
      "years_back": 0,
      "client_types": ["GOVERNMENT", "MUNICIPAL", "PRIVATE"],
      "specific_domain": "",
      "can_use_partner": false,
      "can_use_subcontractor": false,
      "is_mandatory": true,
      "source_section": ""
    }
  ],
  "summary": {
    "total_projects_needed": 0,
    "total_value_needed": null,
    "lookback_period": 0
  }
}
\`\`\``,
  variables: [
    { name: 'documentText', type: 'string', required: true },
  ],
};

/**
 * Extract contact information
 */
export const contactExtractionTemplate: PromptTemplate = {
  name: 'contact-extraction',
  description: 'Extract contact information from document',
  outputFormat: 'json',
  template: `חלץ את פרטי הקשר מהמכרז:

${wrapInTags('{{documentText}}', 'document')}

חפש:
- איש קשר לשאלות
- כתובת להגשה
- אימייל
- טלפון
- פקס
- אתר אינטרנט

החזר JSON:
\`\`\`json
{
  "contacts": [
    {
      "role": "תפקיד",
      "name": "שם",
      "email": "",
      "phone": "",
      "fax": ""
    }
  ],
  "submission": {
    "address": "כתובת להגשה",
    "room": "חדר/קומה",
    "method": "PHYSICAL|ELECTRONIC|BOTH"
  },
  "website": "",
  "clarifications_email": ""
}
\`\`\``,
  variables: [
    { name: 'documentText', type: 'string', required: true },
  ],
};

// Register templates
export function registerExtractionTemplates(): void {
  promptEngine.register(fieldExtractionTemplate);
  promptEngine.register(dateExtractionTemplate);
  promptEngine.register(financialExtractionTemplate);
  promptEngine.register(personnelExtractionTemplate);
  promptEngine.register(experienceExtractionTemplate);
  promptEngine.register(contactExtractionTemplate);
}

registerExtractionTemplates();
