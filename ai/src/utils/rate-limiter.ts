/**
 * Rate Limiter Utility
 *
 * Manages API rate limits for various LLM providers:
 * - Token bucket algorithm
 * - Request queuing
 * - Automatic retry with backoff
 * - Provider-specific limits
 */

import pLimit from 'p-limit';

// Default rate limits by provider
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  openai: {
    requestsPerMinute: 500,
    tokensPerMinute: 90000,
    maxConcurrent: 10,
  },
  anthropic: {
    requestsPerMinute: 50,
    tokensPerMinute: 100000,
    maxConcurrent: 5,
  },
  default: {
    requestsPerMinute: 60,
    tokensPerMinute: 50000,
    maxConcurrent: 5,
  },
};

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  maxConcurrent: number;
}

export interface RateLimiterOptions {
  provider: string;
  config?: Partial<RateLimitConfig>;
  onRateLimit?: (waitMs: number) => void;
}

/**
 * Token Bucket Rate Limiter
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(cost: number = 1): Promise<void> {
    this.refill();

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return;
    }

    // Wait for enough tokens
    const waitTime = ((cost - this.tokens) / this.refillRate) * 1000;
    await sleep(waitTime);
    this.refill();
    this.tokens -= cost;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

/**
 * Rate Limiter for API calls
 */
export class RateLimiter {
  private requestBucket: TokenBucket;
  private tokenBucket: TokenBucket;
  private concurrencyLimiter: ReturnType<typeof pLimit>;
  private config: RateLimitConfig;
  private onRateLimit?: (waitMs: number) => void;

  constructor(options: RateLimiterOptions) {
    const defaultConfig = DEFAULT_LIMITS[options.provider] || DEFAULT_LIMITS['default'];
    this.config = { ...defaultConfig, ...options.config };
    this.onRateLimit = options.onRateLimit;

    // Request rate limiter (requests per minute → requests per second)
    this.requestBucket = new TokenBucket(
      this.config.requestsPerMinute,
      this.config.requestsPerMinute / 60
    );

    // Token rate limiter (tokens per minute → tokens per second)
    this.tokenBucket = new TokenBucket(
      this.config.tokensPerMinute,
      this.config.tokensPerMinute / 60
    );

    // Concurrency limiter
    this.concurrencyLimiter = pLimit(this.config.maxConcurrent);
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(
    fn: () => Promise<T>,
    estimatedTokens: number = 1000
  ): Promise<T> {
    return this.concurrencyLimiter(async () => {
      // Acquire request slot
      await this.requestBucket.acquire(1);

      // Acquire token budget
      await this.tokenBucket.acquire(estimatedTokens);

      return fn();
    });
  }

  /**
   * Execute with automatic retry on rate limit errors
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: {
      estimatedTokens?: number;
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
    } = {}
  ): Promise<T> {
    const {
      estimatedTokens = 1000,
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 60000,
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(fn, estimatedTokens);
      } catch (error) {
        lastError = error as Error;

        // Check if it's a rate limit error
        if (isRateLimitError(error)) {
          const waitMs = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          this.onRateLimit?.(waitMs);
          await sleep(waitMs);
          continue;
        }

        // Other errors - don't retry
        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    availableRequests: number;
    availableTokens: number;
    config: RateLimitConfig;
  } {
    return {
      availableRequests: this.requestBucket.getAvailableTokens(),
      availableTokens: this.tokenBucket.getAvailableTokens(),
      config: this.config,
    };
  }
}

/**
 * Check if an error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('429') ||
      message.includes('quota')
    );
  }
  return false;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Global rate limiters by provider
 */
const globalLimiters = new Map<string, RateLimiter>();

/**
 * Get or create a rate limiter for a provider
 */
export function getRateLimiter(provider: string, config?: Partial<RateLimitConfig>): RateLimiter {
  const key = `${provider}-${JSON.stringify(config || {})}`;

  if (!globalLimiters.has(key)) {
    globalLimiters.set(key, new RateLimiter({ provider, config }));
  }

  return globalLimiters.get(key)!;
}

/**
 * Batch processor with rate limiting
 */
export class BatchProcessor<T, R> {
  private rateLimiter: RateLimiter;

  constructor(
    private processor: (item: T) => Promise<R>,
    options: RateLimiterOptions
  ) {
    this.rateLimiter = new RateLimiter(options);
  }

  /**
   * Process items in batches with rate limiting
   */
  async processBatch(
    items: T[],
    options: {
      estimatedTokensPerItem?: number;
      onProgress?: (completed: number, total: number) => void;
      onError?: (item: T, error: Error) => void;
    } = {}
  ): Promise<Array<{ item: T; result?: R; error?: Error }>> {
    const { estimatedTokensPerItem = 500, onProgress, onError } = options;
    const results: Array<{ item: T; result?: R; error?: Error }> = [];
    let completed = 0;

    const promises = items.map(async (item) => {
      try {
        const result = await this.rateLimiter.executeWithRetry(
          () => this.processor(item),
          { estimatedTokens: estimatedTokensPerItem }
        );
        results.push({ item, result });
      } catch (error) {
        const err = error as Error;
        onError?.(item, err);
        results.push({ item, error: err });
      } finally {
        completed++;
        onProgress?.(completed, items.length);
      }
    });

    await Promise.all(promises);
    return results;
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = () => true,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries && shouldRetry(lastError)) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
