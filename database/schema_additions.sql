-- Tenderix v3.0 - Additional Tables
-- Run this in Supabase SQL Editor

-- Historical Bids table (for competitor pricing intelligence)
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

-- Tender Versions table (for document version management)
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

-- Strategic Questions table (for storing generated questions)
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

-- Tender Analysis Results (for storing AI analysis)
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

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_historical_bids_org ON historical_bids(org_id);
CREATE INDEX IF NOT EXISTS idx_tender_versions_tender ON tender_versions(tender_id);
CREATE INDEX IF NOT EXISTS idx_strategic_questions_tender ON strategic_questions(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_analysis_tender ON tender_analysis(tender_id);

-- Enable RLS
ALTER TABLE historical_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies for anon access (for development)
CREATE POLICY "Allow all for historical_bids" ON historical_bids FOR ALL USING (true);
CREATE POLICY "Allow all for tender_versions" ON tender_versions FOR ALL USING (true);
CREATE POLICY "Allow all for strategic_questions" ON strategic_questions FOR ALL USING (true);
CREATE POLICY "Allow all for tender_analysis" ON tender_analysis FOR ALL USING (true);
