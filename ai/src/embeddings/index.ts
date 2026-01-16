/**
 * Embeddings Module
 *
 * Export all embedding-related functionality
 */

// Indexer
export {
  DocumentIndexer,
  EmbeddingProvider,
  OpenAIEmbeddingProvider,
  LocalEmbeddingProvider,
  IndexedDocument,
  IndexedChunk,
  IndexerConfig,
  IndexStats,
  createOpenAIIndexer,
  createLocalIndexer,
} from './indexer';

// Search
export {
  SemanticSearch,
  QASearch,
  SearchResult,
  SearchOptions,
  SearchFilter,
  AggregatedSearchResult,
  DocumentSearchResult,
  createSearch,
  createQASearch,
} from './search';

// Storage
export {
  VectorStorage,
  InMemoryStorage,
  FileStorage,
  SupabaseVectorStorage,
  createStorage,
} from './storage';
