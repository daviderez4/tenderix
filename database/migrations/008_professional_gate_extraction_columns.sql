-- Migration 008: Add columns for Professional Gate Extraction (4-Agent System)
-- This migration adds columns required by the new professional extraction system
-- that uses 4 AI agents: Definitions, Scanner, Analyzer, Validator

-- ============================================
-- ENSURE BASE TABLE EXISTS
-- ============================================

-- First ensure tenders table exists (basic version for gate_conditions FK)
CREATE TABLE IF NOT EXISTS tenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_number TEXT,
    title TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create gate_conditions table if not exists (from initial schema)
CREATE TABLE IF NOT EXISTS gate_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    condition_number TEXT,
    condition_text TEXT NOT NULL,
    condition_type TEXT NOT NULL DEFAULT 'GATE',
    requirement_type TEXT,
    logic_type TEXT,
    parent_condition_id UUID REFERENCES gate_conditions(id),
    required_amount DECIMAL(15,2),
    amount_currency TEXT DEFAULT 'ILS',
    required_count INTEGER,
    required_years INTEGER,
    date_reference TEXT,
    entity_type TEXT,
    entity_can_rely_on_subcontractor BOOLEAN DEFAULT FALSE,
    entity_can_rely_on_partnership BOOLEAN DEFAULT FALSE,
    max_score DECIMAL(5,2),
    score_formula TEXT,
    source_document_id UUID,
    source_page INTEGER,
    source_section TEXT,
    source_quote TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on tender_id for performance
CREATE INDEX IF NOT EXISTS idx_gate_conditions_tender_id ON gate_conditions(tender_id);

-- ============================================
-- BEARER ENTITY COLUMNS (ישות נושאת הדרישה)
-- ============================================

-- Add bearer_entity column - who must fulfill the requirement
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'bearer_entity') THEN
        ALTER TABLE gate_conditions ADD COLUMN bearer_entity TEXT DEFAULT 'bidder_only';
        COMMENT ON COLUMN gate_conditions.bearer_entity IS 'Who must fulfill requirement: bidder_only, consortium_member, subcontractor_allowed';
    END IF;
END $$;

-- Add subcontractor_allowed column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'subcontractor_allowed') THEN
        ALTER TABLE gate_conditions ADD COLUMN subcontractor_allowed BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN gate_conditions.subcontractor_allowed IS 'Whether subcontractor can fulfill this requirement';
    END IF;
END $$;

-- Add subcontractor_limit column (percentage limit)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'subcontractor_limit') THEN
        ALTER TABLE gate_conditions ADD COLUMN subcontractor_limit INTEGER;
        COMMENT ON COLUMN gate_conditions.subcontractor_limit IS 'Maximum percentage that can be fulfilled by subcontractor';
    END IF;
END $$;

-- Add group_companies_allowed column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'group_companies_allowed') THEN
        ALTER TABLE gate_conditions ADD COLUMN group_companies_allowed BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN gate_conditions.group_companies_allowed IS 'Whether group/related companies can fulfill requirement';
    END IF;
END $$;

-- ============================================
-- QUANTITATIVE DETAILS (פירוט כמותי)
-- ============================================

-- Add scope_type column - ordered vs executed vs paid
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'scope_type') THEN
        ALTER TABLE gate_conditions ADD COLUMN scope_type TEXT;
        COMMENT ON COLUMN gate_conditions.scope_type IS 'Scope measurement type: ordered, executed, paid';
    END IF;
END $$;

-- Add cumulative column - single project or cumulative
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'cumulative') THEN
        ALTER TABLE gate_conditions ADD COLUMN cumulative BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN gate_conditions.cumulative IS 'Whether amounts/counts are cumulative or per-project';
    END IF;
END $$;

-- ============================================
-- LEGAL INTERPRETATION (פרשנות משפטית)
-- ============================================

-- Add legal_classification column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'legal_classification') THEN
        ALTER TABLE gate_conditions ADD COLUMN legal_classification TEXT;
        COMMENT ON COLUMN gate_conditions.legal_classification IS 'Legal interpretation: strict, open, proof_dependent';
    END IF;
END $$;

-- Add legal_reasoning column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'legal_reasoning') THEN
        ALTER TABLE gate_conditions ADD COLUMN legal_reasoning TEXT;
        COMMENT ON COLUMN gate_conditions.legal_reasoning IS 'Explanation for legal classification';
    END IF;
END $$;

-- ============================================
-- TECHNICAL INTERPRETATION (פרשנות טכנית)
-- ============================================

-- Add technical_requirement column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'technical_requirement') THEN
        ALTER TABLE gate_conditions ADD COLUMN technical_requirement TEXT;
        COMMENT ON COLUMN gate_conditions.technical_requirement IS 'What is actually required in practice';
    END IF;
END $$;

-- Add equivalent_options column (JSONB array)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'equivalent_options') THEN
        ALTER TABLE gate_conditions ADD COLUMN equivalent_options JSONB DEFAULT '[]'::JSONB;
        COMMENT ON COLUMN gate_conditions.equivalent_options IS 'Array of equivalent options that satisfy the requirement';
    END IF;
END $$;

-- ============================================
-- SOURCE TRACEABILITY (עקיבות - C1)
-- ============================================

-- Add source_quote column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'source_quote') THEN
        ALTER TABLE gate_conditions ADD COLUMN source_quote TEXT;
        COMMENT ON COLUMN gate_conditions.source_quote IS 'Exact quote from source document';
    END IF;
END $$;

-- Add source_file column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'source_file') THEN
        ALTER TABLE gate_conditions ADD COLUMN source_file TEXT;
        COMMENT ON COLUMN gate_conditions.source_file IS 'Source file name';
    END IF;
END $$;

-- ============================================
-- EXTRACTION METADATA
-- ============================================

-- Add ai_confidence column (0.0-1.0)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'ai_confidence') THEN
        ALTER TABLE gate_conditions ADD COLUMN ai_confidence DECIMAL(3,2);
        COMMENT ON COLUMN gate_conditions.ai_confidence IS 'AI confidence score (0.0-1.0)';
    END IF;
END $$;

-- Add extraction_method column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'extraction_method') THEN
        ALTER TABLE gate_conditions ADD COLUMN extraction_method TEXT DEFAULT 'regex';
        COMMENT ON COLUMN gate_conditions.extraction_method IS 'Method used: regex, iterative, professional_4_agent';
    END IF;
END $$;

-- Add definitions_applied column (JSONB array of definitions used)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'definitions_applied') THEN
        ALTER TABLE gate_conditions ADD COLUMN definitions_applied JSONB DEFAULT '[]'::JSONB;
        COMMENT ON COLUMN gate_conditions.definitions_applied IS 'Definitions from tender that affected interpretation';
    END IF;
END $$;

-- ============================================
-- TENDER DEFINITIONS TABLE (מילון הגדרות המכרז)
-- ============================================

-- Create tender_definitions table if not exists
CREATE TABLE IF NOT EXISTS tender_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    definition TEXT NOT NULL,
    source_section TEXT,
    source_quote TEXT,
    implications JSONB DEFAULT '[]'::JSONB,
    is_critical BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tender_id, term)
);

-- Add comments to tender_definitions
COMMENT ON TABLE tender_definitions IS 'Definitions and terms extracted from tender documents';
COMMENT ON COLUMN tender_definitions.term IS 'The defined term (e.g., "פרויקט דומה")';
COMMENT ON COLUMN tender_definitions.definition IS 'The definition from the tender document';
COMMENT ON COLUMN tender_definitions.implications IS 'Practical implications of this definition';
COMMENT ON COLUMN tender_definitions.is_critical IS 'Whether this definition affects gate conditions';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tender_definitions_tender_id ON tender_definitions(tender_id);
CREATE INDEX IF NOT EXISTS idx_gate_conditions_extraction_method ON gate_conditions(extraction_method);
CREATE INDEX IF NOT EXISTS idx_gate_conditions_bearer_entity ON gate_conditions(bearer_entity);
CREATE INDEX IF NOT EXISTS idx_gate_conditions_legal_classification ON gate_conditions(legal_classification);

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify the migration:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'gate_conditions'
-- ORDER BY ordinal_position;

-- Check tender_definitions table:
-- SELECT * FROM tender_definitions LIMIT 5;
