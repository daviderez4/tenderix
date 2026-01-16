-- Migration 002: Document Version Control (Module 1.1.5)
-- ניהול גרסאות מסמכים - שמירת היסטוריה והשוואה
-- Run this in Supabase SQL Editor

-- =====================================================
-- TENDER CLARIFICATIONS TABLE - מעקב הבהרות
-- =====================================================

CREATE TABLE IF NOT EXISTS tender_clarifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  clarification_number INTEGER NOT NULL,
  published_date DATE,
  content TEXT,
  source_file VARCHAR(255),

  -- ניתוח אוטומטי
  changes_detected JSONB,  -- [{area, original, updated}]
  gate_impacts JSONB,      -- [{condition_id, original_status, new_status}]

  -- עקיבות
  analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(tender_id, clarification_number)
);

-- =====================================================
-- DOCUMENT COMPARISON - השוואת גרסאות
-- =====================================================

CREATE TABLE IF NOT EXISTS document_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

  -- גרסאות להשוואה
  original_doc_id UUID REFERENCES tender_documents(id),
  updated_doc_id UUID REFERENCES tender_documents(id),

  -- תוצאות השוואה
  diff_summary TEXT,
  sections_added TEXT[],
  sections_removed TEXT[],
  sections_modified JSONB,  -- [{section, original, updated}]

  -- השפעה
  affects_gates BOOLEAN DEFAULT FALSE,
  affects_boq BOOLEAN DEFAULT FALSE,
  affects_deadlines BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PREVIOUS TENDER ANALYSIS (Module 1.6)
-- =====================================================

CREATE TABLE IF NOT EXISTS previous_tender_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  previous_tender_id UUID REFERENCES tenders(id),

  -- פרטי מכרז קודם (אם לא בDB)
  previous_tender_number VARCHAR(100),
  previous_issuer VARCHAR(255),
  previous_year INTEGER,

  -- תוצאות
  winner_name VARCHAR(255),
  winning_amount NUMERIC(15,2),

  -- השוואה
  copy_percentage NUMERIC(5,2),  -- כמה % העתיקו
  content_comparison JSONB,       -- {added: [], removed: [], changed: []}
  missed_clarifications TEXT[],   -- הבהרות קודמות שלא נכללו

  -- המלצות
  suggested_questions TEXT[],
  decision_insights TEXT[],

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_clarifications_tender
ON tender_clarifications(tender_id);

CREATE INDEX IF NOT EXISTS idx_comparisons_tender
ON document_comparisons(tender_id);

CREATE INDEX IF NOT EXISTS idx_previous_analysis_tender
ON previous_tender_analysis(tender_id);

-- =====================================================
-- VERIFY
-- =====================================================

SELECT 'tender_clarifications created' as info WHERE EXISTS (
  SELECT FROM information_schema.tables WHERE table_name = 'tender_clarifications'
);

SELECT 'document_comparisons created' as info WHERE EXISTS (
  SELECT FROM information_schema.tables WHERE table_name = 'document_comparisons'
);

SELECT 'previous_tender_analysis created' as info WHERE EXISTS (
  SELECT FROM information_schema.tables WHERE table_name = 'previous_tender_analysis'
);
