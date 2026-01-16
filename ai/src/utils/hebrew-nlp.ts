/**
 * Hebrew NLP Utilities
 *
 * Specialized utilities for processing Hebrew text in tender documents:
 * - Text normalization and cleaning
 * - Hebrew-specific tokenization
 * - Date/number extraction
 * - RTL text handling
 */

// Hebrew character ranges
const HEBREW_LETTERS = /[\u0590-\u05FF]/;
const HEBREW_POINTS = /[\u0591-\u05C7]/g; // Nikud (vowel points)
const HEBREW_ACCENTS = /[\u0591-\u05AF]/g;

// Common Hebrew abbreviations in tenders
const HEBREW_ABBREVIATIONS: Record<string, string> = {
  'ע"מ': 'עוסק מורשה',
  'בע"מ': 'בעירבון מוגבל',
  'ח"פ': 'חברה פרטית',
  'ע"ר': 'עמותה רשומה',
  'מע"מ': 'מס ערך מוסף',
  'ש"ח': 'שקלים חדשים',
  'אג"ח': 'אגרות חוב',
  'נ"ל': 'הנזכר לעיל',
  'כנ"ל': 'כנזכר לעיל',
  'וכו\'': 'וכולי',
  'וכד\'': 'וכדומה',
  'ראה/י': 'ראה',
  'עמ\'': 'עמוד',
  'סע\'': 'סעיף',
  'פר\'': 'פרק',
  'תק\'': 'תקנה',
  'חו"ל': 'חוץ לארץ',
  'או"ם': 'אומות מאוחדות',
  'צה"ל': 'צבא הגנה לישראל',
  'מ"מ': 'מילימטר',
  'מ"ר': 'מטר רבוע',
  'קמ"ש': 'קילומטר לשעה',
  'ק"מ': 'קילומטר',
  'ס"מ': 'סנטימטר',
};

// Hebrew month names
const HEBREW_MONTHS: Record<string, number> = {
  'ינואר': 1, 'פברואר': 2, 'מרץ': 3, 'אפריל': 4,
  'מאי': 5, 'יוני': 6, 'יולי': 7, 'אוגוסט': 8,
  'ספטמבר': 9, 'אוקטובר': 10, 'נובמבר': 11, 'דצמבר': 12,
};

// Hebrew number words
const HEBREW_NUMBERS: Record<string, number> = {
  'אחד': 1, 'אחת': 1, 'שתיים': 2, 'שניים': 2, 'שני': 2,
  'שלוש': 3, 'שלושה': 3, 'ארבע': 4, 'ארבעה': 4,
  'חמש': 5, 'חמישה': 5, 'שש': 6, 'שישה': 6,
  'שבע': 7, 'שבעה': 7, 'שמונה': 8, 'תשע': 9, 'תשעה': 9,
  'עשר': 10, 'עשרה': 10, 'עשרים': 20, 'שלושים': 30,
  'ארבעים': 40, 'חמישים': 50, 'שישים': 60,
  'שבעים': 70, 'שמונים': 80, 'תשעים': 90,
  'מאה': 100, 'מאתיים': 200, 'אלף': 1000,
  'אלפיים': 2000, 'מיליון': 1000000,
};

/**
 * Normalize Hebrew text for processing
 */
export function normalizeHebrew(text: string): string {
  let normalized = text;

  // Remove nikud (vowel points)
  normalized = normalized.replace(HEBREW_POINTS, '');

  // Normalize quotes and apostrophes
  normalized = normalized
    .replace(/[״""]/g, '"')
    .replace(/[׳'']/g, "'");

  // Normalize dashes
  normalized = normalized.replace(/[–—]/g, '-');

  // Normalize whitespace
  normalized = normalized
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Fix common encoding issues
  normalized = normalized
    .replace(/×/g, 'א') // Common UTF-8 encoding issue
    .replace(/÷/g, ''); // Another common issue

  return normalized;
}

/**
 * Remove nikud (Hebrew vowel points) from text
 */
export function removeNikud(text: string): string {
  return text.replace(HEBREW_POINTS, '');
}

/**
 * Check if text contains Hebrew characters
 */
export function containsHebrew(text: string): boolean {
  return HEBREW_LETTERS.test(text);
}

/**
 * Calculate Hebrew/English ratio in text
 */
export function getHebrewRatio(text: string): number {
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  const total = hebrewChars + latinChars;
  return total > 0 ? hebrewChars / total : 0;
}

/**
 * Expand Hebrew abbreviations
 */
export function expandAbbreviations(text: string): string {
  let expanded = text;
  for (const [abbr, full] of Object.entries(HEBREW_ABBREVIATIONS)) {
    const regex = new RegExp(abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    expanded = expanded.replace(regex, full);
  }
  return expanded;
}

/**
 * Extract dates from Hebrew text
 */
export function extractDates(text: string): Array<{ original: string; parsed: Date | null; confidence: number }> {
  const dates: Array<{ original: string; parsed: Date | null; confidence: number }> = [];

  // Pattern: DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const numericPattern = /(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})/g;
  let match;
  while ((match = numericPattern.exec(text)) !== null) {
    const [original, day, month, year] = match;
    const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
    const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
    dates.push({
      original,
      parsed: isNaN(date.getTime()) ? null : date,
      confidence: 0.9,
    });
  }

  // Pattern: Hebrew month names
  const hebrewMonthPattern = /(\d{1,2})\s+(?:ב)?(ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר)\s+(\d{4})/g;
  while ((match = hebrewMonthPattern.exec(text)) !== null) {
    const [original, day, monthName, year] = match;
    const month = HEBREW_MONTHS[monthName];
    if (month) {
      const date = new Date(parseInt(year), month - 1, parseInt(day));
      dates.push({
        original,
        parsed: isNaN(date.getTime()) ? null : date,
        confidence: 0.95,
      });
    }
  }

  return dates;
}

/**
 * Extract monetary amounts from Hebrew text
 */
export function extractAmounts(text: string): Array<{ original: string; value: number; currency: string; confidence: number }> {
  const amounts: Array<{ original: string; value: number; currency: string; confidence: number }> = [];

  // Pattern: Numbers with currency symbols or words
  const patterns = [
    // ₪ symbol
    /₪\s*([\d,\.]+)/g,
    /([\d,\.]+)\s*₪/g,
    // ש"ח
    /([\d,\.]+)\s*ש"ח/g,
    /([\d,\.]+)\s*שקל/g,
    // Millions/thousands
    /([\d,\.]+)\s*מיליון\s*(?:ש"ח|שקל)?/g,
    /([\d,\.]+)\s*אלף\s*(?:ש"ח|שקל)?/g,
    // USD/EUR
    /\$\s*([\d,\.]+)/g,
    /([\d,\.]+)\s*(?:דולר|USD)/g,
    /€\s*([\d,\.]+)/g,
    /([\d,\.]+)\s*(?:יורו|EUR)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const original = match[0];
      let value = parseFloat(match[1].replace(/,/g, ''));

      // Adjust for millions/thousands
      if (original.includes('מיליון')) value *= 1000000;
      if (original.includes('אלף')) value *= 1000;

      // Determine currency
      let currency = 'ILS';
      if (original.includes('$') || original.includes('דולר') || original.includes('USD')) currency = 'USD';
      if (original.includes('€') || original.includes('יורו') || original.includes('EUR')) currency = 'EUR';

      if (!isNaN(value)) {
        amounts.push({ original, value, currency, confidence: 0.85 });
      }
    }
  }

  return amounts;
}

/**
 * Extract percentages from text
 */
export function extractPercentages(text: string): Array<{ original: string; value: number }> {
  const percentages: Array<{ original: string; value: number }> = [];

  const pattern = /([\d,\.]+)\s*%/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(value)) {
      percentages.push({ original: match[0], value });
    }
  }

  return percentages;
}

/**
 * Convert Hebrew number words to digits
 */
export function hebrewWordsToNumber(text: string): number | null {
  const words = text.trim().split(/\s+/);
  let total = 0;
  let current = 0;

  for (const word of words) {
    const cleanWord = word.replace(/[^\u0590-\u05FF]/g, '');
    const value = HEBREW_NUMBERS[cleanWord];

    if (value !== undefined) {
      if (value >= 1000) {
        current = current === 0 ? value : current * value;
        total += current;
        current = 0;
      } else if (value >= 100) {
        current = current === 0 ? value : current * value;
      } else {
        current += value;
      }
    }
  }

  total += current;
  return total > 0 ? total : null;
}

/**
 * Detect section headers in Hebrew tender documents
 */
export function detectSectionHeaders(text: string): Array<{ text: string; level: number; position: number }> {
  const headers: Array<{ text: string; level: number; position: number }> = [];

  // Common section patterns
  const patterns = [
    { regex: /^פרק\s+(\S+)\s*[-:]\s*(.+)$/gm, level: 1 },
    { regex: /^סעיף\s+(\S+)\s*[-:]\s*(.+)$/gm, level: 2 },
    { regex: /^(\d+)\.\s+(.{3,50})$/gm, level: 2 },
    { regex: /^(\d+\.\d+)\s+(.{3,50})$/gm, level: 3 },
    { regex: /^([א-ת])\.\s+(.{3,50})$/gm, level: 3 },
  ];

  for (const { regex, level } of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      headers.push({
        text: match[0],
        level,
        position: match.index,
      });
    }
  }

  return headers.sort((a, b) => a.position - b.position);
}

/**
 * Clean and normalize tender text for analysis
 */
export function cleanTenderText(text: string): string {
  let cleaned = text;

  // Remove page numbers and headers/footers
  cleaned = cleaned.replace(/^עמוד\s+\d+\s*$/gm, '');
  cleaned = cleaned.replace(/^\d+\s*$/gm, '');

  // Remove repeated dashes/underscores (often used as separators)
  cleaned = cleaned.replace(/[-_]{3,}/g, '');

  // Normalize Hebrew text
  cleaned = normalizeHebrew(cleaned);

  // Remove excessive whitespace while preserving paragraph structure
  cleaned = cleaned
    .split(/\n\n+/)
    .map(para => para.replace(/\s+/g, ' ').trim())
    .filter(para => para.length > 0)
    .join('\n\n');

  return cleaned;
}

/**
 * Split text into sentences (Hebrew-aware)
 */
export function splitSentences(text: string): string[] {
  // Hebrew sentence endings
  const sentenceEndings = /([.!?])\s+(?=[א-ת\u0590-\u05FF"']|$)/g;

  return text
    .replace(sentenceEndings, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Extract keywords from Hebrew text
 */
export function extractKeywords(text: string, maxKeywords: number = 20): string[] {
  // Hebrew stopwords
  const stopwords = new Set([
    'של', 'את', 'על', 'עם', 'או', 'אם', 'כי', 'גם', 'רק', 'כל',
    'זה', 'זו', 'זאת', 'הוא', 'היא', 'הם', 'הן', 'אני', 'אנחנו',
    'לא', 'כן', 'יש', 'אין', 'היה', 'היו', 'יהיה', 'להיות',
    'אשר', 'כאשר', 'לפי', 'עד', 'מן', 'אל', 'בין', 'לפני', 'אחרי',
    'תחת', 'מעל', 'ליד', 'בתוך', 'מחוץ', 'דרך', 'באמצעות',
    'יותר', 'פחות', 'מאוד', 'כבר', 'עוד', 'שוב', 'תמיד', 'לעולם',
    'ה', 'ו', 'ב', 'ל', 'מ', 'כ', 'ש',
  ]);

  // Extract words
  const words = text
    .replace(/[^\u0590-\u05FFa-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopwords.has(word));

  // Count frequencies
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Sort by frequency and return top keywords
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}
