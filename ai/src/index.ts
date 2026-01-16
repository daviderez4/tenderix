/**
 * Tenderix AI Infrastructure
 *
 * Comprehensive AI toolkit for tender document analysis:
 * - Agents: Multi-agent orchestration for complex workflows
 * - Prompts: Structured Hebrew prompt templates
 * - Processors: Document chunking, OCR, table extraction
 * - Embeddings: Semantic search and indexing
 * - Utils: Hebrew NLP, token counting, rate limiting
 */

// Types (export first, as base types)
export type {
  LLMProvider,
  LLMConfig,
  LLMMessage,
  LLMResponse,
  LLMGenerateOptions,
  LLMClient,
  Document,
  DocumentType,
  DocumentMetadata,
  DocumentChunk,
  TenderMetadata,
  GateCondition,
  TenderDefinition,
  TenderAnalysis,
  AgentContext,
  AgentResult,
  ChunkingOptions,
  OCROptions,
  TableExtractionResult,
  ExtractedTable,
  EmbeddingConfig,
} from './types';

export { TenderMetadataSchema } from './types';

// Agents
export {
  BaseAgent,
  SimpleAgent,
  type AgentConfig,
  type AgentTool,
  type ToolParameter,
  type AgentState,
  type AgentEvent,
  type AgentEventType,
  type AgentEventHandler,
} from './agents/base-agent';

export {
  AgentOrchestrator,
  runTenderPipeline,
  type OrchestratorConfig,
  type PipelineStep,
  type PipelineContext,
  type PipelineResult,
  type StepResult,
  type ComprehensiveAnalysis,
} from './agents/orchestrator';

export {
  TenderAnalyzerAgent,
  analyzeTender,
  type TenderAnalyzerConfig,
} from './agents/tender-analyzer';

export {
  GateExtractorAgent,
  extractGates,
  matchGates,
  type GateExtractionResult,
  type CompanyAssets,
  type GateMatchResult,
} from './agents/gate-extractor';

export {
  DocumentClassifierAgent,
  classifyDocument,
  classifyDocuments,
  type DocumentType as ClassifierDocumentType,
  type DocumentClassification,
  type DocumentStructure,
  type DocumentSection,
  type DocumentQuality,
} from './agents/document-classifier';

// Prompts
export * from './prompts/templates';
export * from './prompts/hebrew';
export * from './prompts/extraction';
export * from './prompts/analysis';

// Processors
export * from './processors/chunker';
export * from './processors/ocr-enhancer';
export * from './processors/pdf-extractor';
export * from './processors/table-extractor';

// Embeddings
export {
  DocumentIndexer,
  OpenAIEmbeddingProvider,
  LocalEmbeddingProvider,
  createOpenAIIndexer,
  createLocalIndexer,
  type EmbeddingProvider,
  type IndexedDocument,
  type IndexedChunk,
  type IndexerConfig,
  type IndexStats,
} from './embeddings/indexer';

export {
  SemanticSearch,
  QASearch,
  createSearch,
  createQASearch,
  type SearchResult as EmbeddingSearchResult,
  type SearchOptions as EmbeddingSearchOptions,
  type SearchFilter,
  type AggregatedSearchResult,
  type DocumentSearchResult,
} from './embeddings/search';

export {
  InMemoryStorage,
  FileStorage,
  SupabaseVectorStorage,
  createStorage,
  type VectorStorage,
} from './embeddings/storage';

// Utils
export * from './utils/hebrew-nlp';
export * from './utils/token-counter';
export * from './utils/rate-limiter';
export {
  LLMClient as LLMClientImpl,
  createOpenAIClient,
  createAnthropicClient,
  createLocalClient,
} from './utils/llm-client';
