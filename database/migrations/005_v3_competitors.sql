-- Migration 005: Competitors & Competitive Intelligence
-- v3 Architecture: Pillar 4 (מתחרים)
-- Priority: MEDIUM - Required for P4 competitive analysis

-- ============================================
-- Competitors (מתחרים)
-- Module 4.2 - Competitor Mapping
-- ============================================

CREATE TABLE IF NOT EXISTS competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id), -- Which org tracks this competitor

    -- Basic Info
    name TEXT NOT NULL,
    company_number TEXT, -- ח.פ.
    website TEXT,

    -- Profile
    strengths TEXT[],
    weaknesses TEXT[],
    typical_domains TEXT[], -- 'VIDEO', 'COMMUNICATION', etc.

    -- Intelligence
    known_pricing_strategy TEXT,
    relationship_notes TEXT, -- קשרים ידועים עם מזמינים
    typical_margin_range TEXT, -- e.g., "15-25%"

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Competitor Bids (הצעות זוכות)
-- Modules 4.1, 4.3 - Historical bid data
-- ============================================

CREATE TABLE IF NOT EXISTS competitor_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,

    -- Tender Reference
    tender_issuing_body TEXT NOT NULL,
    tender_name TEXT,
    tender_number TEXT,
    tender_year INTEGER,

    -- Bid Details
    bid_amount DECIMAL(15,2),
    won BOOLEAN DEFAULT FALSE,
    quality_score DECIMAL(5,2),
    price_score DECIMAL(5,2),
    total_score DECIMAL(5,2),
    rank INTEGER, -- Position in competition

    -- Pricing Analysis (Module 4.3 - per Elitzach)
    price_per_unit JSONB DEFAULT '{}', -- { "camera": 2500, "access_point": 1500 }
    margin_estimate DECIMAL(5,2),

    -- Project Details (if won)
    project_scope TEXT,
    contract_value DECIMAL(15,2),
    contract_duration_months INTEGER,

    -- Source
    source_url TEXT,
    source_type TEXT, -- 'PUBLIC_RECORD', 'MARKET_INTEL', 'PRESS', 'ESTIMATE'
    confidence_level TEXT DEFAULT 'MEDIUM', -- 'HIGH', 'MEDIUM', 'LOW'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Tender Competitors (מתחרים למכרז)
-- Links competitors to specific tender being analyzed
-- ============================================

CREATE TABLE IF NOT EXISTS tender_competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    competitor_id UUID NOT NULL REFERENCES competitors(id),

    -- Assessment
    likelihood_to_bid TEXT DEFAULT 'MEDIUM', -- 'HIGH', 'MEDIUM', 'LOW', 'CONFIRMED'
    estimated_advantage TEXT, -- Our advantage/disadvantage vs them

    -- Pricing Intelligence
    estimated_bid_range_low DECIMAL(15,2),
    estimated_bid_range_high DECIMAL(15,2),
    pricing_strategy_expected TEXT,

    -- Competitive Analysis
    their_strengths TEXT[], -- For this specific tender
    their_weaknesses TEXT[], -- For this specific tender
    our_counter_strategy TEXT,

    -- Status
    confirmed_participating BOOLEAN DEFAULT FALSE,
    actual_bid_amount DECIMAL(15,2), -- Filled after tender results

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tender_id, competitor_id)
);

-- ============================================
-- Market Pricing Intelligence
-- Aggregated pricing data for estimation
-- ============================================

CREATE TABLE IF NOT EXISTS market_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Item Type
    category TEXT NOT NULL, -- 'VIDEO', 'COMMUNICATION', etc.
    item_type TEXT NOT NULL, -- 'camera_installation', 'fiber_per_meter', etc.
    item_description TEXT,

    -- Pricing
    low_price DECIMAL(15,2),
    typical_price DECIMAL(15,2),
    high_price DECIMAL(15,2),
    unit TEXT, -- 'each', 'meter', 'point', etc.

    -- Source & Validity
    based_on_bids INTEGER, -- Number of bids this is based on
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_competitors_org ON competitors(org_id);
CREATE INDEX IF NOT EXISTS idx_competitors_name ON competitors(name);

CREATE INDEX IF NOT EXISTS idx_competitor_bids_competitor ON competitor_bids(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_bids_issuer ON competitor_bids(tender_issuing_body);
CREATE INDEX IF NOT EXISTS idx_competitor_bids_year ON competitor_bids(tender_year);
CREATE INDEX IF NOT EXISTS idx_competitor_bids_won ON competitor_bids(won);

CREATE INDEX IF NOT EXISTS idx_tender_competitors_tender ON tender_competitors(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_competitors_competitor ON tender_competitors(competitor_id);

CREATE INDEX IF NOT EXISTS idx_market_pricing_category ON market_pricing(category, item_type);

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_competitors_timestamp ON competitors;
CREATE TRIGGER update_competitors_timestamp
    BEFORE UPDATE ON competitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tender_competitors_timestamp ON tender_competitors;
CREATE TRIGGER update_tender_competitors_timestamp
    BEFORE UPDATE ON tender_competitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_pricing ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE competitors IS 'מתחרים - Competitor company profiles';
COMMENT ON TABLE competitor_bids IS 'הצעות זוכות - Historical bid data for pricing intelligence';
COMMENT ON TABLE tender_competitors IS 'מתחרים למכרז - Competitors expected in specific tender';
COMMENT ON TABLE market_pricing IS 'מחירי שוק - Market pricing intelligence for estimation';
