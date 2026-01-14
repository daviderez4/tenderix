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
    UPLOAD_TENDER: '/tdx-upload-v2',
    ANALYZE_DOCUMENT: '/tdx-analyze-doc-v3',
    PARSE_DOCUMENT: '/tdx-intake',

    // Analysis Workflows
    ANALYZE_GATES: '/gate-conditions',
    ANALYZE_SPEC: '/sow-analysis',
    ANALYZE_BOQ: '/boq-analysis',
    ANALYZE_PRICING: '/tdx-pricing-intel',

    // Clarifications
    CLARIFICATION_QUESTIONS: '/clarification-questions',
    PROCESS_CLARIFICATIONS: '/process-clarifications',
    STRATEGIC_QUESTIONS: '/tdx-strategic-v3',

    // Competitor Intelligence
    GET_COMPETITORS: '/tdx-competitors',
    COMPETITOR_HISTORY: '/tdx-competitive-intel',
    COMPETITOR_MAPPING: '/tdx-competitor-mapping',

    // Decision & Scoring
    GENERATE_DECISION: '/tdx-final-decision',
    CALCULATE_SCORE: '/quality-scoring',

    // Contract & Reports
    CONTRACT_ANALYSIS: '/contract-analysis',
    EXPORT_REPORT: '/tenderix/generate-report',

    // Full Pipeline
    FULL_ANALYSIS: '/tdx-full-analysis',

    // AI Features
    AI_CHAT: '/tdx-clarify-simple',
    AI_SUMMARIZE: '/tdx-analyze-doc-v3'
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
    TENDER_DETAIL: 'tenderix-tender-detail.html',
    LOGIN: 'tenderix-login.html'
  },

  // ===================
  // TIMEOUTS (ms)
  // ===================
  TIMEOUTS: {
    DEFAULT: 30000,      // 30 seconds
    UPLOAD: 120000,      // 2 minutes for file upload
    ANALYSIS: 180000,    // 3 minutes for AI analysis
    EXPORT: 60000        // 1 minute for export
  },

  // ===================
  // UPLOAD SETTINGS
  // ===================
  UPLOAD: {
    MAX_FILE_SIZE: 50 * 1024 * 1024,  // 50MB
    ALLOWED_TYPES: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx', '.xls', '.xlsx']
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
