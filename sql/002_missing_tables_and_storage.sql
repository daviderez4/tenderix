-- ============================================
-- TENDERIX PHASE 2 - MISSING TABLES & STORAGE
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: CREATE STORAGE BUCKET (if not exists)
-- Note: This needs to be done via Supabase Dashboard
-- Storage -> New Bucket -> "tender-documents" -> Public
-- ============================================

-- ============================================
-- STEP 2: MISSING TABLES (7 tables from v3 spec)
-- ============================================

-- 1. Similarity Definitions - הגדרות דמיון
CREATE TABLE IF NOT EXISTS similarity_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  category TEXT, -- e.g., 'cctv', 'access_control', 'network', 'software'
  synonyms TEXT[],
  capabilities TEXT[], -- what this term means in terms of capabilities
  source_file TEXT,
  source_page INTEGER,
  source_section TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Condition Interpretations - פרשנויות תנאים
CREATE TABLE IF NOT EXISTS condition_interpretations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id UUID REFERENCES gate_conditions(id) ON DELETE CASCADE,
  interpretation_type TEXT, -- 'narrow', 'broad', 'literal'
  interpretation_text TEXT NOT NULL,
  supporting_arguments TEXT,
  risk_level TEXT, -- 'low', 'medium', 'high'
  recommended BOOLEAN DEFAULT false,
  legal_basis TEXT,
  precedent_references TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Spec-BOQ Cross Reference - הצלבת מפרט-BOQ
CREATE TABLE IF NOT EXISTS spec_boq_crossref (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  spec_id UUID REFERENCES specifications(id) ON DELETE CASCADE,
  boq_id UUID REFERENCES boq_items(id) ON DELETE CASCADE,
  match_type TEXT, -- 'exact', 'partial', 'missing_in_boq', 'missing_in_spec'
  discrepancy_description TEXT,
  pricing_impact TEXT,
  risk_level TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. BOQ Comparisons - השוואת BOQ
CREATE TABLE IF NOT EXISTS boq_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  comparison_tender_id UUID, -- tender we're comparing to
  comparison_tender_name TEXT,
  boq_item_id UUID REFERENCES boq_items(id) ON DELETE CASCADE,
  our_price DECIMAL,
  comparison_price DECIMAL,
  price_difference_percent DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Pricing Recommendations - המלצות תמחור
CREATE TABLE IF NOT EXISTS pricing_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  boq_item_id UUID REFERENCES boq_items(id) ON DELETE SET NULL,
  recommendation_type TEXT, -- 'aggressive', 'conservative', 'market_price'
  recommended_price DECIMAL,
  min_price DECIMAL,
  max_price DECIMAL,
  confidence_level TEXT,
  reasoning TEXT,
  market_data_sources TEXT[],
  competitor_intelligence TEXT,
  risk_factors TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tender Results - תוצאות מכרזים
CREATE TABLE IF NOT EXISTS tender_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  result_status TEXT, -- 'won', 'lost', 'cancelled', 'no_bids'
  winner_name TEXT,
  winning_price DECIMAL,
  our_submitted_price DECIMAL,
  price_difference DECIMAL,
  quality_score_received INTEGER,
  total_score_received INTEGER,
  ranking INTEGER,
  total_bidders INTEGER,
  result_date DATE,
  appeal_deadline DATE,
  appeal_filed BOOLEAN DEFAULT false,
  lessons_learned TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Tender Bids - הצעות במכרזים
CREATE TABLE IF NOT EXISTS tender_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  bid_version INTEGER DEFAULT 1,
  bid_status TEXT DEFAULT 'draft', -- 'draft', 'submitted', 'revised', 'withdrawn'
  total_price DECIMAL,
  price_breakdown JSONB,
  quality_documents JSONB,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  submission_method TEXT, -- 'online', 'physical', 'email'
  submission_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- STEP 3: ADD MISSING COLUMNS TO tender_documents
-- ============================================

ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS original_filename TEXT;
ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS document_type TEXT;
ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'UPLOADED';
ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- ============================================
-- STEP 4: ADD MISSING COLUMNS TO gate_conditions
-- ============================================

ALTER TABLE gate_conditions ADD COLUMN IF NOT EXISTS company_status TEXT;
ALTER TABLE gate_conditions ADD COLUMN IF NOT EXISTS evidence_source TEXT;
ALTER TABLE gate_conditions ADD COLUMN IF NOT EXISTS evidence_quote TEXT;
ALTER TABLE gate_conditions ADD COLUMN IF NOT EXISTS match_explanation TEXT;

-- ============================================
-- STEP 5: INDEXES FOR NEW TABLES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_similarity_definitions_tender ON similarity_definitions(tender_id);
CREATE INDEX IF NOT EXISTS idx_condition_interpretations_condition ON condition_interpretations(condition_id);
CREATE INDEX IF NOT EXISTS idx_spec_boq_crossref_tender ON spec_boq_crossref(tender_id);
CREATE INDEX IF NOT EXISTS idx_boq_comparisons_tender ON boq_comparisons(tender_id);
CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_tender ON pricing_recommendations(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_results_tender ON tender_results(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_bids_tender ON tender_bids(tender_id);

-- ============================================
-- STEP 6: RLS POLICIES FOR NEW TABLES
-- ============================================

ALTER TABLE similarity_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_interpretations ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_boq_crossref ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_bids ENABLE ROW LEVEL SECURITY;

-- Public read access (for demo)
CREATE POLICY "anon_read_similarity_definitions" ON similarity_definitions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_condition_interpretations" ON condition_interpretations FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_spec_boq_crossref" ON spec_boq_crossref FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_boq_comparisons" ON boq_comparisons FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_pricing_recommendations" ON pricing_recommendations FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_tender_results" ON tender_results FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_tender_bids" ON tender_bids FOR SELECT TO anon USING (true);

-- Anon INSERT access (for demo/testing)
CREATE POLICY "anon_insert_similarity_definitions" ON similarity_definitions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_condition_interpretations" ON condition_interpretations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_spec_boq_crossref" ON spec_boq_crossref FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_boq_comparisons" ON boq_comparisons FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_pricing_recommendations" ON pricing_recommendations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_tender_results" ON tender_results FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_tender_bids" ON tender_bids FOR INSERT TO anon WITH CHECK (true);

-- Service role full access
CREATE POLICY "service_similarity_definitions" ON similarity_definitions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_condition_interpretations" ON condition_interpretations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_spec_boq_crossref" ON spec_boq_crossref FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_boq_comparisons" ON boq_comparisons FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_pricing_recommendations" ON pricing_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_tender_results" ON tender_results FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_tender_bids" ON tender_bids FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- STEP 7: ANON WRITE ACCESS FOR EXISTING TABLES
-- (Required for dashboard to work without login)
-- ============================================

-- Tenders table - allow anon insert/update
CREATE POLICY "anon_insert_tenders" ON tenders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_tenders" ON tenders FOR UPDATE TO anon USING (true);

-- Tender documents - allow anon insert
CREATE POLICY "anon_insert_tender_documents" ON tender_documents FOR INSERT TO anon WITH CHECK (true);

-- Gate conditions - allow anon insert/update
CREATE POLICY "anon_insert_gate_conditions" ON gate_conditions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_gate_conditions" ON gate_conditions FOR UPDATE TO anon USING (true);

-- Company profiles - allow anon insert/update
CREATE POLICY "anon_insert_company_profiles" ON company_profiles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_company_profiles" ON company_profiles FOR UPDATE TO anon USING (true);

-- Company certifications - allow anon insert/update/delete
CREATE POLICY "anon_insert_company_certifications" ON company_certifications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_company_certifications" ON company_certifications FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_delete_company_certifications" ON company_certifications FOR DELETE TO anon USING (true);

-- Company personnel - allow anon insert/update/delete
CREATE POLICY "anon_insert_company_personnel" ON company_personnel FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_company_personnel" ON company_personnel FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_delete_company_personnel" ON company_personnel FOR DELETE TO anon USING (true);

-- Company projects - allow anon insert/update/delete
CREATE POLICY "anon_insert_company_projects" ON company_projects FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_company_projects" ON company_projects FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_delete_company_projects" ON company_projects FOR DELETE TO anon USING (true);

-- Tangent projects - allow anon insert/update/delete
CREATE POLICY "anon_insert_tangent_projects" ON tangent_projects FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_tangent_projects" ON tangent_projects FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_delete_tangent_projects" ON tangent_projects FOR DELETE TO anon USING (true);

-- ============================================
-- STEP 8: ACTIVITY LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  tender_name TEXT,
  action_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_activity_log" ON activity_log FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_activity_log" ON activity_log FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "service_activity_log" ON activity_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- STEP 9: USER SETTINGS & NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  deadline_reminders BOOLEAN DEFAULT true,
  new_tender_alerts BOOLEAN DEFAULT true,
  competitor_alerts BOOLEAN DEFAULT true,
  weekly_summary BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'he',
  theme TEXT DEFAULT 'dark',
  currency TEXT DEFAULT 'ILS',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tender_id UUID REFERENCES tenders(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_user_settings" ON user_settings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_user_settings" ON user_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_user_settings" ON user_settings FOR UPDATE TO anon USING (true);

CREATE POLICY "anon_read_notifications" ON notifications FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE TO anon USING (true);

CREATE POLICY "service_user_settings" ON user_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_notifications" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- STEP 10: PROFILES TABLE FOR EXTENDED USER INFO
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_profiles" ON profiles FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE TO anon USING (true);
CREATE POLICY "service_profiles" ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- DONE!
-- ============================================

SELECT 'PHASE 2 MIGRATION COMPLETE - All 7 missing tables created + Storage policies ready!' as status;
