/**
 * Gate Extractor Agent
 *
 * Specialized agent for extracting and analyzing gate conditions:
 * - Identify mandatory vs. optional requirements
 * - Classify requirement types
 * - Match against company assets
 * - Suggest gap closure strategies
 */

import { BaseAgent, AgentTool } from './base-agent';
import type { LLMClient, AgentContext, GateCondition } from '../types';
import { HEBREW_SYSTEM_PROMPTS } from '../prompts/hebrew';

export interface GateExtractionResult {
  conditions: GateCondition[];
  summary: {
    totalConditions: number;
    mandatoryCount: number;
    byType: Record<string, number>;
  };
  confidence: number;
}

export interface CompanyAssets {
  projects?: Array<{
    name: string;
    value: number;
    year: number;
    client: string;
    domain: string;
  }>;
  personnel?: Array<{
    name: string;
    title: string;
    experience: number;
    certifications: string[];
  }>;
  certifications?: string[];
  financials?: {
    annualRevenue: number;
    years: number[];
  };
}

export interface GateMatchResult {
  condition: GateCondition;
  matchStatus: 'FULL' | 'PARTIAL' | 'NONE';
  matchingAssets: Array<{
    type: string;
    name: string;
    matchScore: number;
  }>;
  gap?: {
    description: string;
    closureOptions: string[];
  };
}

/**
 * Gate Extractor Agent
 */
export class GateExtractorAgent extends BaseAgent {
  private companyAssets?: CompanyAssets;

  constructor(client: LLMClient, companyAssets?: CompanyAssets) {
    super(client, {
      name: 'gate-extractor',
      description: 'מומחה לזיהוי וניתוח תנאי סף',
      systemPrompt: `${HEBREW_SYSTEM_PROMPTS.gateExtractor}

אתה סוכן מומחה לזיהוי תנאי סף במכרזים ישראליים.

משימתך:
1. לזהות את כל תנאי הסף במסמך
2. לסווג כל תנאי (ניסיון, פיננסי, הסמכה, כוח אדם)
3. להבחין בין תנאי חובה לתנאי יתרון
4. לנתח את הדרישות המדויקות (כמות, שנים, סכומים)

הקפד על דיוק - כל טעות בזיהוי תנאי סף עלולה לפסול הצעה.`,
      maxIterations: 3,
      temperature: 0.1,
      tools: createGateTools(),
    });

    this.companyAssets = companyAssets;
  }

  /**
   * Extract gate conditions from document
   */
  async extract(documentText: string, context?: AgentContext): Promise<GateExtractionResult> {
    const input = `חלץ את כל תנאי הסף מהמסמך הבא:

<document>
${documentText}
</document>

לכל תנאי סף, זהה:
1. מספר הסעיף
2. תיאור מלא של הדרישה
3. סוג הדרישה (EXPERIENCE/FINANCIAL/CERTIFICATION/PERSONNEL/OTHER)
4. האם חובה או יתרון
5. פרטים מספריים (כמות, סכום, שנים)

החזר JSON מלא.`;

    const result = await this.run(input, context);

    if (result.success && result.result) {
      return this.formatExtractionResult(result.result);
    }

    return {
      conditions: [],
      summary: {
        totalConditions: 0,
        mandatoryCount: 0,
        byType: {},
      },
      confidence: 0,
    };
  }

  /**
   * Match conditions against company assets
   */
  async match(
    conditions: GateCondition[],
    assets: CompanyAssets,
    context?: AgentContext
  ): Promise<GateMatchResult[]> {
    this.companyAssets = assets;
    const results: GateMatchResult[] = [];

    for (const condition of conditions) {
      const matchResult = await this.matchSingleCondition(condition, assets, context);
      results.push(matchResult);
    }

    return results;
  }

  /**
   * Match single condition
   */
  private async matchSingleCondition(
    condition: GateCondition,
    assets: CompanyAssets,
    context?: AgentContext
  ): Promise<GateMatchResult> {
    const input = `בדוק התאמה בין תנאי הסף לנכסי החברה:

תנאי הסף:
${JSON.stringify(condition, null, 2)}

נכסי החברה:
${JSON.stringify(assets, null, 2)}

נתח:
1. האם יש התאמה מלאה, חלקית או אין התאמה?
2. אילו נכסים תואמים?
3. מה הפערים ואיך לסגור אותם?

החזר JSON.`;

    const result = await this.run(input, context);

    if (result.success && result.result) {
      return result.result as GateMatchResult;
    }

    return {
      condition,
      matchStatus: 'NONE',
      matchingAssets: [],
      gap: {
        description: 'לא ניתן לבצע התאמה',
        closureOptions: [],
      },
    };
  }

  /**
   * Extract result from conversation
   */
  protected extractResult(): unknown {
    for (let i = this.state.messages.length - 1; i >= 0; i--) {
      const message = this.state.messages[i];
      if (message.role === 'assistant' && message.content) {
        const jsonMatch = message.content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[1]);
          } catch {
            // Continue
          }
        }
      }
    }
    return null;
  }

  /**
   * Format extraction result
   */
  private formatExtractionResult(raw: unknown): GateExtractionResult {
    const data = raw as Record<string, unknown>;
    const conditions = (data.conditions || []) as GateCondition[];

    // Calculate summary
    const byType: Record<string, number> = {};
    let mandatoryCount = 0;

    for (const condition of conditions) {
      byType[condition.requirementType] = (byType[condition.requirementType] || 0) + 1;
      if (condition.isMandatory) {
        mandatoryCount++;
      }
    }

    return {
      conditions,
      summary: {
        totalConditions: conditions.length,
        mandatoryCount,
        byType,
      },
      confidence: this.calculateConfidence(),
    };
  }
}

/**
 * Create gate extraction tools
 */
function createGateTools(): AgentTool[] {
  return [
    {
      name: 'parse_requirement',
      description: 'פרסר דרישה מטקסט',
      parameters: {
        text: {
          type: 'string',
          description: 'טקסט הדרישה',
          required: true,
        },
      },
      execute: async (params) => {
        const text = params.text as string;

        // Extract numbers
        const numbers = text.match(/\d+(?:,\d+)*(?:\.\d+)?/g) || [];
        const amounts = numbers.map(n => parseFloat(n.replace(/,/g, '')));

        // Detect requirement type
        let requirementType = 'OTHER';
        if (/ניסיון|פרויקט|עבודה|ביצוע/.test(text)) {
          requirementType = 'EXPERIENCE';
        } else if (/מחזור|הכנסות|הון|ערבות|ביטוח/.test(text)) {
          requirementType = 'FINANCIAL';
        } else if (/תעודה|רישיון|הסמכה|ISO|סיווג/.test(text)) {
          requirementType = 'CERTIFICATION';
        } else if (/מנהל|צוות|עובד|מהנדס|אנשי מפתח/.test(text)) {
          requirementType = 'PERSONNEL';
        }

        // Detect if mandatory
        const isMandatory = /תנאי סף|חובה|נדרש|על המציע/.test(text);

        // Extract time period
        let periodYears: number | null = null;
        const periodMatch = text.match(/(\d+)\s*שנ/);
        if (periodMatch) {
          periodYears = parseInt(periodMatch[1]);
        }

        // Extract count
        let requiredCount: number | null = null;
        const countMatch = text.match(/(\d+)\s*(?:פרויקט|עבודה|התקשרות)/);
        if (countMatch) {
          requiredCount = parseInt(countMatch[1]);
        }

        return {
          requirementType,
          isMandatory,
          amounts,
          periodYears,
          requiredCount,
        };
      },
    },
    {
      name: 'find_section_number',
      description: 'מצא מספר סעיף בטקסט',
      parameters: {
        text: {
          type: 'string',
          description: 'טקסט לחיפוש',
          required: true,
        },
      },
      execute: async (params) => {
        const text = params.text as string;

        // Common section number patterns
        const patterns = [
          /סעיף\s*(\d+(?:\.\d+)*)/,
          /(\d+(?:\.\d+)*)\s*[-–]\s/,
          /^(\d+(?:\.\d+)*)\s/,
        ];

        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            return { sectionNumber: match[1] };
          }
        }

        return { sectionNumber: null };
      },
    },
    {
      name: 'check_asset_match',
      description: 'בדוק התאמה בין דרישה לנכס',
      parameters: {
        requirement: {
          type: 'object',
          description: 'פרטי הדרישה',
          required: true,
        },
        asset: {
          type: 'object',
          description: 'פרטי הנכס',
          required: true,
        },
      },
      execute: async (params) => {
        const requirement = params.requirement as Record<string, unknown>;
        const asset = params.asset as Record<string, unknown>;

        let matchScore = 0;
        const reasons: string[] = [];

        // Check type match
        if (requirement.type === asset.type) {
          matchScore += 0.3;
          reasons.push('סוג תואם');
        }

        // Check value match
        const reqValue = requirement.minValue as number;
        const assetValue = asset.value as number;
        if (reqValue && assetValue && assetValue >= reqValue) {
          matchScore += 0.4;
          reasons.push('ערך עומד בדרישה');
        } else if (reqValue && assetValue && assetValue >= reqValue * 0.8) {
          matchScore += 0.2;
          reasons.push('ערך קרוב לדרישה');
        }

        // Check year/period
        const reqYears = requirement.periodYears as number;
        const assetYear = asset.year as number;
        if (reqYears && assetYear) {
          const currentYear = new Date().getFullYear();
          if (currentYear - assetYear <= reqYears) {
            matchScore += 0.3;
            reasons.push('תקופה תואמת');
          }
        }

        return {
          matchScore: Math.min(1, matchScore),
          matchStatus: matchScore >= 0.8 ? 'FULL' : matchScore >= 0.5 ? 'PARTIAL' : 'NONE',
          reasons,
        };
      },
    },
  ];
}

/**
 * Quick gate extraction
 */
export async function extractGates(
  client: LLMClient,
  documentText: string
): Promise<GateExtractionResult> {
  const agent = new GateExtractorAgent(client);
  return agent.extract(documentText);
}

/**
 * Quick gate matching
 */
export async function matchGates(
  client: LLMClient,
  conditions: GateCondition[],
  assets: CompanyAssets
): Promise<GateMatchResult[]> {
  const agent = new GateExtractorAgent(client, assets);
  return agent.match(conditions, assets);
}
