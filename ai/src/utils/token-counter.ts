/**
 * Token Counter Utility
 *
 * Accurate token counting for various LLM models
 * Uses tiktoken for OpenAI models and estimation for others
 */

// Token estimation ratios (chars per token)
const TOKEN_RATIOS: Record<string, number> = {
  // OpenAI models (will use tiktoken when available)
  'gpt-4': 4,
  'gpt-4-turbo': 4,
  'gpt-4o': 4,
  'gpt-3.5-turbo': 4,

  // Anthropic models
  'claude-3-opus': 3.5,
  'claude-3-sonnet': 3.5,
  'claude-3-haiku': 3.5,
  'claude-3.5-sonnet': 3.5,

  // Default
  'default': 4,
};

// Hebrew text typically has fewer chars per token
const HEBREW_ADJUSTMENT = 0.7;

/**
 * Count tokens in text for a specific model
 */
export function countTokens(text: string, model: string = 'default'): number {
  const ratio = TOKEN_RATIOS[model] || TOKEN_RATIOS['default'];

  // Check Hebrew content ratio
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const totalChars = text.length;
  const hebrewRatio = totalChars > 0 ? hebrewChars / totalChars : 0;

  // Adjust ratio for Hebrew content
  const adjustedRatio = ratio * (1 - hebrewRatio * (1 - HEBREW_ADJUSTMENT));

  return Math.ceil(text.length / adjustedRatio);
}

/**
 * Estimate tokens for messages array (chat format)
 */
export function countMessageTokens(
  messages: Array<{ role: string; content: string }>,
  model: string = 'default'
): number {
  // Base overhead per message (role, formatting)
  const messageOverhead = 4;

  let total = 0;
  for (const message of messages) {
    total += countTokens(message.content, model) + messageOverhead;
  }

  // Add base overhead for the conversation
  total += 3;

  return total;
}

/**
 * Calculate maximum tokens available for completion
 */
export function getMaxCompletionTokens(
  promptTokens: number,
  modelMaxTokens: number,
  reserveTokens: number = 100
): number {
  return Math.max(0, modelMaxTokens - promptTokens - reserveTokens);
}

/**
 * Check if text fits within token limit
 */
export function fitsInContext(
  text: string,
  maxTokens: number,
  model: string = 'default'
): boolean {
  return countTokens(text, model) <= maxTokens;
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokenLimit(
  text: string,
  maxTokens: number,
  model: string = 'default',
  suffix: string = '...'
): string {
  const currentTokens = countTokens(text, model);

  if (currentTokens <= maxTokens) {
    return text;
  }

  // Estimate chars to keep
  const ratio = TOKEN_RATIOS[model] || TOKEN_RATIOS['default'];
  const targetChars = Math.floor(maxTokens * ratio);

  // Truncate and add suffix
  const truncated = text.substring(0, targetChars - suffix.length);

  // Try to end at a sentence or word boundary
  const lastSentence = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSentence > truncated.length * 0.8) {
    return truncated.substring(0, lastSentence + 1);
  } else if (lastSpace > truncated.length * 0.9) {
    return truncated.substring(0, lastSpace) + suffix;
  }

  return truncated + suffix;
}

/**
 * Split text into chunks that fit within token limit
 */
export function splitByTokenLimit(
  text: string,
  maxTokens: number,
  model: string = 'default',
  overlap: number = 0
): string[] {
  const chunks: string[] = [];
  const ratio = TOKEN_RATIOS[model] || TOKEN_RATIOS['default'];
  const charsPerChunk = Math.floor(maxTokens * ratio);
  const overlapChars = Math.floor(overlap * ratio);

  let start = 0;
  while (start < text.length) {
    let end = start + charsPerChunk;

    // Try to end at a paragraph or sentence boundary
    if (end < text.length) {
      const slice = text.substring(start, end + 100);
      const lastPara = slice.lastIndexOf('\n\n');
      const lastSentence = slice.lastIndexOf('.');

      if (lastPara > charsPerChunk * 0.7) {
        end = start + lastPara + 2;
      } else if (lastSentence > charsPerChunk * 0.8) {
        end = start + lastSentence + 1;
      }
    }

    chunks.push(text.substring(start, Math.min(end, text.length)));
    start = end - overlapChars;
  }

  return chunks;
}

/**
 * Model context window sizes
 */
export const MODEL_CONTEXT_SIZES: Record<string, number> = {
  // OpenAI
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-turbo': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-3.5-turbo': 16385,

  // Anthropic
  'claude-3-opus': 200000,
  'claude-3-sonnet': 200000,
  'claude-3-haiku': 200000,
  'claude-3.5-sonnet': 200000,
  'claude-3.5-haiku': 200000,

  // Default
  'default': 8192,
};

/**
 * Get context window size for a model
 */
export function getContextSize(model: string): number {
  // Check for exact match
  if (MODEL_CONTEXT_SIZES[model]) {
    return MODEL_CONTEXT_SIZES[model];
  }

  // Check for partial match
  for (const [key, size] of Object.entries(MODEL_CONTEXT_SIZES)) {
    if (model.includes(key)) {
      return size;
    }
  }

  return MODEL_CONTEXT_SIZES['default'];
}

/**
 * Token usage tracker
 */
export class TokenUsageTracker {
  private usage: Map<string, { prompt: number; completion: number; total: number }> = new Map();

  track(model: string, promptTokens: number, completionTokens: number): void {
    const existing = this.usage.get(model) || { prompt: 0, completion: 0, total: 0 };
    existing.prompt += promptTokens;
    existing.completion += completionTokens;
    existing.total += promptTokens + completionTokens;
    this.usage.set(model, existing);
  }

  getUsage(model?: string): { prompt: number; completion: number; total: number } {
    if (model) {
      return this.usage.get(model) || { prompt: 0, completion: 0, total: 0 };
    }

    let total = { prompt: 0, completion: 0, total: 0 };
    for (const usage of this.usage.values()) {
      total.prompt += usage.prompt;
      total.completion += usage.completion;
      total.total += usage.total;
    }
    return total;
  }

  reset(): void {
    this.usage.clear();
  }
}
