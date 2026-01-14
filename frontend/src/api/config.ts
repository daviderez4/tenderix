// API Configuration
export const API_CONFIG = {
  WEBHOOK_BASE: 'https://daviderez.app.n8n.cloud/webhook',
  SUPABASE_URL: 'https://rerfjgjwjqodevkvhkxu.supabase.co',
  // Using service_role key for full access (same as n8n workflows)
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5NDMwNywiZXhwIjoyMDgxMDcwMzA3fQ.HzsbNbVxrLXxRMNvlVuKaqduQ-PgcD3IrseKm_LcN34',
  // OCR.space API - free tier (500 requests/day, 5MB max)
  OCR_SPACE_API_KEY: 'K87574009788957',
};

// Default test IDs (used when no tender is selected)
export const TEST_IDS = {
  TENDER_ID: 'e1e1e1e1-0000-0000-0000-000000000001',
  ORG_ID: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
};

// Default organization data (created automatically if doesn't exist)
export const DEFAULT_ORG = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  name: 'ארגון ראשי',
  company_number: '000000000',
  settings: { default_currency: 'ILS', language: 'he' },
};

// Get current tender ID from localStorage or use default
export function getCurrentTenderId(): string {
  return localStorage.getItem('currentTenderId') || TEST_IDS.TENDER_ID;
}

// Get current org ID (for now always the test org)
export function getCurrentOrgId(): string {
  return TEST_IDS.ORG_ID;
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
