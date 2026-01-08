-- Migration 004: Document Version Control & Tender Enhancements
-- v3 Architecture: Module 1.1.5 (Version Control), 1.5 (Category), 1.6 (Previous Tender)
-- Priority: HIGH - Required for clarification tracking

-- ============================================
-- Enhance tender_documents with version control
-- Module 1.1.5 (per Ido)
-- ============================================

ALTER TABLE tender_documents
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_version_id UUID REFERENCES tender_documents(id),
ADD COLUMN IF NOT EXISTS is_original BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS version_changes TEXT, -- מה השתנה בין גרסאות
ADD COLUMN IF NOT EXISTS processed_text TEXT; -- Normalized text (Module 1.3)

-- ============================================
-- Enhance tenders with v3 fields
-- ============================================

ALTER TABLE tenders
ADD COLUMN IF NOT EXISTS category TEXT, -- Module 1.5: 'VIDEO', 'COMMUNICATION', 'SOFTWARE', 'ACCESS_CONTROL', 'COMBINED'
ADD COLUMN IF NOT EXISTS previous_tender_id UUID REFERENCES tenders(id), -- Module 1.6
ADD COLUMN IF NOT EXISTS previous_winner TEXT, -- Module 1.6
ADD COLUMN IF NOT EXISTS previous_winner_amount DECIMAL(15,2), -- Module 1.6
ADD COLUMN IF NOT EXISTS copy_percentage DECIMAL(5,2), -- Module 1.6: % העתקה מהמכרז הקודם
ADD COLUMN IF NOT EXISTS scoring_method TEXT, -- 'PRICE_ONLY', 'QUALITY_PRICE', 'QUALITY_ONLY'
ADD COLUMN IF NOT EXISTS quality_weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS price_weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS guarantee_amount DECIMAL(15,2), -- ערבות הצעה
ADD COLUMN IF NOT EXISTS contract_duration_months INTEGER,
ADD COLUMN IF NOT EXISTS clarification_deadline TIMESTAMPTZ;

-- ============================================
-- Enhance gate_conditions with v3 fields
-- Modules 2.2, 2.3
-- ============================================

ALTER TABLE gate_conditions
ADD COLUMN IF NOT EXISTS requirement_type TEXT, -- 'CAPABILITY', 'EXECUTION'
ADD COLUMN IF NOT EXISTS logic_type TEXT, -- 'AND', 'OR', 'NESTED'
ADD COLUMN IF NOT EXISTS parent_condition_id UUID REFERENCES gate_conditions(id),
ADD COLUMN IF NOT EXISTS required_amount DECIMAL(15,2), -- Module 2.2
ADD COLUMN IF NOT EXISTS amount_currency TEXT DEFAULT 'ILS',
ADD COLUMN IF NOT EXISTS required_count INTEGER, -- Module 2.2
ADD COLUMN IF NOT EXISTS required_years INTEGER, -- Module 2.2
ADD COLUMN IF NOT EXISTS date_reference TEXT, -- From which date to count
ADD COLUMN IF NOT EXISTS entity_type TEXT, -- Module 2.3: 'COMPANY', 'SUBCONTRACTOR', 'PARTNERSHIP', 'PERSONNEL', 'PROJECT'
ADD COLUMN IF NOT EXISTS can_rely_on_subcontractor BOOLEAN DEFAULT FALSE, -- Module 2.3
ADD COLUMN IF NOT EXISTS can_rely_on_partnership BOOLEAN DEFAULT FALSE, -- Module 2.3
ADD COLUMN IF NOT EXISTS max_score DECIMAL(5,2), -- If ADVANTAGE type
ADD COLUMN IF NOT EXISTS score_formula TEXT,
ADD COLUMN IF NOT EXISTS source_section TEXT, -- Enhanced traceability C1
ADD COLUMN IF NOT EXISTS source_quote TEXT; -- Enhanced traceability C1

-- ============================================
-- Enhance clarification_questions with v3 fields
-- Modules 2.7.5, 2.7.6
-- ============================================

ALTER TABLE clarification_questions
ADD COLUMN IF NOT EXISTS strategic_purpose TEXT, -- Module 2.7.5: מה מנסים להשיג
ADD COLUMN IF NOT EXISTS expected_impact TEXT, -- Module 2.7.5
ADD COLUMN IF NOT EXISTS from_previous_tender BOOLEAN DEFAULT FALSE, -- Module 2.7.6
ADD COLUMN IF NOT EXISTS previous_tender_question_id UUID; -- Reference to original question

-- ============================================
-- INDEXES for new columns
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tender_documents_version ON tender_documents(tender_id, version);
CREATE INDEX IF NOT EXISTS idx_tenders_category ON tenders(category);
CREATE INDEX IF NOT EXISTS idx_tenders_previous ON tenders(previous_tender_id);
CREATE INDEX IF NOT EXISTS idx_gate_conditions_parent ON gate_conditions(parent_condition_id);
CREATE INDEX IF NOT EXISTS idx_gate_conditions_entity ON gate_conditions(entity_type);

COMMENT ON COLUMN tender_documents.version IS 'Document version number, increments with each update';
COMMENT ON COLUMN tender_documents.version_changes IS 'Description of what changed from previous version';
COMMENT ON COLUMN tenders.category IS 'Tender category for loading appropriate technical dictionary';
COMMENT ON COLUMN tenders.previous_tender_id IS 'Link to previous tender from same issuer';
COMMENT ON COLUMN gate_conditions.entity_type IS 'What entity can fulfill this requirement';
