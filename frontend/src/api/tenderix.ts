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
    // Gate Analysis - Local extraction with optional AI enhancement
    extractGates: async (tenderId: string, tenderText: string): Promise<{ success: boolean; conditions: GateCondition[] }> => {
      console.log(`extractGates called with ${tenderText.length} chars`);

      // Local gate extraction using regex patterns
      const extractedConditions: Partial<GateCondition>[] = [];
      let conditionNumber = 1;

      // Pattern 1: Numbered conditions with "תנאי סף"
      const gatePatterns = [
        // Pattern: תנאי סף מס' X - description
        /תנאי\s*סף\s*(?:מס['׳]?|מספר)?\s*(\d+(?:\.\d+)?)\s*[-–:]\s*([^\n]+)/gi,
        // Pattern: numbered list after תנאי סף
        /(\d+(?:\.\d+)?)\s*[.\)]\s*(?:על\s*המציע|נדרש|חובה|יש\s*להציג|יש\s*לצרף)\s*([^\n]+)/gi,
        // Pattern: על המציע + requirement
        /על\s*המציע\s*(?:להיות|להוכיח|להציג|לצרף|להמציא|לעמוד)\s*([^\n]{10,200})/gi,
        // Pattern: תנאי חובה
        /תנאי\s*חובה\s*[-–:]\s*([^\n]+)/gi,
        // Pattern: דרישות סף
        /דרישות?\s*סף\s*[-–:]\s*([^\n]+)/gi,
      ];

      // Track already extracted to avoid duplicates
      const extractedTexts = new Set<string>();

      for (const pattern of gatePatterns) {
        let match;
        const text = tenderText;
        pattern.lastIndex = 0; // Reset regex
        while ((match = pattern.exec(text)) !== null) {
          const conditionText = (match[2] || match[1]).trim();

          // Skip short or duplicate conditions
          if (conditionText.length < 15 || extractedTexts.has(conditionText.substring(0, 50))) {
            continue;
          }
          extractedTexts.add(conditionText.substring(0, 50));

          // Determine requirement type
          let requirementType = 'OTHER';
          if (/ניסיון|פרויקט|ביצוע|עבודה|שנ[הות]/.test(conditionText)) {
            requirementType = 'EXPERIENCE';
          } else if (/מחזור|הכנסות|הון|כספי|פיננס|ערבות/.test(conditionText)) {
            requirementType = 'FINANCIAL';
          } else if (/תעודה|רישיון|הסמכה|ISO|סיווג|אישור/.test(conditionText)) {
            requirementType = 'CERTIFICATION';
          } else if (/מנהל|צוות|עובד|מהנדס|יועץ/.test(conditionText)) {
            requirementType = 'PERSONNEL';
          }

          // Check if mandatory
          const isMandatory = /חובה|תנאי\s*סף|פוסל|להגיש|נדרש/.test(conditionText) ||
                            /על\s*המציע/.test(match[0]);

          // Extract numbers if present
          const numberMatch = conditionText.match(/(\d+)\s*(?:שנ|פרויקט|עבודו?ת)/);
          const amountMatch = conditionText.match(/([\d,]+)\s*(?:₪|ש"ח|מיליון|אלף)/);

          extractedConditions.push({
            tender_id: tenderId,
            condition_number: `${conditionNumber}`,
            condition_text: conditionText,
            condition_type: 'GATE',
            is_mandatory: isMandatory,
            requirement_type: requirementType,
            required_years: numberMatch ? parseInt(numberMatch[1]) : undefined,
            required_amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : undefined,
            status: 'UNKNOWN',
          });
          conditionNumber++;
        }
      }

      // Also look for section-based gate conditions
      const sectionPattern = /(?:פרק|סעיף)\s*[-–]?\s*תנאי\s*סף([\s\S]{100,3000}?)(?=(?:פרק|סעיף)\s*[-–]|$)/gi;
      let sectionMatch;
      while ((sectionMatch = sectionPattern.exec(tenderText)) !== null) {
        const sectionText = sectionMatch[1];
        // Extract bullet points from section
        const bulletPattern = /[•\-\*]\s*([^\n•\-\*]{15,200})/g;
        let bulletMatch;
        while ((bulletMatch = bulletPattern.exec(sectionText)) !== null) {
          const conditionText = bulletMatch[1].trim();
          if (!extractedTexts.has(conditionText.substring(0, 50))) {
            extractedTexts.add(conditionText.substring(0, 50));

            let requirementType = 'OTHER';
            if (/ניסיון|פרויקט/.test(conditionText)) requirementType = 'EXPERIENCE';
            else if (/מחזור|כספי/.test(conditionText)) requirementType = 'FINANCIAL';
            else if (/תעודה|רישיון|ISO/.test(conditionText)) requirementType = 'CERTIFICATION';
            else if (/מנהל|צוות/.test(conditionText)) requirementType = 'PERSONNEL';

            extractedConditions.push({
              tender_id: tenderId,
              condition_number: `${conditionNumber}`,
              condition_text: conditionText,
              condition_type: 'GATE',
              is_mandatory: true,
              requirement_type: requirementType,
              status: 'UNKNOWN',
            });
            conditionNumber++;
          }
        }
      }

      console.log(`Local extraction found ${extractedConditions.length} conditions`);

      // Save conditions to database
      const savedConditions: GateCondition[] = [];
      for (const condition of extractedConditions.slice(0, 30)) { // Limit to 30 conditions
        try {
          const saved = await api.gates.create(condition);
          savedConditions.push(saved);
        } catch (err) {
          console.error('Error saving condition:', err);
        }
      }

      console.log(`Saved ${savedConditions.length} conditions to database`);

      // Try webhook enhancement (optional, with short timeout)
      try {
        console.log('Attempting AI enhancement for gates (20s timeout)...');
        const aiResult = await callWebhook<{ success: boolean; conditions?: Array<{ condition_text: string; status?: string }> }>(
          'tdx-extract-gates',
          { tender_id: tenderId, tender_text: tenderText.substring(0, 15000) },
          20000 // 20 second timeout
        );

        if (aiResult?.success && aiResult.conditions?.length) {
          console.log(`AI found ${aiResult.conditions.length} additional conditions`);
          // Add any new conditions not already found
          for (const aiCond of aiResult.conditions) {
            const exists = savedConditions.some(c =>
              c.condition_text.substring(0, 40) === aiCond.condition_text.substring(0, 40)
            );
            if (!exists && aiCond.condition_text.length > 15) {
              try {
                const saved = await api.gates.create({
                  tender_id: tenderId,
                  condition_number: `AI-${savedConditions.length + 1}`,
                  condition_text: aiCond.condition_text,
                  condition_type: 'GATE',
                  is_mandatory: true,
                  requirement_type: 'OTHER',
                  status: aiCond.status || 'UNKNOWN',
                });
                savedConditions.push(saved);
              } catch (err) {
                console.error('Error saving AI condition:', err);
              }
            }
          }
        }
      } catch (aiError) {
        console.log('AI enhancement skipped (timeout or error):', aiError);
      }

      return {
        success: savedConditions.length > 0,
        conditions: savedConditions,
      };
    },

    matchGates: async (tenderId: string, orgId: string): Promise<{
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
            closure_options: closureOptions.length > 0 ? closureOptions : undefined,
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

    // Strategic Questions - Local generation with optional AI
    getStrategicQuestions: async (tenderId: string, _orgId: string): Promise<{
      success: boolean;
      tender_id: string;
      total_questions: number;
      safe_questions: Array<{ question: string; rationale: string }>;
      strategic_questions: Array<{ question: string; rationale: string; target_competitor?: string }>;
    }> => {
      console.log(`getStrategicQuestions for tender ${tenderId}`);

      const gates = await api.getGateConditions(tenderId);
      const safeQuestions: Array<{ question: string; rationale: string }> = [];
      const strategicQuestions: Array<{ question: string; rationale: string; target_competitor?: string }> = [];

      // Generate safe questions based on tender requirements
      const experienceGates = gates.filter(g => g.requirement_type === 'EXPERIENCE' || /ניסיון|פרויקט/.test(g.condition_text));
      if (experienceGates.length > 0) {
        safeQuestions.push({
          question: 'האם ניתן להציג ניסיון משותף עם קבלן משנה כחלק מהניסיון הנדרש?',
          rationale: 'מאפשר הרחבת אפשרויות הגשה עבור חברות עם ניסיון חלקי',
        });
        safeQuestions.push({
          question: 'מהו סף הערך המינימלי של פרויקט בודד הנחשב כניסיון רלוונטי?',
          rationale: 'הגדרה ברורה תאפשר הכללת פרויקטים נוספים',
        });
      }

      const financialGates = gates.filter(g => g.requirement_type === 'FINANCIAL' || /מחזור|כספי/.test(g.condition_text));
      if (financialGates.length > 0) {
        strategicQuestions.push({
          question: 'האם ניתן להציג ערבות בנקאית במקום הון עצמי להוכחת איתנות פיננסית?',
          rationale: 'מאפשר לחברות עם תזרים חזק אך הון עצמי נמוך להתמודד',
        });
      }

      // Add general strategic questions
      strategicQuestions.push({
        question: 'האם יש משקל לחדשנות טכנולוגית בניקוד האיכות?',
        rationale: 'יתרון לחברות עם פתרונות מתקדמים',
      });
      safeQuestions.push({
        question: 'האם ניתן להגיש הצעה לחלק מהפרויקט בלבד?',
        rationale: 'מאפשר התמודדות ממוקדת',
      });
      safeQuestions.push({
        question: 'האם יתקיים סיור קבלנים נוסף?',
        rationale: 'הזדמנות להכיר את האתר והדרישות',
      });

      // Try AI enhancement
      try {
        const aiResult = await callWebhook<{
          success: boolean;
          safe_questions?: Array<{ question: string; rationale: string }>;
          strategic_questions?: Array<{ question: string; rationale: string }>;
        }>('tdx-strategic-v3', { tender_id: tenderId, org_id: _orgId }, 15000);

        if (aiResult?.success) {
          if (aiResult.safe_questions) safeQuestions.push(...aiResult.safe_questions);
          if (aiResult.strategic_questions) strategicQuestions.push(...aiResult.strategic_questions);
        }
      } catch { console.log('AI strategic questions skipped'); }

      return {
        success: true,
        tender_id: tenderId,
        total_questions: safeQuestions.length + strategicQuestions.length,
        safe_questions: safeQuestions.slice(0, 8),
        strategic_questions: strategicQuestions.slice(0, 8),
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
