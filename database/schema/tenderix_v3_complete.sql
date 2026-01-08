-- ============================================
-- TENDERIX v3 - COMPLETE DATABASE SCHEMA
-- ============================================
-- Based on v3 Architecture Document
-- 4 Pillars + Core Modules
-- Generated: 2026-01-05
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- CORE: MULTI-TENANT FOUNDATION
-- ============================================

-- Organizations (חברות מציעות)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company_number TEXT UNIQUE, -- ח.פ.
    founding_year INTEGER,

    -- Contact
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,

    -- Settings
    settings JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'member', -- 'admin', 'member', 'viewer'
    phone TEXT,

    preferences JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CORE C2: TECHNICAL DICTIONARY (מילון טכני)
-- ============================================

CREATE TABLE technical_dictionary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    category TEXT NOT NULL, -- 'VIDEO', 'COMMUNICATION', 'SOFTWARE', 'ACCESS_CONTROL', 'INFRASTRUCTURE'
    term TEXT NOT NULL,
    term_he TEXT,
    synonyms TEXT[],

    definition TEXT,
    definition_he TEXT,

    -- Equivalence rules (per Ido - capability-based interpretation)
    equivalent_terms JSONB DEFAULT '[]',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(category, term)
);

-- ============================================
-- MODULE 2.0: COMPANY PROFILE (פרופיל חברה)
-- Cross-cutting module for gate condition matching
-- ============================================

-- Company Financial Data (מחזורים)
CREATE TABLE company_financials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    fiscal_year INTEGER NOT NULL,
    annual_revenue DECIMAL(15,2),
    net_profit DECIMAL(15,2),
    employee_count INTEGER,

    audited BOOLEAN DEFAULT FALSE,
    document_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id, fiscal_year)
);

-- Company Certifications (הסמכות ורישיונות)
CREATE TABLE company_certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    cert_type TEXT NOT NULL, -- 'ISO', 'LICENSE', 'SECURITY_CLEARANCE', 'CONTRACTOR_REG', 'TAX'
    cert_name TEXT NOT NULL,
    cert_number TEXT,
    issuing_body TEXT,

    valid_from DATE,
    valid_until DATE,

    document_url TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Personnel (אנשי מפתח)
CREATE TABLE company_personnel (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    full_name TEXT NOT NULL,
    id_number TEXT, -- ת.ז. (for verification)
    role TEXT NOT NULL,
    department TEXT,

    education TEXT,
    education_institution TEXT,
    years_experience INTEGER,
    hire_date DATE,

    professional_certifications TEXT[],
    security_clearance TEXT,

    cv_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Projects (תיק פרויקטים) - THE KEY TABLE
CREATE TABLE company_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Basic Info
    project_name TEXT NOT NULL,
    project_number TEXT, -- Internal reference
    client_name TEXT NOT NULL,
    client_contact TEXT,
    client_type TEXT, -- 'GOVERNMENT', 'MUNICIPAL', 'PRIVATE', 'DEFENSE'

    -- Dates (per Elitzach - end_date_type matters for counting)
    start_date DATE,
    end_date DATE,
    end_date_type TEXT DEFAULT 'DELIVERY', -- 'DELIVERY', 'FINAL_ACCOUNT', 'WARRANTY'
    warranty_end_date DATE,

    -- Financials (per Ido - separate establishment/maintenance)
    total_value DECIMAL(15,2),
    establishment_value DECIMAL(15,2),
    maintenance_value DECIMAL(15,2),
    maintenance_months INTEGER,
    currency TEXT DEFAULT 'ILS',

    -- Role
    role_type TEXT NOT NULL DEFAULT 'PRIMARY', -- 'PRIMARY', 'SUBCONTRACTOR', 'PARTNERSHIP'
    role_percentage DECIMAL(5,2) DEFAULT 100,
    partner_companies TEXT[],

    -- Project Type (per Ido)
    project_type TEXT DEFAULT 'COMBINED', -- 'ESTABLISHMENT', 'MAINTENANCE', 'COMBINED'

    -- Technical Details
    category TEXT, -- 'VIDEO', 'COMMUNICATION', 'SOFTWARE', 'ACCESS_CONTROL', 'COMBINED'
    technologies JSONB DEFAULT '{}',
    quantities JSONB DEFAULT '{}',
    integrations TEXT[],
    sla_details TEXT,

    -- Location
    location TEXT,
    site_count INTEGER,

    -- Supporting Documents
    client_approval_url TEXT,
    contract_url TEXT,

    -- Tangent Projects (per Elitzach)
    is_tangent BOOLEAN DEFAULT FALSE,
    tangent_source TEXT, -- 'PARENT_COMPANY', 'SISTER_COMPANY', 'SERVICE_PROVIDED'
    tangent_description TEXT,

    -- Personnel involved
    project_manager_id UUID REFERENCES company_personnel(id),
    key_personnel_ids UUID[],

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- P1: TENDER INTAKE (קליטת מכרז)
-- ============================================

-- Tenders (מכרזים) - Main table
CREATE TABLE tenders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Basic Info (Module 1.2)
    tender_number TEXT,
    tender_name TEXT NOT NULL,
    issuing_body TEXT NOT NULL,
    issuing_body_type TEXT, -- 'GOVERNMENT', 'MUNICIPAL', 'PUBLIC_COMPANY', 'PRIVATE'

    -- Dates
    publish_date DATE,
    clarification_deadline TIMESTAMPTZ,
    submission_deadline TIMESTAMPTZ,

    -- Financial
    estimated_value DECIMAL(15,2),
    guarantee_amount DECIMAL(15,2),
    guarantee_type TEXT, -- 'BANK', 'INSURANCE'
    contract_duration_months INTEGER,
    extension_options TEXT,

    -- Scoring (per Elitzach)
    scoring_method TEXT, -- 'PRICE_ONLY', 'QUALITY_PRICE', 'QUALITY_ONLY'
    quality_weight DECIMAL(5,2),
    price_weight DECIMAL(5,2),

    -- Category (Module 1.5)
    category TEXT, -- 'VIDEO', 'COMMUNICATION', 'SOFTWARE', 'ACCESS_CONTROL', 'COMBINED'

    -- Previous Tender Analysis (Module 1.6 - per Elitzach)
    previous_tender_id UUID REFERENCES tenders(id),
    previous_winner TEXT,
    previous_winner_amount DECIMAL(15,2),
    copy_percentage DECIMAL(5,2),

    -- Processing Status
    current_step TEXT DEFAULT 'INTAKE', -- 'INTAKE', 'GATES', 'SPECS', 'COMPETITORS', 'DECISION'
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUBMITTED', 'WON', 'LOST', 'CANCELLED', 'NO_GO'

    -- Decision
    go_nogo_decision TEXT, -- 'GO', 'NO_GO', 'CONDITIONAL', 'PENDING'
    decision_date TIMESTAMPTZ,
    decision_notes TEXT,

    -- Metadata
    source_url TEXT,
    raw_data JSONB DEFAULT '{}',

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
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT,

    -- Document Type (auto-detected)
    doc_type TEXT NOT NULL, -- 'INVITATION', 'SPECS', 'BOQ', 'CONTRACT', 'CLARIFICATIONS', 'FORMS', 'APPENDIX'
    doc_type_confidence DECIMAL(5,2),

    -- Version Control (Module 1.1.5 - per Ido)
    version INTEGER DEFAULT 1,
    parent_version_id UUID REFERENCES tender_documents(id),
    is_original BOOLEAN DEFAULT TRUE,
    version_changes TEXT,
    version_date TIMESTAMPTZ,

    -- Structure
    page_count INTEGER,
    structure JSONB DEFAULT '{}',

    -- Processing (Module 1.3)
    processing_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'ERROR'
    ocr_text TEXT,
    processed_text TEXT, -- Normalized Hebrew text

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tender Definitions (Module 1.4)
CREATE TABLE tender_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    term TEXT NOT NULL,
    definition TEXT NOT NULL,
    constraints TEXT,

    -- Interpretation (per Elitzach)
    interpretation_type TEXT, -- 'RESTRICTIVE', 'EXPANSIVE', 'NEUTRAL'
    interpretation_notes TEXT,

    -- Source (Core C1 - Traceability)
    source_document_id UUID REFERENCES tender_documents(id),
    source_page INTEGER,
    source_section TEXT,
    source_quote TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tender_id, term)
);

-- ============================================
-- P2: GATE CONDITIONS (תנאי סף)
-- ============================================

-- Gate Conditions (Module 2.1)
CREATE TABLE gate_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    -- Condition Details
    condition_number TEXT,
    condition_text TEXT NOT NULL,
    condition_type TEXT NOT NULL, -- 'GATE' (פוסל), 'ADVANTAGE' (ניקוד)
    is_mandatory BOOLEAN DEFAULT TRUE,

    -- Requirement Type (Module 2.1)
    requirement_type TEXT, -- 'CAPABILITY', 'EXECUTION'

    -- Logic
    logic_type TEXT DEFAULT 'SINGLE', -- 'SINGLE', 'AND', 'OR', 'NESTED'
    parent_condition_id UUID REFERENCES gate_conditions(id),

    -- Quantitative (Module 2.2)
    required_amount DECIMAL(15,2),
    amount_currency TEXT DEFAULT 'ILS',
    required_count INTEGER,
    required_years INTEGER,
    date_reference TEXT,
    date_reference_type TEXT, -- 'FROM_PUBLISH', 'FROM_DEADLINE', 'ABSOLUTE'

    -- Entity (Module 2.3)
    entity_type TEXT, -- 'COMPANY', 'PERSONNEL', 'PROJECT', 'CERTIFICATION'
    can_rely_on_subcontractor BOOLEAN DEFAULT FALSE,
    can_rely_on_partnership BOOLEAN DEFAULT FALSE,

    -- Scoring (if ADVANTAGE)
    max_score DECIMAL(5,2),
    score_formula TEXT,

    -- Our Status
    status TEXT DEFAULT 'UNKNOWN', -- 'MEETS', 'PARTIALLY_MEETS', 'DOES_NOT_MEET', 'UNKNOWN'
    company_evidence TEXT,
    gap_description TEXT,
    remediation_suggestion TEXT,
    confidence_score DECIMAL(5,2),

    -- Source (Core C1 - Traceability)
    source_document_id UUID REFERENCES tender_documents(id),
    source_page INTEGER,
    source_section TEXT,
    source_quote TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gate Condition Matches (Module 2.6 + Core C3)
CREATE TABLE gate_condition_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gate_condition_id UUID NOT NULL REFERENCES gate_conditions(id) ON DELETE CASCADE,

    -- What matches (one of these)
    project_id UUID REFERENCES company_projects(id),
    personnel_id UUID REFERENCES company_personnel(id),
    certification_id UUID REFERENCES company_certifications(id),

    -- Match Status
    match_status TEXT NOT NULL, -- 'FULL', 'PARTIAL', 'NONE', 'NEEDS_INTERPRETATION'
    match_confidence DECIMAL(5,2),
    match_justification TEXT,

    -- Interpretation (Module 2.4, 2.5)
    interpretation_applied TEXT,
    interpretation_basis TEXT, -- Why this interpretation is valid
    is_dual_interpretation BOOLEAN DEFAULT FALSE,

    -- Contribution (per Ido - optimization)
    contributes_to TEXT DEFAULT 'GATE', -- 'GATE', 'SCORE', 'BOTH'
    score_contribution DECIMAL(5,2),

    -- Gap Closure (Core C4)
    gap_closure_option TEXT, -- 'SUBCONTRACTOR', 'PARTNERSHIP', 'ALTERNATE_DOC', 'DEVELOPMENT', 'CLARIFICATION', 'BLOCKING'
    potential_partners JSONB DEFAULT '[]',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent double-counting (Core C3)
    UNIQUE(gate_condition_id, project_id),
    UNIQUE(gate_condition_id, personnel_id),
    UNIQUE(gate_condition_id, certification_id)
);

-- Gate Conditions Summary (Module 2.9)
CREATE TABLE gate_conditions_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID UNIQUE NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    total_conditions INTEGER DEFAULT 0,
    mandatory_count INTEGER DEFAULT 0,

    meets_count INTEGER DEFAULT 0,
    partially_meets_count INTEGER DEFAULT 0,
    does_not_meet_count INTEGER DEFAULT 0,
    unknown_count INTEGER DEFAULT 0,

    overall_eligibility TEXT, -- 'ELIGIBLE', 'NOT_ELIGIBLE', 'CONDITIONAL', 'UNKNOWN'
    blocking_conditions TEXT[],

    recommendations JSONB DEFAULT '[]',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clarification Questions (Module 2.7)
CREATE TABLE clarification_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    question_number TEXT,
    question_text TEXT NOT NULL,
    question_type TEXT, -- 'TECHNICAL', 'PROCEDURAL', 'GATE_CONDITION', 'PRICING'
    priority TEXT DEFAULT 'MEDIUM', -- 'HIGH', 'MEDIUM', 'LOW'

    -- Strategic (Module 2.7.5 - per Elitzach)
    strategic_purpose TEXT,
    expected_impact TEXT,

    -- Related condition
    related_condition_id UUID REFERENCES gate_conditions(id),

    -- From previous tender (Module 2.7.6)
    from_previous_tender BOOLEAN DEFAULT FALSE,

    -- Status
    status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'READY', 'SENT', 'ANSWERED'
    sent_date TIMESTAMPTZ,

    -- Source
    source_context TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clarification Answers
CREATE TABLE clarification_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES clarification_questions(id) ON DELETE CASCADE,
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    answer_text TEXT NOT NULL,
    answered_date TIMESTAMPTZ,

    -- Impact (Module 2.10)
    impact_assessment TEXT,
    affects_gate_conditions BOOLEAN DEFAULT FALSE,
    affected_condition_ids UUID[],
    requires_reanalysis BOOLEAN DEFAULT FALSE,

    -- Source
    source_document_id UUID REFERENCES tender_documents(id),
    source_page INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- P3: SPECS & BOQ (מפרט וכתב כמויות)
-- ============================================

-- Spec Items (Module 3.1)
CREATE TABLE spec_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    spec_section TEXT,
    item_name TEXT NOT NULL,
    item_description TEXT,

    category TEXT,
    subcategory TEXT,

    -- Requirements
    requirements JSONB DEFAULT '{}',
    manufacturer_restrictions TEXT[],
    required_certifications TEXT[],

    -- Analysis
    complexity_level TEXT DEFAULT 'MEDIUM',
    our_capability_match TEXT, -- 'FULL', 'PARTIAL', 'NEED_PARTNER', 'CANNOT'
    capability_notes TEXT,

    -- Comparison (Module 3.4.5)
    is_unusual BOOLEAN DEFAULT FALSE,
    unusual_reason TEXT,
    similar_tender_notes TEXT,

    -- Risk
    risk_level TEXT DEFAULT 'LOW',
    risk_notes TEXT,

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
    chapter TEXT,
    description TEXT NOT NULL,

    quantity DECIMAL(15,2),
    unit TEXT,

    -- Pricing
    estimated_cost DECIMAL(15,2),
    market_price DECIMAL(15,2),
    suggested_price DECIMAL(15,2),
    final_price DECIMAL(15,2),
    margin_percent DECIMAL(5,2),

    -- Analysis (per Elitzach)
    risk_level TEXT DEFAULT 'LOW',
    risk_reason TEXT,
    quantity_risk_flag BOOLEAN DEFAULT FALSE,
    quantity_risk_reason TEXT,

    confidence TEXT DEFAULT 'MEDIUM',

    -- Link to spec
    spec_item_id UUID REFERENCES spec_items(id),
    missing_in_spec BOOLEAN DEFAULT FALSE,
    discrepancy_notes TEXT,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOQ Summary
CREATE TABLE boq_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID UNIQUE NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    total_items INTEGER,
    total_estimated_cost DECIMAL(15,2),
    total_suggested_price DECIMAL(15,2),
    overall_margin_percent DECIMAL(5,2),

    high_risk_items_count INTEGER,
    pricing_confidence TEXT,

    hot_money_opportunities JSONB DEFAULT '[]',
    risk_items JSONB DEFAULT '[]',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scope of Work Analysis (Module 3.3)
CREATE TABLE sow_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    scope_type TEXT, -- 'ESTABLISHMENT', 'MAINTENANCE', 'INTEGRATION', 'TRAINING'
    description TEXT,

    work_items JSONB DEFAULT '[]',
    hidden_work_detected JSONB DEFAULT '[]',
    scope_risks JSONB DEFAULT '[]',

    resource_requirements JSONB DEFAULT '{}',
    timeline_analysis TEXT,
    complexity_score INTEGER,

    estimated_value_min DECIMAL(15,2),
    estimated_value_max DECIMAL(15,2),

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contract Analysis (Module 3.4)
CREATE TABLE contract_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    contract_type TEXT,
    duration_months INTEGER,

    risk_clauses JSONB DEFAULT '[]',
    opportunity_clauses JSONB DEFAULT '[]',

    penalty_summary TEXT,
    liability_summary TEXT,
    payment_terms TEXT,
    indexation_terms TEXT,

    overall_risk_score INTEGER, -- 1-10
    contract_advantage_score INTEGER, -- 1-10

    negotiation_points JSONB DEFAULT '[]',
    red_flags JSONB DEFAULT '[]',

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- P4: COMPETITORS (מתחרים)
-- ============================================

-- Competitors
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id),

    name TEXT NOT NULL,
    company_number TEXT,
    website TEXT,

    -- Profile
    strengths TEXT[],
    weaknesses TEXT[],
    typical_domains TEXT[],

    -- Intelligence
    known_pricing_strategy TEXT,
    typical_margin_range TEXT,
    relationship_notes TEXT,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor Historical Bids (Module 4.1, 4.3)
CREATE TABLE competitor_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    rank INTEGER,

    -- Pricing Analysis (per Elitzach)
    price_per_unit JSONB DEFAULT '{}',
    margin_estimate DECIMAL(5,2),

    -- Project Details (if won)
    contract_value DECIMAL(15,2),
    project_scope TEXT,

    -- Source
    source_url TEXT,
    source_type TEXT,
    confidence_level TEXT DEFAULT 'MEDIUM',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tender Competitors (Module 4.2)
CREATE TABLE tender_competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    competitor_id UUID NOT NULL REFERENCES competitors(id),

    -- Assessment
    likelihood_to_bid TEXT DEFAULT 'MEDIUM',
    confirmed_participating BOOLEAN DEFAULT FALSE,

    -- Intelligence
    estimated_bid_range_low DECIMAL(15,2),
    estimated_bid_range_high DECIMAL(15,2),
    their_strengths TEXT[],
    their_weaknesses TEXT[],
    our_counter_strategy TEXT,

    -- Post-tender
    actual_bid_amount DECIMAL(15,2),
    actual_rank INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tender_id, competitor_id)
);

-- Market Pricing (Module 4.3)
CREATE TABLE market_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    category TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_description TEXT,

    low_price DECIMAL(15,2),
    typical_price DECIMAL(15,2),
    high_price DECIMAL(15,2),
    unit TEXT,

    based_on_bids INTEGER,
    last_updated TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- OUTPUT: GO/NO-GO DECISION
-- ============================================

-- Decision Scenarios
CREATE TABLE decision_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    scenario_name TEXT NOT NULL,
    proposed_price DECIMAL(15,2),
    expected_margin_percent DECIMAL(5,2),

    win_probability DECIMAL(5,2),
    expected_profit DECIMAL(15,2),

    risk_factors JSONB DEFAULT '[]',
    assumptions JSONB DEFAULT '[]',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Final Decision
CREATE TABLE final_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tender_id UUID UNIQUE NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    recommendation TEXT NOT NULL, -- 'GO', 'NO_GO', 'CONDITIONAL'
    confidence_level TEXT, -- 'HIGH', 'MEDIUM', 'LOW'

    selected_scenario_id UUID REFERENCES decision_scenarios(id),
    recommended_price DECIMAL(15,2),
    expected_profit DECIMAL(15,2),
    win_probability DECIMAL(5,2),

    key_success_factors JSONB DEFAULT '[]',
    key_risks JSONB DEFAULT '[]',
    required_actions JSONB DEFAULT '[]',

    executive_summary TEXT,
    detailed_report TEXT,

    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,

    -- Post-tender tracking
    actual_outcome TEXT, -- 'WON', 'LOST', 'CANCELLED'
    actual_price DECIMAL(15,2),
    lessons_learned TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT & ACTIVITY
-- ============================================

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    tender_id UUID REFERENCES tenders(id),

    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,

    old_values JSONB,
    new_values JSONB,
    details JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    tender_id UUID REFERENCES tenders(id),

    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,

    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Organizations & Users
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_email ON users(email);

-- Company Profile
CREATE INDEX idx_company_financials_org ON company_financials(org_id);
CREATE INDEX idx_company_certifications_org ON company_certifications(org_id);
CREATE INDEX idx_company_certifications_valid ON company_certifications(valid_until);
CREATE INDEX idx_company_personnel_org ON company_personnel(org_id);
CREATE INDEX idx_company_projects_org ON company_projects(org_id);
CREATE INDEX idx_company_projects_dates ON company_projects(start_date, end_date);
CREATE INDEX idx_company_projects_value ON company_projects(total_value);
CREATE INDEX idx_company_projects_type ON company_projects(project_type);
CREATE INDEX idx_company_projects_category ON company_projects(category);

-- Tenders
CREATE INDEX idx_tenders_org ON tenders(org_id);
CREATE INDEX idx_tenders_status ON tenders(status);
CREATE INDEX idx_tenders_step ON tenders(current_step);
CREATE INDEX idx_tenders_deadline ON tenders(submission_deadline);
CREATE INDEX idx_tenders_category ON tenders(category);
CREATE INDEX idx_tenders_issuer ON tenders(issuing_body);

-- Documents
CREATE INDEX idx_tender_documents_tender ON tender_documents(tender_id);
CREATE INDEX idx_tender_documents_type ON tender_documents(doc_type);
CREATE INDEX idx_tender_documents_version ON tender_documents(tender_id, version);

-- Gate Conditions
CREATE INDEX idx_gate_conditions_tender ON gate_conditions(tender_id);
CREATE INDEX idx_gate_conditions_type ON gate_conditions(condition_type);
CREATE INDEX idx_gate_conditions_status ON gate_conditions(status);
CREATE INDEX idx_gate_condition_matches_condition ON gate_condition_matches(gate_condition_id);
CREATE INDEX idx_gate_condition_matches_project ON gate_condition_matches(project_id);

-- Clarifications
CREATE INDEX idx_clarification_questions_tender ON clarification_questions(tender_id);
CREATE INDEX idx_clarification_answers_tender ON clarification_answers(tender_id);

-- Specs & BOQ
CREATE INDEX idx_spec_items_tender ON spec_items(tender_id);
CREATE INDEX idx_boq_items_tender ON boq_items(tender_id);

-- Competitors
CREATE INDEX idx_competitors_org ON competitors(org_id);
CREATE INDEX idx_competitor_bids_competitor ON competitor_bids(competitor_id);
CREATE INDEX idx_tender_competitors_tender ON tender_competitors(tender_id);

-- Activity
CREATE INDEX idx_activity_log_org ON activity_log(org_id);
CREATE INDEX idx_activity_log_tender ON activity_log(tender_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at);

-- Text Search (Hebrew)
CREATE INDEX idx_tenders_name_trgm ON tenders USING gin(tender_name gin_trgm_ops);
CREATE INDEX idx_projects_name_trgm ON company_projects USING gin(project_name gin_trgm_ops);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_timestamp BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_company_personnel_timestamp BEFORE UPDATE ON company_personnel FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_company_projects_timestamp BEFORE UPDATE ON company_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tenders_timestamp BEFORE UPDATE ON tenders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_gate_conditions_summary_timestamp BEFORE UPDATE ON gate_conditions_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_boq_summary_timestamp BEFORE UPDATE ON boq_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_competitors_timestamp BEFORE UPDATE ON competitors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tender_competitors_timestamp BEFORE UPDATE ON tender_competitors FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_condition_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_conditions_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE clarification_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clarification_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE sow_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SEED DATA: Technical Dictionary
-- ============================================

INSERT INTO technical_dictionary (category, term, term_he, synonyms, definition, equivalent_terms) VALUES
('VIDEO', 'CCTV', 'מצלמות אבטחה', ARRAY['security cameras', 'surveillance'], 'Closed-circuit television for monitoring', '[{"term": "IP cameras", "explanation": "Modern digital equivalent"}, {"term": "traffic cameras", "explanation": "Can demonstrate video experience"}]'::jsonb),
('VIDEO', 'VMS', 'מערכת ניהול וידאו', ARRAY['Video Management System', 'NVR'], 'Software for managing video feeds', '[]'::jsonb),
('VIDEO', 'LPR', 'זיהוי לוחיות', ARRAY['ANPR', 'License Plate Recognition'], 'Automatic plate recognition', '[]'::jsonb),
('COMMUNICATION', 'network', 'תשתית רשת', ARRAY['LAN', 'WAN', 'networking'], 'Network infrastructure', '[]'::jsonb),
('COMMUNICATION', 'fiber', 'סיבים אופטיים', ARRAY['fiber optic', 'optical'], 'Fiber optic cabling', '[]'::jsonb),
('ACCESS_CONTROL', 'access control', 'בקרת גישה', ARRAY['ACS', 'entry control'], 'Physical access control systems', '[]'::jsonb),
('SOFTWARE', 'PSIM', 'מערכת אינטגרציה', ARRAY['integration platform'], 'Security system integration', '[]'::jsonb),
('INFRASTRUCTURE', 'UPS', 'אל-פסק', ARRAY['backup power'], 'Uninterruptible power supply', '[]'::jsonb);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE organizations IS 'חברות מציעות - Tenant organizations';
COMMENT ON TABLE company_projects IS 'תיק פרויקטים - Project portfolio for gate matching';
COMMENT ON TABLE tenders IS 'מכרזים - Main tender records';
COMMENT ON TABLE gate_conditions IS 'תנאי סף - Gate conditions extracted from tenders';
COMMENT ON TABLE gate_condition_matches IS 'התאמות - How company assets match conditions';
COMMENT ON TABLE competitors IS 'מתחרים - Competitor profiles';
COMMENT ON TABLE final_decisions IS 'החלטות - GO/NO-GO decisions';
