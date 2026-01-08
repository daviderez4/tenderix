-- Migration 002: Company Portfolio Tables
-- v3 Architecture: Module 2.0 Company Profile Enhancement
-- Priority: HIGH - Required for gate condition matching

-- ============================================
-- Company Projects (תיק פרויקטים)
-- Per Elitzach & Ido requirements
-- ============================================

CREATE TABLE IF NOT EXISTS company_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Basic Info
    project_name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_type TEXT, -- 'GOVERNMENT', 'MUNICIPAL', 'PRIVATE', 'DEFENSE'

    -- Dates (per Elitzach - end_date_type matters)
    start_date DATE,
    end_date DATE,
    end_date_type TEXT DEFAULT 'DELIVERY', -- 'DELIVERY', 'FINAL_ACCOUNT', 'WARRANTY'

    -- Financials (per Ido - separate establishment/maintenance)
    total_value DECIMAL(15,2),
    establishment_value DECIMAL(15,2), -- היקף הקמה
    maintenance_value DECIMAL(15,2), -- היקף אחזקה
    maintenance_months INTEGER, -- משך אחזקה בחודשים

    -- Role
    role_type TEXT NOT NULL DEFAULT 'PRIMARY', -- 'PRIMARY', 'SUBCONTRACTOR', 'PARTNERSHIP'
    role_percentage DECIMAL(5,2) DEFAULT 100, -- אחוז השתתפות

    -- Project Type (per Ido)
    project_type TEXT DEFAULT 'COMBINED', -- 'ESTABLISHMENT', 'MAINTENANCE', 'COMBINED'

    -- Technical Details
    technologies JSONB DEFAULT '{}', -- { "cameras": ["Axis"], "vms": "Milestone" }
    quantities JSONB DEFAULT '{}', -- { "cameras": 150, "access_points": 50 }
    integrations TEXT[],
    sla_provided TEXT,

    -- Supporting Documents
    client_approval_url TEXT,

    -- Tangent Projects (per Elitzach)
    is_tangent BOOLEAN DEFAULT FALSE, -- פרויקט משיק
    tangent_description TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Company Personnel (אנשי מפתח)
-- ============================================

CREATE TABLE IF NOT EXISTS company_personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    education TEXT,
    years_experience INTEGER,
    certifications TEXT[],

    -- Link to projects led
    projects_led UUID[], -- References to company_projects

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Company Certifications (הסמכות ורישיונות)
-- Detailed tracking beyond the array in company_profile
-- ============================================

CREATE TABLE IF NOT EXISTS company_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    cert_type TEXT NOT NULL, -- 'ISO', 'LICENSE', 'SECURITY_CLEARANCE', 'CONTRACTOR_REG', 'TAX'
    cert_name TEXT NOT NULL,
    issuing_body TEXT,

    valid_from DATE,
    valid_until DATE,

    document_url TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Gate Condition Matches
-- Track how projects/personnel match gate conditions
-- Implements C3: Accumulation Logic
-- ============================================

CREATE TABLE IF NOT EXISTS gate_condition_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_condition_id UUID NOT NULL REFERENCES gate_conditions(id) ON DELETE CASCADE,

    -- What matches (one of these)
    project_id UUID REFERENCES company_projects(id),
    personnel_id UUID REFERENCES company_personnel(id),
    certification_id UUID REFERENCES company_certifications(id),

    -- Match Status
    match_status TEXT NOT NULL, -- 'FULL', 'PARTIAL', 'NONE', 'NEEDS_INTERPRETATION'
    match_confidence DECIMAL(5,2), -- 0-100%

    -- Interpretation (per Elitzach - "similar" interpretation)
    interpretation_applied TEXT,
    is_dual_interpretation BOOLEAN DEFAULT FALSE, -- פרשנות כפולה

    -- Contribution (per Ido - can count for both gate and score)
    contributes_to TEXT DEFAULT 'GATE', -- 'GATE', 'SCORE', 'BOTH'
    score_contribution DECIMAL(5,2),

    -- Gap Closure (per Elitzach & Ido)
    gap_description TEXT,
    gap_closure_option TEXT, -- 'SUBCONTRACTOR', 'PARTNERSHIP', 'ALTERNATE_DOC', 'DEVELOPMENT', 'CLARIFICATION', 'BLOCKING'

    -- Potential Partners (per Elitzach - suggest partners)
    potential_partners JSONB, -- [ { "company": "...", "reason": "..." } ]

    justification TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_company_projects_org ON company_projects(org_id);
CREATE INDEX IF NOT EXISTS idx_company_projects_dates ON company_projects(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_company_projects_type ON company_projects(project_type);
CREATE INDEX IF NOT EXISTS idx_company_projects_value ON company_projects(total_value);

CREATE INDEX IF NOT EXISTS idx_company_personnel_org ON company_personnel(org_id);

CREATE INDEX IF NOT EXISTS idx_company_certifications_org ON company_certifications(org_id);
CREATE INDEX IF NOT EXISTS idx_company_certifications_validity ON company_certifications(valid_until);

CREATE INDEX IF NOT EXISTS idx_gate_condition_matches_condition ON gate_condition_matches(gate_condition_id);
CREATE INDEX IF NOT EXISTS idx_gate_condition_matches_project ON gate_condition_matches(project_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_company_projects_timestamp ON company_projects;
CREATE TRIGGER update_company_projects_timestamp
    BEFORE UPDATE ON company_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_personnel_timestamp ON company_personnel;
CREATE TRIGGER update_company_personnel_timestamp
    BEFORE UPDATE ON company_personnel
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE company_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_condition_matches ENABLE ROW LEVEL SECURITY;

-- Policies (adjust based on your auth setup)
-- Example: Users can only see their organization's data
-- CREATE POLICY "Users can view own org projects" ON company_projects
--     FOR SELECT USING (org_id = auth.jwt() ->> 'org_id');

COMMENT ON TABLE company_projects IS 'תיק פרויקטים - Project portfolio for gate condition matching';
COMMENT ON TABLE company_personnel IS 'אנשי מפתח - Key personnel for experience requirements';
COMMENT ON TABLE company_certifications IS 'הסמכות ורישיונות - Certifications with validity tracking';
COMMENT ON TABLE gate_condition_matches IS 'התאמת תנאי סף - How company assets match gate conditions';
