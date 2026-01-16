#!/usr/bin/env node

/**
 * Tenderix Gate Extractor MCP Server - Professional Edition
 *
 * מערכת חילוץ תנאי סף מקצועית למכרזים ישראליים
 * ארכיטקטורה: 4 סוכני AI
 *
 * כלים זמינים:
 * - chunk_document: חיתוך מסמך לחלקים עם חפיפה
 * - extract_gates_from_chunk: חילוץ תנאי סף מ-chunk (legacy)
 * - validate_extraction_coverage: בדיקת כיסוי החילוץ
 * - merge_and_dedupe_conditions: מיזוג והסרת כפילויות
 * - save_extracted_conditions: שמירה ל-Supabase
 *
 * NEW - Professional Tools:
 * - professional_gate_extraction: חילוץ מקצועי עם 4 סוכני AI
 * - extract_definitions: חילוץ מילון הגדרות (Agent 0)
 * - scan_for_conditions: סריקה שורה שורה (Agent 1)
 * - analyze_conditions: ניתוח מעמיק עם פרשנות כפולה (Agent 2)
 * - validate_and_finalize: אימות כיסוי ומיזוג (Agent 3)
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
import {
  // New professional prompts
  DEFINITIONS_SYSTEM_PROMPT,
  DEFINITIONS_PROMPT,
  SCANNER_SYSTEM_PROMPT,
  SCANNER_PROMPT,
  ANALYZER_SYSTEM_PROMPT,
  ANALYZER_PROMPT,
  VALIDATOR_SYSTEM_PROMPT,
  VALIDATOR_PROMPT,
  // Legacy prompts
  SYSTEM_PROMPT,
  EXTRACTION_PROMPT,
  MERGE_PROMPT,
  // Keywords and patterns
  GATE_KEYWORDS,
  SECTION_BOUNDARIES
} from './prompts.js';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rerfjgjwjqodevkvhkxu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Model to use - Claude Opus for complex Hebrew document analysis
const CLAUDE_MODEL = 'claude-opus-4-5-20251101';

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
 * Calculate Levenshtein distance between two strings
 */
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

/**
 * Calculate similarity ratio between two strings
 */
function similarityRatio(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

/**
 * Find section boundaries in Hebrew text
 */
function findSectionBoundaries(text) {
  const boundaries = [];

  for (const pattern of SECTION_BOUNDARIES) {
    let match;
    const regex = new RegExp(pattern.source, 'gm');
    while ((match = regex.exec(text)) !== null) {
      boundaries.push(match.index);
    }
  }

  return [...new Set(boundaries)].sort((a, b) => a - b);
}

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

// ============================================
// PROFESSIONAL AGENT FUNCTIONS
// ============================================

/**
 * Agent 0: Extract Definitions
 * מחלץ את מילון ההגדרות מהמכרז
 */
async function extractDefinitions(documentText) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  console.error('[Agent 0] Extracting definitions from document...');

  const prompt = DEFINITIONS_PROMPT.replace('{document_text}', documentText);

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: DEFINITIONS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = response.content[0].text;

  try {
    const result = extractJsonFromResponse(responseText);
    console.error(`[Agent 0] Found ${result.definitions?.length || 0} definitions`);
    return {
      success: true,
      ...result
    };
  } catch (e) {
    console.error(`[Agent 0] Failed to parse response: ${e.message}`);
    return {
      success: false,
      definitions_found: false,
      definitions: [],
      error: e.message
    };
  }
}

/**
 * Agent 1: Scanner
 * סורק את המסמך שורה שורה ומזהה משפטים פוטנציאליים
 */
async function scanForConditions(documentText) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  console.error('[Agent 1] Scanning document for potential conditions...');

  const prompt = SCANNER_PROMPT.replace('{document_text}', documentText);

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    system: SCANNER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = response.content[0].text;

  try {
    const result = extractJsonFromResponse(responseText);
    console.error(`[Agent 1] Found ${result.potential_conditions?.length || 0} potential conditions`);
    return {
      success: true,
      ...result
    };
  } catch (e) {
    console.error(`[Agent 1] Failed to parse response: ${e.message}`);
    return {
      success: false,
      potential_conditions: [],
      error: e.message
    };
  }
}

/**
 * Agent 2: Analyzer
 * מנתח כל משפט לעומק עם פרשנות כפולה
 */
async function analyzeConditions(potentialConditions, definitions) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  console.error(`[Agent 2] Analyzing ${potentialConditions.length} conditions...`);

  const definitionsJson = JSON.stringify(definitions || [], null, 2);
  const conditionsJson = JSON.stringify(potentialConditions, null, 2);

  const prompt = ANALYZER_PROMPT
    .replace('{definitions_json}', definitionsJson)
    .replace('{conditions_json}', conditionsJson);

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    system: ANALYZER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = response.content[0].text;

  try {
    const result = extractJsonFromResponse(responseText);
    console.error(`[Agent 2] Analyzed ${result.analyzed_conditions?.length || 0} conditions, rejected ${result.rejected_conditions?.length || 0}`);
    return {
      success: true,
      ...result
    };
  } catch (e) {
    console.error(`[Agent 2] Failed to parse response: ${e.message}`);
    return {
      success: false,
      analyzed_conditions: [],
      rejected_conditions: [],
      error: e.message
    };
  }
}

/**
 * Agent 3: Validator
 * מאמת כיסוי, מזהה כפילויות, מייצר דוח סופי
 */
async function validateAndFinalize(documentText, analyzedConditions) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  console.error(`[Agent 3] Validating ${analyzedConditions.length} conditions...`);

  const conditionsJson = JSON.stringify(analyzedConditions, null, 2);

  const prompt = VALIDATOR_PROMPT
    .replace('{document_text}', documentText)
    .replace('{analyzed_conditions_json}', conditionsJson);

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    system: VALIDATOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = response.content[0].text;

  try {
    const result = extractJsonFromResponse(responseText);
    console.error(`[Agent 3] Final conditions: ${result.final_conditions?.length || 0}, coverage: ${result.validation_result?.coverage_percentage || 0}%`);
    return {
      success: true,
      ...result
    };
  } catch (e) {
    console.error(`[Agent 3] Failed to parse response: ${e.message}`);
    return {
      success: false,
      validation_result: { coverage_percentage: 0 },
      final_conditions: analyzedConditions, // Return what we have
      error: e.message
    };
  }
}

/**
 * Professional Gate Extraction Pipeline
 * מריץ את כל 4 הסוכנים ברצף ומחזיר תוצאה מלאה
 */
async function professionalGateExtraction(tenderId, documentText) {
  console.error(`[Pipeline] Starting professional extraction for tender ${tenderId}`);
  console.error(`[Pipeline] Document length: ${documentText.length} characters`);

  const startTime = Date.now();

  // Step 0: Extract definitions
  console.error('[Pipeline] Step 0: Extracting definitions...');
  const definitionsResult = await extractDefinitions(documentText);

  // Step 1: Scan for potential conditions
  console.error('[Pipeline] Step 1: Scanning for conditions...');
  const scanResult = await scanForConditions(documentText);

  if (!scanResult.success || !scanResult.potential_conditions?.length) {
    return {
      success: false,
      error: 'Scanner found no potential conditions',
      definitions: definitionsResult,
      scan_result: scanResult
    };
  }

  // Step 2: Analyze conditions with definitions context
  console.error('[Pipeline] Step 2: Analyzing conditions...');
  const analyzeResult = await analyzeConditions(
    scanResult.potential_conditions,
    definitionsResult.definitions || []
  );

  if (!analyzeResult.success || !analyzeResult.analyzed_conditions?.length) {
    return {
      success: false,
      error: 'Analyzer could not process conditions',
      definitions: definitionsResult,
      scan_result: scanResult,
      analyze_result: analyzeResult
    };
  }

  // Step 3: Validate and finalize
  console.error('[Pipeline] Step 3: Validating and finalizing...');
  const validateResult = await validateAndFinalize(
    documentText,
    analyzeResult.analyzed_conditions
  );

  const endTime = Date.now();
  const durationSec = ((endTime - startTime) / 1000).toFixed(1);

  console.error(`[Pipeline] Completed in ${durationSec}s`);

  // Prepare final conditions with IDs
  const finalConditions = (validateResult.final_conditions || analyzeResult.analyzed_conditions).map((c, i) => ({
    id: randomUUID(),
    tender_id: tenderId,
    condition_number: i + 1,
    // Map to database schema
    condition_text: c.original_text || c.text,
    requirement_type: c.category || 'OTHER',
    is_mandatory: c.is_mandatory !== false,
    // Quantitative
    required_amount: c.quantitative?.amount || null,
    required_years: c.quantitative?.years || null,
    required_count: c.quantitative?.count || null,
    // Traceability
    source_page: c.traceability?.source_page || null,
    source_section: c.traceability?.source_section || null,
    source_quote: c.traceability?.source_quote || c.original_text?.substring(0, 200),
    source_file: c.traceability?.source_file || null,
    // New fields
    bearer_entity: c.bearer?.entity || 'bidder_only',
    subcontractor_allowed: c.bearer?.subcontractor_allowed || false,
    subcontractor_limit: c.bearer?.subcontractor_limit || null,
    group_companies_allowed: c.bearer?.group_companies_allowed || false,
    legal_classification: c.interpretation?.legal?.classification || null,
    legal_reasoning: c.interpretation?.legal?.reasoning || null,
    technical_requirement: c.interpretation?.technical?.what_is_required || null,
    equivalent_options: c.interpretation?.technical?.equivalent_options || [],
    definition_applied: c.interpretation?.technical?.definition_applied || null,
    // Meta
    ai_confidence: c.confidence || 0.8,
    extraction_method: 'professional_4_agent',
    extracted_at: new Date().toISOString(),
    // Keep full analysis for reference
    _full_analysis: c
  }));

  return {
    success: true,
    tender_id: tenderId,
    extraction_method: 'professional_4_agent',
    duration_seconds: parseFloat(durationSec),
    // Definitions
    definitions: {
      found: definitionsResult.definitions_found || false,
      count: definitionsResult.definitions?.length || 0,
      items: definitionsResult.definitions || [],
      critical: definitionsResult.critical_definitions || [],
      missing: definitionsResult.missing_definitions || []
    },
    // Validation
    validation: {
      coverage_percentage: validateResult.validation_result?.coverage_percentage || 0,
      missed_sections: validateResult.validation_result?.missed_sections || [],
      duplicates_merged: validateResult.validation_result?.duplicates_found?.length || 0,
      contradictions: validateResult.validation_result?.contradictions || [],
      overall_confidence: validateResult.validation_result?.overall_confidence || 0.8
    },
    // Summary
    summary: {
      scanned: scanResult.potential_conditions?.length || 0,
      analyzed: analyzeResult.analyzed_conditions?.length || 0,
      rejected: analyzeResult.rejected_conditions?.length || 0,
      final: finalConditions.length
    },
    // Final conditions
    conditions: finalConditions
  };
}

// ============================================
// LEGACY TOOL IMPLEMENTATIONS
// ============================================

/**
 * Tool 1: chunk_document
 * חיתוך מסמך לחלקים עם חפיפה
 */
async function chunkDocument(text, chunkSize = 4000, overlap = 500) {
  const chunks = [];
  const boundaries = findSectionBoundaries(text);

  let currentPos = 0;
  let chunkIndex = 0;

  while (currentPos < text.length) {
    let endPos = currentPos + chunkSize;

    // Try to end at a section boundary
    const nearbyBoundary = boundaries.find(b =>
      b > currentPos + chunkSize - overlap &&
      b < currentPos + chunkSize + overlap
    );

    if (nearbyBoundary) {
      endPos = nearbyBoundary;
    } else if (endPos < text.length) {
      // Try to end at a sentence boundary (period followed by space)
      const searchStart = Math.max(0, endPos - 200);
      const searchEnd = Math.min(text.length, endPos + 200);
      const searchText = text.substring(searchStart, searchEnd);

      const sentenceEnd = searchText.lastIndexOf('. ');
      if (sentenceEnd !== -1) {
        endPos = searchStart + sentenceEnd + 2;
      }
    }

    // Ensure we don't exceed text length
    endPos = Math.min(endPos, text.length);

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

    // Move to next position with overlap
    currentPos = endPos - overlap;
    if (currentPos <= chunks[chunks.length - 1]?.start_position) {
      currentPos = endPos; // Prevent infinite loop
    }
  }

  return {
    success: true,
    total_chunks: chunks.length,
    total_characters: text.length,
    chunk_size: chunkSize,
    overlap: overlap,
    chunks: chunks
  };
}

/**
 * Tool 2: extract_gates_from_chunk (legacy)
 * חילוץ תנאי סף מ-chunk עם Claude
 */
async function extractGatesFromChunk(chunkText, tenderId, existingConditions = []) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  // Build existing conditions section
  let existingConditionsSection = '';
  if (existingConditions.length > 0) {
    const existingTexts = existingConditions.map(c => `- ${c.text?.substring(0, 100)}...`).join('\n');
    existingConditionsSection = `תנאים שכבר חולצו (הימנע מכפילויות):\n${existingTexts}`;
  }

  const prompt = EXTRACTION_PROMPT
    .replace('{chunk_text}', chunkText)
    .replace('{document_text}', chunkText)
    .replace('{existing_conditions_section}', existingConditionsSection);

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = response.content[0].text;

  try {
    const result = extractJsonFromResponse(responseText);

    // Add IDs and tender_id to each condition
    const conditions = (result.conditions || result.potential_conditions || []).map(c => ({
      id: randomUUID(),
      tender_id: tenderId,
      ...c
    }));

    return {
      success: true,
      conditions: conditions,
      extraction_notes: result.extraction_notes || result.scanning_notes || null,
      chunk_length: chunkText.length,
      conditions_found: conditions.length
    };
  } catch (e) {
    return {
      success: false,
      error: `Failed to parse extraction response: ${e.message}`,
      raw_response: responseText.substring(0, 500)
    };
  }
}

/**
 * Tool 3: validate_extraction_coverage
 * בדיקת כיסוי החילוץ
 */
async function validateExtractionCoverage(documentText, extractedConditions) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  // Find relevant excerpts - sections containing keywords
  const excerpts = [];
  const lines = documentText.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const foundKeywords = GATE_KEYWORDS.filter(kw => line.includes(kw));

    if (foundKeywords.length > 0) {
      // Get context (2 lines before and after)
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 3);
      const context = lines.slice(start, end).join('\n');

      excerpts.push({
        line_number: i + 1,
        text: context,
        keywords: foundKeywords
      });
    }
  }

  // Limit excerpts for API call
  const limitedExcerpts = excerpts.slice(0, 20);
  const excerptText = limitedExcerpts.map(e =>
    `[שורה ${e.line_number}] ${e.text}`
  ).join('\n---\n');

  const conditionsText = extractedConditions.map(c =>
    `- [${c.category}] ${c.text?.substring(0, 150)}...`
  ).join('\n');

  // Use new validator prompt
  const prompt = VALIDATOR_PROMPT
    .replace('{document_text}', excerptText)
    .replace('{analyzed_conditions_json}', JSON.stringify(extractedConditions, null, 2));

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: VALIDATOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = response.content[0].text;

  try {
    const result = extractJsonFromResponse(responseText);

    return {
      success: true,
      coverage_percentage: result.validation_result?.coverage_percentage || result.coverage_percentage || 0,
      missed_sections: result.validation_result?.missed_sections || result.missed_sections || [],
      validation_notes: result.validation_notes || null,
      excerpts_analyzed: limitedExcerpts.length,
      total_keyword_matches: excerpts.length
    };
  } catch (e) {
    return {
      success: false,
      error: `Failed to parse validation response: ${e.message}`,
      raw_response: responseText.substring(0, 500)
    };
  }
}

/**
 * Tool 4: merge_and_dedupe_conditions
 * מיזוג והסרת כפילויות
 */
async function mergeAndDedupeConditions(allConditions) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  // First pass: quick deduplication using similarity
  const uniqueConditions = [];
  const similarityThreshold = 0.85;

  for (const condition of allConditions) {
    const conditionText = condition.text || condition.original_text || '';
    const isDuplicate = uniqueConditions.some(existing => {
      const existingText = existing.text || existing.original_text || '';
      const textSimilarity = similarityRatio(conditionText, existingText);
      return textSimilarity >= similarityThreshold;
    });

    if (!isDuplicate) {
      uniqueConditions.push(condition);
    }
  }

  // If significant deduplication happened, use AI for semantic merge
  if (uniqueConditions.length < allConditions.length * 0.8 || uniqueConditions.length > 10) {
    const conditionsJson = JSON.stringify(uniqueConditions.map(c => ({
      id: c.id,
      text: (c.text || c.original_text)?.substring(0, 300),
      type: c.type,
      category: c.category,
      is_mandatory: c.is_mandatory,
      quantitative: c.quantitative
    })), null, 2);

    const prompt = MERGE_PROMPT.replace('{all_conditions}', conditionsJson);

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = response.content[0].text;

    try {
      const result = extractJsonFromResponse(responseText);

      return {
        success: true,
        merged_conditions: result.merged_conditions || [],
        removed_conditions: result.removed_conditions || [],
        merge_summary: result.merge_summary || {
          original_count: allConditions.length,
          final_count: result.merged_conditions?.length || 0
        }
      };
    } catch (e) {
      // Fall back to simple deduplication result
      return {
        success: true,
        merged_conditions: uniqueConditions,
        removed_conditions: [],
        merge_summary: {
          original_count: allConditions.length,
          final_count: uniqueConditions.length,
          duplicates_merged: allConditions.length - uniqueConditions.length
        },
        note: 'AI merge failed, using simple deduplication'
      };
    }
  }

  return {
    success: true,
    merged_conditions: uniqueConditions,
    removed_conditions: [],
    merge_summary: {
      original_count: allConditions.length,
      final_count: uniqueConditions.length,
      duplicates_merged: allConditions.length - uniqueConditions.length
    }
  };
}

/**
 * Tool 5: save_extracted_conditions
 * שמירה ל-Supabase
 */
async function saveExtractedConditions(tenderId, conditions) {
  if (!supabase) throw new Error('Supabase not initialized');

  const savedConditions = [];
  const errors = [];

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];

    const record = {
      id: condition.id || randomUUID(),
      tender_id: tenderId,
      condition_number: condition.condition_number || i + 1,
      condition_text: condition.condition_text || condition.text || condition.original_text,
      requirement_type: condition.requirement_type || condition.category || 'OTHER',
      is_mandatory: condition.is_mandatory !== false,
      ai_confidence: condition.ai_confidence || condition.confidence || 0.8,
      source_quote: condition.source_quote || condition.condition_text?.substring(0, 200),
      source_page: condition.source_page || null,
      source_section: condition.source_section || null,
      source_file: condition.source_file || null,
      ai_analyzed_at: new Date().toISOString(),
      extracted_by: condition.extraction_method || 'gate-extractor-mcp',
      extraction_pass: condition.extraction_pass || 1
    };

    // Add quantitative data if present
    if (condition.required_amount) record.required_amount = condition.required_amount;
    if (condition.required_years) record.required_years = condition.required_years;
    if (condition.required_count) record.required_count = condition.required_count;

    // Legacy quantitative format
    if (condition.quantitative) {
      if (condition.quantitative.amount) record.required_amount = condition.quantitative.amount;
      if (condition.quantitative.years) record.required_years = condition.quantitative.years;
      if (condition.quantitative.count) record.required_count = condition.quantitative.count;
    }

    // New professional fields (if columns exist in DB)
    if (condition.bearer_entity) record.bearer_entity = condition.bearer_entity;
    if (condition.subcontractor_allowed !== undefined) record.subcontractor_allowed = condition.subcontractor_allowed;
    if (condition.legal_classification) record.legal_classification = condition.legal_classification;
    if (condition.technical_requirement) record.technical_requirement = condition.technical_requirement;

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

  // Update tender extraction status
  const { error: tenderError } = await supabase
    .from('tenders')
    .update({
      gates_extracted: true,
      gates_extraction_date: new Date().toISOString(),
      gates_count: savedConditions.length
    })
    .eq('id', tenderId);

  return {
    success: errors.length === 0,
    tender_id: tenderId,
    saved_count: savedConditions.length,
    error_count: errors.length,
    errors: errors.length > 0 ? errors : undefined,
    tender_update_error: tenderError?.message
  };
}

// ============================================
// MCP SERVER SETUP
// ============================================

const server = new Server(
  {
    name: 'tenderix-gate-extractor',
    version: '2.0.0',
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
      // NEW: Professional extraction tool
      {
        name: 'professional_gate_extraction',
        description: 'חילוץ תנאי סף מקצועי עם 4 סוכני AI: מילון הגדרות, סריקה, ניתוח מעמיק, ואימות. מחזיר תוצאות עם עקיבות מלאה ופרשנות כפולה.',
        inputSchema: {
          type: 'object',
          properties: {
            tender_id: {
              type: 'string',
              description: 'מזהה המכרז (UUID)'
            },
            document_text: {
              type: 'string',
              description: 'הטקסט המלא של מסמך המכרז'
            }
          },
          required: ['tender_id', 'document_text']
        }
      },
      // Individual agent tools for manual control
      {
        name: 'extract_definitions',
        description: 'Agent 0: חילוץ מילון הגדרות מהמכרז',
        inputSchema: {
          type: 'object',
          properties: {
            document_text: {
              type: 'string',
              description: 'הטקסט המלא של המסמך'
            }
          },
          required: ['document_text']
        }
      },
      {
        name: 'scan_for_conditions',
        description: 'Agent 1: סריקה שורה שורה לזיהוי משפטים פוטנציאליים',
        inputSchema: {
          type: 'object',
          properties: {
            document_text: {
              type: 'string',
              description: 'הטקסט המלא של המסמך'
            }
          },
          required: ['document_text']
        }
      },
      {
        name: 'analyze_conditions',
        description: 'Agent 2: ניתוח מעמיק של תנאים עם פרשנות משפטית וטכנית',
        inputSchema: {
          type: 'object',
          properties: {
            potential_conditions: {
              type: 'array',
              description: 'רשימת משפטים פוטנציאליים מה-Scanner',
              items: { type: 'object' }
            },
            definitions: {
              type: 'array',
              description: 'מילון הגדרות מהמכרז',
              items: { type: 'object' },
              default: []
            }
          },
          required: ['potential_conditions']
        }
      },
      {
        name: 'validate_and_finalize',
        description: 'Agent 3: אימות כיסוי, מיזוג כפילויות, ויצירת דוח סופי',
        inputSchema: {
          type: 'object',
          properties: {
            document_text: {
              type: 'string',
              description: 'הטקסט המלא של המסמך'
            },
            analyzed_conditions: {
              type: 'array',
              description: 'תנאים מנותחים מה-Analyzer',
              items: { type: 'object' }
            }
          },
          required: ['document_text', 'analyzed_conditions']
        }
      },
      // Legacy tools
      {
        name: 'chunk_document',
        description: 'חיתוך מסמך לחלקים עם חפיפות לעיבוד איטרטיבי. מזהה גבולות סעיפים בעברית.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'הטקסט המלא של המסמך'
            },
            chunk_size: {
              type: 'number',
              description: 'גודל כל chunk בתווים (ברירת מחדל: 4000)',
              default: 4000
            },
            overlap: {
              type: 'number',
              description: 'חפיפה בין chunks בתווים (ברירת מחדל: 500)',
              default: 500
            }
          },
          required: ['text']
        }
      },
      {
        name: 'extract_gates_from_chunk',
        description: '[Legacy] חילוץ תנאי סף מ-chunk בודד. מומלץ להשתמש ב-professional_gate_extraction במקום.',
        inputSchema: {
          type: 'object',
          properties: {
            chunk_text: {
              type: 'string',
              description: 'טקסט ה-chunk לעיבוד'
            },
            tender_id: {
              type: 'string',
              description: 'מזהה המכרז (UUID)'
            },
            existing_conditions: {
              type: 'array',
              description: 'תנאים שכבר חולצו (להימנעות מכפילויות)',
              items: {
                type: 'object'
              },
              default: []
            }
          },
          required: ['chunk_text', 'tender_id']
        }
      },
      {
        name: 'validate_extraction_coverage',
        description: 'בדיקת כיסוי החילוץ - זיהוי קטעים שפוספסו על סמך מילות מפתח.',
        inputSchema: {
          type: 'object',
          properties: {
            document_text: {
              type: 'string',
              description: 'הטקסט המלא של המסמך'
            },
            extracted_conditions: {
              type: 'array',
              description: 'התנאים שחולצו לבדיקה',
              items: {
                type: 'object'
              }
            }
          },
          required: ['document_text', 'extracted_conditions']
        }
      },
      {
        name: 'merge_and_dedupe_conditions',
        description: 'מיזוג תנאים כפולים והסרת תנאים לא תקפים. משתמש ב-Levenshtein וניתוח סמנטי.',
        inputSchema: {
          type: 'object',
          properties: {
            all_conditions: {
              type: 'array',
              description: 'כל התנאים מכל המעברים',
              items: {
                type: 'object'
              }
            }
          },
          required: ['all_conditions']
        }
      },
      {
        name: 'save_extracted_conditions',
        description: 'שמירת תנאי הסף הסופיים ל-Supabase ועדכון סטטוס המכרז.',
        inputSchema: {
          type: 'object',
          properties: {
            tender_id: {
              type: 'string',
              description: 'מזהה המכרז (UUID)'
            },
            conditions: {
              type: 'array',
              description: 'תנאי הסף לשמירה',
              items: {
                type: 'object'
              }
            }
          },
          required: ['tender_id', 'conditions']
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
      case 'professional_gate_extraction':
        result = await professionalGateExtraction(
          args.tender_id,
          args.document_text
        );
        break;

      case 'extract_definitions':
        result = await extractDefinitions(args.document_text);
        break;

      case 'scan_for_conditions':
        result = await scanForConditions(args.document_text);
        break;

      case 'analyze_conditions':
        result = await analyzeConditions(
          args.potential_conditions,
          args.definitions || []
        );
        break;

      case 'validate_and_finalize':
        result = await validateAndFinalize(
          args.document_text,
          args.analyzed_conditions
        );
        break;

      // Legacy tools
      case 'chunk_document':
        result = await chunkDocument(
          args.text,
          args.chunk_size || 4000,
          args.overlap || 500
        );
        break;

      case 'extract_gates_from_chunk':
        result = await extractGatesFromChunk(
          args.chunk_text,
          args.tender_id,
          args.existing_conditions || []
        );
        break;

      case 'validate_extraction_coverage':
        result = await validateExtractionCoverage(
          args.document_text,
          args.extracted_conditions
        );
        break;

      case 'merge_and_dedupe_conditions':
        result = await mergeAndDedupeConditions(args.all_conditions);
        break;

      case 'save_extracted_conditions':
        result = await saveExtractedConditions(
          args.tender_id,
          args.conditions
        );
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
  console.error('Tenderix Gate Extractor MCP Server v2.0 (Professional) running on stdio');
}

main().catch(console.error);
