-- ============================================
-- TENDERIX v3.0 - FINAL MISSING TABLES
-- Run this in Supabase SQL Editor to complete setup
-- https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/sql/new
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 1. TENDER REPORTS (Required for report generation)
-- ============================================
CREATE TABLE IF NOT EXISTS tender_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL DEFAULT 'full_analysis',
    report_data JSONB NOT NULL DEFAULT '{}',
    executive_summary TEXT,
    gate_status JSONB,
    boq_analysis JSONB,
    competitor_analysis JSONB,
    recommendation TEXT,
    win_probability DECIMAL(3,2),
    risks JSONB,
    generated_by TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_reports_tender ON tender_reports(tender_id);

-- ============================================
-- 2. SOURCE REFERENCES (C1 - Traceability)
-- ============================================
CREATE TABLE IF NOT EXISTS source_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    source_file TEXT NOT NULL,
    page_number INTEGER,
    section_number TEXT,
    original_text TEXT NOT NULL,
    extraction_confidence DECIMAL(3,2) DEFAULT 1.0,
    extracted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_source_refs_tender ON source_references(tender_id);
CREATE INDEX IF NOT EXISTS idx_source_refs_entity ON source_references(entity_type, entity_id);

-- ============================================
-- 3. DICTIONARY (C2)
-- ============================================
CREATE TABLE IF NOT EXISTS dictionary_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    name_en TEXT,
    parent_id UUID REFERENCES dictionary_categories(id),
    description TEXT,
    keywords TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dictionary_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES dictionary_categories(id),
    term TEXT NOT NULL,
    term_normalized TEXT NOT NULL,
    synonyms TEXT[],
    definition TEXT,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS term_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID REFERENCES dictionary_terms(id) ON DELETE CASCADE,
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    context TEXT,
    source_ref_id UUID REFERENCES source_references(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dict_terms_normalized ON dictionary_terms(term_normalized);

-- ============================================
-- 4. ACCUMULATION (C3)
-- ============================================
CREATE TABLE IF NOT EXISTS accumulation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL,
    aggregation_method TEXT NOT NULL,
    dedup_fields TEXT[],
    time_window_months INTEGER,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accumulation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    item_type TEXT NOT NULL,
    item_data JSONB NOT NULL,
    dedup_hash TEXT NOT NULL,
    source_document TEXT,
    valid_from DATE,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accum_items_company ON accumulation_items(company_id, item_type);

-- ============================================
-- 5. GAP CLOSURE (C4)
-- ============================================
CREATE TABLE IF NOT EXISTS gap_closure_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gap_type TEXT NOT NULL,
    closure_method TEXT NOT NULL,
    description TEXT,
    typical_time_days INTEGER,
    requirements JSONB,
    risks TEXT[],
    active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS potential_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    company_number TEXT UNIQUE,
    contact_name TEXT,
    contact_email TEXT,
    capabilities JSONB,
    certifications TEXT[],
    experience_categories TEXT[],
    rating DECIMAL(3,2),
    preferred BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. INTAKE ENHANCEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_hash TEXT,
    published_date DATE,
    changes_summary TEXT,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tender_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    related_tender_id UUID REFERENCES tenders(id),
    relation_type TEXT NOT NULL,
    similarity_score DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. GATEKEEPING ENHANCEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS similarity_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    term TEXT NOT NULL,
    interpretation_type TEXT NOT NULL,
    criteria JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS condition_interpretations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_id UUID,
    interpretation_type TEXT NOT NULL,
    interpretation TEXT NOT NULL,
    confidence DECIMAL(3,2),
    risk_level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_condition_interp_condition ON condition_interpretations(condition_id);
CREATE INDEX IF NOT EXISTS idx_similarity_defs_category ON similarity_definitions(category);

-- ============================================
-- 8. BOQ/SPEC ENHANCEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS spec_boq_crossref (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    spec_item_id UUID,
    boq_item_id UUID,
    match_type TEXT NOT NULL,
    discrepancy_type TEXT,
    discrepancy_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS boq_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id),
    item_code TEXT,
    current_price DECIMAL,
    avg_historical_price DECIMAL,
    price_position TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricing_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id),
    boq_item_id UUID,
    recommended_price DECIMAL,
    price_basis TEXT,
    confidence DECIMAL(3,2),
    strategy TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. COMPETITOR INTELLIGENCE
-- ============================================
CREATE TABLE IF NOT EXISTS tender_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_number TEXT NOT NULL,
    tender_name TEXT,
    issuing_body TEXT,
    category TEXT,
    winner_name TEXT,
    winning_price DECIMAL,
    num_bidders INTEGER,
    result_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tender_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_result_id UUID REFERENCES tender_results(id) ON DELETE CASCADE,
    bidder_name TEXT NOT NULL,
    bid_price DECIMAL,
    bid_rank INTEGER,
    disqualified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_results_number ON tender_results(tender_number);
CREATE INDEX IF NOT EXISTS idx_tender_bids_result ON tender_bids(tender_result_id);

-- ============================================
-- SEED DATA
-- ============================================

-- Dictionary Categories
INSERT INTO dictionary_categories (name, name_en, description, keywords) VALUES
('תשתיות', 'Infrastructure', 'עבודות תשתית, ביוב, מים, חשמל', ARRAY['ביוב', 'מים', 'חשמל', 'כבישים']),
('בינוי', 'Construction', 'עבודות בנייה, שיפוצים, גמר', ARRAY['בנייה', 'שיפוץ', 'טיח', 'ריצוף']),
('מערכות מידע', 'IT', 'תוכנה, חומרה, רשתות', ARRAY['תוכנה', 'מחשבים', 'רשת', 'ענן']),
('אבטחה', 'Security', 'מערכות אבטחה, שמירה', ARRAY['אבטחה', 'מצלמות', 'שמירה', 'בקרה']),
('תקשורת', 'Communications', 'טלפוניה, אינטרנט', ARRAY['טלפון', 'אינטרנט', 'סיבים'])
ON CONFLICT (name) DO NOTHING;

-- Accumulation Rules
INSERT INTO accumulation_rules (rule_name, entity_type, aggregation_method, dedup_fields, time_window_months) VALUES
('project_revenue', 'project', 'sum', ARRAY['project_name', 'client_name', 'year'], NULL),
('experience_years', 'experience', 'count_distinct', ARRAY['project_name', 'role'], NULL),
('similar_projects', 'project', 'count_distinct', ARRAY['project_name', 'client_name'], 36),
('annual_revenue', 'revenue', 'sum', ARRAY['year', 'source'], 12)
ON CONFLICT (rule_name) DO NOTHING;

-- Gap Closure Options
INSERT INTO gap_closure_options (gap_type, closure_method, description, typical_time_days, risks) VALUES
('experience', 'subcontractor', 'שכירת קבלן משנה', 14, ARRAY['תלות', 'עלות']),
('experience', 'partner', 'שותפות עם חברה בעלת ניסיון', 30, ARRAY['חלוקת רווחים']),
('revenue', 'partner', 'שותפות עם חברה גדולה', 30, ARRAY['תלות בשותף']),
('certificate', 'training', 'הכשרת עובדים', 60, ARRAY['זמן', 'עלות']),
('certificate', 'hire', 'גיוס בעל תעודה', 30, ARRAY['עלות שכר']),
('financial', 'guarantee', 'ערבות בנקאית', 7, ARRAY['עלות ערבות']);

-- Potential Partners
INSERT INTO potential_partners (company_name, company_number, contact_name, capabilities, experience_categories, rating, preferred) VALUES
('אקמה תשתיות בע"מ', '520000001', 'יוסי כהן', '{"experience": true}', ARRAY['experience'], 4.5, true),
('טק-פרו מערכות בע"מ', '520000002', 'דנה לוי', '{"technology": true}', ARRAY['certificate'], 4.2, false),
('גארד סקיוריטי בע"מ', '520000004', 'משה ברק', '{"security": true}', ARRAY['security'], 4.6, true)
ON CONFLICT (company_number) DO NOTHING;

-- Similarity Definitions
INSERT INTO similarity_definitions (category, term, interpretation_type, criteria, notes) VALUES
('תשתיות', 'פרויקט דומה', 'flexible', '{"size_range": [0.5, 2.0]}', 'היקף 50%-200%'),
('אבטחה', 'פרויקט דומה', 'flexible', '{"same_domain": true}', 'פרויקט אבטחה דומה'),
('מערכות מידע', 'מערכת דומה', 'strict', '{"same_technology_stack": true}', 'אותה טכנולוגיה');

-- Tender Results (Historical)
INSERT INTO tender_results (tender_number, tender_name, issuing_body, category, result_date, winner_name, winning_price, num_bidders) VALUES
('HIS-2025-001', 'פיתוח מערכת ניהול מידע', 'משרד הבריאות', 'מערכות מידע', '2025-11-15', 'דיגיטל סולושנס', 3500000, 5),
('MOD-2025-042', 'שיפוץ מבנה מגורים', 'משרד הביטחון', 'בינוי', '2025-10-20', 'תשתיות הצפון', 12000000, 8),
('TLV-2025-088', 'מערכת מצלמות עירונית', 'עיריית תל אביב', 'אבטחה', '2025-08-15', 'דקל מערכות', 8500000, 6);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT '✅ All tables created successfully!' as status;

SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns WHERE c.table_name = information_schema.columns.table_name) as columns
FROM information_schema.tables c
WHERE table_schema = 'public'
AND table_name IN (
    'tender_reports', 'source_references', 'dictionary_categories', 'dictionary_terms',
    'term_occurrences', 'accumulation_rules', 'accumulation_items', 'gap_closure_options',
    'potential_partners', 'document_versions', 'tender_relations', 'similarity_definitions',
    'condition_interpretations', 'spec_boq_crossref', 'boq_comparisons', 'pricing_recommendations',
    'tender_results', 'tender_bids'
)
ORDER BY table_name;
