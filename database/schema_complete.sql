-- Tenderix v3.0 - Complete Missing Tables
-- Run this in Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/sql

-- =============================================
-- Certifications table
-- =============================================
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  certification_name TEXT NOT NULL,
  issuing_authority TEXT,
  issue_date DATE,
  expiry_date DATE,
  certification_number TEXT,
  status TEXT DEFAULT 'VALID' CHECK (status IN ('VALID', 'EXPIRED', 'PENDING')),
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Key Personnel table
-- =============================================
CREATE TABLE IF NOT EXISTS key_personnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  experience_years INTEGER,
  education TEXT,
  certifications TEXT[],
  specializations TEXT[],
  projects_managed INTEGER,
  availability TEXT DEFAULT 'AVAILABLE',
  cv_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Historical Bids table (for competitor pricing intelligence)
-- =============================================
CREATE TABLE IF NOT EXISTS historical_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  tender_number TEXT,
  tender_name TEXT,
  issuing_body TEXT,
  bid_date DATE,
  winner_name TEXT,
  winning_price DECIMAL,
  our_price DECIMAL,
  our_rank INTEGER,
  total_bidders INTEGER,
  bid_items JSONB,
  notes TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Tender Versions table (for document version management)
-- =============================================
CREATE TABLE IF NOT EXISTS tender_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id),
  version_number INTEGER DEFAULT 1,
  version_type TEXT CHECK (version_type IN ('ORIGINAL', 'CLARIFICATION', 'AMENDMENT')),
  publish_date TIMESTAMPTZ,
  description TEXT,
  changes_summary TEXT,
  document_ids UUID[],
  impact_on_gates JSONB,
  impact_on_boq JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Strategic Questions table
-- =============================================
CREATE TABLE IF NOT EXISTS strategic_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id),
  question_type TEXT CHECK (question_type IN ('SAFE', 'STRATEGIC', 'COMPETITOR_BLOCK')),
  question_text TEXT NOT NULL,
  rationale TEXT,
  target_competitor TEXT,
  priority INTEGER DEFAULT 2,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'ANSWERED')),
  answer TEXT,
  impact_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Tender Analysis Results table
-- =============================================
CREATE TABLE IF NOT EXISTS tender_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id),
  analysis_type TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  input_data JSONB,
  output_data JSONB,
  confidence_score DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Add indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_certifications_org ON certifications(org_id);
CREATE INDEX IF NOT EXISTS idx_key_personnel_org ON key_personnel(org_id);
CREATE INDEX IF NOT EXISTS idx_historical_bids_org ON historical_bids(org_id);
CREATE INDEX IF NOT EXISTS idx_tender_versions_tender ON tender_versions(tender_id);
CREATE INDEX IF NOT EXISTS idx_strategic_questions_tender ON strategic_questions(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_analysis_tender ON tender_analysis(tender_id);

-- =============================================
-- Enable Row Level Security
-- =============================================
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_analysis ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Create policies for anon access (development mode)
-- =============================================
DROP POLICY IF EXISTS "Allow all for certifications" ON certifications;
CREATE POLICY "Allow all for certifications" ON certifications FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for key_personnel" ON key_personnel;
CREATE POLICY "Allow all for key_personnel" ON key_personnel FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for historical_bids" ON historical_bids;
CREATE POLICY "Allow all for historical_bids" ON historical_bids FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for tender_versions" ON tender_versions;
CREATE POLICY "Allow all for tender_versions" ON tender_versions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for strategic_questions" ON strategic_questions;
CREATE POLICY "Allow all for strategic_questions" ON strategic_questions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for tender_analysis" ON tender_analysis;
CREATE POLICY "Allow all for tender_analysis" ON tender_analysis FOR ALL USING (true);

-- =============================================
-- Seed sample data
-- =============================================

-- Sample Certifications
INSERT INTO certifications (org_id, certification_name, issuing_authority, issue_date, expiry_date, status)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ISO 9001:2015', 'מכון התקנים הישראלי', '2023-01-15', '2026-01-15', 'VALID'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ISO 27001:2013', 'מכון התקנים הישראלי', '2023-06-01', '2026-06-01', 'VALID'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'רישיון קבלן ראשי ג-5', 'משרד הבינוי והשיכון', '2022-04-01', '2025-04-01', 'VALID')
ON CONFLICT DO NOTHING;

-- Sample Key Personnel
INSERT INTO key_personnel (org_id, full_name, role, experience_years, education, specializations)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'משה כהן', 'מנכ"ל', 25, 'MBA, תואר ראשון הנדסה', ARRAY['ניהול פרויקטים', 'אסטרטגיה עסקית']),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'שרה לוי', 'סמנכ"ל תפעול', 18, 'תואר ראשון הנדסת תעשייה', ARRAY['ייעול תהליכים', 'ניהול איכות']),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'דוד ישראלי', 'מנהל פרויקטים בכיר', 15, 'תואר ראשון הנדסה אזרחית', ARRAY['ניהול פרויקטי בנייה', 'פיקוח'])
ON CONFLICT DO NOTHING;

-- Sample Historical Bids
INSERT INTO historical_bids (org_id, tender_number, tender_name, issuing_body, bid_date, winner_name, winning_price, our_price, our_rank, total_bidders, notes)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'T-2024-001', 'אספקת שירותי ניקיון', 'עיריית תל אביב-יפו', '2024-06-15', 'חברת ניקיון בע"מ', 850000, 920000, 2, 5, 'הפסדנו בפער קטן'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'T-2024-002', 'שירותי אבטחה', 'משרד הביטחון', '2024-08-20', 'חברת דוד בע"מ', 2500000, 2400000, 1, 8, 'זכינו!')
ON CONFLICT DO NOTHING;

-- Done!
SELECT 'All tables created and seeded successfully!' as result;
