/**
 * Document Indexer
 *
 * Index documents for semantic search:
 * - Generate embeddings
 * - Chunk and vectorize
 * - Build searchable index
 * - Support incremental updates
 */

import type { DocumentChunk } from '../types';
import { DocumentChunker } from '../processors/chunker';

export interface EmbeddingProvider {
  name: string;
  dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
  embedSingle(text: string): Promise<number[]>;
}

export interface IndexedDocument {
  id: string;
  tenderId?: string;
  filename?: string;
  chunks: IndexedChunk[];
  metadata: Record<string, unknown>;
  indexedAt: Date;
}

export interface IndexedChunkMetadata {
  chunkIndex: number;
  startPosition: number;
  endPosition: number;
  sectionTitle?: string;
  [key: string]: unknown;
}

export interface IndexedChunk {
  id: string;
  documentId: string;
  text: string;
  embedding: number[];
  metadata: IndexedChunkMetadata | Record<string, unknown>;
}

export interface IndexerConfig {
  chunkSize?: number;
  chunkOverlap?: number;
  batchSize?: number;
  provider?: EmbeddingProvider;
}

export interface IndexStats {
  totalDocuments: number;
  totalChunks: number;
  dimensions: number;
  lastUpdated: Date;
}

const DEFAULT_CONFIG: IndexerConfig = {
  chunkSize: 500,
  chunkOverlap: 50,
  batchSize: 20,
};

/**
 * OpenAI Embedding Provider
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  dimensions = 1536; // text-embedding-ada-002
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'text-embedding-ada-002') {
    this.apiKey = apiKey;
    this.model = model;

    // Update dimensions based on model
    if (model.includes('3-small')) {
      this.dimensions = 1536;
    } else if (model.includes('3-large')) {
      this.dimensions = 3072;
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embedding error: ${response.statusText}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return data.data.map((item) => item.embedding);
  }

  async embedSingle(text: string): Promise<number[]> {
    const results = await this.embed([text]);
    return results[0];
  }
}

/**
 * Local/Mock Embedding Provider (for development)
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  name = 'local';
  dimensions = 384;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(text => this.simpleEmbed(text));
  }

  async embedSingle(text: string): Promise<number[]> {
    return this.simpleEmbed(text);
  }

  /**
   * Simple hash-based embedding (for development only)
   */
  private simpleEmbed(text: string): number[] {
    const embedding = new Array(this.dimensions).fill(0);
    const words = text.toLowerCase().split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j);
        const index = (charCode * (i + 1) * (j + 1)) % this.dimensions;
        embedding[index] += 1 / (1 + Math.log(1 + words.length));
      }
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }
}

/**
 * Document Indexer
 */
export class DocumentIndexer {
  private config: IndexerConfig;
  private provider: EmbeddingProvider;
  private chunker: DocumentChunker;
  private documents: Map<string, IndexedDocument> = new Map();

  constructor(config?: IndexerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.provider = config?.provider || new LocalEmbeddingProvider();
    this.chunker = new DocumentChunker({
      maxTokens: this.config.chunkSize,
      overlap: this.config.chunkOverlap,
    });
  }

  /**
   * Set embedding provider
   */
  setProvider(provider: EmbeddingProvider): void {
    this.provider = provider;
  }

  /**
   * Index a document
   */
  async indexDocument(
    documentId: string,
    text: string,
    metadata?: Record<string, unknown>
  ): Promise<IndexedDocument> {
    // Chunk the document
    const chunkResult = this.chunker.chunk(text, documentId);
    const chunks = chunkResult.chunks;

    // Generate embeddings in batches
    const indexedChunks: IndexedChunk[] = [];

    for (let i = 0; i < chunks.length; i += this.config.batchSize!) {
      const batch = chunks.slice(i, i + this.config.batchSize!);
      const texts = batch.map(c => c.content);
      const embeddings = await this.provider.embed(texts);

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        indexedChunks.push({
          id: `${documentId}-chunk-${i + j}`,
          documentId,
          text: chunk.content,
          embedding: embeddings[j],
          metadata: {
            chunkIndex: i + j,
            startPosition: chunk.metadata?.startPosition as number || 0,
            endPosition: chunk.metadata?.endPosition as number || 0,
            sectionTitle: chunk.metadata?.sectionTitle as string | undefined,
          },
        });
      }
    }

    const indexedDoc: IndexedDocument = {
      id: documentId,
      tenderId: metadata?.tenderId as string,
      filename: metadata?.filename as string,
      chunks: indexedChunks,
      metadata: metadata || {},
      indexedAt: new Date(),
    };

    this.documents.set(documentId, indexedDoc);

    return indexedDoc;
  }

  /**
   * Index multiple documents
   */
  async indexDocuments(
    documents: Array<{ id: string; text: string; metadata?: Record<string, unknown> }>
  ): Promise<IndexedDocument[]> {
    const results: IndexedDocument[] = [];

    for (const doc of documents) {
      const indexed = await this.indexDocument(doc.id, doc.text, doc.metadata);
      results.push(indexed);
    }

    return results;
  }

  /**
   * Remove document from index
   */
  removeDocument(documentId: string): boolean {
    return this.documents.delete(documentId);
  }

  /**
   * Get document by ID
   */
  getDocument(documentId: string): IndexedDocument | undefined {
    return this.documents.get(documentId);
  }

  /**
   * Get all chunks for search
   */
  getAllChunks(): IndexedChunk[] {
    const allChunks: IndexedChunk[] = [];
    for (const doc of this.documents.values()) {
      allChunks.push(...doc.chunks);
    }
    return allChunks;
  }

  /**
   * Get index statistics
   */
  getStats(): IndexStats {
    let totalChunks = 0;
    let lastUpdated = new Date(0);

    for (const doc of this.documents.values()) {
      totalChunks += doc.chunks.length;
      if (doc.indexedAt > lastUpdated) {
        lastUpdated = doc.indexedAt;
      }
    }

    return {
      totalDocuments: this.documents.size,
      totalChunks,
      dimensions: this.provider.dimensions,
      lastUpdated,
    };
  }

  /**
   * Export index to JSON
   */
  exportIndex(): string {
    const data = {
      documents: Array.from(this.documents.entries()),
      stats: this.getStats(),
    };
    return JSON.stringify(data);
  }

  /**
   * Import index from JSON
   */
  importIndex(json: string): void {
    const data = JSON.parse(json);
    this.documents = new Map(data.documents);
  }

  /**
   * Get embedding for query
   */
  async embedQuery(query: string): Promise<number[]> {
    return this.provider.embedSingle(query);
  }

  /**
   * Get provider info
   */
  getProviderInfo(): { name: string; dimensions: number } {
    return {
      name: this.provider.name,
      dimensions: this.provider.dimensions,
    };
  }
}

/**
 * Create an indexer with OpenAI
 */
export function createOpenAIIndexer(apiKey: string, model?: string): DocumentIndexer {
  const provider = new OpenAIEmbeddingProvider(apiKey, model);
  return new DocumentIndexer({ provider });
}

/**
 * Create a local indexer (for development)
 */
export function createLocalIndexer(): DocumentIndexer {
  return new DocumentIndexer({ provider: new LocalEmbeddingProvider() });
}
