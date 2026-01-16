/**
 * Prompt Template System
 *
 * Structured prompt templates with:
 * - Variable substitution
 * - Conditional sections
 * - Hebrew language support
 * - Validation
 */

export interface PromptTemplate {
  name: string;
  description: string;
  template: string;
  variables: PromptVariable[];
  outputFormat?: 'text' | 'json' | 'markdown';
  examples?: PromptExample[];
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: unknown;
  description?: string;
  validation?: (value: unknown) => boolean;
}

export interface PromptExample {
  input: Record<string, unknown>;
  output: string;
}

export interface CompiledPrompt {
  system?: string;
  user: string;
  variables: Record<string, unknown>;
}

/**
 * Prompt Template Engine
 */
export class PromptEngine {
  private templates: Map<string, PromptTemplate> = new Map();

  /**
   * Register a template
   */
  register(template: PromptTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Get a template by name
   */
  get(name: string): PromptTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Compile a template with variables
   */
  compile(name: string, variables: Record<string, unknown>): CompiledPrompt {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }

    // Validate and apply defaults
    const resolvedVars = this.resolveVariables(template, variables);

    // Compile template
    const compiled = this.compileTemplate(template.template, resolvedVars);

    return {
      user: compiled,
      variables: resolvedVars,
    };
  }

  /**
   * Compile template string with variables
   */
  compileTemplate(template: string, variables: Record<string, unknown>): string {
    let result = template;

    // Replace simple variables: {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (_, name) => {
      const value = variables[name];
      if (value === undefined) return `{{${name}}}`;
      return String(value);
    });

    // Handle conditionals: {{#if variable}}...{{/if}}
    result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, name, content) => {
      const value = variables[name];
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        return content;
      }
      return '';
    });

    // Handle loops: {{#each variable}}...{{/each}}
    result = result.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, name, content) => {
      const value = variables[name];
      if (!Array.isArray(value)) return '';

      return value.map((item, index) => {
        let itemContent = content;
        if (typeof item === 'object') {
          for (const [key, val] of Object.entries(item)) {
            itemContent = itemContent.replace(
              new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
              String(val)
            );
          }
        } else {
          itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
        }
        itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index + 1));
        return itemContent;
      }).join('\n');
    });

    // Clean up extra whitespace
    result = result.replace(/\n{3,}/g, '\n\n').trim();

    return result;
  }

  /**
   * Resolve variables with defaults and validation
   */
  private resolveVariables(
    template: PromptTemplate,
    input: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const variable of template.variables) {
      let value = input[variable.name];

      // Apply default if not provided
      if (value === undefined && variable.default !== undefined) {
        value = variable.default;
      }

      // Check required
      if (variable.required && value === undefined) {
        throw new Error(`Required variable missing: ${variable.name}`);
      }

      // Validate
      if (value !== undefined && variable.validation) {
        if (!variable.validation(value)) {
          throw new Error(`Validation failed for variable: ${variable.name}`);
        }
      }

      resolved[variable.name] = value;
    }

    return resolved;
  }
}

/**
 * Create a simple prompt from string
 */
export function createPrompt(template: string, variables: Record<string, unknown> = {}): string {
  const engine = new PromptEngine();
  return engine.compileTemplate(template, variables);
}

/**
 * Format output instructions for JSON
 */
export function jsonOutputInstructions(schema?: Record<string, string>): string {
  let instructions = `
חשוב: יש להחזיר את התשובה בפורמט JSON בלבד.
אין להוסיף הסברים או טקסט מחוץ ל-JSON.
`;

  if (schema) {
    instructions += '\nמבנה ה-JSON הנדרש:\n```json\n';
    instructions += JSON.stringify(schema, null, 2);
    instructions += '\n```';
  }

  return instructions;
}

/**
 * Format list of items for prompt
 */
export function formatList(items: string[], numbered: boolean = true): string {
  return items
    .map((item, i) => numbered ? `${i + 1}. ${item}` : `- ${item}`)
    .join('\n');
}

/**
 * Format key-value pairs for prompt
 */
export function formatKeyValue(data: Record<string, unknown>): string {
  return Object.entries(data)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

/**
 * Wrap text in XML-like tags (for Claude)
 */
export function wrapInTags(content: string, tag: string): string {
  return `<${tag}>\n${content}\n</${tag}>`;
}

/**
 * Create a section with header
 */
export function section(title: string, content: string): string {
  return `## ${title}\n\n${content}`;
}

/**
 * Global prompt engine instance
 */
export const promptEngine = new PromptEngine();
