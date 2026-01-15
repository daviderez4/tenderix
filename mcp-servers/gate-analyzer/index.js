#!/usr/bin/env node

/**
 * Tenderix Gate Analyzer MCP Server
 *
 * סוכן AI לניתוח איכותי של תנאי סף במכרזים
 *
 * כלים זמינים:
 * - analyze_single_gate: ניתוח תנאי בודד
 * - analyze_all_gates: ניתוח כל תנאי הסף של מכרז
 * - classify_gate: סיווג תנאי (ניסיון/פיננסי/הסמכה/כ"א)
 * - merge_gates: מיזוג תנאים כפולים
 * - summarize_requirement: תמצות דרישה לשפה פשוטה
 * - validate_gates: בדיקת תקינות ומחיקת שגויים
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rerfjgjwjqodevkvhkxu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Initialize clients
let supabase = null;
let anthropic = null;

function initClients() {
  if (SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  if (ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
}

// ============================================
// SYSTEM PROMPTS FOR AI ANALYSIS
// ============================================

const GATE_ANALYSIS_SYSTEM_PROMPT = `אתה מומחה לניתוח מכרזים ישראליים. תפקידך לנתח תנאי סף (Gate Conditions) ולהבין בדיוק מה נדרש מהמציע.

כללים חשובים:
1. תנאי סף אמיתי = דרישה שאם לא עומדים בה - נפסלים מהמכרז
2. יש להבדיל בין תנאי סף (חובה) ליתרון (ניקוד)
3. יש לזהות טקסט שאינו תנאי סף (כותרות, הקדמות, הסברים)
4. יש לחלץ נתונים כמותיים מדויקים (סכומים, שנים, כמויות)

סוגי תנאי סף:
- EXPERIENCE: ניסיון בפרויקטים/עבודות דומות
- FINANCIAL: מחזור כספי, הון עצמי, ערבויות
- CERTIFICATION: הסמכות, רישיונות, תקנים (ISO)
- PERSONNEL: דרישות כוח אדם, מנהלים, מומחים
- EQUIPMENT: ציוד, מכונות, תשתיות
- LEGAL: דרישות משפטיות, תצהירים, אישורים
- OTHER: אחר

תמיד ענה ב-JSON בלבד.`;

const CLASSIFICATION_PROMPT = `נתח את תנאי הסף הבא וסווג אותו:

תנאי: {condition_text}

ענה ב-JSON:
{
  "is_valid_gate": boolean,      // האם זה באמת תנאי סף או טקסט אחר?
  "reason_if_invalid": string,   // אם לא תקף - למה?
  "category": string,            // EXPERIENCE/FINANCIAL/CERTIFICATION/PERSONNEL/EQUIPMENT/LEGAL/OTHER
  "is_mandatory": boolean,       // תנאי סף (true) או יתרון (false)?
  "summary_hebrew": string,      // תמצות בעברית פשוטה - מה בדיוק נדרש?
  "quantitative_data": {
    "amount": number | null,     // סכום כספי אם רלוונטי
    "count": number | null,      // כמות (פרויקטים, שנים, וכו')
    "years": number | null,      // שנות ניסיון/ותק
    "percentage": number | null  // אחוז אם רלוונטי
  },
  "entity_required": string,     // מי צריך לעמוד - "המציע"/"קבלן משנה מותר"/"שותף"
  "confidence": number           // 0-1 רמת ביטחון בניתוח
}`;

const MERGE_ANALYSIS_PROMPT = `בדוק האם שני התנאים הבאים צריכים להתמזג לתנאי אחד:

תנאי 1: {condition1}
תנאי 2: {condition2}

ענה ב-JSON:
{
  "should_merge": boolean,
  "reason": string,
  "merged_text": string | null,  // אם צריך למזג - הטקסט הממוזג
  "primary_id": string | null    // איזה תנאי הראשי
}`;

const BATCH_VALIDATION_PROMPT = `נתח את רשימת תנאי הסף הבאה וזהה:
1. תנאים שאינם תקפים (כותרות, הקדמות)
2. תנאים כפולים שצריך למזג
3. תנאים שצריך לפצל

תנאים:
{conditions_json}

ענה ב-JSON:
{
  "invalid_ids": string[],           // IDs של תנאים לא תקפים למחיקה
  "merge_groups": [                  // קבוצות למיזוג
    { "ids": string[], "merged_text": string }
  ],
  "split_suggestions": [             // הצעות לפיצול
    { "id": string, "split_into": string[] }
  ],
  "valid_conditions": [              // תנאים תקפים עם ניתוח
    {
      "id": string,
      "category": string,
      "summary": string,
      "is_mandatory": boolean
    }
  ]
}`;

// ============================================
// TOOL IMPLEMENTATIONS
// ============================================

/**
 * ניתוח תנאי סף בודד
 */
async function analyzeSingleGate(conditionId) {
  if (!supabase) throw new Error('Supabase not initialized');
  if (!anthropic) throw new Error('Anthropic API not initialized');

  // שליפת התנאי מה-DB
  const { data: condition, error } = await supabase
    .from('gate_conditions')
    .select('*')
    .eq('id', conditionId)
    .single();

  if (error || !condition) {
    throw new Error(`Condition not found: ${conditionId}`);
  }

  // ניתוח עם Claude
  const prompt = CLASSIFICATION_PROMPT.replace('{condition_text}', condition.condition_text);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: GATE_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const analysisText = response.content[0].text;
  let analysis;

  try {
    // Extract JSON from response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (e) {
    return {
      success: false,
      error: 'Failed to parse AI response',
      raw_response: analysisText
    };
  }

  // עדכון ה-DB עם הניתוח
  const updateData = {
    requirement_type: analysis.category,
    is_mandatory: analysis.is_mandatory,
    ai_summary: analysis.summary_hebrew,
    ai_confidence: analysis.confidence,
    ai_analyzed_at: new Date().toISOString()
  };

  if (analysis.quantitative_data) {
    if (analysis.quantitative_data.amount) updateData.required_amount = analysis.quantitative_data.amount;
    if (analysis.quantitative_data.count) updateData.required_count = analysis.quantitative_data.count;
    if (analysis.quantitative_data.years) updateData.required_years = analysis.quantitative_data.years;
  }

  if (analysis.entity_required) {
    updateData.entity_type = analysis.entity_required === 'המציע' ? 'BIDDER' :
                            analysis.entity_required.includes('קבלן משנה') ? 'SUBCONTRACTOR_ALLOWED' :
                            'PARTNER_ALLOWED';
  }

  const { error: updateError } = await supabase
    .from('gate_conditions')
    .update(updateData)
    .eq('id', conditionId);

  return {
    success: !updateError,
    condition_id: conditionId,
    analysis,
    update_error: updateError?.message
  };
}

/**
 * ניתוח כל תנאי הסף של מכרז
 */
async function analyzeAllGates(tenderId) {
  if (!supabase) throw new Error('Supabase not initialized');
  if (!anthropic) throw new Error('Anthropic API not initialized');

  // שליפת כל התנאים
  const { data: conditions, error } = await supabase
    .from('gate_conditions')
    .select('*')
    .eq('tender_id', tenderId)
    .order('condition_number', { ascending: true });

  if (error || !conditions || conditions.length === 0) {
    throw new Error(`No conditions found for tender: ${tenderId}`);
  }

  // הכנת JSON לניתוח batch
  const conditionsJson = conditions.map(c => ({
    id: c.id,
    number: c.condition_number,
    text: c.condition_text?.substring(0, 500),
    current_type: c.requirement_type
  }));

  const prompt = BATCH_VALIDATION_PROMPT.replace('{conditions_json}', JSON.stringify(conditionsJson, null, 2));

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: GATE_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const analysisText = response.content[0].text;
  let batchAnalysis;

  try {
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      batchAnalysis = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (e) {
    return {
      success: false,
      error: 'Failed to parse batch analysis',
      raw_response: analysisText
    };
  }

  // ביצוע הפעולות
  const results = {
    deleted: 0,
    merged: 0,
    updated: 0,
    errors: []
  };

  // מחיקת תנאים לא תקפים
  if (batchAnalysis.invalid_ids?.length > 0) {
    for (const id of batchAnalysis.invalid_ids) {
      const { error } = await supabase
        .from('gate_conditions')
        .delete()
        .eq('id', id);

      if (!error) results.deleted++;
      else results.errors.push({ id, error: error.message });
    }
  }

  // עדכון תנאים תקפים
  if (batchAnalysis.valid_conditions?.length > 0) {
    for (const vc of batchAnalysis.valid_conditions) {
      const { error } = await supabase
        .from('gate_conditions')
        .update({
          requirement_type: vc.category,
          ai_summary: vc.summary,
          is_mandatory: vc.is_mandatory,
          ai_analyzed_at: new Date().toISOString()
        })
        .eq('id', vc.id);

      if (!error) results.updated++;
      else results.errors.push({ id: vc.id, error: error.message });
    }
  }

  return {
    success: true,
    tender_id: tenderId,
    total_conditions: conditions.length,
    analysis: batchAnalysis,
    results
  };
}

/**
 * סיווג תנאי בודד
 */
async function classifyGate(conditionText) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  const prompt = CLASSIFICATION_PROMPT.replace('{condition_text}', conditionText);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: GATE_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const analysisText = response.content[0].text;

  try {
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return { success: true, analysis: JSON.parse(jsonMatch[0]) };
    }
  } catch (e) {
    return { success: false, error: 'Parse error', raw: analysisText };
  }
}

/**
 * בדיקה אם שני תנאים צריכים להתמזג
 */
async function checkMerge(condition1Text, condition2Text) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  const prompt = MERGE_ANALYSIS_PROMPT
    .replace('{condition1}', condition1Text)
    .replace('{condition2}', condition2Text);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: GATE_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const analysisText = response.content[0].text;

  try {
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return { success: true, analysis: JSON.parse(jsonMatch[0]) };
    }
  } catch (e) {
    return { success: false, error: 'Parse error', raw: analysisText };
  }
}

/**
 * תמצות דרישה לשפה פשוטה
 */
async function summarizeRequirement(conditionText) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: GATE_ANALYSIS_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `תמצת את תנאי הסף הבא למשפט אחד פשוט בעברית שמסביר בדיוק מה נדרש מהמציע:

תנאי: ${conditionText}

ענה רק עם המשפט המתומצת, בלי הסברים נוספים.`
    }]
  });

  return {
    success: true,
    original: conditionText,
    summary: response.content[0].text.trim()
  };
}

/**
 * קבלת סטטיסטיקות תנאי סף
 */
async function getGateStats(tenderId) {
  if (!supabase) throw new Error('Supabase not initialized');

  const { data: conditions, error } = await supabase
    .from('gate_conditions')
    .select('*')
    .eq('tender_id', tenderId);

  if (error) throw new Error(error.message);

  const stats = {
    total: conditions.length,
    by_type: {},
    by_mandatory: { mandatory: 0, advantage: 0 },
    analyzed: 0,
    not_analyzed: 0
  };

  for (const c of conditions) {
    // By type
    const type = c.requirement_type || 'UNKNOWN';
    stats.by_type[type] = (stats.by_type[type] || 0) + 1;

    // By mandatory
    if (c.is_mandatory) stats.by_mandatory.mandatory++;
    else stats.by_mandatory.advantage++;

    // Analyzed
    if (c.ai_analyzed_at) stats.analyzed++;
    else stats.not_analyzed++;
  }

  return { success: true, tender_id: tenderId, stats };
}

// ============================================
// MCP SERVER SETUP
// ============================================

const server = new Server(
  {
    name: 'tenderix-gate-analyzer',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'analyze_single_gate',
        description: 'ניתוח תנאי סף בודד עם AI - מסווג, מתמצת ומעדכן ב-DB',
        inputSchema: {
          type: 'object',
          properties: {
            condition_id: {
              type: 'string',
              description: 'מזהה התנאי ב-DB (UUID)'
            }
          },
          required: ['condition_id']
        }
      },
      {
        name: 'analyze_all_gates',
        description: 'ניתוח כל תנאי הסף של מכרז - מזהה כפולים, לא תקפים ומסווג',
        inputSchema: {
          type: 'object',
          properties: {
            tender_id: {
              type: 'string',
              description: 'מזהה המכרז (UUID)'
            }
          },
          required: ['tender_id']
        }
      },
      {
        name: 'classify_gate',
        description: 'סיווג תנאי סף לקטגוריה (ניסיון/פיננסי/הסמכה וכו\')',
        inputSchema: {
          type: 'object',
          properties: {
            condition_text: {
              type: 'string',
              description: 'טקסט התנאי לסיווג'
            }
          },
          required: ['condition_text']
        }
      },
      {
        name: 'check_merge',
        description: 'בדיקה אם שני תנאים צריכים להתמזג',
        inputSchema: {
          type: 'object',
          properties: {
            condition1_text: {
              type: 'string',
              description: 'טקסט תנאי ראשון'
            },
            condition2_text: {
              type: 'string',
              description: 'טקסט תנאי שני'
            }
          },
          required: ['condition1_text', 'condition2_text']
        }
      },
      {
        name: 'summarize_requirement',
        description: 'תמצות דרישה לשפה פשוטה',
        inputSchema: {
          type: 'object',
          properties: {
            condition_text: {
              type: 'string',
              description: 'טקסט התנאי לתמצות'
            }
          },
          required: ['condition_text']
        }
      },
      {
        name: 'get_gate_stats',
        description: 'קבלת סטטיסטיקות תנאי סף של מכרז',
        inputSchema: {
          type: 'object',
          properties: {
            tender_id: {
              type: 'string',
              description: 'מזהה המכרז (UUID)'
            }
          },
          required: ['tender_id']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    initClients();

    let result;

    switch (name) {
      case 'analyze_single_gate':
        result = await analyzeSingleGate(args.condition_id);
        break;

      case 'analyze_all_gates':
        result = await analyzeAllGates(args.tender_id);
        break;

      case 'classify_gate':
        result = await classifyGate(args.condition_text);
        break;

      case 'check_merge':
        result = await checkMerge(args.condition1_text, args.condition2_text);
        break;

      case 'summarize_requirement':
        result = await summarizeRequirement(args.condition_text);
        break;

      case 'get_gate_stats':
        result = await getGateStats(args.tender_id);
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message
          })
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Tenderix Gate Analyzer MCP Server running on stdio');
}

main().catch(console.error);
