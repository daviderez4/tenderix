// PDF Report Type Definitions
// Matches the webhook return types from tenderix.ts

export interface BOQAnalysisData {
  items: Array<{
    item_number: string;
    description: string;
    quantity: number;
    unit: string;
    category: string;
    risk_notes?: string;
  }>;
  summary: {
    total_items: number;
    categories: string[];
    risks: string[];
  };
}

export interface SOWAnalysisData {
  scope: {
    main_deliverables: string[];
    work_phases: string[];
    exclusions: string[];
  };
  risks: Array<{
    description: string;
    severity: string;
    mitigation: string;
  }>;
  recommendations: string[];
}

export interface ClarificationData {
  questions: Array<{
    question: string;
    rationale: string;
    priority: string;
    category: string;
  }>;
}

export interface StrategicQuestionsData {
  total_questions: number;
  safe_questions: Array<{ question: string; rationale: string; benefit_all: boolean }>;
  strategic_questions: Array<{ question: string; rationale: string; target_competitor?: string; expected_impact: string }>;
  optimization_questions: Array<{ question: string; rationale: string; from_analysis: string }>;
}

export interface RequiredDocsData {
  required_documents: Array<{
    document_name: string;
    description: string;
    source_condition: string;
    category: string;
    prep_time: string;
    source: string;
  }>;
}

export interface PricingIntelData {
  pricing_analysis: {
    estimated_range: { min: number; max: number };
    recommended_price: number;
    strategy: string;
  };
  competitor_pricing: Array<{
    competitor: string;
    expected_range: string;
    strategy: string;
  }>;
}

export interface CompetitiveIntelData {
  our_position: {
    strengths: string[];
    weaknesses: string[];
    unique_advantages: string[];
  };
  competitive_landscape: string;
  win_probability: number;
  recommendations: string[];
}

export interface CompetitorMappingData {
  competitors: Array<{
    name: string;
    likelihood: string;
    strengths: string[];
    weaknesses: string[];
    threat_level: string;
  }>;
  market_analysis: string;
}

export interface GateConditionItem {
  condition_number: number;
  condition_text: string;
  status: 'MEETS' | 'PARTIALLY_MEETS' | 'DOES_NOT_MEET' | 'UNKNOWN';
  is_mandatory: boolean;
  requirement_type?: string;
  evidence?: string;
  gap_description?: string;
  ai_summary?: string;
  ai_confidence?: number;
  legal_classification?: string;
  legal_reasoning?: string;
  technical_requirement?: string;
  equivalent_options?: string[];
  closure_options?: string[];
  source_section?: string;
  source_page?: number;
  required_years?: number;
  required_amount?: number;
  required_count?: number;
}

export interface GateConditionsData {
  conditions: GateConditionItem[];
  summary: {
    total: number;
    meets: number;
    partial: number;
    fails: number;
    unknown: number;
    mandatory: number;
  };
}

export interface DecisionData {
  decision: 'GO' | 'NO-GO' | 'CONDITIONAL';
  confidence: number;
  executive_summary: string;
  eligibility_status: string;
  gate_analysis: { total: number; meets: number; partial: number; fails: number };
  blocking_issues: Array<{ issue: string; severity: string; resolution: string }>;
  strengths: string[];
  weaknesses: string[];
  risks: Array<{ risk: string; probability: string; impact: string; mitigation: string }>;
  recommended_actions: Array<{ action: string; priority: string; deadline: string }>;
  resource_estimate: { bd_hours: number; tech_hours: number; estimated_cost: number };
}

export interface TenderReportData {
  tenderName: string;
  tenderNumber?: string;
  issuingBody?: string;
  submissionDeadline?: string;
  estimatedValue?: number;
  generatedAt: string;

  // Decision (existing)
  decision?: DecisionData;

  // Gate conditions analysis (detailed)
  gateConditions?: GateConditionsData;

  // New sections (optional - only present if cached)
  boq?: BOQAnalysisData;
  sow?: SOWAnalysisData;
  clarifications?: ClarificationData;
  strategic?: StrategicQuestionsData;
  requiredDocs?: RequiredDocsData;
  pricingIntel?: PricingIntelData;
  competitiveIntel?: CompetitiveIntelData;
  competitorMapping?: CompetitorMappingData;
}
