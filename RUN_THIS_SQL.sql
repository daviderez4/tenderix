-- ============================================
-- TENDERIX v3.0 - COMPLETE DATABASE SETUP
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/sql/new
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- TENDER CONDITIONS (required for foreign keys)
-- ============================================
CREATE TABLE IF NOT EXISTS tender_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    condition_number TEXT,
    condition_text TEXT NOT NULL,
    condition_type TEXT DEFAULT 'mandatory',
    category TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- C1: SOURCE REFERENCES (Traceability)
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

-- ============================================
-- C2: DICTIONARY
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

-- ============================================
-- C3: ACCUMULATION LOGIC
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
    valid_from DATE,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- C4: GAP CLOSURE
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
    capabilities JSONB,
    experience_categories TEXT[],
    rating DECIMAL(3,2),
    preferred BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INTAKE ENHANCEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS tender_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    definition TEXT NOT NULL,
    section_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT,
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
-- GATE CONDITIONS ENHANCEMENTS
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
    condition_id UUID REFERENCES tender_conditions(id) ON DELETE CASCADE,
    interpretation_type TEXT NOT NULL,
    interpretation TEXT NOT NULL,
    confidence DECIMAL(3,2),
    risk_level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BOQ & SPECIFICATION
-- ============================================
CREATE TABLE IF NOT EXISTS specification_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    item_code TEXT,
    description TEXT NOT NULL,
    quantity DECIMAL,
    unit TEXT,
    requirements JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS boq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    item_code TEXT,
    description TEXT NOT NULL,
    quantity DECIMAL,
    unit TEXT,
    unit_price DECIMAL,
    total_price DECIMAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spec_boq_crossref (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    spec_item_id UUID REFERENCES specification_items(id),
    boq_item_id UUID REFERENCES boq_items(id),
    match_type TEXT NOT NULL,
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
    boq_item_id UUID REFERENCES boq_items(id),
    recommended_price DECIMAL,
    price_basis TEXT,
    confidence DECIMAL(3,2),
    strategy TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPETITOR INTELLIGENCE
-- ============================================
CREATE TABLE IF NOT EXISTS tender_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_number TEXT NOT NULL,
    tender_name TEXT,
    issuing_body TEXT,
    category TEXT,
    result_date DATE,
    winner_name TEXT,
    winning_price DECIMAL,
    num_bidders INTEGER,
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

CREATE TABLE IF NOT EXISTS competitor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    company_number TEXT UNIQUE,
    categories TEXT[],
    typical_bid_size_min DECIMAL,
    typical_bid_size_max DECIMAL,
    win_rate DECIMAL(5,4),
    total_bids INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    pricing_behavior TEXT,
    preferred_clients TEXT[],
    strengths TEXT[],
    last_activity DATE,
    data_quality TEXT DEFAULT 'low',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS tender_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    report_type TEXT DEFAULT 'full_analysis',
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

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_source_refs_tender ON source_references(tender_id);
CREATE INDEX IF NOT EXISTS idx_source_refs_entity ON source_references(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_dict_terms_normalized ON dictionary_terms(term_normalized);
CREATE INDEX IF NOT EXISTS idx_accum_items_type ON accumulation_items(company_id, item_type);
CREATE INDEX IF NOT EXISTS idx_tender_results_winner ON tender_results(winner_name);
CREATE INDEX IF NOT EXISTS idx_competitor_profiles_name ON competitor_profiles(company_name);
CREATE INDEX IF NOT EXISTS idx_tender_reports_tender ON tender_reports(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_conditions_tender ON tender_conditions(tender_id);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Dictionary Categories
INSERT INTO dictionary_categories (name, name_en, description, keywords) VALUES
('תשתיות', 'Infrastructure', 'עבודות תשתית, ביוב, מים, חשמל', ARRAY['ביוב', 'מים', 'חשמל', 'כבישים']),
('בינוי', 'Construction', 'עבודות בנייה, שיפוצים, גמר', ARRAY['בנייה', 'שיפוץ', 'טיח']),
('מערכות מידע', 'IT', 'תוכנה, חומרה, רשתות', ARRAY['תוכנה', 'מחשבים', 'רשת']),
('שירותים', 'Services', 'שירותי ייעוץ, ניהול, תחזוקה', ARRAY['ייעוץ', 'ניהול', 'תחזוקה']),
('רכש', 'Procurement', 'רכישת ציוד, חומרים', ARRAY['ציוד', 'רכש', 'אספקה']),
('אבטחה', 'Security', 'מערכות אבטחה, שמירה', ARRAY['אבטחה', 'מצלמות', 'שמירה']),
('תקשורת', 'Communications', 'טלפוניה, אינטרנט', ARRAY['טלפון', 'אינטרנט', 'סיבים'])
ON CONFLICT (name) DO NOTHING;

-- Accumulation Rules
INSERT INTO accumulation_rules (rule_name, entity_type, aggregation_method, dedup_fields) VALUES
('project_revenue', 'project', 'sum', ARRAY['project_name', 'client_name', 'year']),
('experience_years', 'experience', 'count_distinct', ARRAY['project_name', 'role']),
('similar_projects', 'project', 'count_distinct', ARRAY['project_name', 'client_name']),
('annual_revenue', 'revenue', 'sum', ARRAY['year', 'source']),
('employee_count', 'employee', 'max', ARRAY['employee_id'])
ON CONFLICT (rule_name) DO NOTHING;

-- Gap Closure Options
INSERT INTO gap_closure_options (gap_type, closure_method, description, typical_time_days, risks) VALUES
('experience', 'subcontractor', 'שכירת קבלן משנה עם הניסיון הנדרש', 14, ARRAY['תלות בקבלן', 'עלות נוספת']),
('experience', 'partner', 'שותפות עם חברה בעלת ניסיון', 30, ARRAY['חלוקת רווחים']),
('revenue', 'partner', 'שותפות עם חברה גדולה יותר', 30, ARRAY['תלות בשותף']),
('revenue', 'consortium', 'הקמת קונסורציום', 45, ARRAY['ניהול מורכב']),
('certificate', 'training', 'הכשרת עובדים לקבלת תעודה', 60, ARRAY['זמן הכשרה']),
('certificate', 'hire', 'גיוס בעל התעודה', 30, ARRAY['עלות שכר']),
('staff', 'hire', 'גיוס עובדים', 45, ARRAY['זמן גיוס']),
('staff', 'outsource', 'מיקור חוץ', 14, ARRAY['תלות בספק']),
('financial', 'guarantee', 'ערבות בנקאית', 7, ARRAY['עלות ערבות']),
('financial', 'insurance', 'פוליסת ביטוח', 14, ARRAY['פרמיה']);

-- Potential Partners
INSERT INTO potential_partners (company_name, company_number, contact_name, capabilities, experience_categories, rating, preferred) VALUES
('אקמה תשתיות בע"מ', '520000001', 'יוסי כהן', '{"experience": true, "certifications": ["ISO9001"]}', ARRAY['experience', 'certificate'], 4.5, true),
('טק-פרו מערכות בע"מ', '520000002', 'דנה לוי', '{"technology": true, "team": true}', ARRAY['staff', 'certificate'], 4.2, false),
('פיננס פלוס בע"מ', '520000003', 'אבי רוזן', '{"financing": true, "guarantees": true}', ARRAY['financial', 'revenue'], 4.8, true)
ON CONFLICT (company_number) DO NOTHING;

-- Competitor Profiles
INSERT INTO competitor_profiles (company_name, company_number, categories, typical_bid_size_min, typical_bid_size_max, win_rate, total_bids, total_wins, pricing_behavior, preferred_clients, strengths, last_activity, data_quality) VALUES
('חברת תשתיות הצפון בע"מ', '510000001', ARRAY['תשתיות', 'בינוי'], 1000000, 50000000, 0.25, 40, 10, 'balanced', ARRAY['משרד הביטחון'], ARRAY['ניסיון רב'], '2026-01-01', 'high'),
('דיגיטל סולושנס בע"מ', '510000002', ARRAY['מערכות מידע'], 500000, 10000000, 0.35, 20, 7, 'aggressive', ARRAY['משרד הבריאות'], ARRAY['טכנולוגיה מתקדמת'], '2026-01-05', 'medium'),
('שירותי ניהול מתקדמים בע"מ', '510000003', ARRAY['שירותים'], 100000, 5000000, 0.20, 50, 10, 'premium', ARRAY['עיריות'], ARRAY['שירות איכותי'], '2025-12-20', 'medium')
ON CONFLICT (company_number) DO NOTHING;

-- Tender Results
INSERT INTO tender_results (tender_number, tender_name, issuing_body, category, result_date, winner_name, winning_price, num_bidders) VALUES
('HIS-2025-001', 'פיתוח מערכת ניהול מידע', 'משרד הבריאות', 'מערכות מידע', '2025-11-15', 'דיגיטל סולושנס בע"מ', 3500000, 5),
('MOD-2025-042', 'שיפוץ מבנה מגורים', 'משרד הביטחון', 'בינוי', '2025-10-20', 'חברת תשתיות הצפון בע"מ', 12000000, 8),
('IEC-2025-015', 'התקנת תשתיות חשמל', 'חברת החשמל', 'תשתיות', '2025-09-01', 'בונים ביחד בע"מ', 25000000, 4);

-- Similarity Definitions
INSERT INTO similarity_definitions (category, term, interpretation_type, criteria, notes) VALUES
('תשתיות', 'פרויקט דומה', 'flexible', '{"size_range": [0.5, 2.0], "same_sector": true}', 'פרויקט בהיקף 50%-200%'),
('מערכות מידע', 'מערכת דומה', 'strict', '{"same_technology_stack": true, "same_scale": true}', 'אותה טכנולוגיה'),
('בינוי', 'עבודה דומה', 'flexible', '{"size_range": [0.3, 3.0], "same_building_type": true}', 'אותו סוג מבנה'),
('שירותים', 'שירות דומה', 'flexible', '{"same_service_type": true}', 'אותו סוג שירות');

-- ============================================
-- VERIFICATION
-- ============================================
SELECT
    'Tables Created' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tables;

SELECT
    'dictionary_categories' as table_name, COUNT(*) as rows FROM dictionary_categories
UNION ALL SELECT 'accumulation_rules', COUNT(*) FROM accumulation_rules
UNION ALL SELECT 'gap_closure_options', COUNT(*) FROM gap_closure_options
UNION ALL SELECT 'potential_partners', COUNT(*) FROM potential_partners
UNION ALL SELECT 'competitor_profiles', COUNT(*) FROM competitor_profiles
UNION ALL SELECT 'tender_results', COUNT(*) FROM tender_results
UNION ALL SELECT 'similarity_definitions', COUNT(*) FROM similarity_definitions;

SELECT '🎉 Tenderix v3.0 Database Setup Complete!' as message;
