-- ============================================
-- TENDERIX - Company Profile Tables Migration
-- Task CP.1 from Master Development Prompt
-- ============================================

-- 1. Company Profiles (Main)
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  company_name TEXT NOT NULL,
  bn_number TEXT, -- ח.פ.
  year_founded INTEGER,
  annual_revenue JSONB, -- {"2023": 50000000, "2024": 60000000}
  employee_count INTEGER,
  business_sectors TEXT[],
  contractor_classifications TEXT[],
  parent_subsidiary_companies JSONB, -- companies in group
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Company Certifications
CREATE TABLE IF NOT EXISTS company_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  cert_type TEXT, -- 'iso', 'license', 'security_clearance', 'contractor_registration', 'tax'
  cert_name TEXT NOT NULL,
  issuing_body TEXT,
  valid_from DATE,
  valid_until DATE,
  document_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Company Personnel
CREATE TABLE IF NOT EXISTS company_personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT,
  education TEXT,
  years_experience INTEGER,
  certifications TEXT[],
  led_projects UUID[], -- references to company_projects
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Company Projects (CRITICAL - ALL FIELDS REQUIRED)
CREATE TABLE IF NOT EXISTS company_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  client_name TEXT,
  start_date DATE,
  end_date DATE,

  -- Financial
  total_value DECIMAL,
  our_share_percent DECIMAL,
  role TEXT, -- 'primary', 'subcontractor'

  -- Project type breakdown (Ido requirement)
  project_type TEXT, -- 'construction', 'maintenance', 'combined'
  construction_value DECIMAL,
  maintenance_value DECIMAL,
  maintenance_months INTEGER,

  -- Completion type (Elizach requirement)
  completion_type TEXT, -- 'delivery', 'final_invoice', 'warranty_end'

  -- Technical details
  technologies JSONB, -- {"cameras": "Axis", "vms": "Milestone"}
  quantities JSONB, -- {"cameras": 150, "doors": 30}
  integrations TEXT[],
  sla_provided TEXT,

  -- Documentation
  supporting_documents TEXT[], -- paths to approval letters

  -- REQUIRED unique identifier
  unique_identifier TEXT UNIQUE NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tangent Projects (Elizach requirement)
CREATE TABLE IF NOT EXISTS tangent_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  description TEXT,
  source_type TEXT, -- 'parent_subsidiary', 'service_provided', 'related_domain'
  related_company TEXT,
  can_sign_agreement BOOLEAN, -- can we sign agreement to claim this?
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_company_profiles_user ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_company_certifications_company ON company_certifications(company_id);
CREATE INDEX IF NOT EXISTS idx_company_personnel_company ON company_personnel(company_id);
CREATE INDEX IF NOT EXISTS idx_company_projects_company ON company_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_tangent_projects_company ON tangent_projects(company_id);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tangent_projects ENABLE ROW LEVEL SECURITY;

-- Company Profiles: Users can manage their own
CREATE POLICY "Users can view own company profile" ON company_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own company profile" ON company_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own company profile" ON company_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role bypass for all tables
CREATE POLICY "Service role full access profiles" ON company_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access certifications" ON company_certifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access personnel" ON company_personnel
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access projects" ON company_projects
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access tangent" ON tangent_projects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Related tables: Access through company ownership
CREATE POLICY "Users can manage own certifications" ON company_certifications
  FOR ALL USING (
    company_id IN (SELECT id FROM company_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can manage own personnel" ON company_personnel
  FOR ALL USING (
    company_id IN (SELECT id FROM company_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can manage own projects" ON company_projects
  FOR ALL USING (
    company_id IN (SELECT id FROM company_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can manage own tangent projects" ON tangent_projects
  FOR ALL USING (
    company_id IN (SELECT id FROM company_profiles WHERE user_id = auth.uid())
  );

-- ============================================
-- Completion message
-- ============================================
SELECT 'Company Profile tables created successfully!' as status;
