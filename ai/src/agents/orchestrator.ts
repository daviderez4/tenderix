/**
 * Agent Orchestrator
 *
 * Coordinates multiple agents for complex tender analysis:
 * - Pipeline management
 * - Agent coordination
 * - Result aggregation
 * - Error handling and recovery
 */

import type { LLMClient, AgentContext, AgentResult } from '../types';
import { BaseAgent, AgentEvent, AgentEventHandler } from './base-agent';
import { TenderAnalyzerAgent } from './tender-analyzer';
import { GateExtractorAgent } from './gate-extractor';
import { DocumentClassifierAgent, DocumentClassification } from './document-classifier';

export interface OrchestratorConfig {
  enableParallel?: boolean;
  maxConcurrent?: number;
  timeout?: number;
  retryOnError?: boolean;
  maxRetries?: number;
}

export interface PipelineStep {
  name: string;
  agent: string;
  input: string | ((context: PipelineContext) => string);
  dependsOn?: string[];
  optional?: boolean;
}

export interface PipelineContext {
  documentText: string;
  results: Map<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface PipelineResult {
  success: boolean;
  steps: Map<string, StepResult>;
  aggregatedResult: unknown;
  errors: Error[];
  duration: number;
}

export interface StepResult {
  name: string;
  success: boolean;
  result?: unknown;
  error?: Error;
  duration: number;
}

export interface ComprehensiveAnalysis {
  classification: DocumentClassification;
  metadata: {
    tenderNumber: string | null;
    tenderName: string;
    issuingBody: string;
    submissionDeadline: string | null;
  };
  gateConditions: Array<{
    text: string;
    type: string;
    isMandatory: boolean;
  }>;
  risks: Array<{
    description: string;
    severity: string;
  }>;
  recommendation: {
    decision: 'GO' | 'NO_GO' | 'CONDITIONAL' | 'REVIEW';
    confidence: number;
    reasoning: string;
  };
  summary: string;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  enableParallel: true,
  maxConcurrent: 3,
  timeout: 60000,
  retryOnError: true,
  maxRetries: 2,
};

/**
 * Agent Orchestrator
 */
export class AgentOrchestrator {
  private client: LLMClient;
  private config: OrchestratorConfig;
  private agents: Map<string, BaseAgent>;
  private eventHandlers: AgentEventHandler[] = [];

  constructor(client: LLMClient, config?: OrchestratorConfig) {
    this.client = client;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.agents = new Map();

    // Initialize default agents
    this.registerAgent('classifier', new DocumentClassifierAgent(client));
    this.registerAgent('analyzer', new TenderAnalyzerAgent(client));
    this.registerAgent('gates', new GateExtractorAgent(client));
  }

  /**
   * Register an agent
   */
  registerAgent(name: string, agent: BaseAgent): void {
    this.agents.set(name, agent);
  }

  /**
   * Get an agent
   */
  getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name);
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
  private emit(type: AgentEvent['type'], data: unknown): void {
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
   * Run a pipeline of agents
   */
  async runPipeline(
    steps: PipelineStep[],
    documentText: string,
    context?: AgentContext
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const pipelineContext: PipelineContext = {
      documentText,
      results: new Map(),
      metadata: {},
    };

    const stepResults = new Map<string, StepResult>();
    const errors: Error[] = [];

    this.emit('start', { steps: steps.map(s => s.name) });

    // Build dependency graph
    const completed = new Set<string>();
    const pending = [...steps];

    while (pending.length > 0) {
      // Find steps that can run (dependencies met)
      const ready = pending.filter(step =>
        !step.dependsOn || step.dependsOn.every(dep => completed.has(dep))
      );

      if (ready.length === 0 && pending.length > 0) {
        // Circular dependency or missing dependency
        const error = new Error('Pipeline stuck: unresolved dependencies');
        errors.push(error);
        break;
      }

      // Run ready steps (parallel if enabled)
      const toRun = this.config.enableParallel
        ? ready.slice(0, this.config.maxConcurrent)
        : [ready[0]];

      const results = await Promise.allSettled(
        toRun.map(step => this.runStep(step, pipelineContext, context))
      );

      // Process results
      for (let i = 0; i < toRun.length; i++) {
        const step = toRun[i];
        const result = results[i];

        if (result.status === 'fulfilled') {
          stepResults.set(step.name, result.value);
          pipelineContext.results.set(step.name, result.value.result);
          completed.add(step.name);

          this.emit('step', { step: step.name, result: result.value });
        } else {
          const error = result.reason;
          const stepResult: StepResult = {
            name: step.name,
            success: false,
            error,
            duration: 0,
          };

          stepResults.set(step.name, stepResult);
          errors.push(error);

          if (!step.optional) {
            this.emit('error', { step: step.name, error });
          }

          completed.add(step.name);
        }

        // Remove from pending
        const pendingIndex = pending.indexOf(step);
        if (pendingIndex >= 0) {
          pending.splice(pendingIndex, 1);
        }
      }
    }

    // Aggregate results
    const aggregatedResult = this.aggregateResults(pipelineContext);

    const pipelineResult: PipelineResult = {
      success: errors.length === 0,
      steps: stepResults,
      aggregatedResult,
      errors,
      duration: Date.now() - startTime,
    };

    this.emit('complete', pipelineResult);

    return pipelineResult;
  }

  /**
   * Run a single step
   */
  private async runStep(
    step: PipelineStep,
    pipelineContext: PipelineContext,
    agentContext?: AgentContext
  ): Promise<StepResult> {
    const startTime = Date.now();
    const agent = this.agents.get(step.agent);

    if (!agent) {
      throw new Error(`Agent not found: ${step.agent}`);
    }

    // Resolve input
    const input = typeof step.input === 'function'
      ? step.input(pipelineContext)
      : step.input.replace('{{document}}', pipelineContext.documentText);

    // Run with timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Step timeout')), this.config.timeout)
    );

    let result: AgentResult;
    let retries = 0;

    while (retries <= (this.config.maxRetries || 0)) {
      try {
        result = await Promise.race([
          agent.run(input, agentContext),
          timeoutPromise,
        ]);

        if (result.success) {
          return {
            name: step.name,
            success: true,
            result: result.result,
            duration: Date.now() - startTime,
          };
        }

        if (!this.config.retryOnError) break;
        retries++;
      } catch (error) {
        if (!this.config.retryOnError || retries >= (this.config.maxRetries || 0)) {
          throw error;
        }
        retries++;
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }

    throw new Error(`Step failed after ${retries} retries`);
  }

  /**
   * Aggregate pipeline results
   */
  private aggregateResults(context: PipelineContext): unknown {
    return Object.fromEntries(context.results);
  }

  /**
   * Run comprehensive tender analysis
   */
  async analyzeTender(
    documentText: string,
    context?: AgentContext
  ): Promise<ComprehensiveAnalysis> {
    const pipeline: PipelineStep[] = [
      {
        name: 'classify',
        agent: 'classifier',
        input: '{{document}}',
      },
      {
        name: 'extract_gates',
        agent: 'gates',
        input: '{{document}}',
      },
      {
        name: 'analyze',
        agent: 'analyzer',
        input: '{{document}}',
        dependsOn: ['classify', 'extract_gates'],
      },
    ];

    const result = await this.runPipeline(pipeline, documentText, context);

    // Build comprehensive analysis
    const classification = result.steps.get('classify')?.result as DocumentClassification || {
      type: 'UNKNOWN',
      confidence: 0,
      indicators: [],
      structure: { sections: [], hasTableOfContents: false, hasDefinitions: false, hasAppendices: false },
      quality: { score: 0, issues: [], isOCR: false, hasFormattingIssues: false },
      metadata: { wordCount: 0, language: 'he', hasTablesOrBOQ: false, hasSignatures: false },
    };

    const gatesResult = result.steps.get('extract_gates')?.result as Record<string, unknown> || {};
    const analysisResult = result.steps.get('analyze')?.result as Record<string, unknown> || {};

    return {
      classification,
      metadata: {
        tenderNumber: (analysisResult.metadata as Record<string, unknown>)?.tenderNumber as string | null || null,
        tenderName: (analysisResult.metadata as Record<string, unknown>)?.tenderName as string || '',
        issuingBody: (analysisResult.metadata as Record<string, unknown>)?.issuingBody as string || '',
        submissionDeadline: (analysisResult.metadata as Record<string, unknown>)?.submissionDeadline as string | null || null,
      },
      gateConditions: ((gatesResult.conditions || []) as Array<Record<string, unknown>>).map(c => ({
        text: c.text as string || '',
        type: c.requirementType as string || 'OTHER',
        isMandatory: c.isMandatory as boolean || false,
      })),
      risks: ((analysisResult.risks || []) as Array<Record<string, unknown>>).map(r => ({
        description: r.description as string || '',
        severity: r.severity as string || 'MEDIUM',
      })),
      recommendation: {
        decision: ((analysisResult.recommendation as Record<string, unknown>)?.decision as 'GO' | 'NO_GO' | 'CONDITIONAL' | 'REVIEW') || 'REVIEW',
        confidence: ((analysisResult.recommendation as Record<string, unknown>)?.confidence as number) || 0,
        reasoning: ((analysisResult.recommendation as Record<string, unknown>)?.reasoning as string) || '',
      },
      summary: (analysisResult.summary as string) || '',
    };
  }

  /**
   * Quick analysis with single agent
   */
  async quickAnalyze(
    documentText: string,
    context?: AgentContext
  ): Promise<ComprehensiveAnalysis> {
    const classifier = this.agents.get('classifier') as DocumentClassifierAgent;
    const classification = await classifier.classify(documentText, context);

    return {
      classification,
      metadata: {
        tenderNumber: null,
        tenderName: '',
        issuingBody: '',
        submissionDeadline: null,
      },
      gateConditions: [],
      risks: [],
      recommendation: {
        decision: 'REVIEW',
        confidence: 0.5,
        reasoning: 'ניתוח מהיר - נדרש ניתוח מעמיק',
      },
      summary: `מסמך מסוג ${classification.type} עם ${classification.metadata.wordCount} מילים`,
    };
  }
}

/**
 * Create and run a quick pipeline
 */
export async function runTenderPipeline(
  client: LLMClient,
  documentText: string,
  context?: AgentContext
): Promise<ComprehensiveAnalysis> {
  const orchestrator = new AgentOrchestrator(client);
  return orchestrator.analyzeTender(documentText, context);
}
