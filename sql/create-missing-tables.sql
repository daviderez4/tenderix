-- =============================================
-- TENDERIX - CREATE MISSING TABLES
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. COMPANY PROFILES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    company_name TEXT,
    company_number TEXT,
    address TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    established_year INTEGER,
    employee_count INTEGER,
    annual_revenue NUMERIC,
    industry TEXT,
    description TEXT,
    logo_url TEXT,
    certifications JSONB DEFAULT '[]'::jsonb,
    experience_years INTEGER,
    completed_projects INTEGER,
    win_rate NUMERIC,
    average_project_value NUMERIC,
    specializations TEXT[],
    regions TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. USER SETTINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id),
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    deadline_reminders BOOLEAN DEFAULT true,
    new_tender_alerts BOOLEAN DEFAULT true,
    competitor_alerts BOOLEAN DEFAULT true,
    weekly_summary BOOLEAN DEFAULT true,
    language TEXT DEFAULT 'he',
    theme TEXT DEFAULT 'dark',
    currency TEXT DEFAULT 'ILS',
    timezone TEXT DEFAULT 'Asia/Jerusalem',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. PRICING RECOMMENDATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS pricing_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    scenario_name TEXT,
    total_price NUMERIC,
    profit_margin_percent NUMERIC,
    win_probability NUMERIC,
    risk_level TEXT,
    description TEXT,
    is_recommended BOOLEAN DEFAULT false,
    item_recommendations JSONB DEFAULT '[]'::jsonb,
    sensitivity_analysis JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. PROFILES TABLE (for extended user data)
-- =============================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT,
    company_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. ACTIVITY LOG TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ENABLE RLS ON NEW TABLES
-- =============================================

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Company profiles
CREATE POLICY "View company profiles" ON company_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert company profiles" ON company_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update own company profile" ON company_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);

-- User settings
CREATE POLICY "View own settings" ON user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own settings" ON user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own settings" ON user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Pricing recommendations
CREATE POLICY "View pricing recommendations" ON pricing_recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert pricing recommendations" ON pricing_recommendations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update pricing recommendations" ON pricing_recommendations FOR UPDATE TO authenticated USING (true);

-- Profiles
CREATE POLICY "View all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Activity log
CREATE POLICY "View activity log" ON activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert activity log" ON activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- ADD user_id TO TENDERS IF NOT EXISTS
-- =============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenders' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE tenders ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- =============================================
-- STORAGE BUCKET
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('tender-documents', 'tender-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload tender documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read tender documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete tender documents" ON storage.objects;

CREATE POLICY "Users can upload tender documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tender-documents');

CREATE POLICY "Users can read tender documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tender-documents');

CREATE POLICY "Users can delete tender documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'tender-documents');

-- =============================================
-- DONE!
-- =============================================

SELECT 'All tables created successfully!' as status;
