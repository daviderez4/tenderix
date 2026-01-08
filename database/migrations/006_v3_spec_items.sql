-- Migration 006: Technical Specifications Table
-- v3 Architecture: Module 3.1 (ניתוח מפרט טכני)
-- Priority: MEDIUM - Required for P3 specs analysis

-- ============================================
-- Spec Items (פריטי מפרט)
-- Module 3.1 - Technical Specification Analysis
-- ============================================

CREATE TABLE IF NOT EXISTS spec_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    -- Spec Details
    spec_section TEXT, -- Section number in spec document
    item_name TEXT NOT NULL,
    item_description TEXT,

    -- Category
    category TEXT, -- 'VIDEO', 'COMMUNICATION', 'ACCESS_CONTROL', etc.
    subcategory TEXT,

    -- Requirements
    requirements JSONB DEFAULT '{}', -- Detailed technical requirements
    manufacturer_restrictions TEXT[], -- Specific brands required/preferred
    required_certifications TEXT[], -- CE, UL, ISO, etc.

    -- Quantities
    quantity INTEGER,
    unit TEXT,

    -- Analysis
    complexity_level TEXT DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH'
    our_capability_match TEXT, -- 'FULL', 'PARTIAL', 'NEED_PARTNER', 'CANNOT'
    capability_notes TEXT,

    -- Comparison (Module 3.4.5 - per Elitzach)
    similar_tender_comparison TEXT,
    is_unusual BOOLEAN DEFAULT FALSE,
    unusual_reason TEXT,

    -- Risk
    risk_level TEXT DEFAULT 'LOW', -- 'LOW', 'MEDIUM', 'HIGH'
    risk_notes TEXT,

    -- Link to BOQ
    boq_item_ids UUID[], -- Related BOQ items

    -- Source (Traceability)
    source_document_id UUID REFERENCES tender_documents(id),
    source_page INTEGER,
    source_section TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Spec-BOQ Discrepancies
-- Module 3.4 - Track mismatches between specs and BOQ
-- ============================================

CREATE TABLE IF NOT EXISTS spec_boq_discrepancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    -- References
    spec_item_id UUID REFERENCES spec_items(id),
    boq_item_id UUID REFERENCES boq_items(id),

    -- Discrepancy Details
    discrepancy_type TEXT NOT NULL, -- 'MISSING_IN_BOQ', 'MISSING_IN_SPEC', 'QUANTITY_MISMATCH', 'DESCRIPTION_MISMATCH'
    severity TEXT DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'

    spec_says TEXT,
    boq_says TEXT,

    -- Impact
    estimated_cost_impact DECIMAL(15,2),
    risk_description TEXT,

    -- Resolution
    recommended_action TEXT,
    suggested_clarification TEXT, -- Question to ask in clarifications
    resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_spec_items_tender ON spec_items(tender_id);
CREATE INDEX IF NOT EXISTS idx_spec_items_category ON spec_items(category);
CREATE INDEX IF NOT EXISTS idx_spec_items_risk ON spec_items(risk_level);

CREATE INDEX IF NOT EXISTS idx_spec_boq_discrepancies_tender ON spec_boq_discrepancies(tender_id);
CREATE INDEX IF NOT EXISTS idx_spec_boq_discrepancies_type ON spec_boq_discrepancies(discrepancy_type);
CREATE INDEX IF NOT EXISTS idx_spec_boq_discrepancies_severity ON spec_boq_discrepancies(severity);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE spec_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_boq_discrepancies ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE spec_items IS 'פריטי מפרט - Technical specification items with capability matching';
COMMENT ON TABLE spec_boq_discrepancies IS 'אי-התאמות - Discrepancies between specifications and BOQ';
