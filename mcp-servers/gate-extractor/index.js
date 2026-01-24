#!/usr/bin/env node

/**
 * Tenderix Gate Extractor MCP Server - Professional Edition v3.0
 *
 * מערכת חילוץ תנאי סף מקצועית למכרזים ישראליים
 * ברמת מומחה זכאות רגולטורי ומשפטי
 *
 * כלים חדשים:
 * - expert_gate_analysis: ניתוח מקצועי ברמת מומחה עם טבלאות
 * - compare_to_bidder_profile: השוואה לפרופיל מציע
 * - generate_gap_solutions: יצירת פתרונות לסגירת פערים
 * - generate_strategic_questions: שאלות הבהרה אסטרטגיות
 * - format_hebrew_report: עיצוב דוח עברי קריא
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Import all prompts
import {
  DEFINITIONS_SYSTEM_PROMPT,
  DEFINITIONS_PROMPT,
  SCANNER_SYSTEM_PROMPT,
  SCANNER_PROMPT,
  ANALYZER_SYSTEM_PROMPT,
  ANALYZER_PROMPT,
  VALIDATOR_SYSTEM_PROMPT,
  VALIDATOR_PROMPT,
  SYSTEM_PROMPT,
  EXTRACTION_PROMPT,
  MERGE_PROMPT,
  GATE_KEYWORDS,
  SECTION_BOUNDARIES
} from './prompts.js';

import {
  EXPERT_SYSTEM_PROMPT,
  COMPREHENSIVE_ANALYSIS_PROMPT,
  PROFILE_COMPARISON_PROMPT,
  GAP_CLOSURE_PROMPT,
  STRATEGIC_QUESTIONS_PROMPT
} from './prompts-professional-v2.js';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rerfjgjwjqodevkvhkxu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Model to use
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const CLAUDE_MODEL_COMPLEX = 'claude-opus-4-5-20251101';

// Initialize clients
let supabase = null;
let anthropic = null;

function initClients() {
  if (SUPABASE_KEY && !supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  if (ANTHROPIC_API_KEY && !anthropic) {
    anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract JSON from Claude response
 */
function extractJsonFromResponse(text) {
  // Try to find JSON in markdown code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      // Continue to other methods
    }
  }

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // Continue to other methods
    }
  }

  throw new Error('No valid JSON found in response');
}

/**
 * Format conditions as Hebrew markdown table
 */
function formatHebrewTable(conditions) {
  if (!conditions || conditions.length === 0) {
    return 'לא נמצאו תנאי סף';
  }

  let table = `
## טבלת תנאי סף והגבלות השתתפות

| # | תנאי סף / הגבלה | דרישת המכרז | סטטוס | פער/סיכון | פתרון מוצע | פרשנות רגולטורית | מקור |
|---|----------------|-------------|-------|-----------|------------|------------------|------|
`;

  conditions.forEach((c, i) => {
    const status = c.compliance_status === 'MET' ? '✅ עומד' :
                   c.compliance_status === 'GAP' ? '❌ פער' :
                   c.compliance_status === 'PARTIAL' ? '⚠️ חלקי' : '❓ נדרש מידע';

    table += `| ${i + 1} | ${c.condition_name || c.text || '-'} | ${(c.tender_requirement || c.requirement || '-').substring(0, 50)}... | ${status} | ${c.common_gap_risk || c.gap || '-'} | ${c.proposed_solution || c.solution || '-'} | ${c.regulatory_interpretation || c.interpretation || '-'} | עמ' ${c.source?.page || '?'} |\n`;
  });

  return table;
}

/**
 * Format definitions as Hebrew table
 */
function formatDefinitionsTable(definitions) {
  if (!definitions || definitions.length === 0) {
    return '';
  }

  let table = `
## הגדרות שמכתיבות את פרשנות תנאי הסף (חשוב להוכחות)

| מונח | מה זה אומר בפועל | נקודות פרשנות/סיכון |
|------|------------------|---------------------|
`;

  definitions.forEach(d => {
    table += `| **${d.term}** | ${d.definition || d.practical_meaning || '-'} | ${d.interpretation_risk || d.implications?.join(', ') || '-'} |\n`;
  });

  return table;
}

/**
 * Format experience categories table
 */
function formatExperienceTable(categories) {
  if (!categories || categories.length === 0) {
    return '';
  }

  let table = `
## קטגוריות ניסיון נדרש

| קטגוריה | דרישה | חל על | סטטוס | פער | פתרון | פרשנות |
|---------|-------|-------|-------|-----|-------|--------|
`;

  categories.forEach(c => {
    const status = c.compliance_status === 'MET' ? '✅' :
                   c.compliance_status === 'GAP' ? '❌' : '❓';

    table += `| ${c.category_name} | ${(c.requirement || '-').substring(0, 40)}... | ${c.applies_to || '-'} | ${status} | ${c.common_gap || '-'} | ${c.proposed_solution || '-'} | ${c.regulatory_note || '-'} |\n`;
  });

  return table;
}

/**
 * Format plain language summary
 */
function formatSummary(summary) {
  if (!summary) return '';

  let text = `
## סיכום מצב (במילים פשוטות)

`;

  if (summary.plain_language_summary && Array.isArray(summary.plain_language_summary)) {
    summary.plain_language_summary.forEach(item => {
      text += `• ${item}\n`;
    });
  }

  text += `
### סטטוס כולל
- **המלצה**: ${summary.overall_status === 'GO' ? '✅ GO - להגיש' :
               summary.overall_status === 'NO_GO' ? '❌ NO-GO - לא להגיש' :
               '⚠️ מותנה - להגיש עם סגירת פערים'}
- **רמת ביטחון**: ${Math.round((summary.confidence_level || 0) * 100)}%
- **תנאים שעומדים**: ${summary.met_conditions || 0}
- **פערים**: ${summary.gap_conditions || 0}
- **חוסמים**: ${summary.blocker_conditions || 0}
`;

  return text;
}

/**
 * Generate full Hebrew report
 */
function generateFullReport(analysisResult) {
  let report = `# דוח ניתוח תנאי סף

**מכרז**: ${analysisResult.tender_analysis?.tender_name || 'לא צוין'}
**מספר**: ${analysisResult.tender_analysis?.tender_number || 'לא צוין'}
**גוף מזמין**: ${analysisResult.tender_analysis?.issuing_body || 'לא צוין'}
**מועד הגשה**: ${analysisResult.tender_analysis?.submission_deadline || 'לא צוין'}

---
`;

  // Add definitions table
  report += formatDefinitionsTable(analysisResult.critical_definitions);

  // Add main conditions table
  report += formatHebrewTable(analysisResult.gate_conditions_table);

  // Add experience categories
  report += formatExperienceTable(analysisResult.experience_categories);

  // Add strategic notes
  if (analysisResult.strategic_notes && analysisResult.strategic_notes.length > 0) {
    report += `
## הערות אסטרטגיות חשובות

`;
    analysisResult.strategic_notes.forEach((note, i) => {
      report += `### ${i + 1}. ${note.topic}
${note.explanation}

**השפעה מעשית**: ${note.practical_impact}

`;
    });
  }

  // Add clarification questions
  if (analysisResult.clarification_questions_recommended && analysisResult.clarification_questions_recommended.length > 0) {
    report += `
## שאלות הבהרה מומלצות

| עדיפות | שאלה | סיבה | השפעה |
|--------|------|------|-------|
`;
    analysisResult.clarification_questions_recommended.forEach(q => {
      report += `| ${q.priority} | ${q.question} | ${q.reason} | ${q.potential_impact} |\n`;
    });
  }

  // Add summary
  report += formatSummary(analysisResult.status_summary);

  // Add action items
  if (analysisResult.action_items && analysisResult.action_items.length > 0) {
    report += `
## משימות לביצוע

`;
    analysisResult.action_items.forEach((item, i) => {
      report += `${i + 1}. [ ] **${item.action}** - ${item.owner || 'לא הוגדר'} (עד ${item.deadline || 'לא הוגדר'}) [${item.priority}]\n`;
    });
  }

  return report;
}

// ============================================
// PROFESSIONAL ANALYSIS FUNCTIONS
// ============================================

/**
 * Expert Gate Analysis - Main professional function
 */
async function expertGateAnalysis(documentText, bidderProfile = null) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  console.error('[Expert Analysis] Starting comprehensive analysis...');
  console.error(`[Expert Analysis] Document length: ${documentText.length} characters`);

  const prompt = COMPREHENSIVE_ANALYSIS_PROMPT
    .replace('{document_text}', documentText)
    .replace('{bidder_profile}', bidderProfile ? JSON.stringify(bidderProfile, null, 2) : 'לא סופק');

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL_COMPLEX,
    max_tokens: 16000,
    system: EXPERT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = response.content[0].text;

  try {
    const result = extractJsonFromResponse(responseText);

    // Generate formatted report
    const formattedReport = generateFullReport(result);

    console.error(`[Expert Analysis] Found ${result.gate_conditions_table?.length || 0} conditions`);

    return {
      success: true,
      analysis: result,
      formatted_report: formattedReport,
      raw_response_length: responseText.length
    };
  } catch (e) {
    console.error(`[Expert Analysis] Failed to parse response: ${e.message}`);
    return {
      success: false,
      error: e.message,
      raw_response: responseText.substring(0, 2000)
    };
  }
}

/**
 * Compare analysis to bidder profile
 */
async function compareToBidderProfile(tenderRequirements, bidderProfile) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  console.error('[Profile Comparison] Comparing requirements to profile...');

  const prompt = PROFILE_COMPARISON_PROMPT
    .replace('{tender_requirements}', JSON.stringify(tenderRequirements, null, 2))
    .replace('{bidder_profile}', JSON.stringify(bidderProfile, null, 2));

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    system: EXPERT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = response.content[0].text;

  try {
    const result = extractJsonFromResponse(responseText);
    console.error(`[Profile Comparison] Found ${result.compliance_matrix?.length || 0} matches, ${result.information_gaps?.length || 0} gaps`);

    return {
      success: true,
      comparison: result
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
      raw_response: responseText.substring(0, 1000)
    };
  }
}

/**
 * Generate gap closure solutions
 */
async function generateGapSolutions(gapDescription, tenderContext, bidderProfile) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  console.error('[Gap Closure] Generating solutions...');

  const prompt = GAP_CLOSURE_PROMPT
    .replace('{gap_description}', gapDescription)
    .replace('{tender_context}', JSON.stringify(tenderContext, null, 2))
    .replace('{bidder_profile}', JSON.stringify(bidderProfile, null, 2));

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: EXPERT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = response.content[0].text;

  try {
    const result = extractJsonFromResponse(responseText);
    console.error(`[Gap Closure] Generated ${result.closure_options?.length || 0} options`);

    return {
      success: true,
      solutions: result
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
      raw_response: responseText.substring(0, 1000)
    };
  }
}

/**
 * Generate strategic clarification questions
 */
async function generateStrategicQuestions(tenderAnalysis, bidderProfile, competitorsInfo = null) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  console.error('[Strategic Questions] Generating questions...');

  const prompt = STRATEGIC_QUESTIONS_PROMPT
    .replace('{tender_analysis}', JSON.stringify(tenderAnalysis, null, 2))
    .replace('{bidder_profile}', JSON.stringify(bidderProfile, null, 2))
    .replace('{competitors_info}', competitorsInfo ? JSON.stringify(competitorsInfo, null, 2) : 'לא סופק');

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: EXPERT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = response.content[0].text;

  try {
    const result = extractJsonFromResponse(responseText);
    console.error(`[Strategic Questions] Generated ${result.clarification_questions?.length || 0} questions`);

    return {
      success: true,
      questions: result
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
      raw_response: responseText.substring(0, 1000)
    };
  }
}

/**
 * Save analysis results to Supabase
 */
async function saveAnalysisResults(tenderId, analysisResult) {
  if (!supabase) throw new Error('Supabase not initialized');

  const savedConditions = [];
  const errors = [];

  // Save each condition
  const conditions = analysisResult.gate_conditions_table || [];

  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i];

    const record = {
      id: randomUUID(),
      tender_id: tenderId,
      condition_number: i + 1,
      condition_text: c.tender_requirement || c.requirement,
      requirement_type: c.condition_name || 'OTHER',
      is_mandatory: true,
      ai_confidence: 0.9,
      source_quote: c.tender_requirement,
      source_page: c.source?.page || null,
      source_section: c.source?.section || null,
      ai_analyzed_at: new Date().toISOString(),
      extracted_by: 'expert-gate-analysis-v3',
      // New professional fields
      compliance_status: c.compliance_status,
      gap_description: c.common_gap_risk,
      proposed_solution: c.proposed_solution,
      regulatory_interpretation: c.regulatory_interpretation
    };

    const { data, error } = await supabase
      .from('gate_conditions')
      .upsert(record, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      errors.push({ condition_index: i, error: error.message });
    } else {
      savedConditions.push(data);
    }
  }

  // Update tender status
  await supabase
    .from('tenders')
    .update({
      gates_extracted: true,
      gates_extraction_date: new Date().toISOString(),
      gates_count: savedConditions.length
    })
    .eq('id', tenderId);

  return {
    success: errors.length === 0,
    saved_count: savedConditions.length,
    error_count: errors.length,
    errors: errors.length > 0 ? errors : undefined
  };
}

// ============================================
// LEGACY FUNCTIONS (kept for compatibility)
// ============================================

function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }
  return dp[m][n];
}

function similarityRatio(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

async function chunkDocument(text, chunkSize = 4000, overlap = 500) {
  const chunks = [];
  let currentPos = 0;
  let chunkIndex = 0;

  while (currentPos < text.length) {
    let endPos = Math.min(currentPos + chunkSize, text.length);

    // Try to end at sentence boundary
    if (endPos < text.length) {
      const searchStart = Math.max(0, endPos - 200);
      const searchText = text.substring(searchStart, endPos + 200);
      const sentenceEnd = searchText.lastIndexOf('. ');
      if (sentenceEnd !== -1) {
        endPos = searchStart + sentenceEnd + 2;
      }
    }

    const chunkText = text.substring(currentPos, endPos).trim();
    if (chunkText.length > 0) {
      chunks.push({
        index: chunkIndex,
        text: chunkText,
        start_position: currentPos,
        end_position: endPos,
        char_count: chunkText.length
      });
      chunkIndex++;
    }

    currentPos = endPos - overlap;
    if (currentPos <= 0 && chunkIndex > 0) {
      currentPos = endPos;
    }
  }

  return {
    success: true,
    total_chunks: chunks.length,
    total_characters: text.length,
    chunks: chunks
  };
}

// ============================================
// MCP SERVER SETUP
// ============================================

const server = new Server(
  {
    name: 'tenderix-gate-extractor',
    version: '3.0.0',
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
      // NEW: Professional analysis tools
      {
        name: 'expert_gate_analysis',
        description: 'ניתוח תנאי סף מקצועי ברמת מומחה זכאות רגולטורי. מחזיר טבלאות מעוצבות, הגדרות קריטיות, פערים ופתרונות, והערות אסטרטגיות.',
        inputSchema: {
          type: 'object',
          properties: {
            document_text: {
              type: 'string',
              description: 'הטקסט המלא של מסמך המכרז'
            },
            bidder_profile: {
              type: 'object',
              description: 'פרופיל המציע (אופציונלי) - לבדיקת עמידה',
              default: null
            }
          },
          required: ['document_text']
        }
      },
      {
        name: 'compare_to_bidder_profile',
        description: 'השוואה בין דרישות המכרז לפרופיל המציע - זיהוי פערים והתאמות',
        inputSchema: {
          type: 'object',
          properties: {
            tender_requirements: {
              type: 'object',
              description: 'דרישות המכרז (תוצאת expert_gate_analysis)'
            },
            bidder_profile: {
              type: 'object',
              description: 'פרופיל המציע המלא'
            }
          },
          required: ['tender_requirements', 'bidder_profile']
        }
      },
      {
        name: 'generate_gap_solutions',
        description: 'יצירת פתרונות יצירתיים לסגירת פערים בתנאי סף',
        inputSchema: {
          type: 'object',
          properties: {
            gap_description: {
              type: 'string',
              description: 'תיאור הפער שזוהה'
            },
            tender_context: {
              type: 'object',
              description: 'הקשר המכרז (דרישות, הגדרות)'
            },
            bidder_profile: {
              type: 'object',
              description: 'פרופיל המציע'
            }
          },
          required: ['gap_description', 'tender_context', 'bidder_profile']
        }
      },
      {
        name: 'generate_strategic_questions',
        description: 'יצירת שאלות הבהרה אסטרטגיות - לסגירת פערים ולהגבלת מתחרים',
        inputSchema: {
          type: 'object',
          properties: {
            tender_analysis: {
              type: 'object',
              description: 'ניתוח המכרז'
            },
            bidder_profile: {
              type: 'object',
              description: 'פרופיל המציע'
            },
            competitors_info: {
              type: 'object',
              description: 'מידע על מתחרים (אופציונלי)',
              default: null
            }
          },
          required: ['tender_analysis', 'bidder_profile']
        }
      },
      {
        name: 'format_hebrew_report',
        description: 'עיצוב דוח ניתוח תנאי סף בעברית - טבלאות מעוצבות וקריאות',
        inputSchema: {
          type: 'object',
          properties: {
            analysis_result: {
              type: 'object',
              description: 'תוצאת הניתוח מ-expert_gate_analysis'
            }
          },
          required: ['analysis_result']
        }
      },
      {
        name: 'save_analysis_to_db',
        description: 'שמירת תוצאות הניתוח ל-Supabase',
        inputSchema: {
          type: 'object',
          properties: {
            tender_id: {
              type: 'string',
              description: 'מזהה המכרז (UUID)'
            },
            analysis_result: {
              type: 'object',
              description: 'תוצאת הניתוח'
            }
          },
          required: ['tender_id', 'analysis_result']
        }
      },
      // Legacy tools (kept for compatibility)
      {
        name: 'chunk_document',
        description: 'חיתוך מסמך לחלקים עם חפיפות',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'הטקסט לחיתוך' },
            chunk_size: { type: 'number', default: 4000 },
            overlap: { type: 'number', default: 500 }
          },
          required: ['text']
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
      // New professional tools
      case 'expert_gate_analysis':
        result = await expertGateAnalysis(args.document_text, args.bidder_profile);
        break;

      case 'compare_to_bidder_profile':
        result = await compareToBidderProfile(args.tender_requirements, args.bidder_profile);
        break;

      case 'generate_gap_solutions':
        result = await generateGapSolutions(args.gap_description, args.tender_context, args.bidder_profile);
        break;

      case 'generate_strategic_questions':
        result = await generateStrategicQuestions(args.tender_analysis, args.bidder_profile, args.competitors_info);
        break;

      case 'format_hebrew_report':
        result = {
          success: true,
          formatted_report: generateFullReport(args.analysis_result)
        };
        break;

      case 'save_analysis_to_db':
        result = await saveAnalysisResults(args.tender_id, args.analysis_result);
        break;

      // Legacy tools
      case 'chunk_document':
        result = await chunkDocument(args.text, args.chunk_size, args.overlap);
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
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
  console.error('Tenderix Gate Extractor MCP Server v3.0 (Professional Expert) running on stdio');
}

main().catch(console.error);
