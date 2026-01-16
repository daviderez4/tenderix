/**
 * Vector Storage
 *
 * Storage backends for embeddings:
 * - In-memory storage
 * - File-based storage
 * - Supabase pgvector integration
 */

// Declare browser globals for TypeScript (when in Node environment)
declare const window: (typeof globalThis & { localStorage?: { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void } }) | undefined;
declare const localStorage: { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void } | undefined;

import type { IndexedDocument, IndexedChunk } from './indexer';

export interface VectorStorage {
  name: string;
  save(documents: IndexedDocument[]): Promise<void>;
  load(): Promise<IndexedDocument[]>;
  addDocument(document: IndexedDocument): Promise<void>;
  removeDocument(documentId: string): Promise<boolean>;
  getDocument(documentId: string): Promise<IndexedDocument | null>;
  searchByVector(vector: number[], topK: number): Promise<Array<{ chunk: IndexedChunk; score: number }>>;
  clear(): Promise<void>;
}

/**
 * In-Memory Storage
 */
export class InMemoryStorage implements VectorStorage {
  name = 'memory';
  private documents: Map<string, IndexedDocument> = new Map();
  private chunkIndex: Map<string, IndexedChunk> = new Map();

  async save(documents: IndexedDocument[]): Promise<void> {
    this.documents.clear();
    this.chunkIndex.clear();
    for (const doc of documents) {
      await this.addDocument(doc);
    }
  }

  async load(): Promise<IndexedDocument[]> {
    return Array.from(this.documents.values());
  }

  async addDocument(document: IndexedDocument): Promise<void> {
    this.documents.set(document.id, document);
    for (const chunk of document.chunks) {
      this.chunkIndex.set(chunk.id, chunk);
    }
  }

  async removeDocument(documentId: string): Promise<boolean> {
    const doc = this.documents.get(documentId);
    if (!doc) return false;

    for (const chunk of doc.chunks) {
      this.chunkIndex.delete(chunk.id);
    }
    return this.documents.delete(documentId);
  }

  async getDocument(documentId: string): Promise<IndexedDocument | null> {
    return this.documents.get(documentId) || null;
  }

  async searchByVector(vector: number[], topK: number): Promise<Array<{ chunk: IndexedChunk; score: number }>> {
    const results: Array<{ chunk: IndexedChunk; score: number }> = [];

    for (const chunk of this.chunkIndex.values()) {
      const score = this.cosineSimilarity(vector, chunk.embedding);
      results.push({ chunk, score });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async clear(): Promise<void> {
    this.documents.clear();
    this.chunkIndex.clear();
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}

/**
 * File-Based Storage (JSON)
 */
export class FileStorage implements VectorStorage {
  name = 'file';
  private filePath: string;
  private documents: Map<string, IndexedDocument> = new Map();
  private loaded = false;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async save(documents: IndexedDocument[]): Promise<void> {
    this.documents.clear();
    for (const doc of documents) {
      this.documents.set(doc.id, doc);
    }
    await this.persist();
  }

  async load(): Promise<IndexedDocument[]> {
    if (this.loaded) {
      return Array.from(this.documents.values());
    }

    try {
      // In browser environment, use localStorage
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const data = localStorage.getItem(this.filePath);
        if (data) {
          const parsed = JSON.parse(data) as IndexedDocument[];
          for (const doc of parsed) {
            this.documents.set(doc.id, doc);
          }
        }
      }
      // In Node.js, would use fs
      this.loaded = true;
    } catch (error) {
      console.error('Failed to load storage:', error);
    }

    return Array.from(this.documents.values());
  }

  async addDocument(document: IndexedDocument): Promise<void> {
    await this.load();
    this.documents.set(document.id, document);
    await this.persist();
  }

  async removeDocument(documentId: string): Promise<boolean> {
    await this.load();
    const result = this.documents.delete(documentId);
    if (result) {
      await this.persist();
    }
    return result;
  }

  async getDocument(documentId: string): Promise<IndexedDocument | null> {
    await this.load();
    return this.documents.get(documentId) || null;
  }

  async searchByVector(vector: number[], topK: number): Promise<Array<{ chunk: IndexedChunk; score: number }>> {
    await this.load();
    const results: Array<{ chunk: IndexedChunk; score: number }> = [];

    for (const doc of this.documents.values()) {
      for (const chunk of doc.chunks) {
        const score = this.cosineSimilarity(vector, chunk.embedding);
        results.push({ chunk, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async clear(): Promise<void> {
    this.documents.clear();
    await this.persist();
  }

  private async persist(): Promise<void> {
    try {
      const data = JSON.stringify(Array.from(this.documents.values()));
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(this.filePath, data);
      }
    } catch (error) {
      console.error('Failed to persist storage:', error);
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}

/**
 * Supabase pgvector Storage
 */
export class SupabaseVectorStorage implements VectorStorage {
  name = 'supabase';
  private supabaseUrl: string;
  private supabaseKey: string;
  private tableName: string;

  constructor(supabaseUrl: string, supabaseKey: string, tableName: string = 'document_embeddings') {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.tableName = tableName;
  }

  private async fetch(path: string, options?: RequestInit): Promise<Response> {
    return fetch(`${this.supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: {
        'apikey': this.supabaseKey,
        'Authorization': `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...options?.headers,
      },
    });
  }

  async save(documents: IndexedDocument[]): Promise<void> {
    // Clear existing and save all
    await this.clear();
    for (const doc of documents) {
      await this.addDocument(doc);
    }
  }

  async load(): Promise<IndexedDocument[]> {
    const response = await this.fetch(`${this.tableName}?select=*`);
    if (!response.ok) {
      throw new Error(`Failed to load: ${response.statusText}`);
    }

    const rows = await response.json() as Array<Record<string, unknown>>;

    // Group by document
    const docMap = new Map<string, IndexedDocument>();

    for (const row of rows) {
      const docId = row.document_id as string;
      if (!docMap.has(docId)) {
        docMap.set(docId, {
          id: docId,
          tenderId: row.tender_id as string | undefined,
          filename: row.filename as string | undefined,
          chunks: [],
          metadata: (row.metadata as Record<string, unknown>) || {},
          indexedAt: new Date(row.created_at as string),
        });
      }

      docMap.get(docId)!.chunks.push({
        id: row.id as string,
        documentId: docId,
        text: row.content as string,
        embedding: row.embedding as number[],
        metadata: (row.chunk_metadata as Record<string, unknown>) || {},
      });
    }

    return Array.from(docMap.values());
  }

  async addDocument(document: IndexedDocument): Promise<void> {
    const rows = document.chunks.map(chunk => ({
      id: chunk.id,
      document_id: document.id,
      tender_id: document.tenderId,
      filename: document.filename,
      content: chunk.text,
      embedding: chunk.embedding,
      metadata: document.metadata,
      chunk_metadata: chunk.metadata,
    }));

    const response = await this.fetch(this.tableName, {
      method: 'POST',
      body: JSON.stringify(rows),
    });

    if (!response.ok) {
      throw new Error(`Failed to add document: ${response.statusText}`);
    }
  }

  async removeDocument(documentId: string): Promise<boolean> {
    const response = await this.fetch(
      `${this.tableName}?document_id=eq.${documentId}`,
      { method: 'DELETE' }
    );
    return response.ok;
  }

  async getDocument(documentId: string): Promise<IndexedDocument | null> {
    const response = await this.fetch(
      `${this.tableName}?document_id=eq.${documentId}`
    );

    if (!response.ok) return null;

    const rows = await response.json() as Array<Record<string, unknown>>;
    if (rows.length === 0) return null;

    const chunks: IndexedChunk[] = rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      documentId: row.document_id as string,
      text: row.content as string,
      embedding: row.embedding as number[],
      metadata: (row.chunk_metadata as Record<string, unknown>) || {},
    }));

    return {
      id: documentId,
      tenderId: rows[0].tender_id as string | undefined,
      filename: rows[0].filename as string | undefined,
      chunks,
      metadata: (rows[0].metadata as Record<string, unknown>) || {},
      indexedAt: new Date(rows[0].created_at as string),
    };
  }

  async searchByVector(vector: number[], topK: number): Promise<Array<{ chunk: IndexedChunk; score: number }>> {
    // Use Supabase RPC for vector similarity search
    const response = await this.fetch('rpc/match_documents', {
      method: 'POST',
      body: JSON.stringify({
        query_embedding: vector,
        match_threshold: 0.5,
        match_count: topK,
      }),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const results = await response.json() as Array<Record<string, unknown>>;
    return results.map((row: Record<string, unknown>) => ({
      chunk: {
        id: row.id as string,
        documentId: row.document_id as string,
        text: row.content as string,
        embedding: row.embedding as number[],
        metadata: (row.chunk_metadata as Record<string, unknown>) || {},
      },
      score: row.similarity as number,
    }));
  }

  async clear(): Promise<void> {
    await this.fetch(this.tableName, { method: 'DELETE' });
  }
}

/**
 * Create storage instance
 */
export function createStorage(
  type: 'memory' | 'file' | 'supabase',
  config?: {
    filePath?: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    tableName?: string;
  }
): VectorStorage {
  switch (type) {
    case 'memory':
      return new InMemoryStorage();
    case 'file':
      return new FileStorage(config?.filePath || 'embeddings.json');
    case 'supabase':
      if (!config?.supabaseUrl || !config?.supabaseKey) {
        throw new Error('Supabase URL and key required');
      }
      return new SupabaseVectorStorage(
        config.supabaseUrl,
        config.supabaseKey,
        config.tableName
      );
    default:
      return new InMemoryStorage();
  }
}
