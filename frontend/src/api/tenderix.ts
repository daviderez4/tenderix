import { API_CONFIG } from './config';

// Types
export interface Tender {
  id: string;
  tender_name: string;
  tender_number?: string;
  issuing_body?: string;
  submission_deadline?: string;
  estimated_value?: number;
  status?: string;
  tender_type?: string;
  created_at?: string;
}

export interface GateCondition {
  id: string;
  tender_id: string;
  condition_number: number;
  condition_text: string;
  condition_type?: string;
  is_mandatory: boolean;
  status?: string;
  evidence?: string;
  gap_description?: string;
}

export interface Competitor {
  id: string;
  name: string;
  company_number?: string;
  strengths?: string[];
  weaknesses?: string[];
  typical_domains?: string[];
}

// Supabase fetch helper
async function supabaseFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_CONFIG.SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': API_CONFIG.SUPABASE_KEY,
      'Authorization': `Bearer ${API_CONFIG.SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

// Webhook call helper
async function callWebhook<T>(path: string, payload: object): Promise<T> {
  const res = await fetch(`${API_CONFIG.WEBHOOK_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Webhook error: ${res.status}`);
  return res.json();
}

// API Functions
export const api = {
  // Tenders
  getTenders: () => supabaseFetch<Tender[]>('tenders?select=*&order=created_at.desc'),
  getTender: (id: string) => supabaseFetch<Tender[]>(`tenders?id=eq.${id}`).then(r => r[0]),

  // Gate Conditions
  getGateConditions: (tenderId: string) =>
    supabaseFetch<GateCondition[]>(`gate_conditions?tender_id=eq.${tenderId}&order=condition_number`),

  // Competitors
  getCompetitors: (orgId: string) =>
    supabaseFetch<Competitor[]>(`competitors?org_id=eq.${orgId}`),

  // Workflow triggers
  workflows: {
    extractGates: (tenderId: string, gatesText: string) =>
      callWebhook('tdx-extract-gates', { tender_id: tenderId, gates_text: gatesText }),

    matchGates: (tenderId: string, orgId: string) =>
      callWebhook('tdx-gate-work', { tender_id: tenderId, org_id: orgId }),

    getClarifications: (tenderId: string, orgId: string) =>
      callWebhook('tdx-clarify-simple', { tender_id: tenderId, org_id: orgId }),

    getStrategicQuestions: (tenderId: string, orgId: string) =>
      callWebhook('tdx-strategic-v3', { tender_id: tenderId, org_id: orgId }),

    getRequiredDocs: (tenderId: string, orgId: string) =>
      callWebhook('tdx-required-docs', { tender_id: tenderId, org_id: orgId }),

    analyzeBOQ: (tenderId: string, boqText: string) =>
      callWebhook('tdx-boq-analysis', { tender_id: tenderId, boq_text: boqText }),

    analyzeSOW: (tenderId: string, sowText: string) =>
      callWebhook('tdx-sow-analysis', { tender_id: tenderId, sow_text: sowText }),

    mapCompetitors: (tenderId: string, orgId: string) =>
      callWebhook('tdx-competitor-mapping', { tender_id: tenderId, org_id: orgId }),

    getPricingIntel: (tenderId: string, orgId: string) =>
      callWebhook('tdx-pricing-intel', { tender_id: tenderId, org_id: orgId }),

    getCompetitiveIntel: (tenderId: string, orgId: string) =>
      callWebhook('tdx-competitive-intel', { tender_id: tenderId, org_id: orgId }),

    getFinalDecision: (tenderId: string, orgId: string) =>
      callWebhook('tdx-final-decision', { tender_id: tenderId, org_id: orgId }),
  },
};
