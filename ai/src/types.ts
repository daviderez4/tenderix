/**
 * Core Types for Tenderix AI Infrastructure
 */

import { z } from 'zod';

// ==================== LLM Types ====================

export type LLMProvider = 'openai' | 'anthropic' | 'local';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

export interface LLMGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: unknown[];
  stopSequences?: string[];
}

export interface LLMClient {
  generate(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMResponse>;
  generateJSON<T>(messages: LLMMessage[], schema?: unknown): Promise<T>;
  stream(messages: LLMMessage[], options?: LLMGenerateOptions): AsyncGenerator<string>;
}

// ==================== Document Types ====================

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  content: string;
  metadata: DocumentMetadata;
  chunks?: DocumentChunk[];
}

export type DocumentType =
  | 'INVITATION'      // הזמנה להציע הצעות
  | 'SPECS'          // מפרט טכני
  | 'BOQ'            // כתב כמויות
  | 'CONTRACT'       // חוזה
  | 'CLARIFICATIONS' // הבהרות
  | 'FORMS'          // טפסים
  | 'APPENDIX'       // נספח
  | 'UNKNOWN';

export interface DocumentMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  pageCount?: number;
  language?: string;
  extractedAt: Date;
  processingTime?: number;
  confidence?: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  startPage?: number;
  endPage?: number;
  tokenCount: number;
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

// ==================== Tender Types ====================

export const TenderMetadataSchema = z.object({
  tenderNumber: z.string().optional(),
  tenderName: z.string(),
  issuingBody: z.string(),
  issuingBodyType: z.enum(['GOVERNMENT', 'MUNICIPAL', 'PUBLIC_COMPANY', 'PRIVATE']).optional(),
  publishDate: z.string().optional(),
  submissionDeadline: z.string().optional(),
  clarificationDeadline: z.string().optional(),
  guaranteeAmount: z.string().optional(),
  guaranteeType: z.enum(['BANK', 'INSURANCE']).optional(),
  contractPeriod: z.string().optional(),
  estimatedValue: z.number().optional(),
  category: z.string().optional(),
  priceWeight: z.number().optional(),
  qualityWeight: z.number().optional(),
});

export type TenderMetadata = z.infer<typeof TenderMetadataSchema>;

export interface GateCondition {
  id: string;
  conditionNumber?: string;
  text: string;
  conditionText?: string;
  conditionType?: 'GATE' | 'ADVANTAGE';
  type?: string;
  isMandatory: boolean;
  requirementType: 'EXPERIENCE' | 'FINANCIAL' | 'CERTIFICATION' | 'PERSONNEL' | 'OTHER' | 'CAPABILITY' | 'EXECUTION';
  entityType?: 'COMPANY' | 'PERSONNEL' | 'PROJECT' | 'CERTIFICATION';
  requiredAmount?: number;
  requiredCount?: number;
  requiredYears?: number;
  canRelyOnSubcontractor?: boolean;
  sourceDocument?: string;
  sourcePage?: number;
  sourceSection?: string;
  confidence: number;
}

export interface TenderDefinition {
  term: string;
  definition: string;
  interpretation?: 'RESTRICTIVE' | 'EXPANSIVE' | 'NEUTRAL';
  sourceDocument?: string;
  sourcePage?: number;
}

export interface TenderAnalysis {
  documentType: string;
  confidence: number;
  metadata: {
    tenderNumber: string | null;
    tenderName: string;
    issuingBody: string;
    publishDate?: string | null;
    submissionDeadline: string | null;
  };
  gateConditions: GateCondition[];
  risks: Array<{
    description: string;
    severity: string;
    category?: string;
  }>;
  recommendation: {
    decision: 'GO' | 'NO_GO' | 'CONDITIONAL' | 'REVIEW';
    confidence: number;
    reasoning: string;
  };
  summary: string;
}

// ==================== Agent Types ====================

export interface AgentConfig {
  name: string;
  description: string;
  llmConfig: LLMConfig;
  systemPrompt?: string;
  tools?: AgentTool[];
  maxRetries?: number;
  timeout?: number;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentContext {
  tenderId: string;
  organizationId: string;
  userId?: string;
  documents?: Document[];
  metadata?: TenderMetadata;
  gateConditions?: GateCondition[];
  definitions?: TenderDefinition[];
  memory?: Map<string, unknown>;
}

export interface AgentResult<T = unknown> {
  success: boolean;
  result?: T;
  data?: T;
  error?: string;
  reasoning?: string;
  confidence: number;
  tokensUsed?: number;
  executionTime?: number;
  metadata?: Record<string, unknown>;
}

// ==================== Processing Types ====================

export interface ChunkingOptions {
  maxTokens: number;
  overlap: number;
  preserveSentences: boolean;
  preserveParagraphs: boolean;
  preserveSections: boolean;
}

export interface OCROptions {
  language: 'heb' | 'eng' | 'heb+eng';
  enhanceContrast: boolean;
  deskew: boolean;
  removeNoise: boolean;
}

export interface TableExtractionResult {
  tables: ExtractedTable[];
  confidence: number;
}

export interface ExtractedTable {
  id: string;
  headers: string[];
  rows: string[][];
  sourcePage: number;
  title?: string;
}

// ==================== Embedding Types ====================

export interface EmbeddingConfig {
  model: string;
  dimensions: number;
  batchSize: number;
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface SearchOptions {
  topK: number;
  minScore: number;
  filter?: Record<string, unknown>;
}
