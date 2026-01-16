/**
 * OCR Text Enhancer
 *
 * Post-processing for OCR output:
 * - Fix common OCR errors
 * - Hebrew-specific corrections
 * - Layout reconstruction
 * - Confidence scoring
 */

import { normalizeHebrew, containsHebrew } from '../utils/hebrew-nlp';

export interface OCREnhancerOptions {
  fixHebrewErrors?: boolean;
  fixCommonErrors?: boolean;
  mergeHyphenated?: boolean;
  fixSpacing?: boolean;
  removeNoise?: boolean;
}

export interface EnhancementResult {
  text: string;
  corrections: OCRCorrection[];
  confidence: number;
  stats: OCRStats;
}

export interface OCRCorrection {
  original: string;
  corrected: string;
  type: 'hebrew' | 'common' | 'spacing' | 'noise';
  position: number;
}

export interface OCRStats {
  totalCorrections: number;
  hebrewCorrections: number;
  confidenceFactors: Record<string, number>;
}

const DEFAULT_OPTIONS: OCREnhancerOptions = {
  fixHebrewErrors: true,
  fixCommonErrors: true,
  mergeHyphenated: true,
  fixSpacing: true,
  removeNoise: true,
};

// Common OCR errors for Hebrew characters
const HEBREW_OCR_FIXES: Array<[RegExp, string]> = [
  // Similar-looking letters
  [/[ר](?=[יו])/g, 'ד'], // ר often misread as ד before י/ו
  [/ו{2,}/g, 'ו'], // Multiple vavs
  [/י{3,}/g, 'יי'], // Too many yods
  [/נו([^א-ת])/g, 'נו$1'], // Final nun issues

  // Common word fixes
  [/מכדז/g, 'מכרז'], // Common OCR error for מכרז
  [/תגאי/g, 'תנאי'], // Common OCR error for תנאי
  [/סעיו/g, 'סעיף'], // Common OCR error for סעיף
  [/הגשד/g, 'הגשה'], // Common OCR error for הגשה

  // Letter confusions
  [/([א-ת])l([א-ת])/g, '$1ו$2'], // l misread as vav
  [/([א-ת])1([א-ת])/g, '$1ו$2'], // 1 misread as vav
  [/([א-ת])I([א-ת])/g, '$1ו$2'], // I misread as vav
];

// Common OCR errors for Latin characters in Hebrew context
const COMMON_OCR_FIXES: Array<[RegExp, string]> = [
  [/0/g, 'O'], // Zero vs O - context dependent
  [/l(?=[a-z])/g, 'I'], // lowercase l vs I
  [/rn/g, 'm'], // rn misread as m
  [/vv/g, 'w'], // vv misread as w
  [/c1/g, 'd'], // c1 misread as d
  [/[«»]/g, '"'], // Guillemets to quotes
  [/['']/g, "'"], // Smart quotes
  [/[""]/g, '"'], // Smart double quotes
];

// Noise patterns to remove
const NOISE_PATTERNS: RegExp[] = [
  /[\x00-\x08\x0B\x0C\x0E-\x1F]/g, // Control characters
  /[^\x00-\x7F\u0590-\u05FF\u200E\u200F\s.,;:!?'"()\[\]{}<>@#$%^&*+=\-_\/\\|~`]/g, // Non-standard chars
  /(\s)\1{3,}/g, // Excessive whitespace
];

/**
 * OCR Text Enhancer
 */
export class OCREnhancer {
  private options: OCREnhancerOptions;

  constructor(options?: Partial<OCREnhancerOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Enhance OCR output
   */
  enhance(text: string): EnhancementResult {
    const corrections: OCRCorrection[] = [];
    let enhancedText = text;
    let position = 0;

    // Remove noise first
    if (this.options.removeNoise) {
      enhancedText = this.removeNoise(enhancedText, corrections);
    }

    // Fix Hebrew-specific errors
    if (this.options.fixHebrewErrors && containsHebrew(enhancedText)) {
      enhancedText = this.fixHebrewErrors(enhancedText, corrections);
    }

    // Fix common OCR errors
    if (this.options.fixCommonErrors) {
      enhancedText = this.fixCommonErrors(enhancedText, corrections);
    }

    // Merge hyphenated words
    if (this.options.mergeHyphenated) {
      enhancedText = this.mergeHyphenated(enhancedText, corrections);
    }

    // Fix spacing issues
    if (this.options.fixSpacing) {
      enhancedText = this.fixSpacing(enhancedText, corrections);
    }

    // Normalize Hebrew
    enhancedText = normalizeHebrew(enhancedText);

    // Calculate confidence
    const confidence = this.calculateConfidence(text, enhancedText, corrections);

    return {
      text: enhancedText,
      corrections,
      confidence,
      stats: {
        totalCorrections: corrections.length,
        hebrewCorrections: corrections.filter(c => c.type === 'hebrew').length,
        confidenceFactors: this.getConfidenceFactors(text, enhancedText),
      },
    };
  }

  /**
   * Remove OCR noise
   */
  private removeNoise(text: string, corrections: OCRCorrection[]): string {
    let result = text;

    for (const pattern of NOISE_PATTERNS) {
      const matches = result.match(pattern);
      if (matches) {
        for (const match of matches) {
          corrections.push({
            original: match,
            corrected: match.length > 1 ? ' ' : '',
            type: 'noise',
            position: result.indexOf(match),
          });
        }
        result = result.replace(pattern, match => match.length > 1 ? ' ' : '');
      }
    }

    return result;
  }

  /**
   * Fix Hebrew-specific OCR errors
   */
  private fixHebrewErrors(text: string, corrections: OCRCorrection[]): string {
    let result = text;

    for (const [pattern, replacement] of HEBREW_OCR_FIXES) {
      const matches = [...result.matchAll(pattern)];
      for (const match of matches) {
        if (match[0] !== replacement) {
          corrections.push({
            original: match[0],
            corrected: replacement,
            type: 'hebrew',
            position: match.index || 0,
          });
        }
      }
      result = result.replace(pattern, replacement);
    }

    return result;
  }

  /**
   * Fix common OCR errors
   */
  private fixCommonErrors(text: string, corrections: OCRCorrection[]): string {
    let result = text;

    for (const [pattern, replacement] of COMMON_OCR_FIXES) {
      const matches = [...result.matchAll(pattern)];
      for (const match of matches) {
        if (match[0] !== replacement) {
          corrections.push({
            original: match[0],
            corrected: replacement,
            type: 'common',
            position: match.index || 0,
          });
        }
      }
      result = result.replace(pattern, replacement);
    }

    return result;
  }

  /**
   * Merge hyphenated words split across lines
   */
  private mergeHyphenated(text: string, corrections: OCRCorrection[]): string {
    // Pattern: word ending with hyphen followed by newline and continuation
    const pattern = /([א-תa-zA-Z]+)-\s*\n\s*([א-תa-zA-Z]+)/g;

    return text.replace(pattern, (match, part1, part2, offset) => {
      const merged = part1 + part2;
      corrections.push({
        original: match,
        corrected: merged,
        type: 'common',
        position: offset,
      });
      return merged;
    });
  }

  /**
   * Fix spacing issues
   */
  private fixSpacing(text: string, corrections: OCRCorrection[]): string {
    let result = text;

    // Fix missing spaces after punctuation
    result = result.replace(/([.!?:;,])([א-תa-zA-Z])/g, '$1 $2');

    // Fix extra spaces before punctuation
    result = result.replace(/\s+([.!?:;,])/g, '$1');

    // Fix multiple spaces
    result = result.replace(/  +/g, ' ');

    // Fix spaces around parentheses
    result = result.replace(/\(\s+/g, '(');
    result = result.replace(/\s+\)/g, ')');

    return result;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(
    original: string,
    enhanced: string,
    corrections: OCRCorrection[]
  ): number {
    const factors = this.getConfidenceFactors(original, enhanced);

    // Weighted average of factors
    const weights = {
      textLength: 0.15,
      hebrewRatio: 0.2,
      correctionRatio: 0.25,
      wordQuality: 0.25,
      structureQuality: 0.15,
    };

    let confidence = 0;
    for (const [factor, weight] of Object.entries(weights)) {
      confidence += (factors[factor] || 0) * weight;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Get individual confidence factors
   */
  private getConfidenceFactors(original: string, enhanced: string): Record<string, number> {
    // Text length factor (longer = more confident)
    const textLength = Math.min(1, enhanced.length / 5000);

    // Hebrew ratio factor
    const hebrewChars = (enhanced.match(/[\u0590-\u05FF]/g) || []).length;
    const totalChars = enhanced.replace(/\s/g, '').length;
    const hebrewRatio = totalChars > 0 ? hebrewChars / totalChars : 0;

    // Correction ratio (fewer corrections = better OCR)
    const correctionRatio = 1 - Math.min(1, (original.length - enhanced.length) / original.length);

    // Word quality (average word length, valid word ratio)
    const words = enhanced.split(/\s+/);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const wordQuality = Math.min(1, avgWordLength / 5);

    // Structure quality (paragraphs, sentences)
    const paragraphs = enhanced.split(/\n\n+/).length;
    const sentences = enhanced.split(/[.!?]+/).length;
    const structureQuality = Math.min(1, (paragraphs + sentences) / 20);

    return {
      textLength,
      hebrewRatio,
      correctionRatio,
      wordQuality,
      structureQuality,
    };
  }
}

/**
 * Quick enhancement function
 */
export function enhanceOCRText(
  text: string,
  options?: Partial<OCREnhancerOptions>
): EnhancementResult {
  const enhancer = new OCREnhancer(options);
  return enhancer.enhance(text);
}

/**
 * Simple enhancement (returns just the text)
 */
export function quickEnhance(text: string): string {
  return enhanceOCRText(text).text;
}
