// API Configuration
export const API_CONFIG = {
  WEBHOOK_BASE: 'https://daviderez.app.n8n.cloud/webhook',
  SUPABASE_URL: 'https://rerfjgjwjqodevkvhkxu.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTQzMDcsImV4cCI6MjA4MTA3MDMwN30.Kzh5gi5LZ1sDOqAzKqVnmhT5RKzOiQwM96LUbYpQAqM',
};

// Default test IDs (used when no tender is selected)
export const TEST_IDS = {
  TENDER_ID: 'e1e1e1e1-0000-0000-0000-000000000001',
  ORG_ID: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
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
