-- Migration 003: Technical Dictionary & Tender Definitions
-- v3 Architecture: Module C2 (Technical Dictionary) & Module 1.4 (Definitions)
-- Priority: HIGH - Required for accurate term interpretation

-- ============================================
-- Technical Dictionary (מילון טכני)
-- Core Module C2 - Category-based terminology
-- Per Ido: capability-based interpretation
-- ============================================

CREATE TABLE IF NOT EXISTS technical_dictionary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Category (per architecture)
    category TEXT NOT NULL, -- 'VIDEO', 'COMMUNICATION', 'SOFTWARE', 'ACCESS_CONTROL', 'INFRASTRUCTURE'

    -- Term
    term TEXT NOT NULL,
    term_he TEXT, -- Hebrew version
    synonyms TEXT[],

    -- Definition
    definition TEXT,
    definition_he TEXT,

    -- Equivalence Rules (per Ido - capability-based)
    -- e.g., "traffic camera" can count as "security camera" because...
    equivalent_terms JSONB DEFAULT '[]', -- [ { "term": "...", "explanation": "why equivalent" } ]

    -- Usage context
    typical_requirements TEXT[], -- Common requirements this term appears in
    example_products TEXT[], -- Example products/brands

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(category, term)
);

-- ============================================
-- Tender Definitions (הגדרות מכרז)
-- Module 1.4 - Internal dictionary from tender documents
-- Per Elitzach: Watch for restrictive vs expansive interpretation
-- ============================================

CREATE TABLE IF NOT EXISTS tender_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    -- The definition
    term TEXT NOT NULL, -- המונח
    definition TEXT NOT NULL, -- ההגדרה
    constraints TEXT, -- מגבלות נוספות

    -- Source (Traceability - Core C1)
    source_document_id UUID REFERENCES tender_documents(id),
    source_page INTEGER,
    source_section TEXT,
    source_quote TEXT, -- הציטוט המדויק

    -- Interpretation Type (per Elitzach)
    interpretation_type TEXT, -- 'RESTRICTIVE', 'EXPANSIVE', 'NEUTRAL'
    interpretation_notes TEXT,

    -- Impact
    affects_gate_conditions BOOLEAN DEFAULT FALSE,
    affected_condition_ids UUID[],

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tender_id, term)
);

-- ============================================
-- Seed Technical Dictionary with common terms
-- ============================================

INSERT INTO technical_dictionary (category, term, term_he, synonyms, definition, equivalent_terms) VALUES
-- VIDEO category
('VIDEO', 'CCTV', 'מצלמות אבטחה', ARRAY['security cameras', 'surveillance cameras'],
 'Closed-circuit television systems for security monitoring',
 '[{"term": "IP cameras", "explanation": "Modern digital equivalent"}, {"term": "traffic cameras", "explanation": "Can demonstrate video system experience per Ido"}]'::jsonb),

('VIDEO', 'VMS', 'מערכת ניהול וידאו', ARRAY['Video Management System', 'NVR'],
 'Software platform for managing and viewing video feeds',
 '[{"term": "Milestone", "explanation": "Common VMS brand"}, {"term": "Genetec", "explanation": "Common VMS brand"}]'::jsonb),

('VIDEO', 'LPR', 'זיהוי לוחיות רישוי', ARRAY['ANPR', 'License Plate Recognition'],
 'Automatic number plate recognition systems',
 '[{"term": "traffic enforcement", "explanation": "Common use case"}]'::jsonb),

('VIDEO', 'video analytics', 'אנליטיקה', ARRAY['VA', 'intelligent video'],
 'AI-based analysis of video content',
 '[]'::jsonb),

-- COMMUNICATION category
('COMMUNICATION', 'network infrastructure', 'תשתית רשת', ARRAY['LAN', 'WAN', 'networking'],
 'Physical and logical network components',
 '[]'::jsonb),

('COMMUNICATION', 'fiber optic', 'סיבים אופטיים', ARRAY['fiber', 'optical cable'],
 'High-speed data transmission cables',
 '[]'::jsonb),

('COMMUNICATION', 'WiFi', 'אלחוטי', ARRAY['wireless', 'WLAN'],
 'Wireless local area network technology',
 '[]'::jsonb),

-- ACCESS_CONTROL category
('ACCESS_CONTROL', 'access control', 'בקרת גישה', ARRAY['ACS', 'entry control'],
 'Systems controlling physical access to areas',
 '[]'::jsonb),

('ACCESS_CONTROL', 'card reader', 'קורא כרטיסים', ARRAY['proximity reader', 'smart card reader'],
 'Device for reading access credentials',
 '[]'::jsonb),

('ACCESS_CONTROL', 'turnstile', 'טורניקט', ARRAY['gate', 'barrier'],
 'Physical barrier for controlled entry',
 '[]'::jsonb),

-- SOFTWARE category
('SOFTWARE', 'PSIM', 'מערכת אינטגרציה', ARRAY['Physical Security Information Management'],
 'Platform integrating multiple security systems',
 '[]'::jsonb),

('SOFTWARE', 'integration', 'אינטגרציה', ARRAY['system integration', 'API'],
 'Connecting different systems to work together',
 '[]'::jsonb),

-- INFRASTRUCTURE category
('INFRASTRUCTURE', 'UPS', 'אל-פסק', ARRAY['Uninterruptible Power Supply', 'backup power'],
 'Battery backup for power continuity',
 '[]'::jsonb),

('INFRASTRUCTURE', 'server room', 'חדר שרתים', ARRAY['data center', 'IT room'],
 'Controlled environment for IT equipment',
 '[]'::jsonb)

ON CONFLICT (category, term) DO NOTHING;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_technical_dictionary_category ON technical_dictionary(category);
CREATE INDEX IF NOT EXISTS idx_technical_dictionary_term ON technical_dictionary(term);

CREATE INDEX IF NOT EXISTS idx_tender_definitions_tender ON tender_definitions(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_definitions_term ON tender_definitions(term);

-- ============================================
-- FULL TEXT SEARCH for Hebrew
-- ============================================

-- Add text search columns for Hebrew content
ALTER TABLE technical_dictionary
ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION update_technical_dictionary_search()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.term, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.term_he, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.definition, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_technical_dictionary_search_trigger ON technical_dictionary;
CREATE TRIGGER update_technical_dictionary_search_trigger
    BEFORE INSERT OR UPDATE ON technical_dictionary
    FOR EACH ROW EXECUTE FUNCTION update_technical_dictionary_search();

CREATE INDEX IF NOT EXISTS idx_technical_dictionary_search ON technical_dictionary USING gin(search_vector);

COMMENT ON TABLE technical_dictionary IS 'מילון טכני - Technical terms with equivalence rules for gate matching';
COMMENT ON TABLE tender_definitions IS 'הגדרות מכרז - Tender-specific term definitions affecting interpretation';
