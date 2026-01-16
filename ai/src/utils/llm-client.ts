/**
 * Unified LLM Client
 *
 * Provides a consistent interface for multiple LLM providers:
 * - OpenAI (GPT-4, GPT-3.5)
 * - Anthropic (Claude 3)
 * - Local models (Ollama, vLLM)
 *
 * Features:
 * - Automatic rate limiting
 * - Token counting
 * - Retry logic
 * - Streaming support
 */

import type { LLMConfig, LLMMessage, LLMResponse } from '../types';
import { countTokens, countMessageTokens, getContextSize } from './token-counter';
import { getRateLimiter } from './rate-limiter';

export interface LLMClientOptions extends LLMConfig {
  timeout?: number;
  maxRetries?: number;
}

export interface CompletionOptions {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  responseFormat?: 'text' | 'json';
}

export interface StreamingOptions extends CompletionOptions {
  onToken?: (token: string) => void;
  onComplete?: (response: LLMResponse) => void;
}

/**
 * Unified LLM Client
 */
export class LLMClient {
  private config: LLMClientOptions;
  private rateLimiter;

  constructor(config: LLMClientOptions) {
    this.config = {
      timeout: 60000,
      maxRetries: 3,
      maxTokens: 4096,
      temperature: 0.7,
      ...config,
    };

    this.rateLimiter = getRateLimiter(config.provider);
  }

  /**
   * Generate completion
   */
  async complete(options: CompletionOptions): Promise<LLMResponse> {
    const estimatedTokens = countMessageTokens(options.messages, this.config.model);

    return this.rateLimiter.executeWithRetry(
      async () => {
        switch (this.config.provider) {
          case 'openai':
            return this.completeOpenAI(options);
          case 'anthropic':
            return this.completeAnthropic(options);
          case 'local':
            return this.completeLocal(options);
          default:
            throw new Error(`Unknown provider: ${this.config.provider}`);
        }
      },
      { estimatedTokens }
    );
  }

  /**
   * Generate completion with streaming
   */
  async stream(options: StreamingOptions): Promise<LLMResponse> {
    switch (this.config.provider) {
      case 'openai':
        return this.streamOpenAI(options);
      case 'anthropic':
        return this.streamAnthropic(options);
      default:
        // Fallback to non-streaming for unsupported providers
        const response = await this.complete(options);
        options.onComplete?.(response);
        return response;
    }
  }

  /**
   * Simple text completion (single prompt)
   */
  async generateText(
    prompt: string,
    systemPrompt?: string,
    options?: Partial<CompletionOptions>
  ): Promise<string> {
    const messages: LLMMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.complete({ messages, ...options });
    return response.content;
  }

  /**
   * JSON completion with validation
   */
  async generateJSON<T>(
    prompt: string,
    systemPrompt?: string,
    options?: Partial<CompletionOptions>
  ): Promise<T> {
    const jsonSystemPrompt = (systemPrompt || '') +
      '\n\nYou must respond with valid JSON only. No markdown, no explanations.';

    const response = await this.generateText(prompt, jsonSystemPrompt, {
      ...options,
      responseFormat: 'json',
    });

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try {
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${response}`);
    }
  }

  /**
   * Check if text fits in context
   */
  fitsInContext(text: string): boolean {
    const contextSize = getContextSize(this.config.model);
    const tokens = countTokens(text, this.config.model);
    return tokens < contextSize * 0.9; // Leave 10% buffer
  }

  // ==================== Provider Implementations ====================

  private async completeOpenAI(options: CompletionOptions): Promise<LLMResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: options.messages,
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature ?? this.config.temperature,
        top_p: options.topP,
        stop: options.stopSequences,
        response_format: options.responseFormat === 'json'
          ? { type: 'json_object' }
          : undefined,
      }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    interface OpenAIResponse {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      model: string;
    }
    const data = await response.json() as OpenAIResponse;

    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: data.model,
      finishReason: data.choices[0].finish_reason,
    };
  }

  private async completeAnthropic(options: CompletionOptions): Promise<LLMResponse> {
    // Extract system message
    const systemMessage = options.messages.find(m => m.role === 'system');
    const otherMessages = options.messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: options.maxTokens || this.config.maxTokens,
        system: systemMessage?.content,
        messages: otherMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? this.config.temperature,
        top_p: options.topP,
        stop_sequences: options.stopSequences,
      }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    interface AnthropicResponse {
      content: Array<{ text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
      model: string;
      stop_reason: string;
    }
    const data = await response.json() as AnthropicResponse;

    return {
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      model: data.model,
      finishReason: data.stop_reason,
    };
  }

  private async completeLocal(options: CompletionOptions): Promise<LLMResponse> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: options.messages,
        stream: false,
        options: {
          temperature: options.temperature ?? this.config.temperature,
          top_p: options.topP,
          num_predict: options.maxTokens || this.config.maxTokens,
          stop: options.stopSequences,
        },
      }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Local API error: ${response.status} - ${error}`);
    }

    interface LocalResponse {
      message: { content: string };
      model: string;
    }
    const data = await response.json() as LocalResponse;

    return {
      content: data.message.content,
      model: data.model,
      finishReason: 'stop',
    };
  }

  private async streamOpenAI(options: StreamingOptions): Promise<LLMResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: options.messages,
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature ?? this.config.temperature,
        stream: true,
      }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices[0]?.delta?.content || '';
          if (token) {
            content += token;
            options.onToken?.(token);
          }
        } catch {
          // Ignore parse errors for incomplete chunks
        }
      }
    }

    const result: LLMResponse = {
      content,
      model: this.config.model,
      finishReason: 'stop',
    };

    options.onComplete?.(result);
    return result;
  }

  private async streamAnthropic(options: StreamingOptions): Promise<LLMResponse> {
    const systemMessage = options.messages.find(m => m.role === 'system');
    const otherMessages = options.messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: options.maxTokens || this.config.maxTokens,
        system: systemMessage?.content,
        messages: otherMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? this.config.temperature,
        stream: true,
      }),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content_block_delta') {
            const token = data.delta?.text || '';
            if (token) {
              content += token;
              options.onToken?.(token);
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    const result: LLMResponse = {
      content,
      model: this.config.model,
      finishReason: 'stop',
    };

    options.onComplete?.(result);
    return result;
  }
}

/**
 * Create a pre-configured client for common providers
 */
export function createOpenAIClient(apiKey: string, model: string = 'gpt-4o'): LLMClient {
  return new LLMClient({
    provider: 'openai',
    model,
    apiKey,
  });
}

export function createAnthropicClient(apiKey: string, model: string = 'claude-3-5-sonnet-20241022'): LLMClient {
  return new LLMClient({
    provider: 'anthropic',
    model,
    apiKey,
  });
}

export function createLocalClient(model: string = 'llama3', baseUrl: string = 'http://localhost:11434'): LLMClient {
  return new LLMClient({
    provider: 'local',
    model,
    baseUrl,
  });
}
