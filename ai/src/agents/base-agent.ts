/**
 * Base Agent
 *
 * Foundation class for all AI agents with:
 * - State management
 * - Tool execution
 * - Memory and context
 * - Error handling
 */

import type { LLMClient, LLMMessage, AgentContext, AgentResult } from '../types';

export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  maxIterations?: number;
  temperature?: number;
  tools?: AgentTool[];
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute: (params: Record<string, unknown>, context: AgentContext) => Promise<unknown>;
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface AgentState {
  status: 'idle' | 'running' | 'completed' | 'error';
  currentStep: number;
  totalSteps: number;
  messages: LLMMessage[];
  results: unknown[];
  errors: Error[];
}

export type AgentEventType = 'start' | 'step' | 'tool_call' | 'tool_result' | 'complete' | 'error';

export interface AgentEvent {
  type: AgentEventType;
  timestamp: Date;
  data: unknown;
}

export type AgentEventHandler = (event: AgentEvent) => void;

/**
 * Base Agent Class
 */
export abstract class BaseAgent {
  protected config: AgentConfig;
  protected client: LLMClient;
  protected state: AgentState;
  protected eventHandlers: AgentEventHandler[] = [];

  constructor(client: LLMClient, config: AgentConfig) {
    this.client = client;
    this.config = {
      maxIterations: 10,
      temperature: 0.3,
      ...config,
    };
    this.state = this.createInitialState();
  }

  /**
   * Create initial state
   */
  protected createInitialState(): AgentState {
    return {
      status: 'idle',
      currentStep: 0,
      totalSteps: this.config.maxIterations || 10,
      messages: [],
      results: [],
      errors: [],
    };
  }

  /**
   * Reset agent state
   */
  reset(): void {
    this.state = this.createInitialState();
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Subscribe to events
   */
  on(handler: AgentEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Emit event
   */
  protected emit(type: AgentEventType, data: unknown): void {
    const event: AgentEvent = {
      type,
      timestamp: new Date(),
      data,
    };
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }

  /**
   * Run the agent
   */
  async run(input: string, context?: AgentContext): Promise<AgentResult> {
    this.state.status = 'running';
    this.emit('start', { input, context });

    const agentContext: AgentContext = {
      tenderId: context?.tenderId || '',
      organizationId: context?.organizationId || '',
      userId: context?.userId,
      metadata: context?.metadata,
    };

    try {
      // Build initial messages
      this.state.messages = [
        { role: 'system', content: this.config.systemPrompt },
        { role: 'user', content: input },
      ];

      // Run agent loop
      let iteration = 0;
      while (iteration < this.config.maxIterations! && this.state.status === 'running') {
        this.state.currentStep = iteration + 1;
        this.emit('step', { iteration, messages: this.state.messages });

        // Get LLM response
        const response = await this.client.generate(this.state.messages, {
          temperature: this.config.temperature,
          tools: this.formatToolsForLLM(),
        });

        // Add assistant message
        this.state.messages.push({
          role: 'assistant',
          content: response.content,
        });

        // Check for tool calls
        const toolCalls = this.extractToolCalls(response.content);

        if (toolCalls.length > 0) {
          // Execute tools
          for (const toolCall of toolCalls) {
            this.emit('tool_call', toolCall);

            const result = await this.executeTool(toolCall, agentContext);

            this.emit('tool_result', { tool: toolCall.name, result });

            // Add tool result to messages
            this.state.messages.push({
              role: 'user',
              content: `תוצאת הכלי ${toolCall.name}:\n${JSON.stringify(result, null, 2)}`,
            });
          }
        } else {
          // No tool calls - check if done
          if (this.isTaskComplete(response.content)) {
            this.state.status = 'completed';
          }
        }

        iteration++;
      }

      // Extract final result
      const result = this.extractResult();
      this.state.results.push(result);
      this.emit('complete', result);

      return {
        success: true,
        result,
        confidence: this.calculateConfidence(),
        metadata: {
          iterations: iteration,
          tokensUsed: this.state.messages.reduce(
            (sum, m) => sum + (m.content?.length || 0) / 4,
            0
          ),
        },
      };
    } catch (error) {
      this.state.status = 'error';
      this.state.errors.push(error as Error);
      this.emit('error', error);

      return {
        success: false,
        error: (error as Error).message,
        confidence: 0,
      };
    }
  }

  /**
   * Format tools for LLM
   */
  protected formatToolsForLLM(): unknown[] {
    if (!this.config.tools) return [];

    return this.config.tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters,
          required: Object.entries(tool.parameters)
            .filter(([_, p]) => p.required)
            .map(([name]) => name),
        },
      },
    }));
  }

  /**
   * Extract tool calls from response
   */
  protected extractToolCalls(content: string): Array<{ name: string; params: Record<string, unknown> }> {
    const toolCalls: Array<{ name: string; params: Record<string, unknown> }> = [];

    // Look for JSON tool calls in the response
    const jsonPattern = /```json\s*\{[\s\S]*?"tool"\s*:\s*"(\w+)"[\s\S]*?\}[\s\S]*?```/g;
    let match;

    while ((match = jsonPattern.exec(content)) !== null) {
      try {
        const jsonStr = match[0].replace(/```json\s*/, '').replace(/```\s*$/, '');
        const parsed = JSON.parse(jsonStr);
        if (parsed.tool && this.config.tools?.some(t => t.name === parsed.tool)) {
          toolCalls.push({
            name: parsed.tool,
            params: parsed.params || {},
          });
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Also check for function call format
    const funcPattern = /<tool_call>\s*(\w+)\(([\s\S]*?)\)\s*<\/tool_call>/g;
    while ((match = funcPattern.exec(content)) !== null) {
      try {
        const name = match[1];
        const paramsStr = match[2];
        const params = paramsStr ? JSON.parse(`{${paramsStr}}`) : {};
        if (this.config.tools?.some(t => t.name === name)) {
          toolCalls.push({ name, params });
        }
      } catch {
        // Ignore parse errors
      }
    }

    return toolCalls;
  }

  /**
   * Execute a tool
   */
  protected async executeTool(
    toolCall: { name: string; params: Record<string, unknown> },
    context: AgentContext
  ): Promise<unknown> {
    const tool = this.config.tools?.find(t => t.name === toolCall.name);
    if (!tool) {
      throw new Error(`Tool not found: ${toolCall.name}`);
    }

    return tool.execute(toolCall.params, context);
  }

  /**
   * Check if task is complete
   */
  protected isTaskComplete(response: string): boolean {
    // Look for completion indicators
    const completionIndicators = [
      'סיום',
      'הושלם',
      'סיכום סופי',
      'תוצאה סופית',
      '```json',
      'DONE',
      'COMPLETE',
    ];

    return completionIndicators.some(indicator =>
      response.includes(indicator)
    );
  }

  /**
   * Extract result from conversation
   */
  protected abstract extractResult(): unknown;

  /**
   * Calculate confidence score
   */
  protected calculateConfidence(): number {
    // Base confidence on conversation quality
    let confidence = 0.5;

    // More messages = more thorough = higher confidence
    const messageCount = this.state.messages.length;
    confidence += Math.min(0.2, messageCount * 0.02);

    // Successful tool calls increase confidence
    const toolCallCount = this.state.messages.filter(
      m => m.role === 'user' && m.content?.includes('תוצאת הכלי')
    ).length;
    confidence += Math.min(0.2, toolCallCount * 0.05);

    // No errors = higher confidence
    if (this.state.errors.length === 0) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }
}

/**
 * Simple agent that runs a single prompt
 */
export class SimpleAgent extends BaseAgent {
  constructor(client: LLMClient, name: string, systemPrompt: string) {
    super(client, {
      name,
      description: 'Simple single-turn agent',
      systemPrompt,
      maxIterations: 1,
    });
  }

  protected extractResult(): unknown {
    const lastMessage = this.state.messages[this.state.messages.length - 1];
    if (lastMessage?.role === 'assistant') {
      // Try to parse JSON from response
      const jsonMatch = lastMessage.content?.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch {
          // Return raw content
        }
      }
      return lastMessage.content;
    }
    return null;
  }
}
