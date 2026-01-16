/**
 * PDF Text Extractor
 *
 * Advanced PDF text extraction with:
 * - Multi-column detection
 * - Table preservation
 * - Header/footer removal
 * - Hebrew RTL handling
 * - Scanned document detection
 */

import type { Document, DocumentMetadata } from '../types';
import { normalizeHebrew, cleanTenderText, getHebrewRatio } from '../utils/hebrew-nlp';

export interface PDFExtractionOptions {
  maxPages?: number;
  removeHeaders?: boolean;
  removeFooters?: boolean;
  preserveTables?: boolean;
  detectColumns?: boolean;
  normalizeText?: boolean;
}

export interface PDFExtractionResult {
  text: string;
  pages: PDFPage[];
  metadata: PDFMetadata;
  isScanned: boolean;
  confidence: number;
}

export interface PDFPage {
  pageNumber: number;
  text: string;
  hasText: boolean;
  hasImages: boolean;
  tables?: string[][];
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
}

const DEFAULT_OPTIONS: PDFExtractionOptions = {
  maxPages: 100,
  removeHeaders: true,
  removeFooters: true,
  preserveTables: true,
  detectColumns: true,
  normalizeText: true,
};

/**
 * PDF Text Extractor
 */
export class PDFExtractor {
  private options: PDFExtractionOptions;

  constructor(options?: Partial<PDFExtractionOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Extract text from PDF buffer
   * Note: This is a simplified implementation for browser/node
   * In production, use pdf-parse or pdfjs-dist
   */
  async extract(pdfBuffer: ArrayBuffer): Promise<PDFExtractionResult> {
    // This would use pdf-parse in Node.js or pdfjs-dist in browser
    // For now, we'll provide the structure and utility methods

    throw new Error(
      'PDF extraction requires pdf-parse (Node) or pdfjs-dist (browser). ' +
      'Use extractFromText() for pre-extracted text.'
    );
  }

  /**
   * Process pre-extracted PDF text
   */
  extractFromText(rawText: string, pageCount: number = 1): PDFExtractionResult {
    const pages = this.splitIntoPages(rawText, pageCount);
    const processedPages = pages.map((text, i) => this.processPage(text, i + 1));

    // Combine text
    let combinedText = processedPages
      .map(p => p.text)
      .filter(t => t.length > 0)
      .join('\n\n');

    // Normalize if requested
    if (this.options.normalizeText) {
      combinedText = cleanTenderText(normalizeHebrew(combinedText));
    }

    // Detect if scanned (low text quality)
    const isScanned = this.detectScannedDocument(combinedText);

    // Calculate confidence
    const confidence = this.calculateConfidence(processedPages, combinedText);

    return {
      text: combinedText,
      pages: processedPages,
      metadata: {
        pageCount,
      },
      isScanned,
      confidence,
    };
  }

  /**
   * Split raw text into pages
   */
  private splitIntoPages(text: string, expectedPages: number): string[] {
    // Try to detect page breaks
    const pageBreakPatterns = [
      /\f/g, // Form feed
      /^-{3,}\s*עמוד\s*\d+\s*-{3,}$/gm, // Hebrew page markers
      /^Page\s+\d+\s*$/gm, // English page markers
      /\n{4,}/g, // Multiple newlines
    ];

    for (const pattern of pageBreakPatterns) {
      const parts = text.split(pattern);
      if (parts.length >= expectedPages * 0.5) {
        return parts.filter(p => p.trim().length > 0);
      }
    }

    // If no clear page breaks, split evenly
    const avgCharsPerPage = text.length / expectedPages;
    const pages: string[] = [];
    let start = 0;

    for (let i = 0; i < expectedPages && start < text.length; i++) {
      let end = start + avgCharsPerPage;

      // Try to end at a paragraph boundary
      const slice = text.slice(start, Math.min(end + 200, text.length));
      const lastPara = slice.lastIndexOf('\n\n');
      if (lastPara > avgCharsPerPage * 0.8) {
        end = start + lastPara + 2;
      }

      pages.push(text.slice(start, Math.min(end, text.length)));
      start = end;
    }

    return pages;
  }

  /**
   * Process a single page
   */
  private processPage(text: string, pageNumber: number): PDFPage {
    let processedText = text;

    // Remove headers if requested
    if (this.options.removeHeaders) {
      processedText = this.removeHeaders(processedText);
    }

    // Remove footers if requested
    if (this.options.removeFooters) {
      processedText = this.removeFooters(processedText);
    }

    // Handle multi-column layout
    if (this.options.detectColumns) {
      processedText = this.handleColumns(processedText);
    }

    // Extract tables if preserving
    const tables: string[][] = [];
    if (this.options.preserveTables) {
      const extracted = this.extractTables(processedText);
      tables.push(...extracted.tables);
      processedText = extracted.textWithoutTables;
    }

    return {
      pageNumber,
      text: processedText.trim(),
      hasText: processedText.trim().length > 50,
      hasImages: false, // Would need actual PDF parsing
      tables: tables.length > 0 ? tables : undefined,
    };
  }

  /**
   * Remove common header patterns
   */
  private removeHeaders(text: string): string {
    const lines = text.split('\n');
    const headerPatterns = [
      /^עמוד\s*\d+/,
      /^page\s*\d+/i,
      /^\d+\s*$/,
      /^מכרז\s*(מס['\.]?)?\s*[\d\/]+$/,
    ];

    // Remove first few lines if they match header patterns
    let startLine = 0;
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].trim();
      if (headerPatterns.some(p => p.test(line)) || line.length < 10) {
        startLine = i + 1;
      } else {
        break;
      }
    }

    return lines.slice(startLine).join('\n');
  }

  /**
   * Remove common footer patterns
   */
  private removeFooters(text: string): string {
    const lines = text.split('\n');
    const footerPatterns = [
      /^עמוד\s*\d+/,
      /^page\s*\d+/i,
      /^\d+\s*$/,
      /^[-_]{3,}$/,
      /^סודי|confidential/i,
    ];

    // Remove last few lines if they match footer patterns
    let endLine = lines.length;
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
      const line = lines[i].trim();
      if (footerPatterns.some(p => p.test(line)) || line.length < 10) {
        endLine = i;
      } else {
        break;
      }
    }

    return lines.slice(0, endLine).join('\n');
  }

  /**
   * Handle multi-column layouts
   */
  private handleColumns(text: string): string {
    // Detect column layout by analyzing line lengths and positions
    const lines = text.split('\n');
    const lineLengths = lines.map(l => l.length);
    const avgLength = lineLengths.reduce((a, b) => a + b, 0) / lines.length;

    // If many lines are short and appear side by side, might be columns
    const shortLines = lineLengths.filter(l => l < avgLength * 0.5).length;

    if (shortLines > lines.length * 0.3) {
      // Possible column layout - try to merge
      // This is a simplified heuristic; real implementation would be more sophisticated
      return lines
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .join(' ')
        .replace(/\s+/g, ' ');
    }

    return text;
  }

  /**
   * Extract tables from text
   */
  private extractTables(text: string): { tables: string[][]; textWithoutTables: string } {
    const tables: string[][] = [];
    let textWithoutTables = text;

    // Simple table detection: lines with consistent delimiters
    const tablePatterns = [
      /\|([^|]+\|)+/g, // Pipe-delimited
      /\t([^\t]+\t)+/g, // Tab-delimited
    ];

    for (const pattern of tablePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length >= 2) {
        const tableRows = matches.map(row =>
          row.split(/[|\t]/).map(cell => cell.trim()).filter(cell => cell.length > 0)
        );
        if (tableRows.length >= 2) {
          tables.push(...tableRows);
          // Remove table from text
          for (const match of matches) {
            textWithoutTables = textWithoutTables.replace(match, '\n[TABLE]\n');
          }
        }
      }
    }

    return { tables, textWithoutTables };
  }

  /**
   * Detect if document is scanned (OCR'd)
   */
  private detectScannedDocument(text: string): boolean {
    // Indicators of scanned documents:
    // 1. High ratio of OCR artifacts
    // 2. Many single-character words
    // 3. Unusual character combinations

    const words = text.split(/\s+/);
    const singleCharWords = words.filter(w => w.length === 1).length;
    const singleCharRatio = singleCharWords / words.length;

    // Check for common OCR errors
    const ocrErrors = (text.match(/[I1l|][I1l|]/g) || []).length;
    const ocrErrorRatio = ocrErrors / text.length;

    return singleCharRatio > 0.15 || ocrErrorRatio > 0.01;
  }

  /**
   * Calculate extraction confidence
   */
  private calculateConfidence(pages: PDFPage[], text: string): number {
    let confidence = 1.0;

    // Reduce confidence for pages without text
    const emptyPages = pages.filter(p => !p.hasText).length;
    confidence -= (emptyPages / pages.length) * 0.3;

    // Reduce confidence for low Hebrew ratio (might be encoding issue)
    const hebrewRatio = getHebrewRatio(text);
    if (hebrewRatio < 0.3 && text.length > 100) {
      confidence -= 0.2;
    }

    // Reduce confidence for very short text
    if (text.length < 500) {
      confidence -= 0.2;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}

/**
 * Quick extraction from text
 */
export function extractPDFText(
  rawText: string,
  pageCount: number = 1,
  options?: Partial<PDFExtractionOptions>
): PDFExtractionResult {
  const extractor = new PDFExtractor(options);
  return extractor.extractFromText(rawText, pageCount);
}
