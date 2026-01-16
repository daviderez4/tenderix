/**
 * Prompts Module Index
 *
 * Export all prompt templates and utilities
 */

// Template engine
export {
  PromptEngine,
  PromptTemplate,
  PromptVariable,
  PromptExample,
  CompiledPrompt,
  createPrompt,
  jsonOutputInstructions,
  formatList,
  formatKeyValue,
  wrapInTags,
  section,
  promptEngine,
} from './templates';

// Hebrew prompts
export {
  HEBREW_SYSTEM_PROMPTS,
  metadataExtractionTemplate,
  gateConditionsTemplate,
  definitionsTemplate,
  riskAnalysisTemplate,
  clarificationQuestionsTemplate,
  getSystemPrompt,
  createAnalysisPrompt,
  registerHebrewTemplates,
} from './hebrew';

// Extraction prompts
export {
  fieldExtractionTemplate,
  dateExtractionTemplate,
  financialExtractionTemplate,
  personnelExtractionTemplate,
  experienceExtractionTemplate,
  contactExtractionTemplate,
  registerExtractionTemplates,
} from './extraction';

// Analysis prompts
export {
  goNoGoTemplate,
  gateMatchingTemplate,
  pricingStrategyTemplate,
  competitorAnalysisTemplate,
  documentClassificationTemplate,
  registerAnalysisTemplates,
} from './analysis';
