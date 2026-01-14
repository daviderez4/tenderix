import { API_CONFIG } from './config';

// ==================== TYPES ====================

export interface Tender {
  id: string;
  org_id?: string;
  tender_name: string;
  tender_number?: string;
  issuing_body?: string;
  issuing_body_type?: string;
  publish_date?: string;
  submission_deadline?: string;
  clarification_deadline?: string;
  estimated_value?: number;
  guarantee_amount?: number;
  guarantee_type?: string;
  contract_duration_months?: number;
  scoring_method?: string;
  quality_weight?: number;
  price_weight?: number;
  category?: string;
  current_step?: string;
  status?: string;
  go_nogo_decision?: string;
  created_at?: string;
}

export interface GateCondition {
  id: string;
  tender_id: string;
  condition_number: string;
  condition_text: string;
  condition_type?: string;
  is_mandatory: boolean;
  requirement_type?: string;
  entity_type?: string;
  required_amount?: number;
  required_count?: number;
  required_years?: number;
  status?: string;
  evidence?: string;
  gap_description?: string;
  closure_options?: string[];
  source_page?: number;
  source_section?: string;
}

export interface GateSummary {
  tender_id: string;
  total_conditions: number;
  mandatory_count: number;
  meets_count: number;
  partially_meets_count: number;
  does_not_meet_count: number;
  unknown_count: number;
  overall_eligibility: string;
  blocking_conditions: string[];
  recommendations: string[];
}

export interface BOQItem {
  id: string;
  tender_id: string;
  item_number: string;
  chapter?: string;
  description: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  category?: string;
  risk_level?: string;
  notes?: string;
}

export interface Competitor {
  id: string;
  org_id?: string;
  name: string;
  company_number?: string;
  size_category?: string;
  strengths?: string[];
  weaknesses?: string[];
  typical_domains?: string[];
  pricing_strategy?: string;
  win_rate?: number;
  notes?: string;
}

export interface CompanyProject {
  id: string;
  org_id: string;
  project_name: string;
  project_number?: string;
  client_name: string;
  client_type?: string;
  start_date?: string;
  end_date?: string;
  end_date_type?: string;
  total_value?: number;
  establishment_value?: number;
  maintenance_value?: number;
  maintenance_months?: number;
  role_type?: string;
  role_percentage?: number;
  project_type?: string;
  category?: string;
  technologies?: Record<string, unknown>;
  quantities?: Record<string, unknown>;
  integrations?: string[];
  sla_details?: string;
  location?: string;
  site_count?: number;
}

export interface CompanyFinancial {
  id: string;
  org_id: string;
  fiscal_year: number;
  annual_revenue?: number;
  net_profit?: number;
  employee_count?: number;
  audited?: boolean;
}

export interface CompanyCertification {
  id: string;
  org_id: string;
  cert_type: string;
  cert_name: string;
  cert_number?: string;
  issuing_body?: string;
  valid_from?: string;
  valid_until?: string;
}

export interface Organization {
  id: string;
  name: string;
  company_number?: string;
  founding_year?: number;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  settings?: Record<string, unknown>;
}

export interface TenderDocument {
  id: string;
  tender_id: string;
  file_name: string;
  file_type: string;  // 'PDF', 'DOCX', 'XLSX'
  storage_path: string;  // Path to the file in storage (was file_url)
  doc_type: string;   // 'INVITATION', 'SPECS', 'BOQ', 'CONTRACT', 'CLARIFICATIONS', 'FORMS'
  file_size_bytes?: number;
  version?: number;
  is_original?: boolean;
  page_count?: number;
  structure?: Record<string, unknown>;
  processing_status?: string;
  ocr_text?: string;
  processed_text?: string;
  created_at?: string;
}

export interface Personnel {
  id: string;
  org_id: string;
  full_name: string;
  id_number?: string;
  role?: string;
  department?: string;
  education?: string;
  education_institution?: string;
  years_experience?: number;
  hire_date?: string;
  professional_certifications?: string[];
  security_clearance?: string;
}

// ==================== HELPERS ====================

async function supabaseFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_CONFIG.SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      'apikey': API_CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Supabase error: ${res.status} - ${error}`);
  }
  return res.json();
}

async function callWebhook<T>(path: string, payload: object, timeoutMs = 120000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_CONFIG.WEBHOOK_BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Workflow error: ${res.status} - ${error}`);
    }

    const text = await res.text();
    if (!text) return {} as T;

    try {
      return JSON.parse(text);
    } catch {
      return { raw: text } as T;
    }
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Workflow timeout - please try again');
    }
    throw error;
  }
}

// ==================== API ====================

export const api = {
  // ==================== TENDERS ====================
  tenders: {
    list: () => supabaseFetch<Tender[]>('tenders?select=*&order=created_at.desc'),

    get: (id: string) => supabaseFetch<Tender[]>(`tenders?id=eq.${id}`).then(r => r[0]),

    create: (data: Partial<Tender>) => supabaseFetch<Tender[]>('tenders', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r[0]),

    update: (id: string, data: Partial<Tender>) => supabaseFetch<Tender[]>(`tenders?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }).then(r => r[0]),

    delete: (id: string) => supabaseFetch<void>(`tenders?id=eq.${id}`, {
      method: 'DELETE',
    }),
  },

  // ==================== GATE CONDITIONS ====================
  gates: {
    list: (tenderId: string) =>
      supabaseFetch<GateCondition[]>(`gate_conditions?tender_id=eq.${tenderId}&order=condition_number`),

    getSummary: (tenderId: string) =>
      supabaseFetch<GateSummary[]>(`gate_conditions_summary?tender_id=eq.${tenderId}`).then(r => r[0]),

    update: (id: string, data: Partial<GateCondition>) =>
      supabaseFetch<GateCondition[]>(`gate_conditions?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    create: (data: Partial<GateCondition>) =>
      supabaseFetch<GateCondition[]>('gate_conditions', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r[0]),
  },

  // ==================== BOQ ITEMS ====================
  boq: {
    list: (tenderId: string) =>
      supabaseFetch<BOQItem[]>(`boq_items?tender_id=eq.${tenderId}&order=item_number`),

    create: (data: Partial<BOQItem>) =>
      supabaseFetch<BOQItem[]>('boq_items', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    update: (id: string, data: Partial<BOQItem>) =>
      supabaseFetch<BOQItem[]>(`boq_items?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then(r => r[0]),
  },

  // ==================== COMPETITORS ====================
  competitors: {
    list: (orgId: string) =>
      supabaseFetch<Competitor[]>(`competitors?org_id=eq.${orgId}`),

    create: (data: Partial<Competitor>) =>
      supabaseFetch<Competitor[]>('competitors', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r[0]),
  },

  // ==================== COMPANY PROFILE ====================
  company: {
    getOrganization: (orgId: string) =>
      supabaseFetch<Organization[]>(`organizations?id=eq.${orgId}`).then(r => r[0]),

    updateOrganization: (orgId: string, data: Partial<Organization>) =>
      supabaseFetch<Organization[]>(`organizations?id=eq.${orgId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    getProjects: (orgId: string) =>
      supabaseFetch<CompanyProject[]>(`company_projects?org_id=eq.${orgId}&order=start_date.desc`),

    createProject: (data: Partial<CompanyProject>) =>
      supabaseFetch<CompanyProject[]>('company_projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    updateProject: (id: string, data: Partial<CompanyProject>) =>
      supabaseFetch<CompanyProject[]>(`company_projects?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    getFinancials: (orgId: string) =>
      supabaseFetch<CompanyFinancial[]>(`company_financials?org_id=eq.${orgId}&order=fiscal_year.desc`),

    createFinancial: (data: Partial<CompanyFinancial>) =>
      supabaseFetch<CompanyFinancial[]>('company_financials', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    getCertifications: (orgId: string) =>
      supabaseFetch<CompanyCertification[]>(`company_certifications?org_id=eq.${orgId}`),

    createCertification: (data: Partial<CompanyCertification>) =>
      supabaseFetch<CompanyCertification[]>('company_certifications', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    getPersonnel: (orgId: string) =>
      supabaseFetch<Personnel[]>(`company_personnel?org_id=eq.${orgId}`),

    createPersonnel: (data: Partial<Personnel>) =>
      supabaseFetch<Personnel[]>('company_personnel', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r[0]),
  },

  // ==================== DOCUMENTS ====================
  documents: {
    list: (tenderId: string) =>
      supabaseFetch<TenderDocument[]>(`tender_documents?tender_id=eq.${tenderId}&order=created_at.desc`),

    create: (data: Partial<TenderDocument>) =>
      supabaseFetch<TenderDocument[]>('tender_documents', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r[0]),
  },

  // ==================== AI WORKFLOWS ====================
  workflows: {
    // Gate Analysis
    extractGates: (tenderId: string, tenderText: string) =>
      callWebhook<{ success: boolean; conditions: GateCondition[] }>(
        'tdx-extract-gates',
        { tender_id: tenderId, tender_text: tenderText }
      ),

    matchGates: (tenderId: string, orgId: string) =>
      callWebhook<{
        success: boolean;
        tender_id: string;
        org_id: string;
        conditions: Array<{
          condition_number: string;
          condition_text: string;
          status: string;
          evidence: string;
          gap_description?: string;
          closure_options?: string[];
        }>;
        summary: {
          total: number;
          meets: number;
          partial: number;
          not_meets: number;
          eligibility: string;
        };
      }>('tdx-gate-work', { tender_id: tenderId, org_id: orgId }),

    // Clarification Questions
    getClarifications: (tenderId: string, orgId: string) =>
      callWebhook<{
        success: boolean;
        tender_id: string;
        questions: Array<{
          question: string;
          rationale: string;
          priority: string;
          category: string;
        }>;
      }>('tdx-clarify-simple', { tender_id: tenderId, org_id: orgId }),

    getStrategicQuestions: (tenderId: string, orgId: string) =>
      callWebhook<{
        success: boolean;
        tender_id: string;
        total_questions: number;
        safe_questions: Array<{
          question: string;
          rationale: string;
        }>;
        strategic_questions: Array<{
          question: string;
          rationale: string;
          target_competitor?: string;
        }>;
      }>('tdx-strategic-v3', { tender_id: tenderId, org_id: orgId }),

    // Required Documents
    getRequiredDocs: (tenderId: string, orgId: string) =>
      callWebhook<{
        success: boolean;
        tender_id: string;
        documents: Array<{
          document_name: string;
          description: string;
          source_condition: string;
          status: string;
          deadline?: string;
        }>;
      }>('tdx-required-docs', { tender_id: tenderId, org_id: orgId }),

    // BOQ & SOW Analysis
    analyzeBOQ: (tenderId: string, boqText: string) =>
      callWebhook<{
        success: boolean;
        tender_id: string;
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
      }>('tdx-boq-analysis', { tender_id: tenderId, boq_text: boqText }),

    analyzeSOW: (tenderId: string, sowText: string) =>
      callWebhook<{
        success: boolean;
        tender_id: string;
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
      }>('tdx-sow-analysis', { tender_id: tenderId, sow_text: sowText }),

    // Competitor Analysis
    mapCompetitors: (tenderId: string, orgId: string) =>
      callWebhook<{
        success: boolean;
        tender_id: string;
        tender_name: string;
        competitors: Array<{
          name: string;
          likelihood: string;
          strengths: string[];
          weaknesses: string[];
          threat_level: string;
        }>;
        market_analysis: string;
      }>('tdx-competitor-mapping', { tender_id: tenderId, org_id: orgId }),

    getPricingIntel: (tenderId: string, orgId: string) =>
      callWebhook<{
        success: boolean;
        tender_id: string;
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
      }>('tdx-pricing-intel', { tender_id: tenderId, org_id: orgId }),

    getCompetitiveIntel: (tenderId: string, orgId: string) =>
      callWebhook<{
        success: boolean;
        tender_id: string;
        our_position: {
          strengths: string[];
          weaknesses: string[];
          unique_advantages: string[];
        };
        competitive_landscape: string;
        win_probability: number;
        recommendations: string[];
      }>('tdx-competitive-intel', { tender_id: tenderId, org_id: orgId }),

    // Final Decision
    getFinalDecision: (tenderId: string, orgId: string) =>
      callWebhook<{
        success: boolean;
        tender_id: string;
        recommendation: 'GO' | 'NO-GO' | 'CONDITIONAL';
        confidence: number;
        risk_level: string;
        summary: string;
        key_factors: {
          positive: string[];
          negative: string[];
          conditions: string[];
        };
        next_steps: string[];
      }>('tdx-final-decision', { tender_id: tenderId, org_id: orgId }),

    // ==================== NEW v3.0 MODULES ====================

    // Module 1.6 - Previous Tender Analysis
    analyzePreviousTender: (tenderId: string) =>
      callWebhook<{
        success: boolean;
        tender_id: string;
        previous_tender?: {
          name: string;
          winner: string;
          winning_price: number;
          date: string;
        };
        differences: Array<{
          area: string;
          current: string;
          previous: string;
        }>;
        missed_questions: string[];
        copy_percentage: number;
        recommendations: string[];
      }>('tdx-previous-tender', { tender_id: tenderId }),

    // Module 1.1.5 - Version Management
    trackVersionChanges: (tenderId: string, versionType: 'ORIGINAL' | 'CLARIFICATION' | 'AMENDMENT') =>
      callWebhook<{
        success: boolean;
        tender_id: string;
        version_number: number;
        changes: Array<{
          section: string;
          change_type: string;
          description: string;
        }>;
        impact_on_gates: Array<{
          condition_number: string;
          impact: string;
        }>;
        impact_on_boq: Array<{
          item_number: string;
          impact: string;
        }>;
        summary: string;
      }>('tdx-versions', { tender_id: tenderId, version_type: versionType }),

    // Module 2.10 - Re-Analysis After Clarifications
    reAnalyzeAfterClarifications: (tenderId: string, orgId: string, clarificationText: string) =>
      callWebhook<{
        success: boolean;
        tender_id: string;
        changes_detected: Array<{
          area: string;
          original: string;
          updated: string;
        }>;
        gate_impacts: Array<{
          condition_number: string;
          original_status: string;
          new_status: string;
          reason: string;
        }>;
        new_questions: Array<{
          question: string;
          reason: string;
        }>;
        recommendations: string[];
        summary: string;
      }>('tdx-reanalysis', { tender_id: tenderId, org_id: orgId, clarification_text: clarificationText }),

    // Module 4.1 - Historical Bids Collection
    analyzeHistoricalBids: (tenderId: string, orgId: string) =>
      callWebhook<{
        success: boolean;
        tender_id: string;
        org_id: string;
        win_rate: number;
        total_bids: number;
        total_wins: number;
        average_winning_gap: number;
        trends: Array<{
          area: string;
          insight: string;
        }>;
        top_competitors: Array<{
          name: string;
          wins_against_us: number;
        }>;
        pricing_recommendation: {
          min: number;
          max: number;
          sweet_spot: number;
        };
        insights: string[];
      }>('tdx-historical-bids', { tender_id: tenderId, org_id: orgId }),

    // Module 1.1 - Document Analysis (uses SOW analysis for document parsing)
    analyzeDocument: async (documentText: string, fileName: string) => {
      // Use SOW analysis workflow which is known to work
      const TEST_TENDER_ID = 'e1e1e1e1-0000-0000-0000-000000000001';

      console.log(`analyzeDocument called with ${documentText.length} chars, file: ${fileName}`);

      try {
        console.log('Calling tdx-sow-analysis webhook...');
        const result = await callWebhook<{
          success: boolean;
          tender_id: string;
          scope?: {
            main_deliverables?: string[];
            work_phases?: string[];
            exclusions?: string[];
          };
          risks?: Array<{
            description: string;
            severity: string;
            mitigation: string;
          }>;
          recommendations?: string[];
        }>('tdx-sow-analysis', { tender_id: TEST_TENDER_ID, sow_text: documentText }, 180000);

        console.log('SOW analysis result:', result);

        // Parse basic metadata from the document text with improved patterns
        const parseField = (patterns: RegExp[]): string => {
          for (const pattern of patterns) {
            const match = documentText.match(pattern);
            if (match && match[1]) {
              const value = match[1].trim();
              if (value.length > 0 && value.length < 200) return value;
            }
          }
          return 'לא זוהה';
        };

        // Improved patterns for Hebrew tender documents
        const metadata = {
          tender_number: parseField([
            /מכרז\s*(?:מס['׳]?|מספר|פומבי)?\s*[:\-]?\s*([\d\/\-\.]+)/i,
            /מספר\s*(?:ה)?מכרז\s*[:\-]?\s*([\d\/\-\.]+)/i,
            /מכרז\s+(\d+[\d\/\-\.]*)/i,
          ]),
          tender_name: parseField([
            /שם\s*(?:ה)?מכרז\s*[:\-]?\s*([^\n]{5,100})/i,
            /מכרז\s+(?:ל|ה)?([^\n]{10,100})/i,
            /נושא\s*(?:ה)?מכרז\s*[:\-]?\s*([^\n]{5,100})/i,
          ]) || fileName.replace('.pdf', ''),
          issuing_body: parseField([
            /(?:גוף|גורם)\s*מזמין\s*[:\-]?\s*([^\n]{3,80})/i,
            /המזמין\s*[:\-]?\s*([^\n]{3,80})/i,
            /עיריית?\s+([^\n]{3,50})/i,
            /משרד\s+([^\n]{3,50})/i,
            /חברת?\s+([^\n]{3,50})/i,
          ]),
          publish_date: parseField([
            /תאריך\s*פרסום\s*[:\-]?\s*([\d]{1,2}[\.\/\-][\d]{1,2}[\.\/\-][\d]{2,4})/i,
            /פורסם\s*(?:ב|ביום)?\s*[:\-]?\s*([\d]{1,2}[\.\/\-][\d]{1,2}[\.\/\-][\d]{2,4})/i,
          ]),
          submission_deadline: parseField([
            /מועד\s*(?:אחרון\s*)?(?:ל)?הגשה?\s*[:\-]?\s*([\d]{1,2}[\.\/\-][\d]{1,2}[\.\/\-][\d]{2,4}(?:\s*(?:בשעה|שעה)?\s*[\d:]+)?)/i,
            /להגיש\s*עד\s*[:\-]?\s*([\d]{1,2}[\.\/\-][\d]{1,2}[\.\/\-][\d]{2,4})/i,
            /תאריך\s*הגשה\s*[:\-]?\s*([\d]{1,2}[\.\/\-][\d]{1,2}[\.\/\-][\d]{2,4})/i,
          ]),
          clarification_deadline: parseField([
            /מועד\s*(?:אחרון\s*)?(?:ל)?(?:שאלות|הבהרות)\s*[:\-]?\s*([\d]{1,2}[\.\/\-][\d]{1,2}[\.\/\-][\d]{2,4})/i,
            /שאלות\s*(?:הבהרה)?\s*עד\s*[:\-]?\s*([\d]{1,2}[\.\/\-][\d]{1,2}[\.\/\-][\d]{2,4})/i,
          ]),
          guarantee_amount: parseField([
            /ערבות\s*(?:הצעה|בנקאית)?\s*[:\-]?\s*([\d,\.]+\s*(?:ש"ח|₪|שקל|אלף|מיליון)?)/i,
            /בטוחה\s*[:\-]?\s*([\d,\.]+\s*(?:ש"ח|₪)?)/i,
            /סכום\s*(?:ה)?ערבות\s*[:\-]?\s*([\d,\.]+)/i,
          ]),
          contract_period: parseField([
            /תקופת?\s*(?:ה)?התקשרות\s*[:\-]?\s*([^\n]{3,80})/i,
            /תקופה\s*[:\-]?\s*(\d+\s*(?:חודש|שנ)[^\n]{0,30})/i,
            /למשך\s*(\d+\s*(?:חודש|שנ)[^\n]{0,20})/i,
          ]),
          category: result.scope?.main_deliverables?.[0] || parseField([
            /תחום\s*[:\-]?\s*([^\n]{3,50})/i,
            /סיווג\s*[:\-]?\s*([^\n]{3,50})/i,
          ]),
          price_weight: parseField([
            /משקל\s*(?:ה)?מחיר\s*[:\-]?\s*(\d+%?)/i,
            /מחיר\s*[:\-]?\s*(\d+)%/i,
            /(\d+)%\s*מחיר/i,
          ]),
          quality_weight: parseField([
            /משקל\s*(?:ה)?איכות\s*[:\-]?\s*(\d+%?)/i,
            /איכות\s*[:\-]?\s*(\d+)%/i,
            /(\d+)%\s*איכות/i,
          ]),
        };

        // Extract definitions
        const definitions: Array<{term: string; definition: string}> = [];
        const defPattern = /["״]([^"״]+)["״]\s*[-–:]\s*([^\n]+)/g;
        let match;
        while ((match = defPattern.exec(documentText)) !== null) {
          definitions.push({ term: match[1], definition: match[2] });
        }

        // Build summary from SOW analysis
        const summaryParts = [];
        if (result.scope?.main_deliverables?.length) {
          summaryParts.push(`תחומים עיקריים: ${result.scope.main_deliverables.slice(0, 3).join(', ')}`);
        }
        if (result.risks?.length) {
          const highRisks = result.risks.filter(r => r.severity === 'HIGH').length;
          if (highRisks > 0) summaryParts.push(`זוהו ${highRisks} סיכונים גבוהים`);
        }

        return {
          success: true,
          metadata,
          definitions: definitions.slice(0, 10),
          document_type: 'הזמנה להציע הצעות',
          summary: summaryParts.join('. ') || 'המסמך עובד בהצלחה',
        };
      } catch (error) {
        // Return basic parsed data even on error
        return {
          success: false,
          metadata: {
            tender_number: 'לא זוהה',
            tender_name: fileName || 'לא זוהה',
            issuing_body: 'לא זוהה',
            publish_date: 'לא זוהה',
            submission_deadline: 'לא זוהה',
            clarification_deadline: 'לא זוהה',
            guarantee_amount: 'לא זוהה',
            contract_period: 'לא זוהה',
            category: 'לא זוהה',
            price_weight: 'לא זוהה',
            quality_weight: 'לא זוהה',
          },
          definitions: [],
          document_type: 'לא זוהה',
          summary: error instanceof Error ? error.message : 'שגיאה בניתוח',
        };
      }
    },
  },

  // ==================== ORGANIZATIONS ====================
  organizations: {
    get: (id: string) => supabaseFetch<Organization[]>(`organizations?id=eq.${id}`).then(r => r[0] || null),

    create: (data: Partial<Organization>) => supabaseFetch<Organization[]>('organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(r => r[0]),

    exists: async (id: string): Promise<boolean> => {
      try {
        const org = await supabaseFetch<Organization[]>(`organizations?id=eq.${id}&select=id`);
        return org && org.length > 0;
      } catch {
        return false;
      }
    },

    ensureExists: async (id: string, defaultData: Partial<Organization>): Promise<Organization> => {
      try {
        // Check if organization exists
        const existing = await supabaseFetch<Organization[]>(`organizations?id=eq.${id}`);
        if (existing && existing.length > 0) {
          console.log(`Organization ${id} already exists`);
          return existing[0];
        }

        // Create organization if it doesn't exist
        console.log(`Creating organization ${id}...`);
        const created = await supabaseFetch<Organization[]>('organizations', {
          method: 'POST',
          body: JSON.stringify({ id, ...defaultData }),
        });
        console.log(`Organization ${id} created successfully`);
        return created[0];
      } catch (error) {
        console.error('Error ensuring organization exists:', error);
        throw error;
      }
    },
  },

  // ==================== LEGACY (backward compatibility) ====================
  getTenders: () => supabaseFetch<Tender[]>('tenders?select=*&order=created_at.desc'),
  getTender: (id: string) => supabaseFetch<Tender[]>(`tenders?id=eq.${id}`).then(r => r[0]),
  getGateConditions: (tenderId: string) =>
    supabaseFetch<GateCondition[]>(`gate_conditions?tender_id=eq.${tenderId}&order=condition_number`),
  getCompetitors: (orgId: string) =>
    supabaseFetch<Competitor[]>(`competitors?org_id=eq.${orgId}`),
};

// ==================== FULL ANALYSIS PIPELINE ====================

export async function runFullAnalysis(tenderId: string, orgId: string, onProgress?: (step: string) => void) {
  const results: Record<string, unknown> = {};

  const steps = [
    { name: 'gates', label: 'Gate Matching', fn: () => api.workflows.matchGates(tenderId, orgId) },
    { name: 'clarifications', label: 'Clarifications', fn: () => api.workflows.getClarifications(tenderId, orgId) },
    { name: 'strategic', label: 'Strategic Questions', fn: () => api.workflows.getStrategicQuestions(tenderId, orgId) },
    { name: 'requiredDocs', label: 'Required Documents', fn: () => api.workflows.getRequiredDocs(tenderId, orgId) },
    { name: 'competitors', label: 'Competitor Mapping', fn: () => api.workflows.mapCompetitors(tenderId, orgId) },
    { name: 'pricing', label: 'Pricing Intelligence', fn: () => api.workflows.getPricingIntel(tenderId, orgId) },
    { name: 'competitive', label: 'Competitive Intelligence', fn: () => api.workflows.getCompetitiveIntel(tenderId, orgId) },
    { name: 'decision', label: 'Final Decision', fn: () => api.workflows.getFinalDecision(tenderId, orgId) },
  ];

  for (const step of steps) {
    onProgress?.(step.label);
    try {
      results[step.name] = await step.fn();
    } catch (error) {
      results[step.name] = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  return results;
}
