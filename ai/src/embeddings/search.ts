/**
 * Semantic Search
 *
 * Search documents using semantic similarity:
 * - Vector similarity search
 * - Hybrid search (semantic + keyword)
 * - Reranking
 * - Filtering
 */

import type { DocumentIndexer, IndexedChunk } from './indexer';

export interface SearchResult {
  chunk: IndexedChunk;
  score: number;
  documentId: string;
  highlights?: string[];
}

export interface SearchOptions {
  topK?: number;
  threshold?: number;
  filters?: SearchFilter[];
  rerank?: boolean;
  hybridWeight?: number; // 0 = pure semantic, 1 = pure keyword
}

export interface SearchFilter {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'contains' | 'gt' | 'lt';
  value: unknown;
}

export interface AggregatedSearchResult {
  query: string;
  results: SearchResult[];
  documents: DocumentSearchResult[];
  totalChunks: number;
  searchTime: number;
}

export interface DocumentSearchResult {
  documentId: string;
  topScore: number;
  averageScore: number;
  matchingChunks: number;
  metadata: Record<string, unknown>;
}

const DEFAULT_OPTIONS: SearchOptions = {
  topK: 10,
  threshold: 0.5,
  rerank: false,
  hybridWeight: 0,
};

/**
 * Semantic Search Engine
 */
export class SemanticSearch {
  private indexer: DocumentIndexer;

  constructor(indexer: DocumentIndexer) {
    this.indexer = indexer;
  }

  /**
   * Search for similar chunks
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    // Get query embedding
    const queryEmbedding = await this.indexer.embedQuery(query);

    // Get all chunks
    const chunks = this.indexer.getAllChunks();

    // Calculate similarities
    let results: SearchResult[] = chunks.map(chunk => ({
      chunk,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
      documentId: chunk.documentId,
    }));

    // Apply filters
    if (opts.filters && opts.filters.length > 0) {
      results = this.applyFilters(results, opts.filters);
    }

    // Hybrid search: combine with keyword matching
    if (opts.hybridWeight && opts.hybridWeight > 0) {
      results = this.hybridSearch(results, query, opts.hybridWeight);
    }

    // Filter by threshold
    results = results.filter(r => r.score >= opts.threshold!);

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Take top K
    results = results.slice(0, opts.topK);

    // Rerank if enabled
    if (opts.rerank) {
      results = this.rerank(results, query);
    }

    // Add highlights
    results = results.map(r => ({
      ...r,
      highlights: this.extractHighlights(r.chunk.text, query),
    }));

    return results;
  }

  /**
   * Search with document-level aggregation
   */
  async searchDocuments(query: string, options?: SearchOptions): Promise<AggregatedSearchResult> {
    const startTime = Date.now();
    const results = await this.search(query, { ...options, topK: (options?.topK || 10) * 3 });

    // Aggregate by document
    const documentMap = new Map<string, {
      scores: number[];
      chunks: SearchResult[];
      metadata: Record<string, unknown>;
    }>();

    for (const result of results) {
      const doc = this.indexer.getDocument(result.documentId);
      if (!documentMap.has(result.documentId)) {
        documentMap.set(result.documentId, {
          scores: [],
          chunks: [],
          metadata: doc?.metadata || {},
        });
      }
      const entry = documentMap.get(result.documentId)!;
      entry.scores.push(result.score);
      entry.chunks.push(result);
    }

    // Build document results
    const documents: DocumentSearchResult[] = Array.from(documentMap.entries())
      .map(([documentId, data]) => ({
        documentId,
        topScore: Math.max(...data.scores),
        averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        matchingChunks: data.chunks.length,
        metadata: data.metadata,
      }))
      .sort((a, b) => b.topScore - a.topScore)
      .slice(0, options?.topK || 10);

    // Get final chunk results (top chunks from top documents)
    const topDocIds = new Set(documents.map(d => d.documentId));
    const finalResults = results
      .filter(r => topDocIds.has(r.documentId))
      .slice(0, options?.topK || 10);

    return {
      query,
      results: finalResults,
      documents,
      totalChunks: results.length,
      searchTime: Date.now() - startTime,
    };
  }

  /**
   * Find similar documents
   */
  async findSimilar(documentId: string, options?: SearchOptions): Promise<DocumentSearchResult[]> {
    const doc = this.indexer.getDocument(documentId);
    if (!doc || doc.chunks.length === 0) {
      return [];
    }

    // Use first chunk as representative
    const representativeChunk = doc.chunks[0];
    const queryEmbedding = representativeChunk.embedding;

    // Get all chunks from OTHER documents
    const allChunks = this.indexer.getAllChunks()
      .filter(c => c.documentId !== documentId);

    // Calculate similarities
    const results = allChunks.map(chunk => ({
      chunk,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding),
      documentId: chunk.documentId,
    }));

    // Aggregate by document
    const documentMap = new Map<string, number[]>();
    for (const result of results) {
      if (!documentMap.has(result.documentId)) {
        documentMap.set(result.documentId, []);
      }
      documentMap.get(result.documentId)!.push(result.score);
    }

    // Build document results
    const documents: DocumentSearchResult[] = Array.from(documentMap.entries())
      .map(([docId, scores]) => {
        const docData = this.indexer.getDocument(docId);
        return {
          documentId: docId,
          topScore: Math.max(...scores),
          averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
          matchingChunks: scores.length,
          metadata: docData?.metadata || {},
        };
      })
      .filter(d => d.topScore >= (options?.threshold || 0.5))
      .sort((a, b) => b.topScore - a.topScore)
      .slice(0, options?.topK || 5);

    return documents;
  }

  /**
   * Cosine similarity between vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }

  /**
   * Apply filters to results
   */
  private applyFilters(results: SearchResult[], filters: SearchFilter[]): SearchResult[] {
    return results.filter(result => {
      const doc = this.indexer.getDocument(result.documentId);
      if (!doc) return false;

      for (const filter of filters) {
        const value = doc.metadata[filter.field];

        switch (filter.operator) {
          case 'eq':
            if (value !== filter.value) return false;
            break;
          case 'ne':
            if (value === filter.value) return false;
            break;
          case 'in':
            if (!Array.isArray(filter.value) || !filter.value.includes(value)) return false;
            break;
          case 'contains':
            if (typeof value !== 'string' || !value.includes(String(filter.value))) return false;
            break;
          case 'gt':
            if (typeof value !== 'number' || value <= (filter.value as number)) return false;
            break;
          case 'lt':
            if (typeof value !== 'number' || value >= (filter.value as number)) return false;
            break;
        }
      }

      return true;
    });
  }

  /**
   * Hybrid search combining semantic and keyword
   */
  private hybridSearch(
    results: SearchResult[],
    query: string,
    keywordWeight: number
  ): SearchResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/);

    return results.map(result => {
      // Calculate keyword score
      const text = result.chunk.text.toLowerCase();
      let keywordScore = 0;

      for (const term of queryTerms) {
        if (text.includes(term)) {
          keywordScore += 1 / queryTerms.length;
        }
      }

      // Combine scores
      const combinedScore =
        (1 - keywordWeight) * result.score +
        keywordWeight * keywordScore;

      return {
        ...result,
        score: combinedScore,
      };
    });
  }

  /**
   * Rerank results using additional signals
   */
  private rerank(results: SearchResult[], query: string): SearchResult[] {
    const queryTerms = query.toLowerCase().split(/\s+/);

    return results
      .map(result => {
        let boost = 0;
        const text = result.chunk.text.toLowerCase();

        // Boost for exact phrase match
        if (text.includes(query.toLowerCase())) {
          boost += 0.1;
        }

        // Boost for term density
        const termCount = queryTerms.filter(t => text.includes(t)).length;
        boost += (termCount / queryTerms.length) * 0.05;

        // Boost for shorter chunks (more focused)
        if (result.chunk.text.length < 300) {
          boost += 0.02;
        }

        return {
          ...result,
          score: Math.min(1, result.score + boost),
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Extract highlights from text
   */
  private extractHighlights(text: string, query: string): string[] {
    const highlights: string[] = [];
    const queryTerms = query.toLowerCase().split(/\s+/);
    const sentences = text.split(/[.!?]/);

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      const matchCount = queryTerms.filter(t => lowerSentence.includes(t)).length;

      if (matchCount >= queryTerms.length * 0.5) {
        highlights.push(sentence.trim());
      }
    }

    return highlights.slice(0, 3);
  }
}

/**
 * Question answering using search
 */
export class QASearch {
  private search: SemanticSearch;

  constructor(indexer: DocumentIndexer) {
    this.search = new SemanticSearch(indexer);
  }

  /**
   * Find answer context for a question
   */
  async findContext(question: string, options?: SearchOptions): Promise<{
    context: string;
    sources: Array<{ documentId: string; text: string; score: number }>;
  }> {
    const results = await this.search.search(question, {
      ...options,
      topK: 5,
      threshold: 0.4,
    });

    // Build context from top results
    const contextParts: string[] = [];
    const sources: Array<{ documentId: string; text: string; score: number }> = [];

    for (const result of results) {
      contextParts.push(result.chunk.text);
      sources.push({
        documentId: result.documentId,
        text: result.chunk.text.substring(0, 200) + '...',
        score: result.score,
      });
    }

    return {
      context: contextParts.join('\n\n---\n\n'),
      sources,
    };
  }

  /**
   * Search with Hebrew query expansion
   */
  async searchHebrew(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    // Simple Hebrew query expansion
    const expandedTerms: string[] = [query];

    // Add common variations
    const variations: Record<string, string[]> = {
      'תנאי סף': ['דרישות סף', 'תנאים מוקדמים'],
      'מכרז': ['מכרז פומבי', 'מכרז סגור', 'הליך תחרותי'],
      'הצעה': ['הצעת מחיר', 'הגשה'],
      'ערבות': ['ערבות בנקאית', 'ערבות הצעה', 'ערבות ביצוע'],
      'ניסיון': ['ניסיון קודם', 'רקורד'],
    };

    for (const [term, variants] of Object.entries(variations)) {
      if (query.includes(term)) {
        expandedTerms.push(...variants);
      }
    }

    // Search with all variations and combine results
    const allResults: SearchResult[] = [];

    for (const term of expandedTerms) {
      const results = await this.search.search(term, {
        ...options,
        topK: Math.ceil((options?.topK || 10) / expandedTerms.length),
      });
      allResults.push(...results);
    }

    // Deduplicate and sort
    const seen = new Set<string>();
    const uniqueResults = allResults.filter(r => {
      if (seen.has(r.chunk.id)) return false;
      seen.add(r.chunk.id);
      return true;
    });

    return uniqueResults
      .sort((a, b) => b.score - a.score)
      .slice(0, options?.topK || 10);
  }
}

/**
 * Create a semantic search instance
 */
export function createSearch(indexer: DocumentIndexer): SemanticSearch {
  return new SemanticSearch(indexer);
}

/**
 * Create a QA search instance
 */
export function createQASearch(indexer: DocumentIndexer): QASearch {
  return new QASearch(indexer);
}
