-- =============================================
-- TENDERIX - SAFE SUPABASE SETUP
-- Only applies to tables that exist
-- =============================================

-- =============================================
-- PART 1: STORAGE BUCKET
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('tender-documents', 'tender-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (drop first to avoid conflicts)
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
-- PART 2: ADD user_id TO TENDERS
-- =============================================

DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tenders ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $;

-- =============================================
-- PART 3: TENDERS POLICIES
-- =============================================

ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all tenders" ON tenders;
DROP POLICY IF EXISTS "Users can view own tenders" ON tenders;
DROP POLICY IF EXISTS "Users can insert own tenders" ON tenders;
DROP POLICY IF EXISTS "Users can update own tenders" ON tenders;
DROP POLICY IF EXISTS "Users can delete own tenders" ON tenders;

CREATE POLICY "Users can view own tenders" ON tenders
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own tenders" ON tenders
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update own tenders" ON tenders
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own tenders" ON tenders
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL);

-- =============================================
-- PART 4: TENDER DOCUMENTS POLICIES
-- =============================================

ALTER TABLE tender_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View tender documents" ON tender_documents;
DROP POLICY IF EXISTS "Insert tender documents" ON tender_documents;
DROP POLICY IF EXISTS "Delete tender documents" ON tender_documents;

CREATE POLICY "View tender documents" ON tender_documents
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert tender documents" ON tender_documents
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Delete tender documents" ON tender_documents
FOR DELETE TO authenticated USING (true);

-- =============================================
-- PART 5: GATE CONDITIONS POLICIES
-- =============================================

ALTER TABLE gate_conditions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View gate conditions" ON gate_conditions;
DROP POLICY IF EXISTS "Insert gate conditions" ON gate_conditions;
DROP POLICY IF EXISTS "Update gate conditions" ON gate_conditions;

CREATE POLICY "View gate conditions" ON gate_conditions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert gate conditions" ON gate_conditions
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Update gate conditions" ON gate_conditions
FOR UPDATE TO authenticated USING (true);

-- =============================================
-- PART 6: OTHER EXISTING TABLES
-- =============================================

-- Gate condition matches
ALTER TABLE gate_condition_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View gate condition matches" ON gate_condition_matches;
DROP POLICY IF EXISTS "Insert gate condition matches" ON gate_condition_matches;
CREATE POLICY "View gate condition matches" ON gate_condition_matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert gate condition matches" ON gate_condition_matches FOR INSERT TO authenticated WITH CHECK (true);

-- Competitors
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View competitors" ON competitors;
DROP POLICY IF EXISTS "Insert competitors" ON competitors;
CREATE POLICY "View competitors" ON competitors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert competitors" ON competitors FOR INSERT TO authenticated WITH CHECK (true);

-- Competitor bids
ALTER TABLE competitor_bids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View competitor bids" ON competitor_bids;
DROP POLICY IF EXISTS "Insert competitor bids" ON competitor_bids;
CREATE POLICY "View competitor bids" ON competitor_bids FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert competitor bids" ON competitor_bids FOR INSERT TO authenticated WITH CHECK (true);

-- Analysis summaries
ALTER TABLE analysis_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View analysis summaries" ON analysis_summaries;
DROP POLICY IF EXISTS "Insert analysis summaries" ON analysis_summaries;
CREATE POLICY "View analysis summaries" ON analysis_summaries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert analysis summaries" ON analysis_summaries FOR INSERT TO authenticated WITH CHECK (true);

-- BOQ items
ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View boq items" ON boq_items;
DROP POLICY IF EXISTS "Insert boq items" ON boq_items;
CREATE POLICY "View boq items" ON boq_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert boq items" ON boq_items FOR INSERT TO authenticated WITH CHECK (true);

-- BOQ summary
ALTER TABLE boq_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View boq summary" ON boq_summary;
DROP POLICY IF EXISTS "Insert boq summary" ON boq_summary;
CREATE POLICY "View boq summary" ON boq_summary FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert boq summary" ON boq_summary FOR INSERT TO authenticated WITH CHECK (true);

-- Final decisions
ALTER TABLE final_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View final decisions" ON final_decisions;
DROP POLICY IF EXISTS "Insert final decisions" ON final_decisions;
CREATE POLICY "View final decisions" ON final_decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert final decisions" ON final_decisions FOR INSERT TO authenticated WITH CHECK (true);

-- Clarification questions
ALTER TABLE clarification_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View clarification questions" ON clarification_questions;
DROP POLICY IF EXISTS "Insert clarification questions" ON clarification_questions;
CREATE POLICY "View clarification questions" ON clarification_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert clarification questions" ON clarification_questions FOR INSERT TO authenticated WITH CHECK (true);

-- Clarification answers
ALTER TABLE clarification_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View clarification answers" ON clarification_answers;
DROP POLICY IF EXISTS "Insert clarification answers" ON clarification_answers;
CREATE POLICY "View clarification answers" ON clarification_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert clarification answers" ON clarification_answers FOR INSERT TO authenticated WITH CHECK (true);

-- Pricing recommendations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricing_recommendations') THEN
    ALTER TABLE pricing_recommendations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "View pricing recommendations" ON pricing_recommendations;
    DROP POLICY IF EXISTS "Insert pricing recommendations" ON pricing_recommendations;
    CREATE POLICY "View pricing recommendations" ON pricing_recommendations FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Insert pricing recommendations" ON pricing_recommendations FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Decision scenarios
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_scenarios') THEN
    ALTER TABLE decision_scenarios ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "View decision scenarios" ON decision_scenarios;
    DROP POLICY IF EXISTS "Insert decision scenarios" ON decision_scenarios;
    CREATE POLICY "View decision scenarios" ON decision_scenarios FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Insert decision scenarios" ON decision_scenarios FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Company profiles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_profiles') THEN
    ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "View company profiles" ON company_profiles;
    DROP POLICY IF EXISTS "Insert company profiles" ON company_profiles;
    DROP POLICY IF EXISTS "Update company profiles" ON company_profiles;
    CREATE POLICY "View company profiles" ON company_profiles FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Insert company profiles" ON company_profiles FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "Update company profiles" ON company_profiles FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- Notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "View own notifications" ON notifications;
    DROP POLICY IF EXISTS "Insert notifications" ON notifications;
    DROP POLICY IF EXISTS "Update own notifications" ON notifications;
    CREATE POLICY "View own notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
    CREATE POLICY "Insert notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "Update own notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- User settings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings') THEN
    ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "View own settings" ON user_settings;
    DROP POLICY IF EXISTS "Insert own settings" ON user_settings;
    DROP POLICY IF EXISTS "Update own settings" ON user_settings;
    CREATE POLICY "View own settings" ON user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
    CREATE POLICY "Insert own settings" ON user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Update own settings" ON user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- =============================================
-- DONE!
-- =============================================

SELECT 'Setup complete!' as status;
