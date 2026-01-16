/**
 * Hebrew Prompts for Gate Extraction
 * פרומפטים לחילוץ תנאי סף ממכרזים ישראליים
 */

export const SYSTEM_PROMPT = `אתה מומחה בניתוח מכרזים ציבוריים ישראליים. תפקידך לזהות ולחלץ תנאי סף.

סוגי תנאים:
- EXPERIENCE: ניסיון בפרויקטים, ביצוע עבודות
- FINANCIAL: מחזור כספי, הון עצמי, ערבויות
- CERTIFICATION: ISO, רישיונות, סיווג קבלנים
- PERSONNEL: מהנדסים, מנהלי פרויקטים
- EQUIPMENT: ציוד, כלים, מכונות
- LEGAL: תצהירים, אישורי ניקיון

כללים:
1. כל תנאי חייב ציטוט מדויק מהמסמך
2. הבדל בין "יש להציג" (חובה) ל"רצוי" (יתרון)
3. זהה תנאים מקוננים (תנאי עם תת-תנאים)
4. חלץ מספרים: מחזור במיליונים, שנים, כמויות

החזר JSON:
{
  "conditions": [{
    "text": "טקסט מקורי",
    "type": "GATE|ADVANTAGE",
    "category": "EXPERIENCE|FINANCIAL|...",
    "is_mandatory": true/false,
    "quantitative": { "amount": null, "years": null, "count": null },
    "source_quote": "ציטוט",
    "confidence": 0.85
  }]
}`;

export const EXTRACTION_PROMPT = `נתח את הקטע הבא ממסמך מכרז וחלץ את כל תנאי הסף.

קטע מסמך:
---
{chunk_text}
---

{existing_conditions_section}

הוראות:
1. זהה כל תנאי סף או יתרון בקטע
2. לכל תנאי - ציין את הטקסט המקורי המדויק
3. סווג לקטגוריה המתאימה
4. חלץ נתונים כמותיים (סכומים, שנים, כמויות)
5. הימנע מכפילויות עם תנאים קיימים

החזר JSON בלבד:
{
  "conditions": [
    {
      "text": "הטקסט המקורי של התנאי",
      "type": "GATE",
      "category": "EXPERIENCE",
      "is_mandatory": true,
      "quantitative": {
        "amount": 5000000,
        "years": 3,
        "count": 2
      },
      "source_quote": "ציטוט מדויק מהמסמך",
      "confidence": 0.9
    }
  ],
  "extraction_notes": "הערות נוספות אם יש"
}`;

export const VALIDATION_PROMPT = `בדוק את כיסוי החילוץ של תנאי הסף.

מסמך מקור (קטעים רלוונטיים):
---
{document_excerpts}
---

תנאים שחולצו:
{extracted_conditions}

מילות מפתח לחיפוש:
- תנאי סף
- דרישות סף
- על המציע
- חובה
- יש להציג
- ניסיון
- מחזור
- הסמכה
- רישיון
- ISO
- קבלן
- ערבות
- כוח אדם
- מהנדס
- ציוד

משימה:
1. זהה קטעים במסמך שמכילים מילות מפתח אך לא כוסו בחילוץ
2. חשב אחוז כיסוי משוער
3. החזר רשימת קטעים שפוספסו

החזר JSON:
{
  "coverage_percentage": 85,
  "missed_sections": [
    {
      "text": "קטע שפוספס",
      "keywords_found": ["תנאי סף", "מחזור"],
      "reason": "הסבר למה כנראה פוספס"
    }
  ],
  "validation_notes": "הערות כלליות על איכות החילוץ"
}`;

export const MERGE_PROMPT = `מזג ונקה את רשימת תנאי הסף הבאה.

תנאים מכל המעברים:
{all_conditions}

משימות:
1. זהה תנאים כפולים או חופפים
2. מזג תנאים דומים לתנאי אחד מלא
3. הסר תנאים שאינם תקפים (כותרות, הקדמות)
4. שמור על הציטוט המדויק והמלא ביותר

קריטריונים לזיהוי כפילות:
- תנאים עם אותה דרישה כמותית
- תנאים מאותה קטגוריה עם ניסוח דומה
- תנאים שמתייחסים לאותו נושא

החזר JSON:
{
  "merged_conditions": [
    {
      "id": "new-uuid",
      "text": "הטקסט הממוזג והשלם",
      "type": "GATE",
      "category": "EXPERIENCE",
      "is_mandatory": true,
      "quantitative": {
        "amount": null,
        "years": 5,
        "count": 3
      },
      "source_quote": "הציטוט המלא ביותר",
      "confidence": 0.95,
      "merged_from": ["id1", "id2"]
    }
  ],
  "removed_conditions": [
    {
      "id": "removed-id",
      "reason": "כותרת ולא תנאי"
    }
  ],
  "merge_summary": {
    "original_count": 15,
    "final_count": 10,
    "duplicates_merged": 3,
    "invalid_removed": 2
  }
}`;

/**
 * Keywords for identifying gate conditions in Hebrew documents
 */
export const GATE_KEYWORDS = [
  // Mandatory indicators
  'תנאי סף',
  'תנאים מוקדמים',
  'דרישות סף',
  'על המציע',
  'המציע יציג',
  'המציע יוכיח',
  'חובה להציג',
  'יש להציג',
  'חובה לצרף',
  'יש לצרף',
  'נדרש',
  'דרישה',
  'תנאי מוקדם',

  // Experience related
  'ניסיון',
  'ניסיון מוכח',
  'ביצוע עבודות',
  'ביצוע פרויקטים',
  'עבודות דומות',
  'היקף עבודות',
  'שנות ניסיון',

  // Financial related
  'מחזור',
  'מחזור כספי',
  'מחזור עסקי',
  'הון עצמי',
  'ערבות',
  'ערבות בנקאית',
  'ערבות מכרז',
  'ערבות ביצוע',
  'יכולת כלכלית',

  // Certification related
  'הסמכה',
  'תקן',
  'ISO',
  'רישיון',
  'רישיון קבלן',
  'סיווג קבלני',
  'היתר',
  'אישור',

  // Personnel related
  'כוח אדם',
  'מהנדס',
  'מנהל פרויקט',
  'מנהל עבודה',
  'צוות',
  'עובדים',
  'מומחה',

  // Equipment related
  'ציוד',
  'כלים',
  'מכונות',
  'רכב',
  'תשתיות',

  // Legal related
  'תצהיר',
  'אישור ניקיון',
  'אישור רואה חשבון',
  'אישור עורך דין',
  'אישור משפטי'
];

/**
 * Section boundary patterns for Hebrew documents
 */
export const SECTION_BOUNDARIES = [
  /^[\s]*\d+\.\d*[\s]+/m,           // 1. or 1.1
  /^[\s]*[א-ת]+\.\d*[\s]+/m,        // א. or א.1
  /^[\s]*סעיף[\s]+\d+/m,            // סעיף 1
  /^[\s]*פרק[\s]+[א-ת\d]+/m,        // פרק א or פרק 1
  /^[\s]*תנאי[\s]+סף/m,             // תנאי סף header
  /^[\s]*דרישות[\s]+סף/m,           // דרישות סף header
  /^[\s]*כללי/m,                    // כללי header
  /\n{2,}/                           // Double line break
];

export default {
  SYSTEM_PROMPT,
  EXTRACTION_PROMPT,
  VALIDATION_PROMPT,
  MERGE_PROMPT,
  GATE_KEYWORDS,
  SECTION_BOUNDARIES
};
