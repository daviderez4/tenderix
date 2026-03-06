export const API_CONFIG = {
  SUPABASE_URL: 'https://rerfjgjwjqodevkvhkxu.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5NDMwNywiZXhwIjoyMDgxMDcwMzA3fQ.HzsbNbVxrLXxRMNvlVuKaqduQ-PgcD3IrseKm_LcN34',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTQzMDcsImV4cCI6MjA4MTA3MDMwN30.nJsLqFGS_5lj5BPvUrcGW5J3aLMDjCxuSKVLEMi4E88',
};

export function getEdgeFunctionUrl(functionName: string): string {
  return `${API_CONFIG.SUPABASE_URL}/functions/v1/${functionName}`;
}

export function getCurrentTenderId(): string {
  return localStorage.getItem('currentTenderId') || '';
}

export function getCurrentOrgId(): string {
  return localStorage.getItem('tenderix_selected_org_id') || '';
}

export function setCurrentTender(id: string, name: string): void {
  localStorage.setItem('currentTenderId', id);
  localStorage.setItem('currentTenderName', name);
  window.dispatchEvent(new Event('storage'));
}

export function getTenderExtractedText(tenderId: string): string | null {
  return localStorage.getItem(`tender_${tenderId}_text`);
}

export function setTenderExtractedText(tenderId: string, text: string): void {
  localStorage.setItem(`tender_${tenderId}_text`, text);
}
