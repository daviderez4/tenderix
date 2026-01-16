// API Configuration
export const API_CONFIG = {
  WEBHOOK_BASE: 'https://daviderez.app.n8n.cloud/webhook',
  SUPABASE_URL: 'https://rerfjgjwjqodevkvhkxu.supabase.co',
  // Using service_role key for full access (same as n8n workflows)
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5NDMwNywiZXhwIjoyMDgxMDcwMzA3fQ.HzsbNbVxrLXxRMNvlVuKaqduQ-PgcD3IrseKm_LcN34',
  // OCR.space API - free tier (500 requests/day, 5MB max)
  OCR_SPACE_API_KEY: 'K87574009788957',
};

// Generate a UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get or create session org ID - each browser session gets its own org
export function getSessionOrgId(): string {
  let orgId = localStorage.getItem('tenderix_session_org_id');
  if (!orgId) {
    orgId = generateUUID();
    localStorage.setItem('tenderix_session_org_id', orgId);
    console.log('Created new session org:', orgId);
  }
  return orgId;
}

// Default test IDs (only used for testing, not production)
export const TEST_IDS = {
  TENDER_ID: 'e1e1e1e1-0000-0000-0000-000000000001',
  ORG_ID: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', // Legacy - don't use
};

// Generate unique company number based on session
function getSessionCompanyNumber(): string {
  let companyNum = localStorage.getItem('tenderix_session_company_number');
  if (!companyNum) {
    // Generate 9-digit unique number
    companyNum = Math.floor(100000000 + Math.random() * 900000000).toString();
    localStorage.setItem('tenderix_session_company_number', companyNum);
  }
  return companyNum;
}

// Get default organization data for current session
export function getDefaultOrgData() {
  return {
    id: getSessionOrgId(),
    name: 'הארגון שלי',
    company_number: getSessionCompanyNumber(),
    settings: { default_currency: 'ILS', language: 'he' },
  };
}

// Backward compatibility - DEFAULT_ORG now uses session org
export const DEFAULT_ORG = {
  get id() { return getSessionOrgId(); },
  name: 'הארגון שלי',
  get company_number() { return getSessionCompanyNumber(); },
  settings: { default_currency: 'ILS', language: 'he' },
};

// Get current tender ID from localStorage or empty string
export function getCurrentTenderId(): string {
  return localStorage.getItem('currentTenderId') || '';
}

// Get current org ID - now uses session-based org
export function getCurrentOrgId(): string {
  return getSessionOrgId();
}

// Set current tender
export function setCurrentTender(id: string, name: string): void {
  localStorage.setItem('currentTenderId', id);
  localStorage.setItem('currentTenderName', name);
  // Trigger a storage event so other components can react
  window.dispatchEvent(new Event('storage'));
}

// Store extracted text for current tender (for Gates analysis)
export function setTenderExtractedText(tenderId: string, text: string): void {
  localStorage.setItem(`tender_${tenderId}_text`, text);
}

// Get extracted text for a tender
export function getTenderExtractedText(tenderId: string): string | null {
  return localStorage.getItem(`tender_${tenderId}_text`);
}

// Clear extracted text for a tender
export function clearTenderExtractedText(tenderId: string): void {
  localStorage.removeItem(`tender_${tenderId}_text`);
}
