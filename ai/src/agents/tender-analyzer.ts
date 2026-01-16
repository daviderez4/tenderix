/**
 * Tender Analyzer Agent
 *
 * Main agent for comprehensive tender analysis:
 * - Document classification
 * - Metadata extraction
 * - Gate conditions analysis
 * - Risk assessment
 * - GO/NO-GO recommendation
 */

import { BaseAgent, AgentTool } from './base-agent';
import type { LLMClient, AgentContext, TenderAnalysis } from '../types';
import { HEBREW_SYSTEM_PROMPTS } from '../prompts/hebrew';

export interface TenderAnalyzerConfig {
  enableGateAnalysis?: boolean;
  enableRiskAnalysis?: boolean;
  enableCompetitorAnalysis?: boolean;
  companyProfile?: string;
}

const DEFAULT_CONFIG: TenderAnalyzerConfig = {
  enableGateAnalysis: true,
  enableRiskAnalysis: true,
  enableCompetitorAnalysis: false,
};

/**
 * Tender Analyzer Agent
 */
export class TenderAnalyzerAgent extends BaseAgent {
  private analyzerConfig: TenderAnalyzerConfig;
  private analysisResult: Partial<TenderAnalysis> = {};

  constructor(client: LLMClient, config?: TenderAnalyzerConfig) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    super(client, {
      name: 'tender-analyzer',
      description: 'מנתח מכרזים מקיף',
      systemPrompt: `${HEBREW_SYSTEM_PROMPTS.documentAnalyzer}

אתה סוכן ניתוח מכרזים. תפקידך לנתח מסמכי מכרז ולספק:
1. סיווג המסמך
2. חילוץ מטא-דאטה (מספר מכרז, תאריכים, גוף מזמין)
3. זיהוי תנאי סף
4. הערכת סיכונים
5. המלצת GO/NO-GO

בכל שלב, השתמש בכלים הזמינים לך.
כשתסיים את הניתוח, החזר JSON מסכם.`,
      maxIterations: 5,
      temperature: 0.2,
      tools: createAnalyzerTools(),
    });

    this.analyzerConfig = mergedConfig;
  }

  /**
   * Analyze a tender document
   */
  async analyze(documentText: string, context?: AgentContext): Promise<TenderAnalysis> {
    this.analysisResult = {};

    const input = `נתח את מסמך המכרז הבא:

<document>
${documentText}
</document>

${this.analyzerConfig.companyProfile ? `
פרופיל החברה:
<company>
${this.analyzerConfig.companyProfile}
</company>
` : ''}

בצע ניתוח מלא הכולל:
1. סיווג סוג המסמך
2. חילוץ מטא-דאטה בסיסית
3. ${this.analyzerConfig.enableGateAnalysis ? 'זיהוי תנאי סף' : ''}
4. ${this.analyzerConfig.enableRiskAnalysis ? 'הערכת סיכונים' : ''}
5. המלצת GO/NO-GO

החזר את התוצאות בפורמט JSON.`;

    const result = await this.run(input, context);

    if (result.success && result.result) {
      return this.mergeAnalysisResult(result.result as Partial<TenderAnalysis>);
    }

    return this.createDefaultAnalysis();
  }

  /**
   * Extract result from conversation
   */
  protected extractResult(): Partial<TenderAnalysis> {
    // Find the last JSON response
    for (let i = this.state.messages.length - 1; i >= 0; i--) {
      const message = this.state.messages[i];
      if (message.role === 'assistant' && message.content) {
        const jsonMatch = message.content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            return { ...this.analysisResult, ...parsed };
          } catch {
            // Continue searching
          }
        }
      }
    }

    return this.analysisResult;
  }

  /**
   * Merge partial analysis results
   */
  private mergeAnalysisResult(result: Partial<TenderAnalysis>): TenderAnalysis {
    return {
      documentType: result.documentType || 'UNKNOWN',
      confidence: result.confidence || 0.5,
      metadata: result.metadata || {
        tenderNumber: null,
        tenderName: '',
        issuingBody: '',
        publishDate: null,
        submissionDeadline: null,
      },
      gateConditions: result.gateConditions || [],
      risks: result.risks || [],
      recommendation: result.recommendation || {
        decision: 'REVIEW',
        confidence: 0.5,
        reasoning: '',
      },
      summary: result.summary || '',
    };
  }

  /**
   * Create default analysis result
   */
  private createDefaultAnalysis(): TenderAnalysis {
    return {
      documentType: 'UNKNOWN',
      confidence: 0,
      metadata: {
        tenderNumber: null,
        tenderName: '',
        issuingBody: '',
        publishDate: null,
        submissionDeadline: null,
      },
      gateConditions: [],
      risks: [],
      recommendation: {
        decision: 'REVIEW',
        confidence: 0,
        reasoning: 'לא הצלחנו לבצע ניתוח מלא',
      },
      summary: '',
    };
  }
}

/**
 * Create analyzer tools
 */
function createAnalyzerTools(): AgentTool[] {
  return [
    {
      name: 'classify_document',
      description: 'סווג את סוג המסמך (הזמנה, מפרט, כתב כמויות, חוזה וכו\')',
      parameters: {
        document_text: {
          type: 'string',
          description: 'טקסט המסמך לסיווג',
          required: true,
        },
      },
      execute: async (params) => {
        const text = params.document_text as string;

        // Simple classification based on keywords
        const classifications = [
          { type: 'INVITATION', keywords: ['הזמנה להציע', 'הזמנה להגיש', 'מכרז פומבי', 'מכרז סגור'] },
          { type: 'SPECS', keywords: ['מפרט טכני', 'מפרט ביצוע', 'דרישות טכניות'] },
          { type: 'BOQ', keywords: ['כתב כמויות', 'פירוט כמויות', 'רשימת פריטים'] },
          { type: 'CONTRACT', keywords: ['חוזה התקשרות', 'הסכם', 'תנאי החוזה'] },
          { type: 'CLARIFICATIONS', keywords: ['הבהרות', 'תשובות לשאלות', 'מענה'] },
          { type: 'FORMS', keywords: ['טופס', 'נספח', 'הצהרה'] },
        ];

        let bestMatch = { type: 'UNKNOWN', score: 0 };

        for (const classification of classifications) {
          const score = classification.keywords.filter(kw =>
            text.toLowerCase().includes(kw)
          ).length;

          if (score > bestMatch.score) {
            bestMatch = { type: classification.type, score };
          }
        }

        return {
          type: bestMatch.type,
          confidence: Math.min(1, bestMatch.score * 0.3 + 0.2),
        };
      },
    },
    {
      name: 'extract_dates',
      description: 'חלץ תאריכים חשובים מהמסמך',
      parameters: {
        document_text: {
          type: 'string',
          description: 'טקסט המסמך',
          required: true,
        },
      },
      execute: async (params) => {
        const text = params.document_text as string;
        const dates: Array<{ type: string; date: string; source: string }> = [];

        // Date patterns
        const patterns = [
          { regex: /מועד[^\d]*(\d{1,2})[./](\d{1,2})[./](\d{2,4})/g, type: 'generic' },
          { regex: /הגשה[^\d]*(\d{1,2})[./](\d{1,2})[./](\d{2,4})/g, type: 'submission' },
          { regex: /הבהרות[^\d]*(\d{1,2})[./](\d{1,2})[./](\d{2,4})/g, type: 'clarification' },
          { regex: /פרסום[^\d]*(\d{1,2})[./](\d{1,2})[./](\d{2,4})/g, type: 'publish' },
        ];

        for (const { regex, type } of patterns) {
          let match;
          while ((match = regex.exec(text)) !== null) {
            const day = match[1].padStart(2, '0');
            const month = match[2].padStart(2, '0');
            let year = match[3];
            if (year.length === 2) {
              year = '20' + year;
            }

            dates.push({
              type,
              date: `${year}-${month}-${day}`,
              source: match[0],
            });
          }
        }

        return { dates };
      },
    },
    {
      name: 'extract_amounts',
      description: 'חלץ סכומים כספיים מהמסמך',
      parameters: {
        document_text: {
          type: 'string',
          description: 'טקסט המסמך',
          required: true,
        },
      },
      execute: async (params) => {
        const text = params.document_text as string;
        const amounts: Array<{ type: string; amount: number; currency: string; source: string }> = [];

        // Amount patterns
        const patterns = [
          { regex: /ערבות[^\d]*([₪$€]?\s*[\d,]+(?:\.\d{2})?)/g, type: 'guarantee' },
          { regex: /מחזור[^\d]*([₪$€]?\s*[\d,]+(?:\.\d{2})?)/g, type: 'revenue' },
          { regex: /ביטוח[^\d]*([₪$€]?\s*[\d,]+(?:\.\d{2})?)/g, type: 'insurance' },
          { regex: /סכום[^\d]*([₪$€]?\s*[\d,]+(?:\.\d{2})?)/g, type: 'amount' },
        ];

        for (const { regex, type } of patterns) {
          let match;
          while ((match = regex.exec(text)) !== null) {
            const amountStr = match[1].replace(/[₪$€,\s]/g, '');
            const amount = parseFloat(amountStr);

            if (!isNaN(amount) && amount > 0) {
              amounts.push({
                type,
                amount,
                currency: 'ILS',
                source: match[0],
              });
            }
          }
        }

        return { amounts };
      },
    },
    {
      name: 'identify_gates',
      description: 'זהה תנאי סף במסמך',
      parameters: {
        document_text: {
          type: 'string',
          description: 'טקסט המסמך',
          required: true,
        },
      },
      execute: async (params) => {
        const text = params.document_text as string;
        const gates: Array<{
          text: string;
          type: string;
          requirement_type: string;
        }> = [];

        // Gate indicators
        const gatePatterns = [
          { regex: /תנאי סף[:\s]*([^.]+\.)/gi, type: 'GATE' },
          { regex: /על המציע[:\s]*([^.]+\.)/gi, type: 'GATE' },
          { regex: /נדרש[:\s]*([^.]+\.)/gi, type: 'GATE' },
          { regex: /חובה[:\s]*([^.]+\.)/gi, type: 'GATE' },
        ];

        // Requirement type detection
        const detectRequirementType = (text: string): string => {
          if (/ניסיון|פרויקט|עבודה/.test(text)) return 'EXPERIENCE';
          if (/מחזור|הון|פיננסי|ערבות/.test(text)) return 'FINANCIAL';
          if (/תעודה|רישיון|הסמכה|ISO/.test(text)) return 'CERTIFICATION';
          if (/מנהל|עובד|צוות|אנשי מפתח/.test(text)) return 'PERSONNEL';
          return 'OTHER';
        };

        for (const { regex, type } of gatePatterns) {
          let match;
          while ((match = regex.exec(text)) !== null) {
            gates.push({
              text: match[1].trim(),
              type,
              requirement_type: detectRequirementType(match[1]),
            });
          }
        }

        return { gates };
      },
    },
  ];
}

/**
 * Quick tender analysis
 */
export async function analyzeTender(
  client: LLMClient,
  documentText: string,
  config?: TenderAnalyzerConfig
): Promise<TenderAnalysis> {
  const agent = new TenderAnalyzerAgent(client, config);
  return agent.analyze(documentText);
}
