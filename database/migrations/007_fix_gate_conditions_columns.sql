-- Migration 007: Fix missing columns in gate_conditions table
-- This migration adds columns that were missing in the initial schema
-- but are required by the application

-- ============================================
-- ADD MISSING COLUMNS TO gate_conditions
-- ============================================

-- Add is_mandatory column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'is_mandatory') THEN
        ALTER TABLE gate_conditions ADD COLUMN is_mandatory BOOLEAN DEFAULT TRUE;
        COMMENT ON COLUMN gate_conditions.is_mandatory IS 'Whether this is a mandatory gate condition (true) or advantage/scoring condition (false)';
    END IF;
END $$;

-- Add status column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'status') THEN
        ALTER TABLE gate_conditions ADD COLUMN status TEXT DEFAULT 'UNKNOWN';
        COMMENT ON COLUMN gate_conditions.status IS 'Match status: MEETS, PARTIALLY_MEETS, DOES_NOT_MEET, UNKNOWN';
    END IF;
END $$;

-- Add company_evidence column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'company_evidence') THEN
        ALTER TABLE gate_conditions ADD COLUMN company_evidence TEXT;
        COMMENT ON COLUMN gate_conditions.company_evidence IS 'Evidence from company profile that matches this condition';
    END IF;
END $$;

-- Add gap_description column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'gap_description') THEN
        ALTER TABLE gate_conditions ADD COLUMN gap_description TEXT;
        COMMENT ON COLUMN gate_conditions.gap_description IS 'Description of the gap if company does not meet the condition';
    END IF;
END $$;

-- Add confidence_score column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'confidence_score') THEN
        ALTER TABLE gate_conditions ADD COLUMN confidence_score DECIMAL(5,2);
        COMMENT ON COLUMN gate_conditions.confidence_score IS 'AI confidence score for the match analysis (0-100)';
    END IF;
END $$;

-- Add remediation_suggestion column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'remediation_suggestion') THEN
        ALTER TABLE gate_conditions ADD COLUMN remediation_suggestion TEXT;
        COMMENT ON COLUMN gate_conditions.remediation_suggestion IS 'Suggested ways to close the gap';
    END IF;
END $$;

-- Add source_page column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'source_page') THEN
        ALTER TABLE gate_conditions ADD COLUMN source_page INTEGER;
        COMMENT ON COLUMN gate_conditions.source_page IS 'Page number in source document';
    END IF;
END $$;

-- Add source_section column if not exists (may already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'source_section') THEN
        ALTER TABLE gate_conditions ADD COLUMN source_section TEXT;
        COMMENT ON COLUMN gate_conditions.source_section IS 'Section identifier in source document';
    END IF;
END $$;

-- Create index on status for performance
CREATE INDEX IF NOT EXISTS idx_gate_conditions_status ON gate_conditions(status);

-- Create index on is_mandatory for filtering
CREATE INDEX IF NOT EXISTS idx_gate_conditions_mandatory ON gate_conditions(is_mandatory);

-- Update existing records that have NULL status to 'UNKNOWN'
UPDATE gate_conditions SET status = 'UNKNOWN' WHERE status IS NULL;

-- Update existing records that have NULL is_mandatory to TRUE
UPDATE gate_conditions SET is_mandatory = TRUE WHERE is_mandatory IS NULL;

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify the migration:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'gate_conditions'
-- ORDER BY ordinal_position;
