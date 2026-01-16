/**
 * Document Classifier Agent
 *
 * Specialized agent for classifying tender documents:
 * - Identify document type
 * - Detect language and encoding
 * - Extract document structure
 * - Assess document quality
 */

import { BaseAgent } from './base-agent';
import type { LLMClient, AgentContext } from '../types';

export type DocumentType =
  | 'INVITATION'      // הזמנה להציע הצעות
  | 'SPECS'           // מפרט טכני
  | 'BOQ'             // כתב כמויות
  | 'CONTRACT'        // חוזה התקשרות
  | 'CLARIFICATIONS'  // מסמך הבהרות
  | 'FORMS'           // טפסים
  | 'APPENDIX'        // נספח
  | 'COMBINED'        // מסמך משולב
  | 'UNKNOWN';

export interface DocumentClassification {
  type: DocumentType;
  subType?: string;
  confidence: number;
  indicators: string[];
  structure: DocumentStructure;
  quality: DocumentQuality;
  metadata: {
    pageCount?: number;
    wordCount: number;
    language: string;
    hasTablesOrBOQ: boolean;
    hasSignatures: boolean;
  };
}

export interface DocumentStructure {
  sections: DocumentSection[];
  hasTableOfContents: boolean;
  hasDefinitions: boolean;
  hasAppendices: boolean;
}

export interface DocumentSection {
  title: string;
  startPosition: number;
  level: number;
  type?: string;
}

export interface DocumentQuality {
  score: number;
  issues: string[];
  isOCR: boolean;
  hasFormattingIssues: boolean;
}

/**
 * Document Classifier Agent
 */
export class DocumentClassifierAgent extends BaseAgent {
  constructor(client: LLMClient) {
    super(client, {
      name: 'document-classifier',
      description: 'מסווג מסמכי מכרז',
      systemPrompt: `אתה מומחה לסיווג מסמכי מכרזים בעברית.

סוגי מסמכים:
- INVITATION: הזמנה להציע הצעות, מכרז פומבי/סגור
- SPECS: מפרט טכני, דרישות ביצוע
- BOQ: כתב כמויות, רשימת פריטים ומחירים
- CONTRACT: חוזה התקשרות, תנאים כלליים
- CLARIFICATIONS: מסמך הבהרות, תשובות לשאלות
- FORMS: טפסים להגשה, נספחי הצעה
- APPENDIX: נספח כללי
- COMBINED: מסמך המשלב מספר סוגים
- UNKNOWN: לא ניתן לזהות

בצע סיווג מדויק על בסיס:
1. מילות מפתח וביטויים
2. מבנה המסמך
3. תוכן ונושאים
4. סגנון וניסוח`,
      maxIterations: 1,
      temperature: 0.1,
    });
  }

  /**
   * Classify a document
   */
  async classify(documentText: string, context?: AgentContext): Promise<DocumentClassification> {
    // Quick pre-analysis
    const quickAnalysis = this.quickAnalyze(documentText);

    // If high confidence from quick analysis, return immediately
    if (quickAnalysis.confidence >= 0.9) {
      return quickAnalysis;
    }

    // Use LLM for more detailed classification
    const input = `סווג את המסמך הבא:

<document>
${documentText.substring(0, 5000)}
</document>

${documentText.length > 5000 ? '(המסמך קוצר - מוצגים 5000 תווים ראשונים)' : ''}

ניתוח מקדים:
- סוג משוער: ${quickAnalysis.type}
- אינדיקטורים: ${quickAnalysis.indicators.join(', ')}
- מספר מילים: ${quickAnalysis.metadata.wordCount}

החזר JSON עם:
1. type - סוג המסמך
2. subType - תת-סוג אם רלוונטי
3. confidence - רמת ביטחון (0-1)
4. indicators - מה הוביל לסיווג
5. structure - מבנה המסמך (sections)`;

    const result = await this.run(input, context);

    if (result.success && result.result) {
      return this.mergeResults(quickAnalysis, result.result as Partial<DocumentClassification>);
    }

    return quickAnalysis;
  }

  /**
   * Quick rule-based analysis
   */
  private quickAnalyze(text: string): DocumentClassification {
    const lowerText = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;

    // Detect document type based on keywords
    const typeScores: Record<DocumentType, number> = {
      INVITATION: 0,
      SPECS: 0,
      BOQ: 0,
      CONTRACT: 0,
      CLARIFICATIONS: 0,
      FORMS: 0,
      APPENDIX: 0,
      COMBINED: 0,
      UNKNOWN: 0,
    };

    const indicators: string[] = [];

    // INVITATION indicators
    const invitationKeywords = [
      'הזמנה להציע', 'הזמנה להגיש', 'מכרז פומבי', 'מכרז סגור',
      'קול קורא', 'הליך תחרותי', 'מועד אחרון להגשה',
    ];
    for (const kw of invitationKeywords) {
      if (text.includes(kw)) {
        typeScores.INVITATION += 0.2;
        indicators.push(kw);
      }
    }

    // SPECS indicators
    const specsKeywords = [
      'מפרט טכני', 'מפרט ביצוע', 'דרישות טכניות', 'תקן',
      'מפרט כללי', 'תנאים טכניים', 'specifications',
    ];
    for (const kw of specsKeywords) {
      if (text.includes(kw)) {
        typeScores.SPECS += 0.2;
        indicators.push(kw);
      }
    }

    // BOQ indicators
    const boqKeywords = [
      'כתב כמויות', 'bill of quantities', 'פירוט כמויות',
      'מחיר יחידה', 'סה"כ', 'יח\'', 'מ"ר', 'מ"א',
    ];
    for (const kw of boqKeywords) {
      if (text.includes(kw)) {
        typeScores.BOQ += 0.2;
        indicators.push(kw);
      }
    }

    // CONTRACT indicators
    const contractKeywords = [
      'חוזה', 'הסכם', 'התחייבות', 'תנאים כלליים',
      'צד א', 'צד ב', 'מזמין', 'קבלן', 'ספק',
    ];
    for (const kw of contractKeywords) {
      if (text.includes(kw)) {
        typeScores.CONTRACT += 0.15;
        indicators.push(kw);
      }
    }

    // CLARIFICATIONS indicators
    const clarificationKeywords = [
      'הבהרות', 'תשובות לשאלות', 'מענה', 'שינויים למכרז',
      'תיקון', 'עדכון', 'הבהרה מס\'',
    ];
    for (const kw of clarificationKeywords) {
      if (text.includes(kw)) {
        typeScores.CLARIFICATIONS += 0.25;
        indicators.push(kw);
      }
    }

    // FORMS indicators
    const formsKeywords = [
      'טופס', 'נספח', 'הצהרה', 'התחייבות', 'אישור',
      'חתימה', 'תאריך:', 'שם המציע',
    ];
    for (const kw of formsKeywords) {
      if (text.includes(kw)) {
        typeScores.FORMS += 0.15;
        indicators.push(kw);
      }
    }

    // Find best match
    let bestType: DocumentType = 'UNKNOWN';
    let bestScore = 0;

    for (const [type, score] of Object.entries(typeScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type as DocumentType;
      }
    }

    // Check if combined
    const significantTypes = Object.entries(typeScores)
      .filter(([_, score]) => score >= 0.3)
      .map(([type]) => type);

    if (significantTypes.length >= 2) {
      bestType = 'COMBINED';
    }

    // Detect structure
    const structure = this.detectStructure(text);

    // Detect quality
    const quality = this.assessQuality(text);

    // Detect if has tables
    const hasTablesOrBOQ = /\|.*\||\t.*\t|סה"כ|מחיר/.test(text);

    // Detect signatures
    const hasSignatures = /חתימה|חותמת|signature/.test(lowerText);

    return {
      type: bestType,
      confidence: Math.min(1, bestScore + 0.3),
      indicators: [...new Set(indicators)].slice(0, 5),
      structure,
      quality,
      metadata: {
        wordCount,
        language: 'he',
        hasTablesOrBOQ,
        hasSignatures,
      },
    };
  }

  /**
   * Detect document structure
   */
  private detectStructure(text: string): DocumentStructure {
    const sections: DocumentSection[] = [];

    // Find section headers
    const headerPatterns = [
      /^(\d+\.)\s+(.+)$/gm,           // 1. Header
      /^(\d+\.\d+)\s+(.+)$/gm,        // 1.1 Header
      /^(פרק\s+\S+)\s*[-–:]\s*(.+)$/gm,  // פרק א - Header
      /^(סעיף\s+\d+)\s*[-–:]\s*(.+)$/gm,  // סעיף 1 - Header
    ];

    let position = 0;
    for (const pattern of headerPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const level = match[1].split('.').length;
        sections.push({
          title: match[2].trim(),
          startPosition: match.index,
          level,
        });
      }
    }

    // Sort by position
    sections.sort((a, b) => a.startPosition - b.startPosition);

    return {
      sections: sections.slice(0, 20),
      hasTableOfContents: /תוכן עניינים|תוכן המסמך/.test(text),
      hasDefinitions: /הגדרות|פרק ההגדרות/.test(text),
      hasAppendices: /נספח\s*[א-ת]|נספח\s*\d/.test(text),
    };
  }

  /**
   * Assess document quality
   */
  private assessQuality(text: string): DocumentQuality {
    const issues: string[] = [];
    let score = 1;

    // Check for OCR artifacts
    const ocrArtifacts = (text.match(/[^\u0000-\u007F\u0590-\u05FF\s.,;:!?()[\]{}'"־–—-]/g) || []).length;
    const isOCR = ocrArtifacts > text.length * 0.01;
    if (isOCR) {
      score -= 0.2;
      issues.push('מסמך סרוק עם שגיאות OCR אפשריות');
    }

    // Check for broken lines
    const brokenLines = (text.match(/\S-\n\S/g) || []).length;
    if (brokenLines > 10) {
      score -= 0.1;
      issues.push('שורות שבורות');
    }

    // Check for missing spaces
    const missingSpaces = (text.match(/[א-ת][a-zA-Z]|[a-zA-Z][א-ת]/g) || []).length;
    if (missingSpaces > 5) {
      score -= 0.1;
      issues.push('רווחים חסרים');
    }

    // Check for garbled text
    const garbledPatterns = /[\u0000-\u001F]|�/g;
    const garbledCount = (text.match(garbledPatterns) || []).length;
    if (garbledCount > 5) {
      score -= 0.2;
      issues.push('טקסט פגום');
    }

    // Check formatting
    const hasFormattingIssues = issues.length > 0;

    return {
      score: Math.max(0, score),
      issues,
      isOCR,
      hasFormattingIssues,
    };
  }

  /**
   * Merge quick analysis with LLM results
   */
  private mergeResults(
    quick: DocumentClassification,
    llm: Partial<DocumentClassification>
  ): DocumentClassification {
    return {
      type: llm.type || quick.type,
      subType: llm.subType,
      confidence: Math.max(quick.confidence, llm.confidence || 0),
      indicators: [...new Set([...quick.indicators, ...(llm.indicators || [])])],
      structure: llm.structure || quick.structure,
      quality: quick.quality,
      metadata: {
        ...quick.metadata,
        ...(llm.metadata || {}),
      },
    };
  }

  /**
   * Extract result from conversation
   */
  protected extractResult(): unknown {
    const lastMessage = this.state.messages[this.state.messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.content) {
      const jsonMatch = lastMessage.content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch {
          // Return null
        }
      }
    }
    return null;
  }
}

/**
 * Quick document classification
 */
export async function classifyDocument(
  client: LLMClient,
  documentText: string
): Promise<DocumentClassification> {
  const agent = new DocumentClassifierAgent(client);
  return agent.classify(documentText);
}

/**
 * Batch classify documents
 */
export async function classifyDocuments(
  client: LLMClient,
  documents: string[]
): Promise<DocumentClassification[]> {
  const agent = new DocumentClassifierAgent(client);
  return Promise.all(documents.map(doc => agent.classify(doc)));
}
