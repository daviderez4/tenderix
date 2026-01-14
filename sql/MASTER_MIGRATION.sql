-- ============================================
-- TENDERIX MASTER MIGRATION
-- All tables from Master Development Prompt
-- ============================================

-- ============================================
-- PILLAR 0: COMPANY PROFILE TABLES
-- ============================================

-- Company Profiles (Main)
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  company_name TEXT NOT NULL,
  bn_number TEXT,
  year_founded INTEGER,
  annual_revenue JSONB,
  employee_count INTEGER,
  business_sectors TEXT[],
  contractor_classifications TEXT[],
  parent_subsidiary_companies JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Company Certifications
CREATE TABLE IF NOT EXISTS company_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  cert_type TEXT,
  cert_name TEXT NOT NULL,
  issuing_body TEXT,
  valid_from DATE,
  valid_until DATE,
  document_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Company Personnel
CREATE TABLE IF NOT EXISTS company_personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT,
  education TEXT,
  years_experience INTEGER,
  certifications TEXT[],
  led_projects UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Company Projects (CRITICAL)
CREATE TABLE IF NOT EXISTS company_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  client_name TEXT,
  start_date DATE,
  end_date DATE,
  total_value DECIMAL,
  our_share_percent DECIMAL,
  role TEXT,
  project_type TEXT,
  construction_value DECIMAL,
  maintenance_value DECIMAL,
  maintenance_months INTEGER,
  completion_type TEXT,
  technologies JSONB,
  quantities JSONB,
  integrations TEXT[],
  sla_provided TEXT,
  supporting_documents TEXT[],
  unique_identifier TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tangent Projects
CREATE TABLE IF NOT EXISTS tangent_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  description TEXT,
  source_type TEXT,
  related_company TEXT,
  can_sign_agreement BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PILLAR 1: TENDER INTAKE TABLES
-- ============================================

-- Tender Documents
CREATE TABLE IF NOT EXISTS tender_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  page_count INTEGER,
  ocr_text TEXT,
  parsed_structure JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Document Versions
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  document_id UUID REFERENCES tender_documents(id) ON DELETE CASCADE,
  version_number INTEGER DEFAULT 1,
  version_type TEXT,
  changes_summary TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tender Definitions
CREATE TABLE IF NOT EXISTS tender_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  constraints TEXT,
  source_file TEXT,
  source_page INTEGER,
  source_section TEXT
);

-- Previous Tender Analysis
CREATE TABLE IF NOT EXISTS previous_tender_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  previous_tender_number TEXT,
  previous_winner TEXT,
  previous_value DECIMAL,
  scope_comparison JSONB,
  previous_clarifications JSONB,
  copy_percentage INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PILLAR 2: GATE CONDITIONS TABLES
-- ============================================

-- Gate Conditions (Main)
CREATE TABLE IF NOT EXISTS gate_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  condition_number INTEGER,
  condition_text TEXT NOT NULL,
  source_file TEXT NOT NULL,
  source_page INTEGER,
  source_section TEXT,
  quote TEXT,
  condition_type TEXT,
  requirement_type TEXT,
  logic_type TEXT,
  logic_expression TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gate Condition Quantities
CREATE TABLE IF NOT EXISTS gate_condition_quantities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id UUID REFERENCES gate_conditions(id) ON DELETE CASCADE,
  exact_amount DECIMAL,
  includes_vat BOOLEAN,
  scope_type TEXT,
  amount_type TEXT,
  contractor_role TEXT,
  time_range_years INTEGER,
  time_range_start DATE,
  completion_definition TEXT,
  has_ambiguity BOOLEAN DEFAULT false,
  ambiguity_notes TEXT,
  interpretation_options JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gate Condition Entities
CREATE TABLE IF NOT EXISTS gate_condition_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id UUID REFERENCES gate_conditions(id) ON DELETE CASCADE,
  required_entity TEXT,
  subcontractor_allowed BOOLEAN,
  parent_company_allowed BOOLEAN,
  reliance_percentage_limit DECIMAL,
  parent_for_threshold_or_scoring TEXT,
  analysis_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gate Condition Matches
CREATE TABLE IF NOT EXISTS gate_condition_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id UUID REFERENCES gate_conditions(id) ON DELETE CASCADE,
  matching_projects UUID[],
  matching_certifications UUID[],
  matching_personnel UUID[],
  match_confidence TEXT,
  match_reasoning TEXT,
  missing_info TEXT,
  company_questions JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gate Optimization
CREATE TABLE IF NOT EXISTS gate_optimization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  threshold_projects UUID[],
  scoring_projects UUID[],
  threshold_projects_count_for_scoring BOOLEAN,
  optimization_notes TEXT,
  fixed_scoring_percent DECIMAL,
  flexible_scoring_percent DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clarification Requests
CREATE TABLE IF NOT EXISTS clarification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  condition_id UUID REFERENCES gate_conditions(id) ON DELETE SET NULL,
  request_type TEXT,
  request_text TEXT NOT NULL,
  request_text_formal TEXT,
  priority TEXT,
  status TEXT DEFAULT 'draft',
  response_text TEXT,
  response_impact TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Strategic Questions
CREATE TABLE IF NOT EXISTS strategic_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  target_competitor TEXT,
  our_advantage TEXT,
  justification_to_issuer TEXT,
  verified_safe_for_us BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Competitor Question Analysis
CREATE TABLE IF NOT EXISTS competitor_question_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  asked_by_us BOOLEAN DEFAULT false,
  likely_asker TEXT,
  target_analysis TEXT,
  market_intel TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Required Documents
CREATE TABLE IF NOT EXISTS required_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  condition_id UUID REFERENCES gate_conditions(id) ON DELETE SET NULL,
  document_type TEXT,
  required_format TEXT,
  signer TEXT,
  validity_required BOOLEAN,
  valid_until DATE,
  status TEXT,
  document_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gate Assessments
CREATE TABLE IF NOT EXISTS gate_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id UUID REFERENCES gate_conditions(id) ON DELETE CASCADE,
  requirement_summary TEXT,
  source_citation TEXT,
  legal_interpretation TEXT,
  technical_interpretation TEXT,
  supporting_evidence TEXT,
  gaps TEXT,
  possible_arguments TEXT,
  closure_paths TEXT[],
  conclusion TEXT,
  confidence_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Analysis Versions
CREATE TABLE IF NOT EXISTS analysis_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  version_number INTEGER,
  trigger_type TEXT,
  trigger_document TEXT,
  previous_gate_score INTEGER,
  new_gate_score INTEGER,
  changes_summary JSONB,
  go_nogo_changed BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PILLAR 3: SPECIFICATION & BOQ TABLES
-- ============================================

-- Specifications
CREATE TABLE IF NOT EXISTS specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  spec_id TEXT,
  description TEXT,
  spec_type TEXT,
  requirement_level TEXT,
  linked_boq_items UUID[],
  source_file TEXT,
  source_page INTEGER,
  source_section TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- BOQ Items
CREATE TABLE IF NOT EXISTS boq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  line_number TEXT,
  description TEXT,
  unit TEXT,
  quantity DECIMAL,
  category TEXT,
  linked_specs UUID[],
  our_cost DECIMAL,
  suggested_price DECIMAL,
  market_price DECIMAL,
  completeness_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- BOQ Exceptions
CREATE TABLE IF NOT EXISTS boq_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  exception_type TEXT,
  description TEXT,
  spec_says TEXT,
  boq_says TEXT,
  risk_level TEXT,
  pricing_impact DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PILLAR 4: COMPETITOR ANALYSIS TABLES
-- ============================================

-- Competitor Bids
CREATE TABLE IF NOT EXISTS competitor_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  source_tender_number TEXT,
  source_tender_name TEXT,
  source_issuer TEXT,
  winner_name TEXT,
  winning_price DECIMAL,
  boq_details JSONB,
  source_url TEXT,
  source_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Competitors
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_size TEXT,
  specializations TEXT[],
  win_history JSONB,
  pricing_strategy TEXT,
  known_strengths TEXT[],
  known_weaknesses TEXT[],
  win_loss_record JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- UPDATE TENDERS TABLE WITH NEW FIELDS
-- ============================================

ALTER TABLE tenders ADD COLUMN IF NOT EXISTS tender_number TEXT;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS issuing_body TEXT;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS publish_date DATE;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS submission_deadline TIMESTAMPTZ;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS clarification_deadline TIMESTAMPTZ;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS bid_bond_amount DECIMAL;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS contract_period_months INTEGER;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS extension_options TEXT;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS scoring_method TEXT;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS price_weight DECIMAL;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS quality_weight DECIMAL;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS gate_score INTEGER;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS gate_status TEXT;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_company_profiles_user ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tender_documents_tender ON tender_documents(tender_id);
CREATE INDEX IF NOT EXISTS idx_gate_conditions_tender ON gate_conditions(tender_id);
CREATE INDEX IF NOT EXISTS idx_gate_conditions_status ON gate_conditions(status);
CREATE INDEX IF NOT EXISTS idx_specifications_tender ON specifications(tender_id);
CREATE INDEX IF NOT EXISTS idx_boq_items_tender ON boq_items(tender_id);
CREATE INDEX IF NOT EXISTS idx_competitor_bids_tender ON competitor_bids(tender_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tangent_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_condition_quantities ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_condition_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_condition_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE clarification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (for demo)
CREATE POLICY "anon_read_company_profiles" ON company_profiles FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_company_certifications" ON company_certifications FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_company_personnel" ON company_personnel FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_company_projects" ON company_projects FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_tangent_projects" ON tangent_projects FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_tender_documents" ON tender_documents FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_document_versions" ON document_versions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_tender_definitions" ON tender_definitions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_gate_conditions" ON gate_conditions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_gate_condition_quantities" ON gate_condition_quantities FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_gate_condition_entities" ON gate_condition_entities FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_gate_condition_matches" ON gate_condition_matches FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_clarification_requests" ON clarification_requests FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_strategic_questions" ON strategic_questions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_specifications" ON specifications FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_boq_items" ON boq_items FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_boq_exceptions" ON boq_exceptions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_competitor_bids" ON competitor_bids FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_competitors" ON competitors FOR SELECT TO anon USING (true);

-- Service role full access
CREATE POLICY "service_company_profiles" ON company_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_company_certifications" ON company_certifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_company_personnel" ON company_personnel FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_company_projects" ON company_projects FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_tangent_projects" ON tangent_projects FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_tender_documents" ON tender_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_document_versions" ON document_versions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_tender_definitions" ON tender_definitions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_gate_conditions" ON gate_conditions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_gate_condition_quantities" ON gate_condition_quantities FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_gate_condition_entities" ON gate_condition_entities FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_gate_condition_matches" ON gate_condition_matches FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_clarification_requests" ON clarification_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_strategic_questions" ON strategic_questions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_specifications" ON specifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_boq_items" ON boq_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_boq_exceptions" ON boq_exceptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_competitor_bids" ON competitor_bids FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_competitors" ON competitors FOR ALL TO service_role USING (true) WITH CHECK (true);

SELECT 'TENDERIX MASTER MIGRATION COMPLETE!' as status;
