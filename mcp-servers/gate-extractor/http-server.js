#!/usr/bin/env node

/**
 * HTTP Server wrapper for Gate Extractor
 * Exposes MCP tools via HTTP endpoints for n8n integration
 *
 * Run: node http-server.js
 * Port: 3100 (or PORT env variable)
 */

import http from 'http';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import {
  SYSTEM_PROMPT,
  EXTRACTION_PROMPT,
  VALIDATION_PROMPT,
  MERGE_PROMPT,
  GATE_KEYWORDS,
  SECTION_BOUNDARIES
} from './prompts.js';

const PORT = process.env.PORT || 3100;

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rerfjgjwjqodevkvhkxu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Model to use
const CLAUDE_MODEL = 'claude-opus-4-5-20251101';

// Initialize clients
let supabase = null;
let anthropic = null;

function initClients() {
  if (SUPABASE_KEY && !supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase client initialized');
  }
  if (ANTHROPIC_API_KEY && !anthropic) {
    anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    console.log('Anthropic client initialized');
  }
}

// ============================================
// UTILITY FUNCTIONS
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
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
      }
    }
  }
  return dp[m][n];
}

function similarityRatio(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(str1, str2) / maxLen;
}

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

function extractJsonFromResponse(text) {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch (e) {}
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch (e) {}
  }
  throw new Error('No valid JSON found in response');
}

// ============================================
// TOOL IMPLEMENTATIONS
// ============================================

async function chunkDocument(text, chunkSize = 4000, overlap = 500) {
  const chunks = [];
  const boundaries = findSectionBoundaries(text);
  let currentPos = 0;
  let chunkIndex = 0;

  while (currentPos < text.length) {
    let endPos = currentPos + chunkSize;
    const nearbyBoundary = boundaries.find(b => b > currentPos + chunkSize - overlap && b < currentPos + chunkSize + overlap);
    if (nearbyBoundary) {
      endPos = nearbyBoundary;
    } else if (endPos < text.length) {
      const searchStart = Math.max(0, endPos - 200);
      const searchEnd = Math.min(text.length, endPos + 200);
      const searchText = text.substring(searchStart, searchEnd);
      const sentenceEnd = searchText.lastIndexOf('. ');
      if (sentenceEnd !== -1) endPos = searchStart + sentenceEnd + 2;
    }
    endPos = Math.min(endPos, text.length);
    const chunkText = text.substring(currentPos, endPos).trim();
    if (chunkText.length > 0) {
      chunks.push({ index: chunkIndex, text: chunkText, start_position: currentPos, end_position: endPos, char_count: chunkText.length });
      chunkIndex++;
    }
    currentPos = endPos - overlap;
    if (chunks.length > 0 && currentPos <= chunks[chunks.length - 1]?.start_position) currentPos = endPos;
  }

  return { success: true, total_chunks: chunks.length, total_characters: text.length, chunk_size: chunkSize, overlap, chunks };
}

async function extractGatesFromChunk(chunkText, tenderId, existingConditions = []) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  let existingConditionsSection = '';
  if (existingConditions.length > 0) {
    const existingTexts = existingConditions.map(c => `- ${c.text?.substring(0, 100)}...`).join('\n');
    existingConditionsSection = `תנאים שכבר חולצו (הימנע מכפילויות):\n${existingTexts}`;
  }

  const prompt = EXTRACTION_PROMPT.replace('{chunk_text}', chunkText).replace('{existing_conditions_section}', existingConditionsSection);

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = response.content[0].text;
  try {
    const result = extractJsonFromResponse(responseText);
    const conditions = (result.conditions || []).map(c => ({ id: randomUUID(), tender_id: tenderId, ...c }));
    return { success: true, conditions, extraction_notes: result.extraction_notes || null, chunk_length: chunkText.length, conditions_found: conditions.length };
  } catch (e) {
    return { success: false, error: `Failed to parse: ${e.message}`, raw_response: responseText.substring(0, 500) };
  }
}

async function validateExtractionCoverage(documentText, extractedConditions) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  const excerpts = [];
  const lines = documentText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const foundKeywords = GATE_KEYWORDS.filter(kw => line.includes(kw));
    if (foundKeywords.length > 0) {
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 3);
      excerpts.push({ line_number: i + 1, text: lines.slice(start, end).join('\n'), keywords: foundKeywords });
    }
  }

  const limitedExcerpts = excerpts.slice(0, 20);
  const excerptText = limitedExcerpts.map(e => `[שורה ${e.line_number}] ${e.text}`).join('\n---\n');
  const conditionsText = extractedConditions.map(c => `- [${c.category}] ${c.text?.substring(0, 150)}...`).join('\n');
  const prompt = VALIDATION_PROMPT.replace('{document_excerpts}', excerptText).replace('{extracted_conditions}', conditionsText);

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }]
  });

  try {
    const result = extractJsonFromResponse(response.content[0].text);
    return { success: true, coverage_percentage: result.coverage_percentage || 0, missed_sections: result.missed_sections || [], validation_notes: result.validation_notes || null };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function mergeAndDedupeConditions(allConditions) {
  if (!anthropic) throw new Error('Anthropic API not initialized');

  const uniqueConditions = [];
  const similarityThreshold = 0.85;
  for (const condition of allConditions) {
    const isDuplicate = uniqueConditions.some(existing => similarityRatio(condition.text || '', existing.text || '') >= similarityThreshold);
    if (!isDuplicate) uniqueConditions.push(condition);
  }

  if (uniqueConditions.length < allConditions.length * 0.8 || uniqueConditions.length > 10) {
    const conditionsJson = JSON.stringify(uniqueConditions.map(c => ({ id: c.id, text: c.text?.substring(0, 300), type: c.type, category: c.category, is_mandatory: c.is_mandatory, quantitative: c.quantitative })), null, 2);
    const prompt = MERGE_PROMPT.replace('{all_conditions}', conditionsJson);

    try {
      const response = await anthropic.messages.create({ model: CLAUDE_MODEL, max_tokens: 4096, system: SYSTEM_PROMPT, messages: [{ role: 'user', content: prompt }] });
      const result = extractJsonFromResponse(response.content[0].text);
      return { success: true, merged_conditions: result.merged_conditions || [], removed_conditions: result.removed_conditions || [], merge_summary: result.merge_summary };
    } catch (e) {
      return { success: true, merged_conditions: uniqueConditions, merge_summary: { original_count: allConditions.length, final_count: uniqueConditions.length }, note: 'AI merge failed' };
    }
  }

  return { success: true, merged_conditions: uniqueConditions, merge_summary: { original_count: allConditions.length, final_count: uniqueConditions.length } };
}

async function saveExtractedConditions(tenderId, conditions) {
  if (!supabase) throw new Error('Supabase not initialized');

  const savedConditions = [];
  const errors = [];

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    const record = {
      id: condition.id || randomUUID(),
      tender_id: tenderId,
      condition_number: i + 1,
      condition_text: condition.text,
      requirement_type: condition.category || 'OTHER',
      is_mandatory: condition.is_mandatory !== false,
      ai_confidence: condition.confidence || 0.8,
      source_quote: condition.source_quote || condition.text?.substring(0, 200),
      ai_analyzed_at: new Date().toISOString(),
      extracted_by: 'gate-extractor-http'
    };
    if (condition.quantitative) {
      if (condition.quantitative.amount) record.required_amount = condition.quantitative.amount;
      if (condition.quantitative.years) record.required_years = condition.quantitative.years;
      if (condition.quantitative.count) record.required_count = condition.quantitative.count;
    }

    const { data, error } = await supabase.from('gate_conditions').upsert(record, { onConflict: 'id' }).select().single();
    if (error) errors.push({ i, error: error.message });
    else savedConditions.push(data);
  }

  await supabase.from('tenders').update({ gates_extracted: true, gates_extraction_date: new Date().toISOString(), gates_count: savedConditions.length }).eq('id', tenderId);

  return { success: errors.length === 0, tender_id: tenderId, saved_count: savedConditions.length, errors: errors.length > 0 ? errors : undefined };
}

// ============================================
// HTTP SERVER
// ============================================

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // Health check
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Only accept POST for tool endpoints
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Parse body
  let body = '';
  for await (const chunk of req) body += chunk;
  let params;
  try {
    params = JSON.parse(body);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  initClients();

  try {
    let result;

    switch (path) {
      case '/mcp/gate-extractor/chunk_document':
        result = await chunkDocument(params.text, params.chunk_size, params.overlap);
        break;

      case '/mcp/gate-extractor/extract_gates_from_chunk':
        result = await extractGatesFromChunk(params.chunk_text, params.tender_id, params.existing_conditions);
        break;

      case '/mcp/gate-extractor/validate_extraction_coverage':
        result = await validateExtractionCoverage(params.document_text, params.extracted_conditions);
        break;

      case '/mcp/gate-extractor/merge_and_dedupe_conditions':
        result = await mergeAndDedupeConditions(params.all_conditions);
        break;

      case '/mcp/gate-extractor/save_extracted_conditions':
        result = await saveExtractedConditions(params.tender_id, params.conditions);
        break;

      default:
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Unknown endpoint: ${path}` }));
        return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));

  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Gate Extractor HTTP Server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /mcp/gate-extractor/chunk_document');
  console.log('  POST /mcp/gate-extractor/extract_gates_from_chunk');
  console.log('  POST /mcp/gate-extractor/validate_extraction_coverage');
  console.log('  POST /mcp/gate-extractor/merge_and_dedupe_conditions');
  console.log('  POST /mcp/gate-extractor/save_extracted_conditions');
  console.log('  GET  /health');
});
