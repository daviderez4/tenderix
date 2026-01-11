// js/config.js - Tenderix Configuration
// =====================================

const CONFIG = {
  // ===================
  // SUPABASE
  // ===================
  SUPABASE_URL: 'https://rerfjgjwjqodevkvhkxu.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTQzMDcsImV4cCI6MjA4MTA3MDMwN30.XE4N3ewYESrVeCMWZdJhYbgjTG_SRaYQ9zUczjVgNUM',
  
  // ===================
  // N8N WEBHOOKS
  // ===================
  N8N_BASE_URL: 'https://daviderez.app.n8n.cloud/webhook',
  
  WEBHOOKS: {
    // Document Processing
    UPLOAD_TENDER: '/upload-tender',
    ANALYZE_DOCUMENT: '/analyze-document',
    
    // Analysis Workflows
    ANALYZE_GATES: '/analyze-gates',
    ANALYZE_SPEC: '/analyze-spec',
    ANALYZE_BOQ: '/analyze-boq',
    
    // Competitor Intelligence
    GET_COMPETITORS: '/get-competitors',
    ANALYZE_COMPETITOR: '/analyze-competitor',
    
    // Decision & Pricing
    GENERATE_DECISION: '/generate-decision',
    CALCULATE_PRICING: '/calculate-pricing',
    
    // Reports
    EXPORT_REPORT: '/export-report',
    GENERATE_SUMMARY: '/generate-summary',
    
    // AI Chat
    AI_CHAT: '/ai-chat',
    ASK_QUESTION: '/ask-question'
  },
  
  // ===================
  // APP SETTINGS
  // ===================
  APP_NAME: 'Tenderix',
  APP_VERSION: '1.0.0',
  DEFAULT_LANGUAGE: 'he',
  
  // Date & Currency
  DATE_FORMAT: 'DD.MM.YYYY',
  TIME_FORMAT: 'HH:mm',
  CURRENCY: '₪',
  CURRENCY_CODE: 'ILS',
  
  // ===================
  // UI SETTINGS
  // ===================
  TOAST_DURATION: 5000,        // 5 seconds
  LOADING_DELAY: 300,          // Show loader after 300ms
  DEBOUNCE_DELAY: 300,         // Search debounce
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // ===================
  // STORAGE BUCKETS
  // ===================
  STORAGE: {
    TENDER_DOCUMENTS: 'tender-documents',
    COMPANY_DOCUMENTS: 'company-documents',
    REPORTS: 'reports',
    EXPORTS: 'exports'
  },
  
  // ===================
  // STATUS MAPPINGS
  // ===================
  TENDER_STATUS: {
    draft: { label: 'טיוטה', color: 'gray' },
    active: { label: 'פעיל', color: 'blue' },
    analyzing: { label: 'בניתוח', color: 'cyan' },
    pending: { label: 'ממתין', color: 'yellow' },
    ready_for_decision: { label: 'מוכן להחלטה', color: 'purple' },
    submitted: { label: 'הוגש', color: 'indigo' },
    won: { label: 'זכייה', color: 'green' },
    lost: { label: 'הפסד', color: 'red' },
    cancelled: { label: 'בוטל', color: 'gray' }
  },
  
  GATE_STATUS: {
    pending: { label: 'ממתין לבדיקה', color: 'gray' },
    checking: { label: 'בבדיקה', color: 'cyan' },
    passed: { label: 'עבר', color: 'green' },
    failed: { label: 'נכשל', color: 'red' },
    partial: { label: 'חלקי', color: 'yellow' },
    needs_clarification: { label: 'דורש הבהרה', color: 'orange' }
  },
  
  // ===================
  // SCORE THRESHOLDS
  // ===================
  SCORES: {
    HIGH: 80,      // >= 80 = High/Good
    MEDIUM: 50,    // >= 50 = Medium
    LOW: 0         // < 50 = Low/Risk
  },
  
  // ===================
  // DEADLINE ALERTS
  // ===================
  DEADLINE_ALERTS: {
    URGENT: 3,     // <= 3 days = urgent (red)
    WARNING: 7,    // <= 7 days = warning (orange)
    NORMAL: 14     // <= 14 days = normal (yellow)
  },

  // ===================
  // APP SETTINGS (for Utils)
  // ===================
  APP: {
    CURRENCY_LOCALE: 'he-IL'
  },

  // ===================
  // SCORE COLORS
  // ===================
  SCORE_COLORS: {
    high: '#22c55e',    // green
    medium: '#f59e0b',  // orange
    low: '#ef4444'      // red
  },

  // ===================
  // STATUS LABELS (Hebrew)
  // ===================
  STATUS_LABELS: {
    draft: 'טיוטה',
    active: 'פעיל',
    analyzing: 'בניתוח',
    pending: 'ממתין',
    pending_decision: 'ממתין להחלטה',
    ready_for_decision: 'מוכן להחלטה',
    submitted: 'הוגש',
    won: 'זכייה',
    lost: 'הפסד',
    cancelled: 'בוטל',
    expired: 'פג תוקף'
  },

  // ===================
  // GATE LABELS (Hebrew)
  // ===================
  GATE_LABELS: {
    pending: 'ממתין',
    checking: 'בבדיקה',
    passed: 'עבר',
    failed: 'נכשל',
    partial: 'חלקי',
    needs_clarification: 'דורש הבהרה'
  },

  // ===================
  // NOTIFICATIONS
  // ===================
  NOTIFICATIONS: {
    AUTO_DISMISS_MS: 5000,
    MAX_VISIBLE: 5
  },

  // ===================
  // ROUTES
  // ===================
  ROUTES: {
    DASHBOARD: 'tenderix-dashboard.html',
    TENDER_DETAIL: 'tenderix-tender.html',
    LOGIN: 'tenderix-login.html'
  }
};

// Make globally available
window.CONFIG = CONFIG;

// ===================
// SUPABASE CLIENT
// ===================
let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient && window.supabase) {
    supabaseClient = window.supabase.createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY
    );
  }
  return supabaseClient;
}

// Make getSupabase globally available
window.getSupabase = getSupabase;

console.log('Tenderix Config loaded');

// Also export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
