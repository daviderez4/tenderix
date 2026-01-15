-- Database migration for AI Gate Analysis
-- Run this in Supabase SQL Editor

-- Add AI analysis columns to gate_conditions table
ALTER TABLE gate_conditions ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE gate_conditions ADD COLUMN IF NOT EXISTS ai_confidence FLOAT;
ALTER TABLE gate_conditions ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster queries on analyzed status
CREATE INDEX IF NOT EXISTS idx_gate_conditions_ai_analyzed
ON gate_conditions(tender_id, ai_analyzed_at);

-- Update RLS policy to allow updates (if needed)
-- The existing policies should already cover this

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'gate_conditions'
AND column_name IN ('ai_summary', 'ai_confidence', 'ai_analyzed_at');
