-- ============================================
-- TENDERIX - 12 MISSING TABLES ONLY
-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/sql/new
-- ============================================

-- 1. term_occurrences (depends on dictionary_terms, tenders, source_references)
CREATE TABLE IF NOT EXISTS term_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID REFERENCES dictionary_terms(id) ON DELETE CASCADE,
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    context TEXT,
    source_ref_id UUID REFERENCES source_references(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. accumulation_items
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

-- 3. potential_partners
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

-- 4. document_versions
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

-- 5. tender_relations
CREATE TABLE IF NOT EXISTS tender_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    related_tender_id UUID REFERENCES tenders(id),
    relation_type TEXT NOT NULL,
    similarity_score DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. similarity_definitions
CREATE TABLE IF NOT EXISTS similarity_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    term TEXT NOT NULL,
    interpretation_type TEXT NOT NULL,
    criteria JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. condition_interpretations (references gate_conditions)
CREATE TABLE IF NOT EXISTS condition_interpretations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_id UUID REFERENCES gate_conditions(id) ON DELETE CASCADE,
    interpretation_type TEXT NOT NULL,
    interpretation TEXT NOT NULL,
    confidence DECIMAL(3,2),
    risk_level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_condition_interp_condition ON condition_interpretations(condition_id);
CREATE INDEX IF NOT EXISTS idx_similarity_defs_category ON similarity_definitions(category);

-- 8. spec_boq_crossref (references spec_items, boq_items)
CREATE TABLE IF NOT EXISTS spec_boq_crossref (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    spec_item_id UUID REFERENCES spec_items(id) ON DELETE SET NULL,
    boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
    match_type TEXT NOT NULL,
    discrepancy_type TEXT,
    discrepancy_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. boq_comparisons
CREATE TABLE IF NOT EXISTS boq_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id),
    item_code TEXT,
    current_price DECIMAL,
    avg_historical_price DECIMAL,
    price_position TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. pricing_recommendations
CREATE TABLE IF NOT EXISTS pricing_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id),
    boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
    recommended_price DECIMAL,
    price_basis TEXT,
    confidence DECIMAL(3,2),
    strategy TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. tender_results
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

CREATE INDEX IF NOT EXISTS idx_tender_results_number ON tender_results(tender_number);

-- 12. tender_bids (references tender_results)
CREATE TABLE IF NOT EXISTS tender_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_result_id UUID REFERENCES tender_results(id) ON DELETE CASCADE,
    bidder_name TEXT NOT NULL,
    bid_price DECIMAL,
    bid_rank INTEGER,
    disqualified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_bids_result ON tender_bids(tender_result_id);

-- ============================================
-- SEED DATA FOR NEW TABLES
-- ============================================

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
SELECT 'All 12 tables created!' as status;
