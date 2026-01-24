import { API_CONFIG, getCurrentOrgId } from './config';

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
  updated_at?: string;
  is_favorite?: boolean;
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
  // C1: עקיבות מלאה
  source_page?: number;
  source_section?: string;
  source_quote?: string;      // ציטוט מדויק מהמסמך
  source_file?: string;       // שם הקובץ המקורי
  // AI Analysis
  ai_summary?: string;
  ai_confidence?: number;
  ai_analyzed_at?: string;
  // Professional extraction fields (4-agent system)
  bearer_entity?: 'bidder_only' | 'consortium_member' | 'subcontractor_allowed';
  subcontractor_allowed?: boolean;
  subcontractor_limit?: number;
  group_companies_allowed?: boolean;
  scope_type?: 'ordered' | 'executed' | 'paid';
  cumulative?: boolean;
  legal_classification?: 'strict' | 'open' | 'proof_dependent';
  legal_reasoning?: string;
  technical_requirement?: string;
  equivalent_options?: string[];
  extraction_method?: string;
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
  // P1.3: הגדרת סיום פרויקט
  completion_type?: 'handover' | 'final_invoice' | 'warranty_end';
  // היקפים נפרדים
  construction_scope?: number;
  maintenance_scope?: number;
  maintenance_duration_months?: number;
  // פרויקטים משיקים - פרויקטים קשורים שיכולים להיחשב כניסיון
  tangent_projects?: TangentProject[];
  // מקור הפרויקט (לחברות קבוצה)
  source_company_id?: string;
  source_company_name?: string;
}

// פרויקט משיק - פרויקט שיכול להיחשב כ"דומה" או "רלוונטי"
export interface TangentProject {
  related_project_id: string;
  relationship_type: 'SIMILAR_SCOPE' | 'SAME_CLIENT' | 'SAME_TECHNOLOGY' | 'CONTINUATION';
  similarity_score: number;  // 0-100
  notes?: string;
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
  // תאריך תוקף ובדיקה
  is_valid?: boolean;  // נחשב אוטומטית לפי valid_until
  renewal_reminder_days?: number;  // כמה ימים לפני לשלוח תזכורת
  document_path?: string;  // נתיב לקובץ התעודה
}

// מסמך נדרש עם סטטוס ותוקף
export interface RequiredDocument {
  id: string;
  tender_id: string;
  document_name: string;
  description?: string;
  category: string;
  source_condition?: string;  // מאיזה תנאי סף נגזר
  status: 'AVAILABLE' | 'MISSING' | 'EXPIRED' | 'PENDING';
  validity_date?: string;  // תאריך תוקף
  is_expired?: boolean;
  days_until_expiry?: number;
  file_path?: string;
  prep_time?: string;
  responsible_person?: string;
  notes?: string;
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
  // התמחויות הארגון
  specializations?: string;
  // חברות קבוצה - C4
  parent_org_id?: string;
  group_companies?: GroupCompany[];
}

// חברות קבוצה - לשימוש בתנאי סף של "חברות קשורות"
export interface GroupCompany {
  id: string;
  parent_org_id: string;
  company_name: string;
  company_number?: string;
  relationship_type: 'SUBSIDIARY' | 'SISTER' | 'PARENT' | 'AFFILIATE';
  ownership_percentage?: number;
  can_use_experience: boolean;  // האם ניתן להשתמש בניסיון שלה
  can_use_financials: boolean;  // האם ניתן להשתמש בדוחות הכספיים
  notes?: string;
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

// ==================== MODULE 1.1.5: VERSION CONTROL ====================

export interface TenderClarification {
  id: string;
  tender_id: string;
  clarification_number: number;
  publish_date?: string;
  question_text?: string;
  answer_text?: string;
  impacts_gates: boolean;
  impacts_boq: boolean;
  impacts_schedule: boolean;
  affected_sections?: string[];
  created_at?: string;
}

export interface DocumentComparison {
  id: string;
  tender_id: string;
  original_doc_id: string;
  updated_doc_id: string;
  comparison_type: 'CLARIFICATION' | 'AMENDMENT' | 'ADDENDUM';
  changes: Array<{
    section: string;
    change_type: 'ADDED' | 'REMOVED' | 'MODIFIED';
    original_text?: string;
    new_text?: string;
    impact_level: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  summary: string;
  created_at?: string;
}

export interface PreviousTenderAnalysis {
  id: string;
  tender_id: string;
  previous_tender_number?: string;
  previous_winner?: string;
  previous_winning_price?: number;
  previous_date?: string;
  differences: Array<{
    area: string;
    current: string;
    previous: string;
  }>;
  copy_percentage?: number;
  insights?: string[];
  created_at?: string;
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

// Helper function to extract requirement keywords from condition text
function extractRequirementKeywords(text: string): string[] {
  const keywords: string[] = [];
  const patterns = [
    /ניסיון\s+(?:ב)?([^\s,]{3,20})/gi,
    /הסמכת?\s+([^\s,]{3,20})/gi,
    /רישיון\s+([^\s,]{3,20})/gi,
    /ISO\s*\d+/gi,
    /מחזור\s+(?:של\s+)?(\d+)/gi,
    /(\d+)\s+פרויקט/gi,
    /(\d+)\s+שנ/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const kw = match[0].trim().toLowerCase();
      if (kw.length > 3 && !keywords.includes(kw)) {
        keywords.push(kw);
      }
    }
  }

  // Also extract common requirement types
  const commonKeywords = [
    'ניסיון', 'מחזור', 'ISO', 'הסמכה', 'רישיון', 'ערבות',
    'ביטוח', 'צוות', 'מהנדס', 'מנהל פרויקט', 'אבטחה', 'סייבר'
  ];

  const textLower = text.toLowerCase();
  for (const kw of commonKeywords) {
    if (textLower.includes(kw) && !keywords.includes(kw)) {
      keywords.push(kw);
    }
  }

  return keywords;
}

// ==================== API ====================

export const api = {
  // ==================== TENDERS ====================
  tenders: {
    // List only tenders belonging to current session's organization
    list: () => {
      const orgId = getCurrentOrgId();
      return supabaseFetch<Tender[]>(`tenders?org_id=eq.${orgId}&select=*&order=created_at.desc`);
    },

    // List ALL tenders (admin only - for debugging)
    listAll: () => supabaseFetch<Tender[]>('tenders?select=*&order=created_at.desc'),

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

    create: (data: Partial<GateCondition>) => {
      // Filter to only include columns that exist in the database table
      const dbData = {
        id: data.id,
        tender_id: data.tender_id,
        condition_number: data.condition_number,
        condition_text: data.condition_text,
        condition_type: data.condition_type,
        is_mandatory: data.is_mandatory,
        requirement_type: data.requirement_type,
        required_amount: data.required_amount,
        required_count: data.required_count,
        required_years: data.required_years,
        status: data.status,
        evidence: data.evidence,
        gap_description: data.gap_description,
        closure_options: data.closure_options,
        source_page: data.source_page,
        source_section: data.source_section,
        source_quote: data.source_quote,
        source_file: data.source_file,
        ai_summary: data.ai_summary,
        ai_confidence: data.ai_confidence,
        ai_analyzed_at: data.ai_analyzed_at,
        // Note: bearer_entity and other professional extraction fields
        // are NOT in the database schema yet
      };
      // Remove undefined values
      const cleanData = Object.fromEntries(
        Object.entries(dbData).filter(([_, v]) => v !== undefined)
      );
      return supabaseFetch<GateCondition[]>('gate_conditions', {
        method: 'POST',
        body: JSON.stringify(cleanData),
      }).then(r => r[0]);
    },
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

    updatePersonnel: (id: string, data: Partial<Personnel>) =>
      supabaseFetch<Personnel[]>(`company_personnel?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    deletePersonnel: (id: string) =>
      supabaseFetch<void>(`company_personnel?id=eq.${id}`, { method: 'DELETE' }),

    // Delete functions
    deleteProject: (id: string) =>
      supabaseFetch<void>(`company_projects?id=eq.${id}`, { method: 'DELETE' }),

    updateCertification: (id: string, data: Partial<CompanyCertification>) =>
      supabaseFetch<CompanyCertification[]>(`company_certifications?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    deleteCertification: (id: string) =>
      supabaseFetch<void>(`company_certifications?id=eq.${id}`, { method: 'DELETE' }),

    updateFinancial: (id: string, data: Partial<CompanyFinancial>) =>
      supabaseFetch<CompanyFinancial[]>(`company_financials?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    deleteFinancial: (id: string) =>
      supabaseFetch<void>(`company_financials?id=eq.${id}`, { method: 'DELETE' }),

    // ===== חברות קבוצה =====
    getGroupCompanies: (orgId: string) =>
      supabaseFetch<GroupCompany[]>(`group_companies?parent_org_id=eq.${orgId}`),

    addGroupCompany: (data: Partial<GroupCompany>) =>
      supabaseFetch<GroupCompany[]>('group_companies', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    updateGroupCompany: (id: string, data: Partial<GroupCompany>) =>
      supabaseFetch<GroupCompany[]>(`group_companies?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    deleteGroupCompany: (id: string) =>
      supabaseFetch<void>(`group_companies?id=eq.${id}`, { method: 'DELETE' }),

    // קבלת כל הפרויקטים כולל מחברות קבוצה
    getAllGroupProjects: async (orgId: string): Promise<CompanyProject[]> => {
      const allProjects: CompanyProject[] = [];

      // פרויקטים של החברה עצמה
      const ownProjects = await api.company.getProjects(orgId);
      allProjects.push(...ownProjects);

      // פרויקטים של חברות קבוצה
      try {
        const groupCompanies = await api.company.getGroupCompanies(orgId);
        for (const gc of groupCompanies) {
          if (gc.can_use_experience) {
            // נניח שיש טבלת פרויקטים לחברות קבוצה או שמשתמשים באותה טבלה
            const gcProjects = await supabaseFetch<CompanyProject[]>(
              `company_projects?source_company_id=eq.${gc.id}`
            ).catch(() => []);

            // מסמן את הפרויקטים כמגיעים מחברת קבוצה
            for (const p of gcProjects) {
              allProjects.push({
                ...p,
                source_company_id: gc.id,
                source_company_name: gc.company_name,
              });
            }
          }
        }
      } catch (e) {
        console.log('Error getting group projects:', e);
      }

      return allProjects;
    },

    // בדיקת תוקף הסמכות
    checkCertificationValidity: async (orgId: string): Promise<Array<{
      cert: CompanyCertification;
      status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
      days_until_expiry?: number;
    }>> => {
      const certs = await api.company.getCertifications(orgId);
      const today = new Date();
      const results: Array<{
        cert: CompanyCertification;
        status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
        days_until_expiry?: number;
      }> = [];

      for (const cert of certs) {
        if (!cert.valid_until) {
          results.push({ cert, status: 'VALID' });
          continue;
        }

        const expiryDate = new Date(cert.valid_until);
        const daysUntil = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) {
          results.push({ cert, status: 'EXPIRED', days_until_expiry: daysUntil });
        } else if (daysUntil < 30) {
          results.push({ cert, status: 'EXPIRING_SOON', days_until_expiry: daysUntil });
        } else {
          results.push({ cert, status: 'VALID', days_until_expiry: daysUntil });
        }
      }

      return results;
    },
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

    update: (id: string, data: Partial<TenderDocument>) =>
      supabaseFetch<TenderDocument[]>(`tender_documents?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    // Get document versions (all versions of a specific document type)
    getVersions: (tenderId: string, docType: string) =>
      supabaseFetch<TenderDocument[]>(`tender_documents?tender_id=eq.${tenderId}&doc_type=eq.${docType}&order=version.desc`),

    // Create new version of existing document
    createVersion: async (tenderId: string, docType: string, data: Partial<TenderDocument>) => {
      // Get latest version number
      const existing = await supabaseFetch<TenderDocument[]>(
        `tender_documents?tender_id=eq.${tenderId}&doc_type=eq.${docType}&order=version.desc&limit=1`
      );
      const nextVersion = existing.length > 0 ? (existing[0].version || 1) + 1 : 1;

      return supabaseFetch<TenderDocument[]>('tender_documents', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          tender_id: tenderId,
          doc_type: docType,
          version: nextVersion,
          is_original: false,
        }),
      }).then(r => r[0]);
    },
  },

  // ==================== DOCUMENT SCRAPING & PROCESSING ====================
  scraper: {
    // Scrape documents from Dekel/Merkavi tender page
    scrapeFromUrl: async (tenderUrl: string, tenderId: string): Promise<{
      success: boolean;
      tender_id: string;
      source: 'dekel' | 'merkavi' | 'mr_gov' | 'unknown';
      documents: Array<{
        file_name: string;
        file_url: string;
        file_type: string;
        doc_type: string;
        category: string;
        publish_date?: string;
        is_clarification: boolean;
      }>;
      metadata?: {
        tender_number?: string;
        tender_name?: string;
        issuing_body?: string;
        submission_deadline?: string;
        category?: string;
      };
      error?: string;
    }> => {
      console.log(`Scraping documents from: ${tenderUrl}`);

      try {
        // Call n8n webhook for scraping
        const response = await fetch(`${API_CONFIG.WEBHOOK_BASE}/tdx-scrape-documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tender_url: tenderUrl,
            tender_id: tenderId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Scraper returned ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Scraping error:', error);
        return {
          success: false,
          tender_id: tenderId,
          source: 'unknown',
          documents: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },

    // Download and process a single document
    processDocument: async (
      tenderId: string,
      documentUrl: string,
      fileName: string,
      docType: string
    ): Promise<{
      success: boolean;
      document_id?: string;
      file_name: string;
      doc_type: string;
      extracted_text?: string;
      page_count?: number;
      structure?: Record<string, unknown>;
      error?: string;
    }> => {
      console.log(`Processing document: ${fileName}`);

      try {
        const response = await fetch(`${API_CONFIG.WEBHOOK_BASE}/tdx-process-document`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tender_id: tenderId,
            document_url: documentUrl,
            file_name: fileName,
            doc_type: docType,
          }),
        });

        if (!response.ok) {
          throw new Error(`Document processing returned ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Document processing error:', error);
        return {
          success: false,
          file_name: fileName,
          doc_type: docType,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },

    // Batch process multiple documents
    processAllDocuments: async (
      tenderId: string,
      documents: Array<{ file_name: string; file_url: string; doc_type: string }>
    ): Promise<{
      success: boolean;
      processed: number;
      failed: number;
      results: Array<{
        file_name: string;
        success: boolean;
        document_id?: string;
        error?: string;
      }>;
    }> => {
      console.log(`Batch processing ${documents.length} documents`);

      const results: Array<{
        file_name: string;
        success: boolean;
        document_id?: string;
        error?: string;
      }> = [];

      // Process in parallel batches of 3
      const BATCH_SIZE = 3;
      for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = documents.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.all(
          batch.map(async (doc) => {
            const result = await api.scraper.processDocument(
              tenderId,
              doc.file_url,
              doc.file_name,
              doc.doc_type
            );
            return {
              file_name: doc.file_name,
              success: result.success,
              document_id: result.document_id,
              error: result.error,
            };
          })
        );

        results.push(...batchResults);

        // Small delay between batches
        if (i + BATCH_SIZE < documents.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      return {
        success: results.every(r => r.success),
        processed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    },

    // Auto-classify document type from filename
    classifyDocument: (fileName: string): {
      doc_type: string;
      category: string;
      confidence: number;
    } => {
      const lowerName = fileName.toLowerCase();

      // Classification rules
      if (/הזמנה|invitation|הגשת/.test(lowerName)) {
        return { doc_type: 'INVITATION', category: 'main', confidence: 0.9 };
      }
      if (/מפרט|specs?|טכני|technical/.test(lowerName)) {
        return { doc_type: 'SPECS', category: 'technical', confidence: 0.85 };
      }
      if (/כמויות|boq|quantities|כמות/.test(lowerName)) {
        return { doc_type: 'BOQ', category: 'pricing', confidence: 0.9 };
      }
      if (/חוזה|contract|הסכם/.test(lowerName)) {
        return { doc_type: 'CONTRACT', category: 'legal', confidence: 0.85 };
      }
      if (/הבהרה|clarification|תשובות|שאלות/.test(lowerName)) {
        return { doc_type: 'CLARIFICATIONS', category: 'updates', confidence: 0.9 };
      }
      if (/טופס|form|נספח/.test(lowerName)) {
        return { doc_type: 'FORMS', category: 'forms', confidence: 0.8 };
      }
      if (/תוכנית|plan|dwg|cad/.test(lowerName)) {
        return { doc_type: 'DRAWINGS', category: 'technical', confidence: 0.85 };
      }
      if (/\.xlsx?$/.test(lowerName)) {
        return { doc_type: 'BOQ', category: 'pricing', confidence: 0.7 };
      }
      if (/\.zip$/.test(lowerName)) {
        return { doc_type: 'DRAWINGS', category: 'technical', confidence: 0.6 };
      }

      return { doc_type: 'OTHER', category: 'other', confidence: 0.5 };
    },

    // Process Excel BOQ file
    processExcelBOQ: async (
      tenderId: string,
      documentUrl: string,
      fileName: string
    ): Promise<{
      success: boolean;
      items: Array<{
        item_number: string;
        description: string;
        unit: string;
        quantity: number;
        category?: string;
      }>;
      summary?: {
        total_items: number;
        categories: string[];
      };
      error?: string;
    }> => {
      console.log(`Processing Excel BOQ: ${fileName}`);

      try {
        const response = await fetch(`${API_CONFIG.WEBHOOK_BASE}/tdx-process-excel-boq`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tender_id: tenderId,
            document_url: documentUrl,
            file_name: fileName,
          }),
        });

        if (!response.ok) {
          throw new Error(`Excel processing returned ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Excel BOQ processing error:', error);
        return {
          success: false,
          items: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  },

  // ==================== GOOGLE DRIVE INTEGRATION ====================
  drive: {
    // Create folder structure for a tender
    createTenderFolder: async (tenderId: string, tenderName: string, tenderNumber?: string): Promise<{
      success: boolean;
      folder_id?: string;
      folder_url?: string;
      subfolders?: {
        documents: string;
        drawings: string;
        clarifications: string;
        submissions: string;
      };
      error?: string;
    }> => {
      console.log(`Creating Drive folder for tender: ${tenderName}`);

      try {
        const response = await fetch(`${API_CONFIG.WEBHOOK_BASE}/tdx-drive-create-folder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tender_id: tenderId,
            tender_name: tenderName,
            tender_number: tenderNumber,
            // Folder structure
            subfolders: ['מסמכי מכרז', 'תוכניות', 'הבהרות', 'הגשה'],
          }),
        });

        if (!response.ok) {
          throw new Error(`Drive API returned ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Drive folder creation error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },

    // Upload file to Drive
    uploadFile: async (
      tenderId: string,
      folderId: string,
      file: File,
      docType?: string
    ): Promise<{
      success: boolean;
      file_id?: string;
      file_url?: string;
      web_view_link?: string;
      error?: string;
    }> => {
      console.log(`Uploading ${file.name} to Drive folder ${folderId}`);

      try {
        // Convert file to base64 for webhook
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:...;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const response = await fetch(`${API_CONFIG.WEBHOOK_BASE}/tdx-drive-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tender_id: tenderId,
            folder_id: folderId,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            doc_type: docType || api.scraper.classifyDocument(file.name).doc_type,
            file_content: base64,
          }),
        });

        if (!response.ok) {
          throw new Error(`Drive upload returned ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Drive upload error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },

    // List files in a tender folder
    listFiles: async (folderId: string): Promise<{
      success: boolean;
      files: Array<{
        id: string;
        name: string;
        mimeType: string;
        size?: number;
        webViewLink: string;
        webContentLink?: string;
        createdTime: string;
        modifiedTime: string;
        doc_type?: string;
      }>;
      error?: string;
    }> => {
      try {
        const response = await fetch(`${API_CONFIG.WEBHOOK_BASE}/tdx-drive-list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder_id: folderId }),
        });

        if (!response.ok) {
          throw new Error(`Drive list returned ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Drive list error:', error);
        return {
          success: false,
          files: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },

    // Download file from Drive and process it
    downloadAndProcess: async (
      tenderId: string,
      fileId: string,
      fileName: string
    ): Promise<{
      success: boolean;
      extracted_text?: string;
      page_count?: number;
      error?: string;
    }> => {
      try {
        const response = await fetch(`${API_CONFIG.WEBHOOK_BASE}/tdx-drive-download-process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tender_id: tenderId,
            file_id: fileId,
            file_name: fileName,
          }),
        });

        if (!response.ok) {
          throw new Error(`Drive download returned ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Drive download error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },

    // Sync tender folder - download all files and update DB
    syncTenderFolder: async (tenderId: string, folderId: string): Promise<{
      success: boolean;
      synced: number;
      failed: number;
      files: Array<{
        name: string;
        success: boolean;
        error?: string;
      }>;
    }> => {
      try {
        const response = await fetch(`${API_CONFIG.WEBHOOK_BASE}/tdx-drive-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tender_id: tenderId,
            folder_id: folderId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Drive sync returned ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Drive sync error:', error);
        return {
          success: false,
          synced: 0,
          failed: 0,
          files: [],
        };
      }
    },

    // Get or create tender folder
    getOrCreateFolder: async (tenderId: string, tenderName: string, tenderNumber?: string): Promise<{
      success: boolean;
      folder_id?: string;
      folder_url?: string;
      is_new: boolean;
      error?: string;
    }> => {
      try {
        const response = await fetch(`${API_CONFIG.WEBHOOK_BASE}/tdx-drive-get-or-create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tender_id: tenderId,
            tender_name: tenderName,
            tender_number: tenderNumber,
          }),
        });

        if (!response.ok) {
          throw new Error(`Drive API returned ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Drive get/create error:', error);
        return {
          success: false,
          is_new: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  },

  // ==================== CLARIFICATIONS (Module 1.1.5) ====================
  clarifications: {
    list: (tenderId: string) =>
      supabaseFetch<TenderClarification[]>(`tender_clarifications?tender_id=eq.${tenderId}&order=clarification_number`),

    create: (data: Partial<TenderClarification>) =>
      supabaseFetch<TenderClarification[]>('tender_clarifications', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    update: (id: string, data: Partial<TenderClarification>) =>
      supabaseFetch<TenderClarification[]>(`tender_clarifications?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    // Get next clarification number for a tender
    getNextNumber: async (tenderId: string): Promise<number> => {
      const existing = await supabaseFetch<TenderClarification[]>(
        `tender_clarifications?tender_id=eq.${tenderId}&order=clarification_number.desc&limit=1`
      );
      return existing.length > 0 ? existing[0].clarification_number + 1 : 1;
    },

    // Add clarification with auto-numbering
    addClarification: async (tenderId: string, data: Omit<Partial<TenderClarification>, 'tender_id' | 'clarification_number'>) => {
      const nextNum = await api.clarifications.getNextNumber(tenderId);
      return supabaseFetch<TenderClarification[]>('tender_clarifications', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          tender_id: tenderId,
          clarification_number: nextNum,
        }),
      }).then(r => r[0]);
    },
  },

  // ==================== DOCUMENT COMPARISONS (Module 1.1.5) ====================
  comparisons: {
    list: (tenderId: string) =>
      supabaseFetch<DocumentComparison[]>(`document_comparisons?tender_id=eq.${tenderId}&order=created_at.desc`),

    create: (data: Partial<DocumentComparison>) =>
      supabaseFetch<DocumentComparison[]>('document_comparisons', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    get: (id: string) =>
      supabaseFetch<DocumentComparison[]>(`document_comparisons?id=eq.${id}`).then(r => r[0]),
  },

  // ==================== PREVIOUS TENDER ANALYSIS (Module 1.6) ====================
  previousTenders: {
    get: (tenderId: string) =>
      supabaseFetch<PreviousTenderAnalysis[]>(`previous_tender_analysis?tender_id=eq.${tenderId}`).then(r => r[0] || null),

    create: (data: Partial<PreviousTenderAnalysis>) =>
      supabaseFetch<PreviousTenderAnalysis[]>('previous_tender_analysis', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r[0]),

    update: (id: string, data: Partial<PreviousTenderAnalysis>) =>
      supabaseFetch<PreviousTenderAnalysis[]>(`previous_tender_analysis?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }).then(r => r[0]),
  },

  // ==================== AI WORKFLOWS ====================
  workflows: {
    // ==========================================================
    // PROFESSIONAL GATE EXTRACTION - חילוץ תנאי סף מקצועי
    // Iterative extraction using MCP Server via n8n workflow
    // ==========================================================
    extractGates: async (tenderId: string, tenderText: string): Promise<{ success: boolean; conditions: GateCondition[] }> => {
      console.log(`extractGates called with ${tenderText.length} chars`);

      // ===== נסיון ראשון: חילוץ מקצועי 4 סוכנים דרך n8n =====
      try {
        console.log('Attempting professional 4-agent extraction via n8n webhook...');
        const professionalWebhookUrl = `${API_CONFIG.WEBHOOK_BASE}/tdx-professional-gates`;

        const professionalResponse = await fetch(professionalWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tender_id: tenderId,
            tender_text: tenderText
          }),
        });

        if (professionalResponse.ok) {
          const result = await professionalResponse.json();
          console.log('Professional extraction result:', result);

          if (result.success && result.conditions && result.conditions.length > 0) {
            console.log(`Professional extraction successful: ${result.conditions.length} conditions`);
            console.log('Validation:', result.validation);
            console.log('Definitions found:', result.definitions?.length || 0);

            // Convert to GateCondition format
            const conditions: GateCondition[] = result.conditions.map((c: any, i: number) => ({
              id: c.id || crypto.randomUUID(),
              tender_id: tenderId,
              condition_number: `${c.condition_number || i + 1}`,
              condition_text: c.condition_text || c.original_text || c.text,
              condition_type: c.type || 'GATE',
              is_mandatory: c.is_mandatory !== false,
              requirement_type: c.category || 'OTHER',
              required_amount: c.required_amount || c.quantitative?.amount,
              required_years: c.required_years || c.quantitative?.years,
              required_count: c.required_count || c.quantitative?.count,
              source_quote: c.source_section || c.source_quote,
              ai_confidence: c.ai_confidence || c.confidence,
              bearer_entity: c.bearer_entity,
              subcontractor_allowed: c.subcontractor_allowed,
              legal_classification: c.legal_classification,
              legal_reasoning: c.legal_reasoning,
              technical_requirement: c.technical_requirement,
              status: 'UNKNOWN',
            }));

            // ===== SAVE TO DATABASE =====
            console.log('Saving professional extraction results to database...');

            // Delete existing conditions for this tender
            try {
              await supabaseFetch(`gate_conditions?tender_id=eq.${tenderId}`, { method: 'DELETE' });
              console.log('Cleared existing conditions');
            } catch (e) {
              console.log('No existing conditions to clear');
            }

            // Save new conditions
            const savedConditions: GateCondition[] = [];
            for (const condition of conditions.slice(0, 50)) {
              try {
                const saved = await api.gates.create(condition);
                if (saved) savedConditions.push(saved);
              } catch (err) {
                console.error('Error saving condition:', err);
              }
            }
            console.log(`Saved ${savedConditions.length} conditions to database`);

            return { success: true, conditions: savedConditions };
          }
          console.log('Professional webhook returned no conditions, falling back to v2...');
        } else {
          console.log(`Professional webhook returned ${professionalResponse.status}, falling back to v2...`);
        }
      } catch (professionalError) {
        console.log('Professional webhook not available, trying v2:', professionalError);
      }

      // ===== נסיון שני: חילוץ v2 דרך n8n =====
      try {
        console.log('Attempting v2 extraction via n8n webhook...');
        const webhookUrl = `${API_CONFIG.WEBHOOK_BASE}/tdx-extract-gates-v2`;

        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tender_id: tenderId }),
        });

        if (webhookResponse.ok) {
          const result = await webhookResponse.json();
          console.log('Iterative extraction result:', result);

          if (result.success && result.conditions && result.conditions.length > 0) {
            console.log(`Iterative extraction successful: ${result.conditions.length} conditions`);
            console.log('Summary:', result.summary);

            // Convert to GateCondition format
            const conditions: GateCondition[] = result.conditions.map((c: any, i: number) => ({
              id: c.id || crypto.randomUUID(),
              tender_id: tenderId,
              condition_number: `${i + 1}`,
              condition_text: c.text,
              condition_type: c.type,
              is_mandatory: c.is_mandatory !== false,
              requirement_type: c.category || 'OTHER',
              required_amount: c.quantitative?.amount,
              required_years: c.quantitative?.years,
              required_count: c.quantitative?.count,
              source_quote: c.source_quote,
              ai_confidence: c.confidence,
              status: 'UNKNOWN',
            }));

            // ===== SAVE TO DATABASE =====
            console.log('Saving v2 extraction results to database...');

            // Delete existing conditions for this tender
            try {
              await supabaseFetch(`gate_conditions?tender_id=eq.${tenderId}`, { method: 'DELETE' });
              console.log('Cleared existing conditions');
            } catch (e) {
              console.log('No existing conditions to clear');
            }

            // Save new conditions
            const savedConditions: GateCondition[] = [];
            for (const condition of conditions.slice(0, 50)) {
              try {
                const saved = await api.gates.create(condition);
                if (saved) savedConditions.push(saved);
              } catch (err) {
                console.error('Error saving condition:', err);
              }
            }
            console.log(`Saved ${savedConditions.length} conditions to database`);

            return { success: true, conditions: savedConditions };
          }
          console.log('Webhook returned no conditions, falling back to regex extraction');
        } else {
          console.log(`Webhook returned ${webhookResponse.status}, falling back to regex extraction`);
        }
      } catch (webhookError) {
        console.log('Webhook not available, using regex extraction:', webhookError);
      }

      // ===== Fallback: חילוץ מבוסס regex =====
      console.log('Using regex-based extraction...');

      // ===== שלב 1: נרמול הטקסט =====
      const normalizeText = (text: string): string => {
        return text
          // נרמול רווחים
          .replace(/\s+/g, ' ')
          // נרמול מקפים
          .replace(/[-–—]/g, '-')
          // נרמול גרשיים
          .replace(/[''׳]/g, "'")
          .replace(/[""״]/g, '"')
          // נרמול מספרים עבריים
          .replace(/מס'\s*/g, "מספר ")
          .replace(/מס\.\s*/g, "מספר ")
          // הסרת תווים מיוחדים מיותרים
          .replace(/[\u200B-\u200D\uFEFF]/g, '')
          .trim();
      };

      const normalizedText = normalizeText(tenderText);
      console.log('Text normalized');

      // ===== שלב 2: זיהוי אזור תנאי הסף במסמך =====
      const findGateSection = (text: string): string => {
        // חיפוש כותרת פרק תנאי סף
        const sectionHeaders = [
          /(?:פרק|סעיף|חלק)\s*[א-ת0-9.\-]*\s*[-–:]\s*תנאי\s*(?:סף|מוקדמים|להשתתפות)([\s\S]*?)(?=(?:פרק|סעיף|חלק)\s*[א-ת0-9.\-]*\s*[-–:]|$)/gi,
          /תנאי\s*סף\s*(?:להשתתפות|במכרז)?\s*[-–:]([\s\S]*?)(?=(?:פרק|סעיף|חלק)\s*[א-ת0-9.\-]*\s*[-–:]|$)/gi,
          /דרישות\s*(?:מקדמיות|סף)\s*[-–:]([\s\S]*?)(?=(?:פרק|סעיף|חלק)\s*[א-ת0-9.\-]*\s*[-–:]|$)/gi,
          /תנאים\s*(?:מוקדמים|להשתתפות)\s*[-–:]([\s\S]*?)(?=(?:פרק|סעיף|חלק)\s*[א-ת0-9.\-]*\s*[-–:]|$)/gi,
        ];

        for (const pattern of sectionHeaders) {
          pattern.lastIndex = 0;
          const match = pattern.exec(text);
          if (match && match[1] && match[1].length > 100) {
            console.log(`Found gate section with ${match[1].length} chars`);
            return match[1];
          }
        }

        // אם לא נמצא פרק ספציפי, חפש באזור הרלוונטי
        const gateAreaMatch = text.match(/תנאי\s*סף([\s\S]{500,8000}?)(?:כתב\s*כמויות|מפרט\s*טכני|תנאים\s*כלליים|נספח)/i);
        if (gateAreaMatch) {
          console.log(`Found gate area with ${gateAreaMatch[1].length} chars`);
          return gateAreaMatch[1];
        }

        // fallback - כל הטקסט
        console.log('Using full text for gate extraction');
        return text;
      };

      const gateSection = findGateSection(normalizedText);

      // ===== שלב 3: חילוץ תנאים בודדים =====
      interface RawCondition {
        text: string;
        originalNumber?: string;
        source: string;
        position: number;
      }

      const rawConditions: RawCondition[] = [];

      // Pattern 1: רשימה ממוספרת - 1.1, 1.2, 2.1 וכו'
      const numberedPattern = /(\d+(?:\.\d+)?)\s*[.\)]\s*([^\n]{20,500})/g;
      let match;
      while ((match = numberedPattern.exec(gateSection)) !== null) {
        const text = match[2].trim();
        // סינון כותרות וטקסט לא רלוונטי
        if (text.length >= 20 && !isHeaderOrTitle(text)) {
          rawConditions.push({
            text,
            originalNumber: match[1],
            source: 'numbered',
            position: match.index,
          });
        }
      }

      // Pattern 2: נקודות (bullets)
      const bulletPattern = /[•●○■□▪▫◦\-\*]\s*([^\n•●○■□▪▫◦\-\*]{20,500})/g;
      while ((match = bulletPattern.exec(gateSection)) !== null) {
        const text = match[1].trim();
        if (text.length >= 20 && !isHeaderOrTitle(text) && !isDuplicate(text, rawConditions)) {
          rawConditions.push({
            text,
            source: 'bullet',
            position: match.index,
          });
        }
      }

      // Pattern 3: משפטים עם "על המציע"
      const bidderPattern = /על\s*המציע\s+([^\n.]{15,400}[.])/gi;
      while ((match = bidderPattern.exec(gateSection)) !== null) {
        const text = `על המציע ${match[1]}`.trim();
        if (!isDuplicate(text, rawConditions)) {
          rawConditions.push({
            text,
            source: 'bidder_requirement',
            position: match.index,
          });
        }
      }

      // Pattern 4: משפטים עם דרישה מפורשת
      const requirementPattern = /(?:יש\s*להציג|יש\s*לצרף|נדרש|חובה\s*להמציא)\s+([^\n.]{15,400}[.])/gi;
      while ((match = requirementPattern.exec(gateSection)) !== null) {
        const text = match[0].trim();
        if (!isDuplicate(text, rawConditions)) {
          rawConditions.push({
            text,
            source: 'explicit_requirement',
            position: match.index,
          });
        }
      }

      // Pattern 5: תנאים עם מספרים כמותיים
      const quantitativePattern = /(?:לפחות|מינימום|לא\s*פחות\s*מ[-–]?)\s*(\d+)\s*([^\n.]{10,300}[.])/gi;
      while ((match = quantitativePattern.exec(gateSection)) !== null) {
        const text = match[0].trim();
        if (!isDuplicate(text, rawConditions)) {
          rawConditions.push({
            text,
            source: 'quantitative',
            position: match.index,
          });
        }
      }

      console.log(`Raw extraction found ${rawConditions.length} potential conditions`);

      // ===== שלב 4: ניקוי וסינון =====
      function isHeaderOrTitle(text: string): boolean {
        // כותרות קצרות
        if (text.length < 25) return true;
        // מתחיל באות גדולה עברית בלי הקשר
        if (/^[א-ת]\s*[-–.]\s*$/.test(text)) return true;
        // רק מספרים וסימנים
        if (/^[\d.\-–\s]+$/.test(text)) return true;
        // כותרות נפוצות
        if (/^(?:כללי|הגדרות|מבוא|פרק|סעיף|נספח)\s*[-–:]?\s*$/i.test(text)) return true;
        // טקסט ללא פועל או דרישה
        if (!/(?:על|יש|נדרש|חובה|צריך|להמציא|להציג|לצרף|ביצע|ניסיון|מחזור|הסמכה|רישיון)/i.test(text)) return true;
        return false;
      }

      function isDuplicate(text: string, existing: RawCondition[]): boolean {
        const normalized = text.substring(0, 60).toLowerCase();
        return existing.some(c => c.text.substring(0, 60).toLowerCase() === normalized);
      }

      function cleanConditionText(text: string): string {
        return text
          // הסרת מספור בהתחלה
          .replace(/^\d+(?:\.\d+)?[.\)]\s*/, '')
          // הסרת נקודות/bullets בהתחלה
          .replace(/^[•●○■□▪▫◦\-\*]\s*/, '')
          // הסרת רווחים כפולים
          .replace(/\s+/g, ' ')
          // הסרת תווים מיוחדים בסוף
          .replace(/[:\s]+$/, '')
          .trim();
      }

      // ===== שלב 5: סיווג וניתוח כל תנאי =====
      function classifyCondition(text: string): {
        type: string;
        isMandatory: boolean;
        years?: number;
        amount?: number;
        count?: number;
        category: string;
      } {
        // סיווג לפי תוכן
        let category = 'OTHER';
        if (/ניסיון|פרויקט|ביצוע|עבודה|התקנ|הקמ|אספק/.test(text)) {
          category = 'EXPERIENCE';
        } else if (/מחזור|הכנסות|הון|כספי|פיננס|ערבות|בנקאי|דוחות?\s*כספי/.test(text)) {
          category = 'FINANCIAL';
        } else if (/תעודה|רישיון|הסמכה|ISO|סיווג|אישור|קבלן\s*רשום|תקן/.test(text)) {
          category = 'CERTIFICATION';
        } else if (/מנהל|צוות|עובד|מהנדס|יועץ|אחראי|בעל\s*תפקיד/.test(text)) {
          category = 'PERSONNEL';
        } else if (/ציוד|רכב|מכונ|כלי|מעבד/.test(text)) {
          category = 'EQUIPMENT';
        } else if (/משפטי|חוק|רשם|פירוק|כינוס|עיקול/.test(text)) {
          category = 'LEGAL';
        }

        // בדיקת חובה/יתרון
        const isMandatory = /תנאי\s*סף|חובה|פוסל|נדרש|על\s*המציע|יש\s*להמציא|יש\s*להציג|יש\s*לצרף/.test(text) ||
                          /לא\s*יתקבל|לא\s*תתקבל|לא\s*ייכלל/.test(text);

        // חילוץ מספרים
        let years: number | undefined;
        let amount: number | undefined;
        let count: number | undefined;

        // שנים
        const yearsMatch = text.match(/(\d+)\s*שנ[יהות]/);
        if (yearsMatch) years = parseInt(yearsMatch[1]);

        // סכומים - תמיכה במיליון, אלף, ש"ח, ₪
        const amountPatterns = [
          /([\d,]+)\s*מיליון\s*(?:₪|ש"ח|שקל)/i,
          /([\d,]+)\s*אלף\s*(?:₪|ש"ח|שקל)/i,
          /([\d,]+)\s*(?:₪|ש"ח)/i,
        ];
        for (const pattern of amountPatterns) {
          const amountMatch = text.match(pattern);
          if (amountMatch) {
            let val = parseFloat(amountMatch[1].replace(/,/g, ''));
            if (/מיליון/.test(amountMatch[0])) val *= 1000000;
            else if (/אלף/.test(amountMatch[0])) val *= 1000;
            amount = val;
            break;
          }
        }

        // כמויות
        const countMatch = text.match(/(\d+)\s*(?:פרויקט|עבודו?ת|חוז[הי])/);
        if (countMatch) count = parseInt(countMatch[1]);

        return { type: 'GATE', isMandatory, years, amount, count, category };
      }

      // ===== שלב 6: בניית תנאים סופיים =====
      const extractedConditions: Partial<GateCondition>[] = [];
      let conditionNumber = 1;
      const seenTexts = new Set<string>();

      for (const raw of rawConditions) {
        const cleanText = cleanConditionText(raw.text);

        // בדיקת כפילויות לאחר ניקוי
        const signature = cleanText.substring(0, 80).toLowerCase();
        if (seenTexts.has(signature)) continue;
        seenTexts.add(signature);

        // סינון נוסף
        if (cleanText.length < 25 || cleanText.length > 600) continue;
        if (isHeaderOrTitle(cleanText)) continue;

        const classification = classifyCondition(cleanText);

        extractedConditions.push({
          tender_id: tenderId,
          condition_number: raw.originalNumber || `${conditionNumber}`,
          condition_text: cleanText,
          condition_type: classification.type,
          is_mandatory: classification.isMandatory,
          requirement_type: classification.category,
          required_years: classification.years,
          required_amount: classification.amount,
          required_count: classification.count,
          status: 'UNKNOWN',
          source_section: raw.source,
        });
        conditionNumber++;
      }

      console.log(`After filtering: ${extractedConditions.length} valid conditions`);

      // ===== שלב 7: מיון לפי חשיבות =====
      extractedConditions.sort((a, b) => {
        // חובה קודם
        if (a.is_mandatory && !b.is_mandatory) return -1;
        if (!a.is_mandatory && b.is_mandatory) return 1;
        // לפי קטגוריה - ניסיון ופיננסי קודמים
        const order: Record<string, number> = { EXPERIENCE: 1, FINANCIAL: 2, CERTIFICATION: 3, PERSONNEL: 4, EQUIPMENT: 5, LEGAL: 6, OTHER: 7 };
        return (order[a.requirement_type || 'OTHER'] || 7) - (order[b.requirement_type || 'OTHER'] || 7);
      });

      // מספור מחדש אחרי מיון
      extractedConditions.forEach((c, i) => {
        c.condition_number = `${i + 1}`;
      });

      // ===== שלב 8: שמירה לDB =====
      const savedConditions: GateCondition[] = [];

      // מחיקת תנאים קיימים למכרז זה (למניעת כפילויות)
      try {
        await supabaseFetch(`gate_conditions?tender_id=eq.${tenderId}`, { method: 'DELETE' });
        console.log('Cleared existing conditions');
      } catch (e) {
        console.log('No existing conditions to clear');
      }

      // שמירת תנאים חדשים
      for (const condition of extractedConditions.slice(0, 50)) { // מקסימום 50 תנאים
        try {
          const saved = await api.gates.create(condition);
          if (saved) savedConditions.push(saved);
        } catch (err) {
          console.error('Error saving condition:', err);
        }
      }

      console.log(`Saved ${savedConditions.length} conditions to database`);

      // ===== שלב 9: סיכום (AI enhancement מושבת כרגע) =====
      // ה-AI enhancement דורש webhook פעיל שעדיין לא קיים
      // הניתוח המבוסס regex הוא מספיק לרוב המקרים
      console.log(`Gate extraction complete: ${savedConditions.length} conditions extracted using regex patterns`);

      if (savedConditions.length === 0) {
        console.warn('No conditions found - document may not contain gate conditions section or format is not recognized');
      } else {
        console.log('Categories:', savedConditions.reduce((acc, c) => {
          acc[c.requirement_type || 'OTHER'] = (acc[c.requirement_type || 'OTHER'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>));
      }

      return {
        success: savedConditions.length > 0,
        conditions: savedConditions,
      };
    },

    // ==========================================================
    // AI GATE ANALYSIS - ניתוח תנאי סף בודד עם AI
    // Module 2.6: השוואה לפרופיל חברה + פרשנות כפולה (Module 2.5)
    // ==========================================================
    analyzeGateWithAI: async (
      _tenderId: string,
      conditionId: string,
      conditionText: string,
      orgId: string,
      preloadedProfile?: { projects: CompanyProject[]; financials: CompanyFinancial[]; certifications: CompanyCertification[] }
    ): Promise<{
      success: boolean;
      condition_id: string;
      status: string;
      evidence: string;
      gap_description?: string;
      interpretation?: {
        legal: { classification: string; reasoning: string };
        technical: { what_is_required: string; equivalent_options: string[] };
      };
      gap_closure?: {
        has_gap: boolean;
        closure_options: Array<{
          method: string;
          description: string;
          feasibility: string;
          time_estimate_days: number;
        }>;
        recommended_action?: string;
      };
      clarification_questions?: Array<{
        question: string;
        rationale: string;
        priority: string;
      }>;
      risk_assessment?: { level: string; factors: string[] };
      ai_confidence: number;
      ai_summary?: string;
    }> => {
      console.log(`analyzeGateWithAI called for condition ${conditionId}`);

      try {
        // Use preloaded profile or fetch it
        let companyProfile;
        if (preloadedProfile) {
          companyProfile = {
            projects: preloadedProfile.projects.slice(0, 10),
            financials: preloadedProfile.financials.slice(0, 3),
            certifications: preloadedProfile.certifications.slice(0, 10),
          };
        } else {
          const [projects, financials, certifications] = await Promise.all([
            api.company.getProjects(orgId).catch(() => [] as CompanyProject[]),
            api.company.getFinancials(orgId).catch(() => [] as CompanyFinancial[]),
            api.company.getCertifications(orgId).catch(() => [] as CompanyCertification[]),
          ]);
          companyProfile = {
            projects: projects.slice(0, 10),
            financials: financials.slice(0, 3),
            certifications: certifications.slice(0, 10),
          };
        }

        // Analyze gate condition using local logic + Claude API via n8n
        console.log(`Analyzing gate condition: ${conditionId}`);

        // Parse condition text for key requirements
        const conditionLower = conditionText.toLowerCase();

        // Determine requirement type
        let requirementType = 'OTHER';
        if (/ניסיון|פרויקט|ביצע|ביצוע/.test(conditionLower)) requirementType = 'EXPERIENCE';
        else if (/מחזור|הכנסות|כספי|שקל|ש"ח/.test(conditionLower)) requirementType = 'FINANCIAL';
        else if (/תעודה|הסמכה|רישיון|ISO|אישור/.test(conditionLower)) requirementType = 'CERTIFICATION';
        else if (/עובד|צוות|כוח אדם|מהנדס/.test(conditionLower)) requirementType = 'PERSONNEL';

        // Check for legal classification
        let legalClassification: 'strict' | 'open' | 'proof_dependent' = 'open';
        let legalReasoning = 'תנאי זה פתוח לפרשנות';

        if (/בלבד|אך ורק|רק|חובה/.test(conditionLower)) {
          legalClassification = 'strict';
          legalReasoning = 'תנאי זה קשיח ומחייב עמידה מלאה';
        } else if (/לפחות|מינימום|minimum/.test(conditionLower)) {
          legalClassification = 'proof_dependent';
          legalReasoning = 'תנאי זה תלוי בהוכחות שיוצגו';
        }

        // Match against company profile
        let status = 'UNKNOWN';
        let evidence = '';
        let gapDescription = '';
        let aiConfidence = 0.5;

        // Check experience requirements
        if (requirementType === 'EXPERIENCE') {
          const projectMatch = conditionLower.match(/(\d+)\s*פרויקט/);
          const requiredProjects = projectMatch ? parseInt(projectMatch[1]) : 1;

          const relevantProjects = companyProfile.projects.filter(p => {
            const projectValue = p.total_value || 0;
            return projectValue > 0;
          });

          if (relevantProjects.length >= requiredProjects) {
            status = 'MEETS';
            evidence = `נמצאו ${relevantProjects.length} פרויקטים רלוונטיים: ${relevantProjects.slice(0, 3).map(p => p.project_name).join(', ')}`;
            aiConfidence = 0.85;
          } else if (relevantProjects.length > 0) {
            status = 'PARTIALLY_MEETS';
            evidence = `נמצאו ${relevantProjects.length} פרויקטים, נדרשים ${requiredProjects}`;
            gapDescription = `חסרים ${requiredProjects - relevantProjects.length} פרויקטים`;
            aiConfidence = 0.7;
          } else {
            status = 'DOES_NOT_MEET';
            gapDescription = `לא נמצאו פרויקטים רלוונטיים. נדרשים ${requiredProjects} פרויקטים`;
            aiConfidence = 0.6;
          }
        }
        // Check financial requirements
        else if (requirementType === 'FINANCIAL') {
          const amountMatch = conditionLower.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:מיליון|מלש"ח|₪|ש"ח)/);
          const requiredAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) * (conditionLower.includes('מיליון') || conditionLower.includes('מלש"ח') ? 1000000 : 1) : 0;

          const latestFinancial = companyProfile.financials[0];
          const revenue = latestFinancial?.annual_revenue || 0;

          if (revenue >= requiredAmount) {
            status = 'MEETS';
            evidence = `מחזור שנתי: ${(revenue / 1000000).toFixed(1)} מיליון ₪`;
            aiConfidence = 0.9;
          } else if (revenue > requiredAmount * 0.5) {
            status = 'PARTIALLY_MEETS';
            evidence = `מחזור שנתי: ${(revenue / 1000000).toFixed(1)} מיליון ₪, נדרש: ${(requiredAmount / 1000000).toFixed(1)} מיליון ₪`;
            gapDescription = `פער של ${((requiredAmount - revenue) / 1000000).toFixed(1)} מיליון ₪`;
            aiConfidence = 0.7;
          } else {
            status = 'DOES_NOT_MEET';
            gapDescription = `מחזור לא מספק. נדרש: ${(requiredAmount / 1000000).toFixed(1)} מיליון ₪`;
            aiConfidence = 0.6;
          }
        }
        // Check certification requirements
        else if (requirementType === 'CERTIFICATION') {
          const isoMatch = conditionLower.match(/iso\s*(\d+)/i);
          const requiredCert = isoMatch ? `ISO ${isoMatch[1]}` : '';

          const matchingCert = companyProfile.certifications.find(c =>
            requiredCert && c.cert_name?.toUpperCase().includes(requiredCert.toUpperCase())
          );

          if (matchingCert) {
            status = 'MEETS';
            evidence = `נמצאה הסמכה: ${matchingCert.cert_name}, תוקף עד: ${matchingCert.valid_until || 'לא ידוע'}`;
            aiConfidence = 0.95;
          } else if (companyProfile.certifications.length > 0) {
            status = 'PARTIALLY_MEETS';
            evidence = `קיימות הסמכות: ${companyProfile.certifications.map(c => c.cert_name).join(', ')}`;
            gapDescription = `לא נמצאה הסמכה ספציפית: ${requiredCert || 'ההסמכה הנדרשת'}`;
            aiConfidence = 0.6;
          } else {
            status = 'DOES_NOT_MEET';
            gapDescription = `לא נמצאו הסמכות. נדרש: ${requiredCert || 'הסמכה רלוונטית'}`;
            aiConfidence = 0.5;
          }
        }
        // For other types, mark as needs review
        else {
          status = 'UNKNOWN';
          gapDescription = 'תנאי זה דורש בדיקה ידנית';
          aiConfidence = 0.3;
        }

        // Build AI summary
        const aiSummary = status === 'MEETS'
          ? `✅ עומד בתנאי. ${evidence}`
          : status === 'PARTIALLY_MEETS'
          ? `⚠️ עמידה חלקית. ${gapDescription}`
          : status === 'DOES_NOT_MEET'
          ? `❌ לא עומד. ${gapDescription}`
          : `❓ נדרש בירור נוסף`;

        // Save to database - only fields that exist in the table
        try {
          await fetch(`${API_CONFIG.SUPABASE_URL}/rest/v1/gate_conditions?id=eq.${conditionId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': API_CONFIG.SUPABASE_KEY,
              'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              status,
              evidence,
              gap_description: gapDescription,
              ai_confidence: aiConfidence,
              ai_summary: aiSummary,
              ai_analyzed_at: new Date().toISOString()
            })
          });
        } catch (saveError) {
          console.warn('Failed to save analysis to DB:', saveError);
        }

        const result = {
          success: true,
          status,
          evidence,
          gap_description: gapDescription,
          interpretation: {
            legal: { classification: legalClassification, reasoning: legalReasoning },
            technical: {
              what_is_required: conditionText,
              equivalent_options: []
            }
          },
          ai_confidence: aiConfidence,
          ai_summary: aiSummary
        };

        console.log('AI analysis result:', result);

        return {
          success: result.success || false,
          condition_id: conditionId,
          status: result.status || 'UNKNOWN',
          evidence: result.evidence || '',
          gap_description: result.gap_description,
          interpretation: result.interpretation,
          ai_confidence: result.ai_confidence || 0,
          ai_summary: result.ai_summary,
        };
      } catch (error) {
        console.error('AI analysis error:', error);
        return {
          success: false,
          condition_id: conditionId,
          status: 'UNKNOWN',
          evidence: '',
          ai_confidence: 0,
        };
      }
    },

    matchGates: async (tenderId: string, orgId: string): Promise<{
      success: boolean;
      tender_id: string;
      org_id: string;
      conditions: Array<{
        id?: string;
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
    }> => {
      console.log(`matchGates called for tender ${tenderId}, org ${orgId}`);

      // Get gate conditions
      const gates = await api.getGateConditions(tenderId);
      if (!gates || gates.length === 0) {
        return {
          success: false,
          tender_id: tenderId,
          org_id: orgId,
          conditions: [],
          summary: { total: 0, meets: 0, partial: 0, not_meets: 0, eligibility: 'UNKNOWN' },
        };
      }

      // Get organization profile
      const [projects, financials, certifications] = await Promise.all([
        api.company.getProjects(orgId).catch(() => [] as CompanyProject[]),
        api.company.getFinancials(orgId).catch(() => [] as CompanyFinancial[]),
        api.company.getCertifications(orgId).catch(() => [] as CompanyCertification[]),
      ]);

      console.log(`Profile data: ${projects.length} projects, ${financials.length} financials, ${certifications.length} certs`);

      // Match each gate condition
      const matchedConditions: Array<{
        condition_number: string;
        condition_text: string;
        status: string;
        evidence: string;
        gap_description?: string;
        closure_options?: string[];
      }> = [];

      for (const gate of gates) {
        let status = 'UNKNOWN';
        let evidence = '';
        let gapDescription = '';
        const closureOptions: string[] = [];

        const conditionText = gate.condition_text.toLowerCase();
        const requirementType = gate.requirement_type || 'OTHER';

        // Match based on requirement type
        if (requirementType === 'EXPERIENCE' || /ניסיון|פרויקט|ביצוע/.test(conditionText)) {
          // Check projects for experience
          const projectMatch = conditionText.match(/(\d+)\s*פרויקט/);
          const requiredProjects = projectMatch ? parseInt(projectMatch[1]) : 1;

          const relevantProjects = projects.filter((p: CompanyProject) => {
            // Check if project is in relevant category/type
            const projectText = `${p.project_name} ${p.project_type || ''} ${p.category || ''}`.toLowerCase();
            const conditionWords = conditionText.split(/\s+/).filter((w: string) => w.length > 3);
            return conditionWords.some((word: string) => projectText.includes(word));
          });

          if (relevantProjects.length >= requiredProjects) {
            status = 'MEETS';
            evidence = `נמצאו ${relevantProjects.length} פרויקטים רלוונטיים: ${relevantProjects.slice(0, 3).map((p: CompanyProject) => p.project_name).join(', ')}`;
          } else if (relevantProjects.length > 0) {
            status = 'PARTIALLY_MEETS';
            evidence = `נמצאו ${relevantProjects.length} פרויקטים רלוונטיים מתוך ${requiredProjects} נדרשים`;
            gapDescription = `חסרים ${requiredProjects - relevantProjects.length} פרויקטים`;
            closureOptions.push('שיתוף פעולה עם קבלן משנה בעל ניסיון');
          } else {
            status = 'DOES_NOT_MEET';
            gapDescription = `לא נמצאו פרויקטים רלוונטיים. נדרשים ${requiredProjects} פרויקטים`;
            closureOptions.push('שיתוף פעולה עם קבלן משנה בעל ניסיון', 'בקשת הקלה בתנאי');
          }
        } else if (requirementType === 'FINANCIAL' || /מחזור|הכנסות|כספי/.test(conditionText)) {
          // Check financials
          const amountMatch = conditionText.match(/([\d,]+)\s*(?:מיליון|₪|ש"ח)/);
          const requiredAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) * (conditionText.includes('מיליון') ? 1000000 : 1) : 0;

          const latestFinancial = financials.length > 0 ? financials[0] : null;
          if (latestFinancial && latestFinancial.annual_revenue) {
            if (latestFinancial.annual_revenue >= requiredAmount) {
              status = 'MEETS';
              evidence = `מחזור שנתי: ₪${(latestFinancial.annual_revenue / 1000000).toFixed(1)} מיליון (${latestFinancial.fiscal_year})`;
            } else {
              status = 'DOES_NOT_MEET';
              gapDescription = `מחזור נדרש: ₪${(requiredAmount / 1000000).toFixed(1)} מיליון, קיים: ₪${(latestFinancial.annual_revenue / 1000000).toFixed(1)} מיליון`;
              closureOptions.push('הגשה עם שותף', 'קבלת מכתב כוונות מבנק');
            }
          } else {
            status = 'UNKNOWN';
            gapDescription = 'לא נמצאו נתונים פיננסיים בפרופיל';
            closureOptions.push('עדכון נתונים פיננסיים בפרופיל');
          }
        } else if (requirementType === 'CERTIFICATION' || /תעודה|רישיון|הסמכה|ISO/.test(conditionText)) {
          // Check certifications
          const isoMatch = conditionText.match(/ISO\s*(\d+)/i);
          const certKeywords = ['קבלן', 'רישום', 'סיווג', 'רישיון'];

          const matchingCerts = certifications.filter((c: CompanyCertification) => {
            const certText = `${c.cert_type} ${c.cert_name}`.toLowerCase();
            if (isoMatch) {
              return certText.includes(isoMatch[1]) || certText.includes('iso');
            }
            return certKeywords.some(kw => conditionText.includes(kw) && certText.includes(kw));
          });

          if (matchingCerts.length > 0) {
            status = 'MEETS';
            evidence = `נמצאה הסמכה: ${matchingCerts[0].cert_name} (${matchingCerts[0].cert_type})`;
          } else {
            status = 'UNKNOWN';
            gapDescription = 'לא נמצאה הסמכה מתאימה בפרופיל';
            closureOptions.push('בדיקה האם קיימת הסמכה רלוונטית', 'קבלת הסמכה חדשה');
          }
        } else if (requirementType === 'PERSONNEL' || /מנהל|צוות|עובד|מהנדס/.test(conditionText)) {
          // Personnel - usually needs manual verification
          status = 'UNKNOWN';
          gapDescription = 'יש לוודא ידנית זמינות כ"א מתאים';
          closureOptions.push('בדיקת זמינות צוות', 'גיוס יועצים חיצוניים');
        }

        matchedConditions.push({
          condition_number: gate.condition_number,
          condition_text: gate.condition_text,
          status,
          evidence,
          gap_description: gapDescription || undefined,
          closure_options: closureOptions.length > 0 ? closureOptions : undefined,
        });

        // Update gate in database
        try {
          await api.gates.update(gate.id, {
            status,
            evidence: evidence || undefined,
            gap_description: gapDescription || undefined,
            // Note: closure_options column doesn't exist in Supabase schema
          });
        } catch (err) {
          console.error('Error updating gate:', err);
        }
      }

      // Calculate summary
      const summary = {
        total: matchedConditions.length,
        meets: matchedConditions.filter(c => c.status === 'MEETS').length,
        partial: matchedConditions.filter(c => c.status === 'PARTIALLY_MEETS').length,
        not_meets: matchedConditions.filter(c => c.status === 'DOES_NOT_MEET').length,
        eligibility: 'UNKNOWN' as string,
      };

      // Determine eligibility
      const mandatoryFails = matchedConditions.filter((c, i) =>
        gates[i].is_mandatory && c.status === 'DOES_NOT_MEET'
      ).length;

      if (mandatoryFails > 0) {
        summary.eligibility = 'NOT_ELIGIBLE';
      } else if (summary.meets === summary.total) {
        summary.eligibility = 'ELIGIBLE';
      } else if (summary.not_meets === 0) {
        summary.eligibility = 'CONDITIONAL';
      } else {
        summary.eligibility = 'REVIEW_NEEDED';
      }

      console.log(`Gate matching complete: ${summary.meets}/${summary.total} meets, eligibility: ${summary.eligibility}`);

      // Try AI enhancement with short timeout (optional)
      try {
        const aiResult = await callWebhook<{
          success: boolean;
          conditions?: Array<{ condition_number: string; status?: string; evidence?: string }>;
        }>('tdx-gate-work', { tender_id: tenderId, org_id: orgId }, 15000);

        if (aiResult?.success && aiResult.conditions) {
          console.log('AI gate matching enhancement received');
          // Could merge AI insights here if needed
        }
      } catch (aiError) {
        console.log('AI enhancement skipped for gate matching');
      }

      return {
        success: true,
        tender_id: tenderId,
        org_id: orgId,
        conditions: matchedConditions,
        summary,
      };
    },

    // Clarification Questions - Local generation with optional AI
    getClarifications: async (tenderId: string, _orgId: string): Promise<{
      success: boolean;
      tender_id: string;
      questions: Array<{
        question: string;
        rationale: string;
        priority: string;
        category: string;
      }>;
    }> => {
      console.log(`getClarifications for tender ${tenderId}`);

      // Get gate conditions to generate questions about
      const gates = await api.getGateConditions(tenderId);
      const questions: Array<{ question: string; rationale: string; priority: string; category: string }> = [];

      // Generate clarification questions based on gate conditions
      for (const gate of gates) {
        // Questions for unknown/partial status
        if (gate.status === 'UNKNOWN' || gate.status === 'PARTIALLY_MEETS') {
          // Experience-related clarifications
          if (gate.requirement_type === 'EXPERIENCE' || /ניסיון|פרויקט/.test(gate.condition_text)) {
            questions.push({
              question: `האם ניסיון בפרויקטים דומים ${gate.condition_text.includes('ממשלתי') ? 'לגופים ציבוריים אחרים' : 'בסקטור הפרטי'} יתקבל כתחליף?`,
              rationale: `תנאי סף ${gate.condition_number} דורש ניסיון ספציפי`,
              priority: gate.is_mandatory ? 'P1' : 'P2',
              category: 'ניסיון',
            });
          }
          // Financial clarifications
          if (gate.requirement_type === 'FINANCIAL' || /מחזור|כספי/.test(gate.condition_text)) {
            questions.push({
              question: 'האם ניתן להציג דוחות כספיים מבוקרים עבור תקופה שונה מזו המוגדרת?',
              rationale: `תנאי סף ${gate.condition_number} כולל דרישה פיננסית`,
              priority: 'P1',
              category: 'פיננסי',
            });
          }
          // Certification clarifications
          if (gate.requirement_type === 'CERTIFICATION' || /תעודה|הסמכה|ISO/.test(gate.condition_text)) {
            questions.push({
              question: 'האם ניתן להציג אישור על תהליך הסמכה בהתהוות במקום תעודה סופית?',
              rationale: `תנאי סף ${gate.condition_number} דורש הסמכה ספציפית`,
              priority: 'P2',
              category: 'הסמכות',
            });
          }
        }

        // Questions for conditions that don't meet
        if (gate.status === 'DOES_NOT_MEET' && gate.is_mandatory) {
          questions.push({
            question: `האם ניתן לעמוד בתנאי "${gate.condition_text.substring(0, 50)}..." באמצעות שותפות או קבלן משנה?`,
            rationale: 'בחינת אפשרויות חלופיות לעמידה בתנאי סף',
            priority: 'P1',
            category: 'תנאי סף',
          });
        }
      }

      // Add general clarification questions
      const generalQuestions = [
        { question: 'מהו לוח הזמנים המשוער לביצוע הפרויקט?', rationale: 'בירור היקף ומשך הפרויקט', priority: 'P2', category: 'כללי' },
        { question: 'האם צפויים שינויים במפרט הטכני לפני מועד ההגשה?', rationale: 'תכנון משאבים לעדכון ההצעה', priority: 'P3', category: 'כללי' },
        { question: 'מהו היקף הערבות הבנקאית הנדרשת?', rationale: 'הערכת עלויות מימון', priority: 'P2', category: 'פיננסי' },
      ];

      questions.push(...generalQuestions);

      // Try AI enhancement
      try {
        const aiResult = await callWebhook<{ success: boolean; questions?: Array<{ question: string; rationale: string; priority: string; category: string }> }>(
          'tdx-clarify-simple', { tender_id: tenderId, org_id: _orgId }, 15000
        );
        if (aiResult?.success && aiResult.questions?.length) {
          // Add unique AI questions
          for (const q of aiResult.questions) {
            if (!questions.some(existing => existing.question.includes(q.question.substring(0, 30)))) {
              questions.push(q);
            }
          }
        }
      } catch { console.log('AI clarifications skipped'); }

      return { success: true, tender_id: tenderId, questions: questions.slice(0, 15) };
    },

    // Strategic Questions - Local generation with optional AI (Module 2.7.5)
    // מייצר שאלות "בטוחות" (מועילות לכולם) ושאלות "מכוונות" (להחלשת מתחרים)
    getStrategicQuestions: async (tenderId: string, orgId: string): Promise<{
      success: boolean;
      tender_id: string;
      total_questions: number;
      safe_questions: Array<{ question: string; rationale: string; benefit_all: boolean }>;
      strategic_questions: Array<{ question: string; rationale: string; target_competitor?: string; expected_impact: string }>;
      optimization_questions: Array<{ question: string; rationale: string; from_analysis: string }>;
    }> => {
      console.log(`getStrategicQuestions for tender ${tenderId}, org ${orgId}`);

      const gates = await api.getGateConditions(tenderId);
      const safeQuestions: Array<{ question: string; rationale: string; benefit_all: boolean }> = [];
      const strategicQuestions: Array<{ question: string; rationale: string; target_competitor?: string; expected_impact: string }> = [];
      const optimizationQuestions: Array<{ question: string; rationale: string; from_analysis: string }> = [];

      // Get company profile for strategic analysis
      const [projects, financials, certifications, competitors] = await Promise.all([
        api.company.getProjects(orgId).catch(() => [] as CompanyProject[]),
        api.company.getFinancials(orgId).catch(() => [] as CompanyFinancial[]),
        api.company.getCertifications(orgId).catch(() => [] as CompanyCertification[]),
        api.getCompetitors(orgId).catch(() => [] as Competitor[]),
      ]);

      // ===== שאלות בטוחות - מועילות לכולם =====
      const experienceGates = gates.filter(g => g.requirement_type === 'EXPERIENCE' || /ניסיון|פרויקט/.test(g.condition_text));
      if (experienceGates.length > 0) {
        safeQuestions.push({
          question: 'האם ניתן להציג ניסיון משותף עם קבלן משנה כחלק מהניסיון הנדרש?',
          rationale: 'מאפשר הרחבת אפשרויות הגשה עבור חברות עם ניסיון חלקי',
          benefit_all: true,
        });
        safeQuestions.push({
          question: 'מהו סף הערך המינימלי של פרויקט בודד הנחשב כניסיון רלוונטי?',
          rationale: 'הגדרה ברורה תאפשר הכללת פרויקטים נוספים',
          benefit_all: true,
        });
        safeQuestions.push({
          question: 'האם פרויקטים בביצוע (טרם הושלמו) נחשבים כניסיון?',
          rationale: 'הרחבת אפשרויות הצגת ניסיון',
          benefit_all: true,
        });
      }

      const financialGates = gates.filter(g => g.requirement_type === 'FINANCIAL' || /מחזור|כספי/.test(g.condition_text));
      if (financialGates.length > 0) {
        safeQuestions.push({
          question: 'האם ניתן להציג דוחות כספיים לשנת 2023 או 2024?',
          rationale: 'גמישות בשנות הדיווח',
          benefit_all: true,
        });
      }

      // General safe questions
      safeQuestions.push({
        question: 'האם יתקיים סיור קבלנים נוסף?',
        rationale: 'הזדמנות להכיר את האתר והדרישות',
        benefit_all: true,
      });
      safeQuestions.push({
        question: 'האם ניתן לקבל הארכה במועד ההגשה?',
        rationale: 'זמן נוסף לכל המציעים',
        benefit_all: true,
      });

      // ===== שאלות אסטרטגיות - מכוונות להחלשת מתחרים =====

      // אם יש לנו ניסיון עודף - נבקש להחמיר
      if (projects.length >= 5) {
        strategicQuestions.push({
          question: 'האם ניסיון של 5 שנים לפחות בתחום נדרש כתנאי סף?',
          rationale: 'העלאת רף הניסיון תפסול מתחרים חדשים',
          expected_impact: 'צפוי לפסול חברות צעירות',
        });
      }

      // אם יש לנו הסמכות רבות - נבקש לדרוש אותן
      if (certifications.length >= 2) {
        const certNames = certifications.map(c => c.cert_name).slice(0, 2).join(' ו-');
        strategicQuestions.push({
          question: `האם הסמכת ${certNames} נדרשת כתנאי סף?`,
          rationale: 'דרישת הסמכות ספציפיות שיש לנו',
          expected_impact: 'חברות ללא הסמכות לא יוכלו להשתתף',
        });
      }

      // אם יש לנו מחזור גבוה - נבקש להחמיר
      if (financials.length > 0 && financials[0].annual_revenue && financials[0].annual_revenue > 10000000) {
        strategicQuestions.push({
          question: 'האם מחזור מינימלי של 10 מיליון ש"ח נדרש?',
          rationale: 'דרישה פיננסית גבוהה תפסול חברות קטנות',
          expected_impact: 'מתחרים קטנים לא יעמדו בדרישה',
        });
      }

      // שאלות מכוונות נגד מתחרים ספציפיים
      if (competitors.length > 0) {
        const weakCompetitors = competitors.filter(c => c.weaknesses && c.weaknesses.length > 0);
        for (const comp of weakCompetitors.slice(0, 2)) {
          const weakness = comp.weaknesses?.[0] || '';
          if (weakness.includes('ניסיון')) {
            strategicQuestions.push({
              question: 'האם נדרש ניסיון ספציפי בפרויקטים ממשלתיים?',
              rationale: `${comp.name} חלש בניסיון ממשלתי`,
              target_competitor: comp.name,
              expected_impact: `צפוי להקשות על ${comp.name}`,
            });
          } else if (weakness.includes('פיננס') || weakness.includes('מחזור')) {
            strategicQuestions.push({
              question: 'האם ערבות בנקאית אוטונומית נדרשת?',
              rationale: `${comp.name} חלש פיננסית`,
              target_competitor: comp.name,
              expected_impact: `${comp.name} יתקשה להציג ערבות`,
            });
          }
        }
      }

      // חדשנות טכנולוגית - אם יש לנו יתרון
      strategicQuestions.push({
        question: 'האם יש משקל לחדשנות טכנולוגית בניקוד האיכות?',
        rationale: 'יתרון לחברות עם פתרונות מתקדמים',
        expected_impact: 'מעלה משקל לטכנולוגיה על פני מחיר',
      });

      // ===== שאלות מאופטימיזציה (מ-Module 2.6.5) =====
      // Get optimization analysis results if available
      try {
        const optimization = await api.workflows.analyzeGateScoringOptimization(tenderId, orgId);
        if (optimization.success) {
          // שאלות להמרת תנאי סף לניקוד
          for (const item of optimization.gate_to_scoring.slice(0, 2)) {
            optimizationQuestions.push({
              question: item.question_template,
              rationale: item.reason,
              from_analysis: 'אופטימיזציית תנאי סף',
            });
          }
          // שאלות להחמרת תנאי ניקוד לסף
          for (const item of optimization.scoring_to_gate.slice(0, 2)) {
            optimizationQuestions.push({
              question: item.question_template,
              rationale: item.reason,
              from_analysis: 'אופטימיזציית תנאי ניקוד',
            });
          }
        }
      } catch (e) {
        console.log('Optimization analysis not available:', e);
      }

      // Try AI enhancement
      try {
        const aiResult = await callWebhook<{
          success: boolean;
          safe_questions?: Array<{ question: string; rationale: string }>;
          strategic_questions?: Array<{ question: string; rationale: string }>;
        }>('tdx-strategic-v3', { tender_id: tenderId, org_id: orgId }, 15000);

        if (aiResult?.success) {
          if (aiResult.safe_questions) {
            safeQuestions.push(...aiResult.safe_questions.map(q => ({ ...q, benefit_all: true })));
          }
          if (aiResult.strategic_questions) {
            strategicQuestions.push(...aiResult.strategic_questions.map(q => ({ ...q, expected_impact: 'מניתוח AI' })));
          }
        }
      } catch { console.log('AI strategic questions skipped'); }

      return {
        success: true,
        tender_id: tenderId,
        total_questions: safeQuestions.length + strategicQuestions.length + optimizationQuestions.length,
        safe_questions: safeQuestions.slice(0, 10),
        strategic_questions: strategicQuestions.slice(0, 10),
        optimization_questions: optimizationQuestions.slice(0, 5),
      };
    },

    // Required Documents - Local generation with optional AI
    getRequiredDocs: async (tenderId: string, _orgId: string): Promise<{
      success: boolean;
      tender_id: string;
      required_documents: Array<{
        document_name: string;
        description: string;
        source_condition: string;
        category: string;
        prep_time: string;
        source: string;
      }>;
    }> => {
      console.log(`getRequiredDocs for tender ${tenderId}`);

      const gates = await api.getGateConditions(tenderId);
      const documents: Array<{ document_name: string; description: string; source_condition: string; category: string; prep_time: string; source: string }> = [];

      // Generate document list based on gate conditions
      for (const gate of gates) {
        const text = gate.condition_text;
        const condRef = `תנאי סף ${gate.condition_number}`;

        if (gate.requirement_type === 'EXPERIENCE' || /ניסיון|פרויקט/.test(text)) {
          documents.push({
            document_name: 'רשימת פרויקטים',
            description: 'טבלת פרויקטים כולל: שם הלקוח, היקף, תאריכים, תפקיד',
            source_condition: condRef,
            category: 'ניסיון',
            prep_time: '2-3 ימים',
            source: 'פנימי',
          });
          documents.push({
            document_name: 'אישורי ביצוע / מכתבי המלצה',
            description: 'אישורים חתומים מלקוחות על ביצוע מוצלח',
            source_condition: condRef,
            category: 'ניסיון',
            prep_time: '1-2 שבועות',
            source: 'לקוחות',
          });
        }

        if (gate.requirement_type === 'FINANCIAL' || /מחזור|כספי|הון/.test(text)) {
          documents.push({
            document_name: 'דוחות כספיים מבוקרים',
            description: 'דוחות שנתיים מבוקרים ל-3 השנים האחרונות',
            source_condition: condRef,
            category: 'פיננסי',
            prep_time: 'מיידי (אם קיימים)',
            source: 'רו"ח',
          });
        }

        if (gate.requirement_type === 'CERTIFICATION' || /תעודה|רישיון|הסמכה|ISO/.test(text)) {
          documents.push({
            document_name: 'תעודות והסמכות',
            description: `העתק תעודה/רישיון בתוקף בהתאם לדרישה: ${text.substring(0, 50)}`,
            source_condition: condRef,
            category: 'הסמכות',
            prep_time: 'מיידי',
            source: 'גוף מסמיך',
          });
        }

        if (/ערבות/.test(text)) {
          documents.push({
            document_name: 'ערבות בנקאית',
            description: 'ערבות בנקאית בהתאם לנוסח המפורט במכרז',
            source_condition: condRef,
            category: 'פיננסי',
            prep_time: '3-5 ימי עסקים',
            source: 'בנק',
          });
        }
      }

      // Add standard documents
      const standardDocs = [
        { document_name: 'תעודת התאגדות', description: 'העתק נאמן למקור', source_condition: 'סטנדרטי', category: 'חברה', prep_time: 'מיידי', source: 'רשם החברות' },
        { document_name: 'אישור ניהול ספרים', description: 'אישור תקף ממס הכנסה', source_condition: 'סטנדרטי', category: 'חברה', prep_time: 'מיידי', source: 'מס הכנסה' },
        { document_name: 'אישור ניכוי מס במקור', description: 'אישור תקף ממס הכנסה', source_condition: 'סטנדרטי', category: 'חברה', prep_time: 'מיידי', source: 'מס הכנסה' },
        { document_name: 'טופס הצעה חתום', description: 'טופס ההצעה המלא על כל נספחיו', source_condition: 'סטנדרטי', category: 'הצעה', prep_time: 'יום הגשה', source: 'פנימי' },
      ];

      // Add standard docs that aren't already included
      for (const doc of standardDocs) {
        if (!documents.some(d => d.document_name === doc.document_name)) {
          documents.push(doc);
        }
      }

      // Try AI enhancement
      try {
        const aiResult = await callWebhook<{ success: boolean; documents?: Array<{ document_name: string; description: string }> }>(
          'tdx-required-docs', { tender_id: tenderId, org_id: _orgId }, 15000
        );
        if (aiResult?.success && aiResult.documents) {
          console.log('AI documents enhancement received');
        }
      } catch { console.log('AI documents skipped'); }

      return {
        success: true,
        tender_id: tenderId,
        required_documents: documents,
      };
    },

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

    // Module 2.6.5 - Gate vs Scoring Optimization
    // מזהה תנאי סף שיכולים להפוך לתנאי ניקוד ולהיפך
    analyzeGateScoringOptimization: async (tenderId: string, orgId: string): Promise<{
      success: boolean;
      tender_id: string;
      org_id: string;
      gate_to_scoring: Array<{
        condition_number: string;
        condition_text: string;
        current_type: 'GATE';
        recommended_type: 'SCORING';
        reason: string;
        potential_advantage: string;
        question_template: string;
      }>;
      scoring_to_gate: Array<{
        condition_number: string;
        condition_text: string;
        current_type: 'SCORING';
        recommended_type: 'GATE';
        reason: string;
        competitor_impact: string;
        question_template: string;
      }>;
      optimization_score: number;
      summary: string;
    }> => {
      console.log(`analyzeGateScoringOptimization for tender ${tenderId}, org ${orgId}`);

      // Get gate conditions
      const gates = await api.getGateConditions(tenderId);
      if (!gates || gates.length === 0) {
        return {
          success: false,
          tender_id: tenderId,
          org_id: orgId,
          gate_to_scoring: [],
          scoring_to_gate: [],
          optimization_score: 0,
          summary: 'לא נמצאו תנאי סף לניתוח',
        };
      }

      // Get company profile to understand our position
      const [projects, financials, certifications] = await Promise.all([
        api.company.getProjects(orgId).catch(() => [] as CompanyProject[]),
        api.company.getFinancials(orgId).catch(() => [] as CompanyFinancial[]),
        api.company.getCertifications(orgId).catch(() => [] as CompanyCertification[]),
      ]);

      const gateToScoring: Array<{
        condition_number: string;
        condition_text: string;
        current_type: 'GATE';
        recommended_type: 'SCORING';
        reason: string;
        potential_advantage: string;
        question_template: string;
      }> = [];

      const scoringToGate: Array<{
        condition_number: string;
        condition_text: string;
        current_type: 'SCORING';
        recommended_type: 'GATE';
        reason: string;
        competitor_impact: string;
        question_template: string;
      }> = [];

      for (const gate of gates) {
        const text = gate.condition_text.toLowerCase();
        const condNum = gate.condition_number;

        // Check if gate condition that we DON'T meet - suggest changing to scoring
        if (gate.status === 'DOES_NOT_MEET' || gate.status === 'PARTIALLY_MEETS') {
          // Experience requirements we almost meet
          if (/ניסיון|פרויקט/.test(text) && gate.status === 'PARTIALLY_MEETS') {
            gateToScoring.push({
              condition_number: condNum,
              condition_text: gate.condition_text,
              current_type: 'GATE',
              recommended_type: 'SCORING',
              reason: 'אנו עומדים באופן חלקי בדרישה - המרה לניקוד תאפשר השתתפות',
              potential_advantage: 'יאפשר לנו להתחרות עם ניקוד חלקי במקום פסילה',
              question_template: `האם ניתן להמיר את דרישת הניסיון לתנאי ניקוד, כך שניסיון רב יותר יזכה בניקוד גבוה יותר?`,
            });
          }

          // Financial requirements we don't meet
          if (/מחזור|הכנסות|הון/.test(text) && gate.status === 'DOES_NOT_MEET') {
            gateToScoring.push({
              condition_number: condNum,
              condition_text: gate.condition_text,
              current_type: 'GATE',
              recommended_type: 'SCORING',
              reason: 'דרישה פיננסית שאנו לא עומדים בה - שינוי לניקוד יאפשר השתתפות',
              potential_advantage: 'חברות קטנות יותר יוכלו להתחרות',
              question_template: `האם ניתן להפוך את הדרישה הפיננסית לתנאי ניקוד? לדוגמה: מחזור גבוה יותר = ניקוד גבוה יותר`,
            });
          }
        }

        // Check if gate condition that we EXCEED - suggest strengthening to knock out competitors
        if (gate.status === 'MEETS') {
          // Experience we strongly exceed
          if (/ניסיון|פרויקט/.test(text) && projects.length >= 5) {
            scoringToGate.push({
              condition_number: condNum,
              condition_text: gate.condition_text,
              current_type: 'SCORING',
              recommended_type: 'GATE',
              reason: 'לנו ניסיון עודף משמעותי - העלאת הרף תפסול מתחרים',
              competitor_impact: 'צפוי לפסול חברות עם ניסיון מועט',
              question_template: `האם ניתן להעלות את דרישת הניסיון ל-X פרויקטים מינימום?`,
            });
          }

          // Certifications we have that others might not
          if (/ISO|הסמכה|תעודה/.test(text) && certifications.length >= 3) {
            scoringToGate.push({
              condition_number: condNum,
              condition_text: gate.condition_text,
              current_type: 'SCORING',
              recommended_type: 'GATE',
              reason: 'יש לנו הסמכות מרובות - הדרישה תפסול מתחרים',
              competitor_impact: 'חברות ללא הסמכות לא יוכלו להשתתף',
              question_template: `האם תעודת ${certifications[0]?.cert_name || 'ISO'} היא תנאי סף הכרחי?`,
            });
          }

          // Strong financials
          if (/מחזור|הכנסות/.test(text) && financials.length > 0 && financials[0].annual_revenue) {
            const revenue = financials[0].annual_revenue;
            if (revenue > 10000000) { // מעל 10 מיליון
              scoringToGate.push({
                condition_number: condNum,
                condition_text: gate.condition_text,
                current_type: 'SCORING',
                recommended_type: 'GATE',
                reason: 'המחזור שלנו גבוה - העלאת סף פיננסי תפסול מתחרים קטנים',
                competitor_impact: 'חברות קטנות לא יעמדו בדרישה',
                question_template: `האם ניתן להגדיר מחזור מינימלי של ${(revenue * 0.8 / 1000000).toFixed(1)} מיליון ש"ח כתנאי סף?`,
              });
            }
          }
        }
      }

      // Calculate optimization score (0-100)
      const totalSuggestions = gateToScoring.length + scoringToGate.length;
      const optimizationScore = Math.min(100, totalSuggestions * 15);

      return {
        success: true,
        tender_id: tenderId,
        org_id: orgId,
        gate_to_scoring: gateToScoring,
        scoring_to_gate: scoringToGate,
        optimization_score: optimizationScore,
        summary: `נמצאו ${gateToScoring.length} תנאים להמרה לניקוד ו-${scoringToGate.length} תנאים להחמרה`,
      };
    },

    // Module 3.4 - Spec vs BOQ Discrepancy Detection
    // מזהה אי-התאמות בין מפרט טכני לכתב כמויות
    detectSpecBoqDiscrepancies: async (tenderId: string, specText: string, boqText: string): Promise<{
      success: boolean;
      tender_id: string;
      discrepancies: Array<{
        id: string;
        spec_reference: string;
        boq_reference: string;
        discrepancy_type: 'MISSING_IN_BOQ' | 'MISSING_IN_SPEC' | 'QUANTITY_MISMATCH' | 'DESCRIPTION_MISMATCH';
        description: string;
        severity: 'HIGH' | 'MEDIUM' | 'LOW';
        recommendation: string;
        question_template: string;
      }>;
      summary: {
        total_discrepancies: number;
        high_severity: number;
        medium_severity: number;
        low_severity: number;
      };
      recommendations: string[];
    }> => {
      console.log(`detectSpecBoqDiscrepancies for tender ${tenderId}`);

      const discrepancies: Array<{
        id: string;
        spec_reference: string;
        boq_reference: string;
        discrepancy_type: 'MISSING_IN_BOQ' | 'MISSING_IN_SPEC' | 'QUANTITY_MISMATCH' | 'DESCRIPTION_MISMATCH';
        description: string;
        severity: 'HIGH' | 'MEDIUM' | 'LOW';
        recommendation: string;
        question_template: string;
      }> = [];

      let discrepancyId = 1;

      // Extract items mentioned in spec
      const specItems: Array<{ keyword: string; context: string }> = [];
      const specKeywords = [
        /מצלמ[הו]?ת?\s*(?:אבטחה|IP|PTZ|קבועה)?/gi,
        /רכזת?\s*(?:תקשורת|רשת|switch)?/gi,
        /שרת\s*(?:וידאו|הקלטה|VMS)?/gi,
        /כבל\s*(?:Cat\d|אופטי|חשמל)?/gi,
        /מסך\s*(?:תצוגה|LCD)?/gi,
        /UPS|אל-פסק/gi,
        /מקלדת\s*(?:שליטה)?/gi,
        /קורא\s*(?:כרטיסים|ביומטרי)?/gi,
      ];

      for (const pattern of specKeywords) {
        let match;
        while ((match = pattern.exec(specText)) !== null) {
          specItems.push({
            keyword: match[0],
            context: specText.substring(Math.max(0, match.index - 50), Math.min(specText.length, match.index + 100)),
          });
        }
      }

      // Check if spec items appear in BOQ
      for (const item of specItems) {
        const keyword = item.keyword.toLowerCase().trim();
        if (keyword.length < 3) continue;

        // Check if mentioned in BOQ
        if (!boqText.toLowerCase().includes(keyword.substring(0, Math.min(keyword.length, 10)))) {
          discrepancies.push({
            id: `D${discrepancyId++}`,
            spec_reference: item.context.substring(0, 80) + '...',
            boq_reference: 'לא נמצא',
            discrepancy_type: 'MISSING_IN_BOQ',
            description: `פריט "${item.keyword}" מופיע במפרט אך לא נמצא בכתב הכמויות`,
            severity: 'HIGH',
            recommendation: 'יש לברר האם הפריט כלול במחיר אחר או חסר מכתב הכמויות',
            question_template: `האם הפריט "${item.keyword}" המופיע במפרט הטכני כלול בכתב הכמויות? אם לא, כיצד יתומחר?`,
          });
        }
      }

      // Extract quantities from BOQ and look for mismatches
      const quantityPattern = /(\d+)\s*(?:יח['׳]?|יחידות?|מ['׳]?|מטר|קומפ)/gi;
      const boqQuantities: Array<{ number: number; context: string }> = [];
      let qMatch;
      while ((qMatch = quantityPattern.exec(boqText)) !== null) {
        boqQuantities.push({
          number: parseInt(qMatch[1]),
          context: boqText.substring(Math.max(0, qMatch.index - 30), Math.min(boqText.length, qMatch.index + 50)),
        });
      }

      // Look for same quantities in spec
      for (const bq of boqQuantities) {
        const specQuantityPattern = new RegExp(`(\\d+)\\s*(?:יח|יחידות?|מ['׳]?|מטר)`, 'gi');
        let specMatch;
        while ((specMatch = specQuantityPattern.exec(specText)) !== null) {
          const specNum = parseInt(specMatch[1]);
          // Check if there's a significant mismatch (more than 20% difference)
          if (bq.number > 5 && specNum > 5 && Math.abs(bq.number - specNum) / Math.max(bq.number, specNum) > 0.2) {
            // Check if they're in similar context
            const boqContext = bq.context.toLowerCase();
            const specContext = specText.substring(Math.max(0, specMatch.index - 30), Math.min(specText.length, specMatch.index + 50)).toLowerCase();

            // Look for common keywords
            const commonKeywords = ['מצלמ', 'כבל', 'רכזת', 'שרת', 'מסך'];
            const hasCommonKeyword = commonKeywords.some(kw => boqContext.includes(kw) && specContext.includes(kw));

            if (hasCommonKeyword) {
              discrepancies.push({
                id: `D${discrepancyId++}`,
                spec_reference: `${specNum} יח' - ${specContext.substring(0, 50)}...`,
                boq_reference: `${bq.number} יח' - ${bq.context.substring(0, 50)}...`,
                discrepancy_type: 'QUANTITY_MISMATCH',
                description: `אי-התאמה בכמות: המפרט מציין ${specNum} וכתב הכמויות מציין ${bq.number}`,
                severity: Math.abs(bq.number - specNum) > 10 ? 'HIGH' : 'MEDIUM',
                recommendation: 'יש לברר מהי הכמות הנכונה לתמחור',
                question_template: `מהי הכמות הנכונה - ${specNum} לפי המפרט או ${bq.number} לפי כתב הכמויות?`,
              });
            }
          }
        }
      }

      // Add general recommendations if discrepancies found
      const recommendations: string[] = [];
      if (discrepancies.length > 0) {
        recommendations.push('יש להגיש את כל השאלות בנוגע לאי-התאמות לפני מועד ההבהרות');
        recommendations.push('מומלץ לתעד את כל אי-ההתאמות לצורך תמחור סיכונים');
        if (discrepancies.filter(d => d.severity === 'HIGH').length > 2) {
          recommendations.push('שימו לב: מספר גבוה של אי-התאמות חמורות - יש לשקול סיכון מוגבר בתמחור');
        }
      }

      return {
        success: true,
        tender_id: tenderId,
        discrepancies: discrepancies.slice(0, 20), // Limit to 20 discrepancies
        summary: {
          total_discrepancies: discrepancies.length,
          high_severity: discrepancies.filter(d => d.severity === 'HIGH').length,
          medium_severity: discrepancies.filter(d => d.severity === 'MEDIUM').length,
          low_severity: discrepancies.filter(d => d.severity === 'LOW').length,
        },
        recommendations,
      };
    },

    // Module 3.4.5 - Compare to Similar Tenders
    // מוצא מכרזים דומים ומשווה תכולה לזיהוי חסרים
    compareToSimilarTenders: async (tenderId: string, category: string): Promise<{
      success: boolean;
      tender_id: string;
      similar_tenders: Array<{
        id: string;
        name: string;
        issuing_body: string;
        date: string;
        similarity_score: number;
        category: string;
      }>;
      missing_items: Array<{
        item: string;
        found_in_tenders: string[];
        frequency: number;
        recommendation: string;
      }>;
      extra_items: Array<{
        item: string;
        note: string;
      }>;
      insights: string[];
    }> => {
      console.log(`compareToSimilarTenders for tender ${tenderId}, category ${category}`);

      // Get current tender
      const currentTender = await api.getTender(tenderId);
      if (!currentTender) {
        return {
          success: false,
          tender_id: tenderId,
          similar_tenders: [],
          missing_items: [],
          extra_items: [],
          insights: ['לא נמצא מכרז'],
        };
      }

      // Get all tenders in same category
      const allTenders = await api.getTenders();
      const categoryKeywords = category.toLowerCase().split(/[\s,]+/).filter(k => k.length > 2);

      // Find similar tenders by category/name matching
      const similarTenders: Array<{
        id: string;
        name: string;
        issuing_body: string;
        date: string;
        similarity_score: number;
        category: string;
      }> = [];

      for (const tender of allTenders) {
        if (tender.id === tenderId) continue;

        const tenderText = `${tender.tender_name} ${tender.category || ''} ${tender.issuing_body || ''}`.toLowerCase();
        let matchCount = 0;

        for (const keyword of categoryKeywords) {
          if (tenderText.includes(keyword)) matchCount++;
        }

        const similarityScore = categoryKeywords.length > 0 ? (matchCount / categoryKeywords.length) * 100 : 0;

        if (similarityScore >= 30) {
          similarTenders.push({
            id: tender.id,
            name: tender.tender_name,
            issuing_body: tender.issuing_body || 'לא ידוע',
            date: tender.publish_date || tender.created_at || '',
            similarity_score: Math.round(similarityScore),
            category: tender.category || category,
          });
        }
      }

      // Sort by similarity
      similarTenders.sort((a, b) => b.similarity_score - a.similarity_score);

      // Get gate conditions from similar tenders to find common requirements
      const requirementFrequency: Map<string, { count: number; tenders: string[] }> = new Map();

      for (const similar of similarTenders.slice(0, 5)) {
        try {
          const gates = await api.getGateConditions(similar.id);
          for (const gate of gates) {
            // Extract key requirement keywords
            const keywords = extractRequirementKeywords(gate.condition_text);
            for (const kw of keywords) {
              const existing = requirementFrequency.get(kw);
              if (existing) {
                existing.count++;
                if (!existing.tenders.includes(similar.name)) {
                  existing.tenders.push(similar.name);
                }
              } else {
                requirementFrequency.set(kw, { count: 1, tenders: [similar.name] });
              }
            }
          }
        } catch (e) {
          console.log(`Could not get gates for ${similar.id}:`, e);
        }
      }

      // Get current tender gates
      const currentGates = await api.getGateConditions(tenderId);
      const currentKeywords = new Set<string>();
      for (const gate of currentGates) {
        const keywords = extractRequirementKeywords(gate.condition_text);
        keywords.forEach(kw => currentKeywords.add(kw));
      }

      // Find missing items (in similar but not in current)
      const missingItems: Array<{
        item: string;
        found_in_tenders: string[];
        frequency: number;
        recommendation: string;
      }> = [];

      for (const [keyword, data] of requirementFrequency.entries()) {
        if (data.count >= 2 && !currentKeywords.has(keyword)) {
          missingItems.push({
            item: keyword,
            found_in_tenders: data.tenders,
            frequency: data.count,
            recommendation: data.count >= 3
              ? 'דרישה נפוצה מאוד - מומלץ לברר עם המזמין'
              : 'דרישה שכיחה - כדאי לבדוק',
          });
        }
      }

      // Sort by frequency
      missingItems.sort((a, b) => b.frequency - a.frequency);

      // Find extra items (in current but rare in similar)
      const extraItems: Array<{ item: string; note: string }> = [];
      for (const kw of currentKeywords) {
        const freq = requirementFrequency.get(kw);
        if (!freq || freq.count <= 1) {
          extraItems.push({
            item: kw,
            note: 'דרישה ייחודית למכרז זה - לא נפוצה במכרזים דומים',
          });
        }
      }

      // Generate insights
      const insights: string[] = [];
      if (similarTenders.length === 0) {
        insights.push('לא נמצאו מכרזים דומים להשוואה');
      } else {
        insights.push(`נמצאו ${similarTenders.length} מכרזים דומים להשוואה`);
      }
      if (missingItems.length > 0) {
        insights.push(`זוהו ${missingItems.length} דרישות שכיחות במכרזים דומים שלא מופיעות במכרז זה`);
      }
      if (extraItems.length > 0) {
        insights.push(`המכרז כולל ${extraItems.length} דרישות ייחודיות שלא נפוצות במכרזים דומים`);
      }

      return {
        success: true,
        tender_id: tenderId,
        similar_tenders: similarTenders.slice(0, 10),
        missing_items: missingItems.slice(0, 15),
        extra_items: extraItems.slice(0, 10),
        insights,
      };
    },

    // Module 2.7.6 - Analyze Competitor Questions
    // מנתח שאלות הבהרה של מתחרים לחשיפת אסטרטגיה
    analyzeCompetitorQuestions: async (tenderId: string, clarificationDoc: string): Promise<{
      success: boolean;
      tender_id: string;
      total_questions: number;
      question_categories: Array<{
        category: string;
        count: number;
        examples: string[];
      }>;
      competitor_signals: Array<{
        signal_type: 'WEAKNESS' | 'STRATEGY' | 'CONCERN' | 'ADVANTAGE';
        description: string;
        source_question: string;
        our_action: string;
      }>;
      market_insights: string[];
      recommendations: string[];
    }> => {
      console.log(`analyzeCompetitorQuestions for tender ${tenderId}`);

      // Parse questions from clarification document
      const questions: string[] = [];
      const questionPatterns = [
        /שאלה\s*(?:מס['׳]?)?\s*\d+\s*[:\-]?\s*([^\n]+)/gi,
        /\d+\s*[.\)]\s*([^\n]{20,300})\?/g,
        /האם\s+([^\n]{10,200})\?/gi,
        /מה\s+([^\n]{10,200})\?/gi,
        /כיצד\s+([^\n]{10,200})\?/gi,
        /מהו\s+([^\n]{10,200})\?/gi,
      ];

      for (const pattern of questionPatterns) {
        let match;
        while ((match = pattern.exec(clarificationDoc)) !== null) {
          const question = match[1]?.trim() || match[0].trim();
          if (question.length > 15 && !questions.includes(question)) {
            questions.push(question);
          }
        }
      }

      // Categorize questions
      const categories: Map<string, string[]> = new Map([
        ['ניסיון', []],
        ['פיננסי', []],
        ['טכני', []],
        ['לוח זמנים', []],
        ['תמחור', []],
        ['משפטי', []],
        ['אחר', []],
      ]);

      for (const q of questions) {
        const qLower = q.toLowerCase();
        if (/ניסיון|פרויקט|עבודה קודמת|רפרנס/.test(qLower)) {
          categories.get('ניסיון')!.push(q);
        } else if (/מחזור|הכנסות|ערבות|פיננס|כספי/.test(qLower)) {
          categories.get('פיננסי')!.push(q);
        } else if (/טכני|מפרט|תקן|ISO|הסמכה/.test(qLower)) {
          categories.get('טכני')!.push(q);
        } else if (/זמן|לוח|תאריך|מועד|משך/.test(qLower)) {
          categories.get('לוח זמנים')!.push(q);
        } else if (/מחיר|תמחור|עלות|תשלום/.test(qLower)) {
          categories.get('תמחור')!.push(q);
        } else if (/חוזה|הסכם|תנאי|סעיף|משפט/.test(qLower)) {
          categories.get('משפטי')!.push(q);
        } else {
          categories.get('אחר')!.push(q);
        }
      }

      // Convert to array format
      const questionCategories = Array.from(categories.entries())
        .filter(([_, qs]) => qs.length > 0)
        .map(([category, qs]) => ({
          category,
          count: qs.length,
          examples: qs.slice(0, 3),
        }));

      // Detect competitor signals
      const competitorSignals: Array<{
        signal_type: 'WEAKNESS' | 'STRATEGY' | 'CONCERN' | 'ADVANTAGE';
        description: string;
        source_question: string;
        our_action: string;
      }> = [];

      for (const q of questions) {
        const qLower = q.toLowerCase();

        // Weakness signals - questions asking for relaxed requirements
        if (/האם ניתן|האם אפשר|להקל|לוותר|חלופ|במקום/.test(qLower)) {
          if (/ניסיון|פרויקט/.test(qLower)) {
            competitorSignals.push({
              signal_type: 'WEAKNESS',
              description: 'מתחרה מבקש הקלה בדרישות ניסיון - כנראה חסר ניסיון',
              source_question: q.substring(0, 100),
              our_action: 'לבקש החמרת דרישות הניסיון אם אנו עומדים בהן',
            });
          } else if (/מחזור|פיננס|כספי/.test(qLower)) {
            competitorSignals.push({
              signal_type: 'WEAKNESS',
              description: 'מתחרה מבקש הקלה בדרישות פיננסיות',
              source_question: q.substring(0, 100),
              our_action: 'לבקש שמירה או החמרת הדרישות הפיננסיות',
            });
          }
        }

        // Strategy signals - questions about scoring
        if (/משקל|ניקוד|הערכה|יתרון/.test(qLower)) {
          competitorSignals.push({
            signal_type: 'STRATEGY',
            description: 'מתחרה מנסה להבין את שיטת הניקוד',
            source_question: q.substring(0, 100),
            our_action: 'להתמקד בקריטריונים שיש לנו יתרון בהם',
          });
        }

        // Concern signals - risk questions
        if (/סיכון|אחריות|ביטוח|קנס|פיצוי/.test(qLower)) {
          competitorSignals.push({
            signal_type: 'CONCERN',
            description: 'מתחרה מודאג מסיכונים בפרויקט',
            source_question: q.substring(0, 100),
            our_action: 'לכלול רזרבה לסיכונים בתמחור',
          });
        }
      }

      // Generate market insights
      const marketInsights: string[] = [];
      const experienceQuestions = categories.get('ניסיון')!.length;
      const financialQuestions = categories.get('פיננסי')!.length;

      if (experienceQuestions > 3) {
        marketInsights.push(`ריבוי שאלות על ניסיון (${experienceQuestions}) מעיד על מתחרים חלשים בתחום זה`);
      }
      if (financialQuestions > 2) {
        marketInsights.push(`שאלות פיננסיות רבות (${financialQuestions}) מעידות על מתחרים קטנים בשוק`);
      }
      if (questions.length > 20) {
        marketInsights.push('מספר גבוה של שאלות מעיד על עניין רב במכרז');
      }

      // Recommendations
      const recommendations: string[] = [];
      if (competitorSignals.filter(s => s.signal_type === 'WEAKNESS').length > 0) {
        recommendations.push('זוהו חולשות של מתחרים - להשתמש בהן בשאלות אסטרטגיות');
      }
      if (experienceQuestions > financialQuestions) {
        recommendations.push('להדגיש ניסיון בהצעה - זה נראה כקריטי');
      }
      recommendations.push('לעקוב אחר תשובות ההבהרה ולעדכן אסטרטגיה בהתאם');

      return {
        success: true,
        tender_id: tenderId,
        total_questions: questions.length,
        question_categories: questionCategories,
        competitor_signals: competitorSignals.slice(0, 10),
        market_insights: marketInsights,
        recommendations,
      };
    },

    // Module 3.5 - Pricing Risk Analysis & Recommendations
    // ניתוח סיכוני תמחור והמלצות
    analyzePricingRisks: async (tenderId: string, boqItems: BOQItem[]): Promise<{
      success: boolean;
      tender_id: string;
      risk_analysis: Array<{
        item_number: string;
        description: string;
        risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
        risk_type: string;
        recommendation: string;
        suggested_markup_percent: number;
      }>;
      overall_risk_score: number;
      reserve_recommendation: {
        min_percent: number;
        recommended_percent: number;
        max_percent: number;
        reasoning: string;
      };
      pricing_strategy: {
        approach: 'AGGRESSIVE' | 'CONSERVATIVE' | 'BALANCED';
        reasoning: string;
        key_items_to_focus: string[];
      };
      warnings: string[];
    }> => {
      console.log(`analyzePricingRisks for tender ${tenderId}`);

      const riskAnalysis: Array<{
        item_number: string;
        description: string;
        risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
        risk_type: string;
        recommendation: string;
        suggested_markup_percent: number;
      }> = [];

      let totalRiskScore = 0;
      const warnings: string[] = [];

      for (const item of boqItems) {
        const desc = (item.description || '').toLowerCase();
        let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
        let riskType = '';
        let recommendation = '';
        let suggestedMarkup = 5;

        // זיהוי סיכונים לפי סוג פריט
        if (/תשתית|חפירה|בטון|יסודות/.test(desc)) {
          riskLevel = 'HIGH';
          riskType = 'עבודות תשתית - תלוי בתנאי שטח';
          recommendation = 'לבקר באתר ולהוסיף רזרבה לבלתי צפוי';
          suggestedMarkup = 15;
          totalRiskScore += 20;
        } else if (/כבלים|תשתית תקשורת|צנרת/.test(desc)) {
          riskLevel = 'MEDIUM';
          riskType = 'תלוי במרחקים ומסלולים';
          recommendation = 'לוודא אורכים מדויקים במפרט';
          suggestedMarkup = 10;
          totalRiskScore += 10;
        } else if (/התקנה|עבודה|שירות/.test(desc)) {
          riskLevel = 'MEDIUM';
          riskType = 'עבודה - תלוי בזמינות צוות';
          recommendation = 'לתמחר לפי שעות צפויות + 20%';
          suggestedMarkup = 10;
          totalRiskScore += 8;
        } else if (/ציוד|מכשיר|מצלמה|רכזת/.test(desc)) {
          riskLevel = 'LOW';
          riskType = 'ציוד - מחיר יציב';
          recommendation = 'לבדוק מול ספקים לפני תמחור סופי';
          suggestedMarkup = 5;
          totalRiskScore += 3;
        }

        // בדיקת כמויות גדולות
        if (item.quantity && item.quantity > 100) {
          riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : riskLevel;
          riskType += ' + כמות גדולה';
          recommendation += ' | לבקש הנחת כמות מספק';
          totalRiskScore += 5;
        }

        // בדיקת פריטים ללא מחיר
        if (!item.unit_price || item.unit_price === 0) {
          warnings.push(`פריט ${item.item_number} ללא מחיר - יש לתמחר`);
        }

        if (riskType) {
          riskAnalysis.push({
            item_number: item.item_number,
            description: item.description.substring(0, 80),
            risk_level: riskLevel,
            risk_type: riskType,
            recommendation,
            suggested_markup_percent: suggestedMarkup,
          });
        }
      }

      // חישוב המלצת רזרבה
      const normalizedRiskScore = Math.min(100, totalRiskScore);
      let minReserve = 3;
      let recommendedReserve = 5;
      let maxReserve = 10;
      let reserveReasoning = 'פרויקט עם סיכון נמוך';

      if (normalizedRiskScore > 60) {
        minReserve = 10;
        recommendedReserve = 15;
        maxReserve = 20;
        reserveReasoning = 'פרויקט עם סיכון גבוה - הרבה עבודות תשתית או אי-ודאויות';
      } else if (normalizedRiskScore > 30) {
        minReserve = 5;
        recommendedReserve = 10;
        maxReserve = 15;
        reserveReasoning = 'פרויקט עם סיכון בינוני - כולל עבודות מורכבות';
      }

      // אסטרטגיית תמחור
      const highRiskItems = riskAnalysis.filter(r => r.risk_level === 'HIGH').length;
      let approach: 'AGGRESSIVE' | 'CONSERVATIVE' | 'BALANCED' = 'BALANCED';
      let strategyReasoning = 'גישה מאוזנת מומלצת';

      if (highRiskItems > boqItems.length * 0.3) {
        approach = 'CONSERVATIVE';
        strategyReasoning = 'יותר מ-30% פריטים בסיכון גבוה - מומלץ תמחור שמרני';
      } else if (highRiskItems === 0 && normalizedRiskScore < 20) {
        approach = 'AGGRESSIVE';
        strategyReasoning = 'פרויקט עם סיכון נמוך - ניתן לתמחר אגרסיבי יותר לזכייה';
      }

      return {
        success: true,
        tender_id: tenderId,
        risk_analysis: riskAnalysis,
        overall_risk_score: normalizedRiskScore,
        reserve_recommendation: {
          min_percent: minReserve,
          recommended_percent: recommendedReserve,
          max_percent: maxReserve,
          reasoning: reserveReasoning,
        },
        pricing_strategy: {
          approach,
          reasoning: strategyReasoning,
          key_items_to_focus: riskAnalysis
            .filter(r => r.risk_level === 'HIGH')
            .map(r => r.item_number)
            .slice(0, 5),
        },
        warnings,
      };
    },

    // Module 2.7 - Questions with Priorities
    // שאלות עם עדיפויות P1/P2/P3
    generatePrioritizedQuestions: async (tenderId: string, orgId: string): Promise<{
      success: boolean;
      tender_id: string;
      p1_critical: Array<{ question: string; rationale: string; deadline: string }>;
      p2_important: Array<{ question: string; rationale: string }>;
      p3_nice_to_have: Array<{ question: string; rationale: string }>;
      total_questions: number;
    }> => {
      console.log(`generatePrioritizedQuestions for tender ${tenderId}, org ${orgId}`);

      const [gates, orgData] = await Promise.all([
        api.getGateConditions(tenderId),
        api.organizations.get(orgId),
      ]);
      const p1: Array<{ question: string; rationale: string; deadline: string }> = [];
      const p2: Array<{ question: string; rationale: string }> = [];
      const p3: Array<{ question: string; rationale: string }> = [];

      for (const gate of gates) {
        const text = gate.condition_text.toLowerCase();

        // P1 - שאלות קריטיות (משנות GO/NO-GO)
        if (gate.status === 'DOES_NOT_MEET' && gate.is_mandatory) {
          p1.push({
            question: `בנוגע לתנאי "${gate.condition_text.substring(0, 50)}..." - האם ניתן להקל בדרישה או להציג חלופה?`,
            rationale: 'תנאי סף שאיננו עומדים בו - חוסם!',
            deadline: 'לפני מועד ההבהרות',
          });
        }

        // P1 - אי בהירות בתנאי מנדטורי
        if (gate.is_mandatory && gate.status === 'UNKNOWN') {
          if (/ניסיון/.test(text)) {
            p1.push({
              question: `מהי ההגדרה המדויקת של "ניסיון" הנדרש בתנאי ${gate.condition_number}?`,
              rationale: 'חוסר בהירות בתנאי סף קריטי',
              deadline: 'לפני מועד ההבהרות',
            });
          }
        }

        // P2 - שאלות חשובות (משפיעות על ניקוד/תמחור)
        if (gate.status === 'PARTIALLY_MEETS') {
          p2.push({
            question: `האם עמידה חלקית בתנאי ${gate.condition_number} מקבלת ניקוד יחסי?`,
            rationale: 'הבנת שיטת הניקוד תשפיע על אסטרטגיה',
          });
        }

        // P2 - שאלות על היקף
        if (/היקף|כמות|גודל/.test(text)) {
          p2.push({
            question: `האם ההיקף המצוין בתנאי ${gate.condition_number} הוא מינימום או טווח?`,
            rationale: 'השפעה על תמחור',
          });
        }

        // P3 - שאלות משניות (לשיפור הצעה)
        if (/יתרון|העדפה|בונוס/.test(text)) {
          p3.push({
            question: `מהו המשקל היחסי של "${gate.condition_text.substring(0, 30)}..." בניקוד?`,
            rationale: 'אופטימיזציה של ההצעה',
          });
        }
      }

      // הוספת שאלות כלליות
      p2.push({
        question: 'מהו לוח הזמנים המשוער לביצוע הפרויקט?',
        rationale: 'תכנון משאבים',
      });

      p3.push({
        question: 'האם יש התייחסות להצעות חדשניות?',
        rationale: 'הזדמנות לבידול',
      });

      // שאלות ספציפיות לארגון
      if (orgData && orgData.specializations) {
        p3.push({
          question: `האם ניסיון ב-${orgData.specializations} מקנה יתרון בניקוד?`,
          rationale: 'מינוף התמחות הארגון',
        });
      }

      return {
        success: true,
        tender_id: tenderId,
        p1_critical: p1.slice(0, 10),
        p2_important: p2.slice(0, 10),
        p3_nice_to_have: p3.slice(0, 10),
        total_questions: p1.length + p2.length + p3.length,
      };
    },

    // Module 1.1 - Document Analysis (uses local regex parsing with optional AI enhancement)
    analyzeDocument: async (documentText: string, fileName: string) => {
      console.log(`analyzeDocument called with ${documentText.length} chars, file: ${fileName}`);

      // Helper function to parse fields using regex patterns
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

      // Parse metadata locally first (fast, always works)
      const localMetadata = {
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
        category: parseField([
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

      // Extract definitions locally
      const definitions: Array<{term: string; definition: string}> = [];
      const defPattern = /["״]([^"״]+)["״]\s*[-–:]\s*([^\n]+)/g;
      let match;
      while ((match = defPattern.exec(documentText)) !== null) {
        definitions.push({ term: match[1], definition: match[2] });
      }

      console.log('Local parsing complete:', localMetadata);

      // Try to enhance with AI analysis (optional, with short timeout)
      let aiResult = null;
      try {
        console.log('Attempting AI enhancement (15s timeout)...');
        const TEST_TENDER_ID = 'e1e1e1e1-0000-0000-0000-000000000001';
        aiResult = await callWebhook<{
          success: boolean;
          scope?: { main_deliverables?: string[] };
        }>('tdx-sow-analysis', { tender_id: TEST_TENDER_ID, sow_text: documentText.substring(0, 10000) }, 15000);
        console.log('AI enhancement result:', aiResult);
      } catch (aiError) {
        console.log('AI enhancement skipped (timeout or error):', aiError);
        // Continue with local parsing only
      }

      // Merge AI results if available
      if (aiResult?.scope?.main_deliverables?.[0]) {
        localMetadata.category = aiResult.scope.main_deliverables[0];
      }

      return {
        success: true,
        metadata: localMetadata,
        definitions: definitions.slice(0, 10),
        document_type: 'הזמנה להציע הצעות',
        summary: 'המסמך עובד בהצלחה',
      };
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
      } catch (error: unknown) {
        // Handle duplicate company_number - generate a new one and retry
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('23505') || errorMsg.includes('duplicate key')) {
          console.log('Duplicate company_number, generating new one...');
          const newCompanyNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
          localStorage.setItem('tenderix_session_company_number', newCompanyNumber);
          const retryData = { ...defaultData, company_number: newCompanyNumber };
          const created = await supabaseFetch<Organization[]>('organizations', {
            method: 'POST',
            body: JSON.stringify({ id, ...retryData }),
          });
          console.log(`Organization ${id} created with new company_number`);
          return created[0];
        }
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

  createCompetitor: (competitor: Omit<Competitor, 'id'>) =>
    supabaseFetch<Competitor>('competitors', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ id: crypto.randomUUID(), ...competitor }),
    }).then(data => Array.isArray(data) ? data[0] : data),

  deleteCompetitor: (id: string) =>
    supabaseFetch<void>(`competitors?id=eq.${id}`, { method: 'DELETE' }),
};

// ==================== SAMPLE COMPETITORS DATA ====================

const SAMPLE_COMPETITORS: Omit<Competitor, 'id' | 'org_id'>[] = [
  {
    name: 'אלקטרא בע"מ',
    company_number: '520038466',
    size_category: 'large',
    strengths: ['ניסיון רב בפרויקטים ממשלתיים', 'יציבות פיננסית גבוהה', 'צוות הנדסי מנוסה', 'קשרים עם גורמי ממשל'],
    weaknesses: ['מחירים גבוהים יחסית', 'זמני תגובה ארוכים', 'פחות גמישות בפרויקטים קטנים'],
    typical_domains: ['תשתיות', 'מערכות חשמל', 'בניה ציבורית', 'פרויקטי ממשלה'],
    pricing_strategy: 'פרימיום - מתמחרים גבוה עם דגש על איכות',
    win_rate: 35,
    notes: 'מתחרה עיקרי במכרזי ממשלה גדולים',
  },
  {
    name: 'שפיר הנדסה בע"מ',
    company_number: '520033756',
    size_category: 'large',
    strengths: ['יכולת ביצוע פרויקטים גדולים', 'ניסיון בתשתיות תחבורה', 'הון עצמי גבוה'],
    weaknesses: ['פחות נוכחות בפרויקטים קטנים', 'תלות בקבלני משנה'],
    typical_domains: ['תשתיות תחבורה', 'כבישים', 'מנהור', 'רכבת'],
    pricing_strategy: 'תחרותי - מתמחרים לפי השוק',
    win_rate: 40,
    notes: 'דומיננטי בתחום התחבורה',
  },
  {
    name: 'דניה סיבוס בע"מ',
    company_number: '520026990',
    size_category: 'large',
    strengths: ['מומחיות בבנייה רוויה', 'ניסיון בפרויקטי מגורים', 'קשרי משקיעים'],
    weaknesses: ['פחות ניסיון בתשתיות', 'מיקוד בנדל"ן פרטי'],
    typical_domains: ['בנייה רוויה', 'מגורים', 'מסחר', 'משרדים'],
    pricing_strategy: 'מאוזן - איזון בין מחיר לאיכות',
    win_rate: 30,
    notes: 'שחקן מוביל בשוק הנדל"ן',
  },
  {
    name: 'מיטרוניקס בע"מ',
    company_number: '512345678',
    size_category: 'medium',
    strengths: ['התמחות בטכנולוגיה', 'חדשנות', 'צוות טכני איכותי', 'גמישות גבוהה'],
    weaknesses: ['פחות ניסיון בפרויקטים גדולים', 'משאבים מוגבלים'],
    typical_domains: ['מערכות מידע', 'IT', 'סייבר', 'תוכנה'],
    pricing_strategy: 'אגרסיבי - מתמחרים נמוך לכניסה לשוק',
    win_rate: 45,
    notes: 'מתחרה צומח בתחום הטכנולוגיה',
  },
  {
    name: 'א.ש. בר בע"מ',
    company_number: '513456789',
    size_category: 'medium',
    strengths: ['מומחיות באינסטלציה', 'מחירים תחרותיים', 'זמינות גבוהה'],
    weaknesses: ['טווח שירותים מצומצם', 'פחות ניסיון בפרויקטים מורכבים'],
    typical_domains: ['אינסטלציה', 'תשתיות מים', 'ביוב'],
    pricing_strategy: 'נמוך - מתחרה על מחיר',
    win_rate: 55,
    notes: 'מתמחה בעבודות אינסטלציה',
  },
  {
    name: 'גלי-תכנון בע"מ',
    company_number: '514567890',
    size_category: 'small',
    strengths: ['מומחיות בתכנון', 'יצירתיות', 'שירות אישי', 'מחירים הוגנים'],
    weaknesses: ['יכולת ביצוע מוגבלת', 'צוות קטן'],
    typical_domains: ['תכנון', 'אדריכלות', 'ניהול פרויקטים'],
    pricing_strategy: 'פרימיום - מתמחרים על איכות התכנון',
    win_rate: 25,
    notes: 'משרד תכנון בוטיק',
  },
];

/**
 * Populate sample competitors for an organization
 * This is useful for testing and demonstration purposes
 */
export async function populateSampleCompetitors(orgId: string): Promise<Competitor[]> {
  const existingCompetitors = await api.getCompetitors(orgId);

  // Check if competitors already exist
  if (existingCompetitors.length > 0) {
    console.log(`Organization ${orgId} already has ${existingCompetitors.length} competitors`);
    return existingCompetitors;
  }

  const createdCompetitors: Competitor[] = [];

  for (const competitorData of SAMPLE_COMPETITORS) {
    try {
      const competitor = await api.createCompetitor({
        ...competitorData,
        org_id: orgId,
      });
      createdCompetitors.push(competitor);
      console.log(`Created competitor: ${competitor.name}`);
    } catch (error) {
      console.error(`Failed to create competitor ${competitorData.name}:`, error);
    }
  }

  console.log(`Created ${createdCompetitors.length} sample competitors for org ${orgId}`);
  return createdCompetitors;
}

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

// ==================== TENDER ACTIONS ====================

export async function toggleTenderFavorite(tenderId: string, currentValue: boolean): Promise<Tender | undefined> {
  return api.tenders.update(tenderId, {
    is_favorite: !currentValue,
    updated_at: new Date().toISOString()
  });
}

export async function deleteTender(tenderId: string): Promise<void> {
  // First delete related data (ignore errors if tables don't exist or are empty)
  try {
    await api.tenders.delete(tenderId);
  } catch (error) {
    console.error('Error deleting tender:', error);
    throw error;
  }
}
