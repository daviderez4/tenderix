-- ============================================
-- TENDERIX - 12 MISSING TABLES (NO FK CONSTRAINTS)
-- Copy-paste this entire block into Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS term_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID,
    tender_id UUID,
    context TEXT,
    source_ref_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accumulation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    item_type TEXT NOT NULL,
    item_data JSONB NOT NULL DEFAULT '{}',
    dedup_hash TEXT NOT NULL DEFAULT '',
    source_document TEXT,
    valid_from DATE,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS potential_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    company_number TEXT,
    contact_name TEXT,
    contact_email TEXT,
    capabilities JSONB,
    certifications TEXT[],
    experience_categories TEXT[],
    rating DECIMAL(3,2),
    preferred BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID,
    document_type TEXT NOT NULL DEFAULT 'unknown',
    version_number INTEGER NOT NULL DEFAULT 1,
    file_name TEXT NOT NULL DEFAULT '',
    file_hash TEXT,
    published_date DATE,
    changes_summary TEXT,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tender_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID,
    related_tender_id UUID,
    relation_type TEXT NOT NULL DEFAULT 'similar',
    similarity_score DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS similarity_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    term TEXT NOT NULL,
    interpretation_type TEXT NOT NULL DEFAULT 'flexible',
    criteria JSONB NOT NULL DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS condition_interpretations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_id UUID,
    interpretation_type TEXT NOT NULL DEFAULT 'standard',
    interpretation TEXT NOT NULL DEFAULT '',
    confidence DECIMAL(3,2),
    risk_level TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spec_boq_crossref (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID,
    spec_item_id UUID,
    boq_item_id UUID,
    match_type TEXT NOT NULL DEFAULT 'exact',
    discrepancy_type TEXT,
    discrepancy_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS boq_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID,
    item_code TEXT,
    current_price DECIMAL,
    avg_historical_price DECIMAL,
    price_position TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricing_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID,
    boq_item_id UUID,
    recommended_price DECIMAL,
    price_basis TEXT,
    confidence DECIMAL(3,2),
    strategy TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
    tender_result_id UUID,
    bidder_name TEXT NOT NULL DEFAULT '',
    bid_price DECIMAL,
    bid_rank INTEGER,
    disqualified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verify
SELECT 'SUCCESS: All 12 tables created!' as result;
