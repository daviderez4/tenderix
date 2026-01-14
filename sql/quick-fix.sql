-- Quick fix: Create missing tables

CREATE TABLE IF NOT EXISTS company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id),
    email_notifications BOOLEAN DEFAULT true,
    language TEXT DEFAULT 'he',
    theme TEXT DEFAULT 'dark',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricing_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    scenario_name TEXT,
    total_price NUMERIC,
    is_recommended BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_company_profiles" ON company_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "all_user_settings" ON user_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "all_pricing" ON pricing_recommendations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "all_profiles" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT 'Tables created!' as status;
