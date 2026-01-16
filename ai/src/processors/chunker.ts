/**
 * Smart Text Chunker
 *
 * Intelligent document chunking for LLM processing:
 * - Respects document structure (sections, paragraphs)
 * - Handles Hebrew text properly
 * - Maintains context with overlapping chunks
 * - Preserves semantic coherence
 */

import type { DocumentChunk, ChunkingOptions } from '../types';
import { countTokens } from '../utils/token-counter';
import { detectSectionHeaders, splitSentences } from '../utils/hebrew-nlp';

const DEFAULT_OPTIONS: ChunkingOptions = {
  maxTokens: 4000,
  overlap: 200,
  preserveSentences: true,
  preserveParagraphs: true,
  preserveSections: true,
};

export interface ChunkResult {
  chunks: DocumentChunk[];
  metadata: {
    totalChunks: number;
    averageTokens: number;
    maxTokens: number;
    minTokens: number;
  };
}

/**
 * Smart document chunker
 */
export class DocumentChunker {
  private options: ChunkingOptions;
  private model: string;

  constructor(options?: Partial<ChunkingOptions>, model: string = 'default') {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.model = model;
  }

  /**
   * Chunk a document intelligently
   */
  chunk(text: string, documentId: string): ChunkResult {
    if (this.options.preserveSections) {
      return this.chunkBySections(text, documentId);
    } else if (this.options.preserveParagraphs) {
      return this.chunkByParagraphs(text, documentId);
    } else {
      return this.chunkByTokens(text, documentId);
    }
  }

  /**
   * Chunk by document sections
   */
  private chunkBySections(text: string, documentId: string): ChunkResult {
    const sections = this.splitIntoSections(text);
    const chunks: DocumentChunk[] = [];
    let index = 0;

    for (const section of sections) {
      const sectionChunks = this.processSection(section, documentId, index);
      chunks.push(...sectionChunks);
      index += sectionChunks.length;
    }

    // Add overlap between chunks
    this.addOverlap(chunks);

    return this.buildResult(chunks);
  }

  /**
   * Chunk by paragraphs
   */
  private chunkByParagraphs(text: string, documentId: string): ChunkResult {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let index = 0;

    for (const paragraph of paragraphs) {
      const combinedTokens = countTokens(currentChunk + '\n\n' + paragraph, this.model);

      if (combinedTokens > this.options.maxTokens && currentChunk.length > 0) {
        // Save current chunk and start new one
        chunks.push(this.createChunk(currentChunk, documentId, index++));
        currentChunk = paragraph;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
      }
    }

    // Add remaining content
    if (currentChunk.length > 0) {
      chunks.push(this.createChunk(currentChunk, documentId, index));
    }

    this.addOverlap(chunks);
    return this.buildResult(chunks);
  }

  /**
   * Simple token-based chunking
   */
  private chunkByTokens(text: string, documentId: string): ChunkResult {
    const chunks: DocumentChunk[] = [];
    let index = 0;
    let start = 0;

    while (start < text.length) {
      // Estimate characters for token limit
      const estimatedChars = this.options.maxTokens * 4; // ~4 chars per token
      let end = Math.min(start + estimatedChars, text.length);

      // Adjust to token limit
      while (countTokens(text.slice(start, end), this.model) > this.options.maxTokens && end > start + 100) {
        end -= 100;
      }

      // Try to end at a sentence or word boundary
      if (end < text.length) {
        const slice = text.slice(start, end + 100);
        const lastSentence = slice.lastIndexOf('.');
        const lastSpace = slice.lastIndexOf(' ');

        if (lastSentence > slice.length * 0.7) {
          end = start + lastSentence + 1;
        } else if (lastSpace > slice.length * 0.8) {
          end = start + lastSpace;
        }
      }

      chunks.push(this.createChunk(text.slice(start, end), documentId, index++));
      start = end - this.options.overlap * 4; // Overlap in chars
    }

    return this.buildResult(chunks);
  }

  /**
   * Split text into logical sections
   */
  private splitIntoSections(text: string): string[] {
    const headers = detectSectionHeaders(text);
    const sections: string[] = [];

    if (headers.length === 0) {
      return [text];
    }

    for (let i = 0; i < headers.length; i++) {
      const start = headers[i].position;
      const end = i < headers.length - 1 ? headers[i + 1].position : text.length;
      sections.push(text.slice(start, end).trim());
    }

    // Add any content before the first header
    if (headers[0].position > 0) {
      sections.unshift(text.slice(0, headers[0].position).trim());
    }

    return sections.filter(s => s.length > 0);
  }

  /**
   * Process a section into chunks
   */
  private processSection(section: string, documentId: string, startIndex: number): DocumentChunk[] {
    const sectionTokens = countTokens(section, this.model);

    if (sectionTokens <= this.options.maxTokens) {
      return [this.createChunk(section, documentId, startIndex)];
    }

    // Section is too large, split by paragraphs
    const result = this.chunkByParagraphs(section, documentId);

    // Re-index chunks
    return result.chunks.map((chunk, i) => ({
      ...chunk,
      index: startIndex + i,
    }));
  }

  /**
   * Add overlap between consecutive chunks
   */
  private addOverlap(chunks: DocumentChunk[]): void {
    if (this.options.overlap <= 0 || chunks.length < 2) return;

    for (let i = 1; i < chunks.length; i++) {
      const prevContent = chunks[i - 1].content;
      const overlapTokens = this.options.overlap;

      // Get last N tokens worth of text from previous chunk
      const sentences = splitSentences(prevContent);
      let overlapText = '';
      let currentTokens = 0;

      for (let j = sentences.length - 1; j >= 0; j--) {
        const sentenceTokens = countTokens(sentences[j], this.model);
        if (currentTokens + sentenceTokens > overlapTokens) break;
        overlapText = sentences[j] + ' ' + overlapText;
        currentTokens += sentenceTokens;
      }

      if (overlapText.trim()) {
        chunks[i].content = '[...] ' + overlapText.trim() + '\n\n' + chunks[i].content;
        chunks[i].tokenCount = countTokens(chunks[i].content, this.model);
      }
    }
  }

  /**
   * Create a chunk object
   */
  private createChunk(content: string, documentId: string, index: number): DocumentChunk {
    return {
      id: `${documentId}-chunk-${index}`,
      documentId,
      content: content.trim(),
      index,
      tokenCount: countTokens(content, this.model),
    };
  }

  /**
   * Build result with metadata
   */
  private buildResult(chunks: DocumentChunk[]): ChunkResult {
    const tokenCounts = chunks.map(c => c.tokenCount);

    return {
      chunks,
      metadata: {
        totalChunks: chunks.length,
        averageTokens: Math.round(tokenCounts.reduce((a, b) => a + b, 0) / chunks.length),
        maxTokens: Math.max(...tokenCounts),
        minTokens: Math.min(...tokenCounts),
      },
    };
  }
}

/**
 * Convenience function for quick chunking
 */
export function chunkText(
  text: string,
  documentId: string = 'doc',
  options?: Partial<ChunkingOptions>
): DocumentChunk[] {
  const chunker = new DocumentChunker(options);
  return chunker.chunk(text, documentId).chunks;
}

/**
 * Chunk multiple documents
 */
export function chunkDocuments(
  documents: Array<{ id: string; content: string }>,
  options?: Partial<ChunkingOptions>
): Map<string, DocumentChunk[]> {
  const chunker = new DocumentChunker(options);
  const result = new Map<string, DocumentChunk[]>();

  for (const doc of documents) {
    result.set(doc.id, chunker.chunk(doc.content, doc.id).chunks);
  }

  return result;
}

/**
 * Rechunk if a chunk is too large
 */
export function rechunkIfNeeded(
  chunk: DocumentChunk,
  maxTokens: number,
  model: string = 'default'
): DocumentChunk[] {
  if (chunk.tokenCount <= maxTokens) {
    return [chunk];
  }

  const chunker = new DocumentChunker({ maxTokens }, model);
  return chunker.chunk(chunk.content, chunk.documentId).chunks;
}
