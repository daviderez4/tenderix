-- Only the missing Company Profile tables
-- company_profiles and tangent_projects

-- 1. Company Profiles (Main table - REQUIRED for foreign keys)
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

-- 2. Tangent Projects (Elizach requirement)
CREATE TABLE IF NOT EXISTS tangent_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  description TEXT,
  source_type TEXT,
  related_company TEXT,
  can_sign_agreement BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_profiles_user ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tangent_projects_company ON tangent_projects(company_id);

-- RLS
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tangent_projects ENABLE ROW LEVEL SECURITY;

-- Policies for company_profiles
DROP POLICY IF EXISTS "Users can view own company profile" ON company_profiles;
DROP POLICY IF EXISTS "Users can insert own company profile" ON company_profiles;
DROP POLICY IF EXISTS "Users can update own company profile" ON company_profiles;
DROP POLICY IF EXISTS "Service role full access profiles" ON company_profiles;

CREATE POLICY "Users can view own company profile" ON company_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own company profile" ON company_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own company profile" ON company_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access profiles" ON company_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon read profiles" ON company_profiles FOR SELECT TO anon USING (true);

-- Policies for tangent_projects
DROP POLICY IF EXISTS "Users can manage own tangent projects" ON tangent_projects;
DROP POLICY IF EXISTS "Service role full access tangent" ON tangent_projects;

CREATE POLICY "Users can manage own tangent projects" ON tangent_projects FOR ALL USING (company_id IN (SELECT id FROM company_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Service role full access tangent" ON tangent_projects FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon read tangent" ON tangent_projects FOR SELECT TO anon USING (true);

SELECT 'Missing company tables created!' as status;
