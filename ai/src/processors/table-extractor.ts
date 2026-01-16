/**
 * Table Extractor
 *
 * Extract tables from various document formats:
 * - Text-based tables (ASCII, Unicode)
 * - Structured data detection
 * - BOQ (Bill of Quantities) parsing
 * - Hebrew table handling
 */

import type { ExtractedTable, TableExtractionResult } from '../types';

export interface TableExtractionOptions {
  minRows?: number;
  minColumns?: number;
  detectHeaders?: boolean;
  normalizeNumbers?: boolean;
  preserveFormatting?: boolean;
}

export interface BOQItem {
  itemNumber: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  chapter?: string;
}

const DEFAULT_OPTIONS: TableExtractionOptions = {
  minRows: 2,
  minColumns: 2,
  detectHeaders: true,
  normalizeNumbers: true,
  preserveFormatting: false,
};

// Common table delimiters
const DELIMITERS = {
  pipe: '|',
  tab: '\t',
  comma: ',',
  semicolon: ';',
};

// Hebrew column headers for BOQ
const BOQ_HEADERS = {
  itemNumber: ['מס\'', 'מס׳', 'סעיף', '#', 'פריט', 'מק"ט'],
  description: ['תיאור', 'פירוט', 'שם הפריט', 'תאור'],
  unit: ['יחידה', 'יח\'', 'יח׳', 'מידה'],
  quantity: ['כמות', 'כמ\'', 'כמ׳'],
  unitPrice: ['מחיר יחידה', 'מחיר ליחידה', 'מחיר'],
  totalPrice: ['סה"כ', 'סך הכל', 'סכום', 'סה״כ'],
};

/**
 * Table Extractor
 */
export class TableExtractor {
  private options: TableExtractionOptions;

  constructor(options?: Partial<TableExtractionOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Extract all tables from text
   */
  extract(text: string): TableExtractionResult {
    const tables: ExtractedTable[] = [];
    let confidence = 0;

    // Try different extraction methods
    const methods = [
      () => this.extractPipeTables(text),
      () => this.extractTabTables(text),
      () => this.extractASCIITables(text),
      () => this.extractAlignedTables(text),
    ];

    for (const method of methods) {
      const result = method();
      if (result.length > 0) {
        tables.push(...result);
      }
    }

    // Remove duplicates and filter by size
    const uniqueTables = this.deduplicateTables(tables);
    const filteredTables = uniqueTables.filter(
      t => t.rows.length >= this.options.minRows! &&
           t.headers.length >= this.options.minColumns!
    );

    // Calculate confidence
    confidence = this.calculateConfidence(filteredTables, text);

    return { tables: filteredTables, confidence };
  }

  /**
   * Extract BOQ items specifically
   */
  extractBOQ(text: string): BOQItem[] {
    const result = this.extract(text);
    const boqItems: BOQItem[] = [];

    for (const table of result.tables) {
      const items = this.parseBOQTable(table);
      boqItems.push(...items);
    }

    return boqItems;
  }

  /**
   * Extract pipe-delimited tables
   */
  private extractPipeTables(text: string): ExtractedTable[] {
    const tables: ExtractedTable[] = [];
    const lines = text.split('\n');

    let currentTable: string[][] = [];
    let tableStart = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes('|') && line.split('|').length >= 2) {
        if (tableStart === -1) tableStart = i;

        const cells = line
          .split('|')
          .map(cell => cell.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1 || arr.length === 2);

        if (cells.length >= this.options.minColumns! - 1) {
          // Skip separator lines
          if (!cells.every(c => /^[-:=]+$/.test(c))) {
            currentTable.push(cells);
          }
        }
      } else if (currentTable.length > 0) {
        // End of table
        if (currentTable.length >= this.options.minRows!) {
          tables.push(this.createTable(currentTable, tableStart));
        }
        currentTable = [];
        tableStart = -1;
      }
    }

    // Handle table at end of text
    if (currentTable.length >= this.options.minRows!) {
      tables.push(this.createTable(currentTable, tableStart));
    }

    return tables;
  }

  /**
   * Extract tab-delimited tables
   */
  private extractTabTables(text: string): ExtractedTable[] {
    const tables: ExtractedTable[] = [];
    const lines = text.split('\n');

    let currentTable: string[][] = [];
    let tableStart = -1;
    let columnCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cells = line.split('\t').map(c => c.trim());

      if (cells.length >= this.options.minColumns!) {
        if (currentTable.length === 0) {
          tableStart = i;
          columnCount = cells.length;
        }

        // Check if consistent column count
        if (Math.abs(cells.length - columnCount) <= 1) {
          currentTable.push(cells);
        } else if (currentTable.length >= this.options.minRows!) {
          tables.push(this.createTable(currentTable, tableStart));
          currentTable = [cells];
          tableStart = i;
          columnCount = cells.length;
        }
      } else if (currentTable.length > 0) {
        if (currentTable.length >= this.options.minRows!) {
          tables.push(this.createTable(currentTable, tableStart));
        }
        currentTable = [];
        tableStart = -1;
      }
    }

    if (currentTable.length >= this.options.minRows!) {
      tables.push(this.createTable(currentTable, tableStart));
    }

    return tables;
  }

  /**
   * Extract ASCII box tables
   */
  private extractASCIITables(text: string): ExtractedTable[] {
    const tables: ExtractedTable[] = [];

    // Pattern for ASCII table rows
    const rowPattern = /[+┌┬┐├┼┤└┴┘─│|]+/g;
    const sections = text.split(rowPattern);

    let currentTable: string[][] = [];
    let tableStart = 0;

    for (const section of sections) {
      const lines = section.split('\n').filter(l => l.trim().length > 0);

      for (const line of lines) {
        // Extract cells from line
        const cells = line
          .split(/[│|]/)
          .map(c => c.trim())
          .filter(c => c.length > 0);

        if (cells.length >= this.options.minColumns!) {
          currentTable.push(cells);
        }
      }
    }

    if (currentTable.length >= this.options.minRows!) {
      tables.push(this.createTable(currentTable, tableStart));
    }

    return tables;
  }

  /**
   * Extract tables from aligned text (whitespace-delimited)
   */
  private extractAlignedTables(text: string): ExtractedTable[] {
    const tables: ExtractedTable[] = [];
    const lines = text.split('\n');

    // Find lines with similar spacing patterns
    let currentTable: string[][] = [];
    let tableStart = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for multiple whitespace-separated columns
      const cells = line.split(/\s{2,}/).map(c => c.trim()).filter(c => c.length > 0);

      if (cells.length >= this.options.minColumns!) {
        if (tableStart === -1) tableStart = i;
        currentTable.push(cells);
      } else if (currentTable.length > 0) {
        if (currentTable.length >= this.options.minRows!) {
          // Verify consistent column count
          const columnCounts = currentTable.map(r => r.length);
          const modeCount = this.mode(columnCounts);

          if (modeCount >= this.options.minColumns!) {
            const normalizedTable = currentTable.filter(r => r.length === modeCount);
            if (normalizedTable.length >= this.options.minRows!) {
              tables.push(this.createTable(normalizedTable, tableStart));
            }
          }
        }
        currentTable = [];
        tableStart = -1;
      }
    }

    return tables;
  }

  /**
   * Create table object from rows
   */
  private createTable(rows: string[][], startLine: number): ExtractedTable {
    let headers: string[] = [];
    let dataRows: string[][] = rows;

    if (this.options.detectHeaders && rows.length > 0) {
      // Check if first row looks like headers
      const firstRow = rows[0];
      const isHeader = firstRow.some(cell =>
        this.isHeaderCell(cell) ||
        Object.values(BOQ_HEADERS).flat().some(h =>
          cell.includes(h) || h.includes(cell)
        )
      );

      if (isHeader) {
        headers = firstRow;
        dataRows = rows.slice(1);
      } else {
        // Generate generic headers
        headers = firstRow.map((_, i) => `עמודה ${i + 1}`);
      }
    }

    // Normalize numbers if requested
    if (this.options.normalizeNumbers) {
      dataRows = dataRows.map(row =>
        row.map(cell => this.normalizeNumber(cell))
      );
    }

    return {
      id: `table-${startLine}`,
      headers,
      rows: dataRows,
      sourcePage: Math.floor(startLine / 50) + 1, // Estimate page
    };
  }

  /**
   * Parse BOQ table into structured items
   */
  private parseBOQTable(table: ExtractedTable): BOQItem[] {
    const items: BOQItem[] = [];

    // Map headers to BOQ fields
    const headerMapping = new Map<number, keyof BOQItem>();

    table.headers.forEach((header, index) => {
      const normalizedHeader = header.trim().toLowerCase();

      for (const [field, patterns] of Object.entries(BOQ_HEADERS)) {
        if (patterns.some(p => normalizedHeader.includes(p.toLowerCase()))) {
          headerMapping.set(index, field as keyof BOQItem);
          break;
        }
      }
    });

    // Parse each row
    for (const row of table.rows) {
      const item: Partial<BOQItem> = {};

      headerMapping.forEach((field, index) => {
        const value = row[index]?.trim();
        if (!value) return;

        switch (field) {
          case 'itemNumber':
            item.itemNumber = value;
            break;
          case 'description':
            item.description = value;
            break;
          case 'unit':
            item.unit = value;
            break;
          case 'quantity':
            item.quantity = this.parseNumber(value);
            break;
          case 'unitPrice':
            item.unitPrice = this.parseNumber(value);
            break;
          case 'totalPrice':
            item.totalPrice = this.parseNumber(value);
            break;
        }
      });

      // Only add if has minimum required fields
      if (item.description && (item.quantity !== undefined || item.itemNumber)) {
        items.push(item as BOQItem);
      }
    }

    return items;
  }

  /**
   * Check if cell looks like a header
   */
  private isHeaderCell(cell: string): boolean {
    // Headers are usually short, no numbers, and may be bold/uppercase
    return (
      cell.length < 30 &&
      !/^\d+$/.test(cell) &&
      !/^[\d,\.]+$/.test(cell)
    );
  }

  /**
   * Normalize number string
   */
  private normalizeNumber(cell: string): string {
    // If it looks like a number, normalize it
    const cleaned = cell.replace(/[,\s]/g, '');
    if (/^-?[\d\.]+$/.test(cleaned)) {
      return cleaned;
    }
    return cell;
  }

  /**
   * Parse number from string
   */
  private parseNumber(str: string): number {
    const cleaned = str.replace(/[,\s₪$€]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Deduplicate tables
   */
  private deduplicateTables(tables: ExtractedTable[]): ExtractedTable[] {
    const seen = new Set<string>();
    return tables.filter(table => {
      const key = JSON.stringify(table.rows.slice(0, 3));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate extraction confidence
   */
  private calculateConfidence(tables: ExtractedTable[], text: string): number {
    if (tables.length === 0) return 0;

    let confidence = 0.5;

    // More tables = higher confidence
    confidence += Math.min(0.2, tables.length * 0.05);

    // Consistent column counts = higher confidence
    const consistentTables = tables.filter(t =>
      t.rows.every(r => r.length === t.headers.length)
    ).length;
    confidence += (consistentTables / tables.length) * 0.2;

    // Headers detected = higher confidence
    const tablesWithHeaders = tables.filter(t => t.headers.length > 0).length;
    confidence += (tablesWithHeaders / tables.length) * 0.1;

    return Math.min(1, confidence);
  }

  /**
   * Get mode (most frequent value) of array
   */
  private mode(arr: number[]): number {
    const counts = new Map<number, number>();
    for (const val of arr) {
      counts.set(val, (counts.get(val) || 0) + 1);
    }
    let maxCount = 0;
    let mode = arr[0];
    for (const [val, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mode = val;
      }
    }
    return mode;
  }
}

/**
 * Quick table extraction
 */
export function extractTables(
  text: string,
  options?: Partial<TableExtractionOptions>
): TableExtractionResult {
  const extractor = new TableExtractor(options);
  return extractor.extract(text);
}

/**
 * Quick BOQ extraction
 */
export function extractBOQ(text: string): BOQItem[] {
  const extractor = new TableExtractor();
  return extractor.extractBOQ(text);
}
