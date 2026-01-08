-- Tenderix Database Schema v1.0
-- Based on v3 Architecture Document
-- PostgreSQL/Supabase

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For Hebrew text search

-- ============================================
-- CORE: Company Profile (Module 2.0)
-- ============================================

-- Companies (המציע)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company_number TEXT UNIQUE, -- ח.פ.
    founding_year INTEGER,
    annual_revenue JSONB, -- { "2024": 50000000, "2023": 45000000 }
    employee_count INTEGER,
    activity_domains TEXT[], -- תחומי פעילות
    contractor_classifications TEXT[], -- סיווגים קבלניים
    parent_company_id UUID REFERENCES companies(id), -- חברת אם
    group_companies UUID[], -- חברות בת/אחות בקבוצה
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Certifications (הסמכות ורישיונות)
CREATE TABLE company_certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    cert_type TEXT NOT NULL, -- 'ISO', 'LICENSE', 'SECURITY_CLEARANCE', 'CONTRACTOR_REG'
    cert_name TEXT NOT NULL,
    issuing_body TEXT,
    valid_from DATE,
    valid_until DATE,
    document_url TEXT,
    metadata JSONB, -- Additional details
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Personnel (אנשי מפתח)
CREATE TABLE company_personnel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    education TEXT,
    years_experience INTEGER,
    certifications TEXT[],
    projects_led UUID[], -- References to company_projects
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Projects (תיק פרויקטים)
CREATE TABLE company_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_type TEXT, -- 'GOVERNMENT', 'MUNICIPAL', 'PRIVATE', 'DEFENSE'

    -- Dates
    start_date DATE,
    end_date DATE,
    end_date_type TEXT, -- 'DELIVERY', 'FINAL_ACCOUNT', 'WARRANTY' (per Elitzach)

    -- Financials (per Ido - separate establishment vs maintenance)
    total_value DECIMAL(15,2),
    establishment_value DECIMAL(15,2), -- היקף הקמה
    maintenance_value DECIMAL(15,2), -- היקף אחזקה
    maintenance_months INTEGER, -- משך אחזקה בחודשים

    -- Role
    role_type TEXT NOT NULL, -- 'PRIMARY', 'SUBCONTRACTOR', 'PARTNERSHIP'
    role_percentage DECIMAL(5,2), -- אחוז השתתפות

    -- Project Type (per Ido)
    project_type TEXT, -- 'ESTABLISHMENT', 'MAINTENANCE', 'COMBINED'

    -- Technical Details
    technologies JSONB, -- { "cameras": ["Axis", "Hanwha"], "vms": "Milestone" }
    quantities JSONB, -- { "cameras": 150, "access_points": 50 }
    integrations TEXT[],
    sla_provided TEXT,

    -- Supporting Documents
    client_approval_url TEXT,

    -- Traceability
    is_tangent BOOLEAN DEFAULT FALSE, -- פרויקט משיק (per Elitzach)
    tangent_description TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- P1: Tender Intake (קליטת מכרז)
-- ============================================

-- Tenders (מכרזים)
CREATE TABLE tenders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id), -- Which company is analyzing this

    -- Basic Info (Module 1.2)
    tender_number TEXT,
    tender_name TEXT NOT NULL,
    issuing_body TEXT NOT NULL, -- גוף מזמין

    -- Dates
    publish_date DATE,
    clarification_deadline DATE,
    submission_deadline TIMESTAMPTZ,

    -- Financial
    guarantee_amount DECIMAL(15,2), -- ערבות הצעה
    contract_duration_months INTEGER,
    extension_options TEXT,

    -- Scoring (per Elitzach)
    scoring_method TEXT, -- 'PRICE_ONLY', 'QUALITY_PRICE', 'QUALITY_ONLY'
    quality_weight DECIMAL(5,2),
    price_weight DECIMAL(5,2),

    -- Category (Module 1.5)
    category TEXT, -- 'VIDEO', 'COMMUNICATION', 'SOFTWARE', 'ACCESS_CONTROL', 'COMBINED'

    -- Previous Tender (Module 1.6 - per Elitzach)
    previous_tender_id UUID REFERENCES tenders(id),
    previous_winner TEXT,
    previous_winner_amount DECIMAL(15,2),
    copy_percentage DECIMAL(5,2), -- % העתקה מהמכרז הקודם

    -- Status
    status TEXT DEFAULT 'INTAKE', -- 'INTAKE', 'GATES', 'SPECS', 'COMPETITORS', 'DECISION'
    go_nogo_decision TEXT, -- 'GO', 'NO_GO', 'CONDITIONAL', 'PENDING'

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tender Documents (Module 1.1, 1.1.5)
CREATE TABLE tender_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    -- File Info
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'PDF', 'DOCX', 'XLSX'
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,

    -- Document Type (auto-detected)
    doc_type TEXT NOT NULL, -- 'INVITATION', 'SPECS', 'BOQ', 'CONTRACT', 'CLARIFICATIONS', 'FORMS'

    -- Version Control (Module 1.1.5 - per Ido)
    version INTEGER DEFAULT 1,
    parent_version_id UUID REFERENCES tender_documents(id),
    is_original BOOLEAN DEFAULT TRUE,
    version_changes TEXT, -- מה השתנה בין גרסאות

    -- Structure Mapping
    page_count INTEGER,
    structure JSONB, -- { "chapters": [...], "tables": [...], "appendices": [...] }

    -- Processing Status
    processing_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'ERROR'
    processed_text TEXT, -- Normalized text (Module 1.3)

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tender Definitions (Module 1.4 - internal dictionary)
CREATE TABLE tender_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    term TEXT NOT NULL, -- המונח
    definition TEXT NOT NULL, -- ההגדרה
    constraints TEXT, -- מגבלות

    -- Source (Traceability - Core C1)
    source_document_id UUID REFERENCES tender_documents(id),
    source_page INTEGER,
    source_section TEXT,
    source_quote TEXT,

    -- Interpretation (per Elitzach)
    interpretation_type TEXT, -- 'RESTRICTIVE', 'EXPANSIVE'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- P2: Gate Conditions (תנאי סף)
-- ============================================

-- Gate Conditions (Module 2.1)
CREATE TABLE gate_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    -- Condition Details
    condition_number TEXT, -- e.g., "3.1.2"
    condition_text TEXT NOT NULL,
    condition_type TEXT NOT NULL, -- 'GATE' (פוסל), 'ADVANTAGE' (ניקוד)

    -- Requirement Type (Module 2.1)
    requirement_type TEXT, -- 'CAPABILITY', 'EXECUTION'

    -- Logic
    logic_type TEXT, -- 'AND', 'OR', 'NESTED'
    parent_condition_id UUID REFERENCES gate_conditions(id), -- For nested conditions

    -- Quantitative Details (Module 2.2)
    required_amount DECIMAL(15,2),
    amount_currency TEXT DEFAULT 'ILS',
    required_count INTEGER,
    required_years INTEGER,
    date_reference TEXT, -- From which date to count

    -- Entity (Module 2.3 - per Elitzach & Ido)
    entity_type TEXT, -- 'COMPANY', 'SUBCONTRACTOR', 'PARTNERSHIP', 'PERSONNEL', 'PROJECT'
    entity_can_rely_on_subcontractor BOOLEAN DEFAULT FALSE,
    entity_can_rely_on_partnership BOOLEAN DEFAULT FALSE,

    -- Scoring (if ADVANTAGE)
    max_score DECIMAL(5,2),
    score_formula TEXT,

    -- Source (Traceability)
    source_document_id UUID REFERENCES tender_documents(id),
    source_page INTEGER,
    source_section TEXT,
    source_quote TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gate Condition Matches (Module 2.6 - matching projects to conditions)
CREATE TABLE gate_condition_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gate_condition_id UUID NOT NULL REFERENCES gate_conditions(id) ON DELETE CASCADE,
    project_id UUID REFERENCES company_projects(id),
    personnel_id UUID REFERENCES company_personnel(id),
    certification_id UUID REFERENCES company_certifications(id),

    -- Match Status
    match_status TEXT NOT NULL, -- 'FULL', 'PARTIAL', 'NONE', 'NEEDS_INTERPRETATION'
    match_confidence DECIMAL(5,2), -- 0-100%

    -- Interpretation Used (Module 2.4, 2.5)
    interpretation_applied TEXT, -- How "similar" was interpreted
    is_dual_interpretation BOOLEAN DEFAULT FALSE, -- פרשנות כפולה

    -- Contribution
    contributes_to TEXT, -- 'GATE', 'SCORE', 'BOTH'
    score_contribution DECIMAL(5,2),

    -- Gap (if partial/none)
    gap_description TEXT,
    gap_closure_option TEXT, -- 'SUBCONTRACTOR', 'PARTNERSHIP', 'ALTERNATE_DOC', 'DEVELOPMENT', 'CLARIFICATION', 'BLOCKING'

    -- Potential Partners (per Elitzach)
    potential_partners JSONB, -- [ { "company": "...", "reason": "..." } ]

    -- Source
    justification TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clarification Questions (Module 2.7, 2.7.5, 2.7.6)
CREATE TABLE clarification_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    -- Question Details
    question_text TEXT NOT NULL,
    question_type TEXT, -- 'TECHNICAL', 'PROCEDURAL', 'STRATEGIC', 'FROM_OTHERS'

    -- Strategic Purpose (Module 2.7.5 - per Elitzach)
    strategic_purpose TEXT, -- מה מנסים להשיג
    expected_impact TEXT,

    -- Related Condition
    related_condition_id UUID REFERENCES gate_conditions(id),

    -- Status
    status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'SENT', 'ANSWERED'
    answer_text TEXT,
    answer_impact TEXT, -- How does the answer change analysis

    -- Source (for questions from previous tender - Module 1.6)
    from_previous_tender BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- P3: Specs & BOQ (מפרט)
-- ============================================

-- Technical Specifications (Module 3.1)
CREATE TABLE spec_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    -- Item Details
    spec_section TEXT,
    item_name TEXT NOT NULL,
    item_description TEXT,

    -- Requirements
    requirements JSONB, -- Detailed technical requirements
    manufacturer_restrictions TEXT[], -- Specific brands required

    -- Comparison (Module 3.4.5 - per Elitzach)
    similar_tender_comparison TEXT,
    is_unusual BOOLEAN DEFAULT FALSE,
    unusual_reason TEXT,

    -- Source
    source_document_id UUID REFERENCES tender_documents(id),
    source_page INTEGER,
    source_section TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOQ Items (Module 3.2)
CREATE TABLE boq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    -- Item Details
    item_number TEXT,
    item_name TEXT NOT NULL,
    item_description TEXT,
    unit TEXT,
    quantity DECIMAL(15,2),

    -- Links
    spec_item_id UUID REFERENCES spec_items(id),

    -- Analysis (per Elitzach)
    missing_in_spec BOOLEAN DEFAULT FALSE, -- אי-התאמה
    discrepancy_notes TEXT,

    -- Pricing Risk (Module 3.5)
    pricing_risk_level TEXT, -- 'LOW', 'MEDIUM', 'HIGH'
    pricing_risk_reason TEXT,
    suggested_clarification TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scope Analysis (Module 3.3)
CREATE TABLE scope_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    scope_type TEXT, -- 'ESTABLISHMENT', 'MAINTENANCE', 'INTEGRATION'
    description TEXT,
    estimated_value_min DECIMAL(15,2),
    estimated_value_max DECIMAL(15,2),

    -- Risks
    risks JSONB, -- [ { "risk": "...", "impact": "...", "mitigation": "..." } ]

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- P4: Competitors (מתחרים)
-- ============================================

-- Competitors (Module 4.2)
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company_number TEXT,

    -- Profile
    strengths TEXT[],
    weaknesses TEXT[],
    typical_domains TEXT[],

    -- Intelligence
    known_pricing_strategy TEXT,
    relationship_notes TEXT, -- קשרים ידועים עם מזמינים

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor Bids (Module 4.1, 4.3)
CREATE TABLE competitor_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_id UUID NOT NULL REFERENCES competitors(id),

    -- Tender Reference
    tender_issuing_body TEXT,
    tender_name TEXT,
    tender_year INTEGER,
    tender_number TEXT,

    -- Bid Details
    bid_amount DECIMAL(15,2),
    won BOOLEAN,
    quality_score DECIMAL(5,2),

    -- Pricing Analysis (Module 4.3 - per Elitzach)
    price_per_unit JSONB, -- { "camera": 2500, "access_point": 1500 }

    -- Source
    source_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tender Competitors (linking competitors to specific tender)
CREATE TABLE tender_competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    competitor_id UUID NOT NULL REFERENCES competitors(id),

    -- Assessment
    likelihood_to_bid TEXT, -- 'HIGH', 'MEDIUM', 'LOW'
    estimated_advantage TEXT, -- vs our company

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- OUTPUT: GO/NO-GO Decision
-- ============================================

CREATE TABLE go_nogo_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    -- Decision
    decision TEXT NOT NULL, -- 'GO', 'NO_GO', 'CONDITIONAL'
    decision_date TIMESTAMPTZ DEFAULT NOW(),

    -- Gate Conditions Summary
    gates_passed INTEGER,
    gates_total INTEGER,
    gates_with_gaps INTEGER,
    gap_closure_feasibility TEXT, -- 'EASY', 'POSSIBLE', 'DIFFICULT', 'IMPOSSIBLE'

    -- Scoring Estimate
    estimated_quality_score DECIMAL(5,2),
    estimated_ranking TEXT, -- 'TOP_3', 'TOP_5', 'UNLIKELY'

    -- Risk Assessment
    overall_risk_level TEXT, -- 'LOW', 'MEDIUM', 'HIGH'
    key_risks JSONB,

    -- Recommendations
    recommendations JSONB, -- [ { "action": "...", "priority": "..." } ]
    required_documents JSONB, -- Documents needed for submission

    -- Notes
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CORE: Technical Dictionary (C2)
-- ============================================

CREATE TABLE technical_dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    category TEXT NOT NULL, -- 'VIDEO', 'COMMUNICATION', 'SOFTWARE', 'ACCESS_CONTROL', 'INFRASTRUCTURE'
    term TEXT NOT NULL,
    synonyms TEXT[],
    definition TEXT,

    -- Equivalence Rules (per Ido - capability-based interpretation)
    equivalent_terms JSONB, -- [ { "term": "...", "explanation": "why equivalent" } ]

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT & TRACEABILITY (C1)
-- ============================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    entity_type TEXT NOT NULL, -- 'tender', 'gate_condition', etc.
    entity_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'AI_ANALYSIS'

    user_id UUID,
    ai_model TEXT,

    old_values JSONB,
    new_values JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Tenders
CREATE INDEX idx_tenders_company ON tenders(company_id);
CREATE INDEX idx_tenders_status ON tenders(status);
CREATE INDEX idx_tenders_submission ON tenders(submission_deadline);

-- Documents
CREATE INDEX idx_documents_tender ON tender_documents(tender_id);
CREATE INDEX idx_documents_type ON tender_documents(doc_type);

-- Gate Conditions
CREATE INDEX idx_gate_conditions_tender ON gate_conditions(tender_id);
CREATE INDEX idx_gate_conditions_type ON gate_conditions(condition_type);

-- Projects
CREATE INDEX idx_projects_company ON company_projects(company_id);
CREATE INDEX idx_projects_dates ON company_projects(start_date, end_date);

-- Text Search (Hebrew)
CREATE INDEX idx_tenders_name_trgm ON tenders USING gin(tender_name gin_trgm_ops);
CREATE INDEX idx_projects_name_trgm ON company_projects USING gin(project_name gin_trgm_ops);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;

-- Policies will be defined based on auth requirements

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_timestamp
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tenders_timestamp
    BEFORE UPDATE ON tenders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_projects_timestamp
    BEFORE UPDATE ON company_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE companies IS 'מציעים - Company profiles for tender analysis';
COMMENT ON TABLE tenders IS 'מכרזים - Tender records with full processing pipeline';
COMMENT ON TABLE gate_conditions IS 'תנאי סף - Gate conditions extracted from tenders';
COMMENT ON TABLE company_projects IS 'תיק פרויקטים - Past projects for gate condition matching';
