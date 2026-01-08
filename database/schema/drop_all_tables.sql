-- ============================================
-- DROP ALL EXISTING TABLES
-- Run this FIRST, then run tenderix_v3_complete.sql
-- ============================================

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Drop all tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS final_decisions CASCADE;
DROP TABLE IF EXISTS decision_scenarios CASCADE;
DROP TABLE IF EXISTS market_pricing CASCADE;
DROP TABLE IF EXISTS tender_competitors CASCADE;
DROP TABLE IF EXISTS competitor_bids CASCADE;
DROP TABLE IF EXISTS competitors CASCADE;
DROP TABLE IF EXISTS contract_analysis CASCADE;
DROP TABLE IF EXISTS sow_analysis CASCADE;
DROP TABLE IF EXISTS boq_summary CASCADE;
DROP TABLE IF EXISTS boq_items CASCADE;
DROP TABLE IF EXISTS spec_items CASCADE;
DROP TABLE IF EXISTS clarification_answers CASCADE;
DROP TABLE IF EXISTS clarification_questions CASCADE;
DROP TABLE IF EXISTS gate_conditions_summary CASCADE;
DROP TABLE IF EXISTS gate_condition_matches CASCADE;
DROP TABLE IF EXISTS gate_conditions CASCADE;
DROP TABLE IF EXISTS tender_definitions CASCADE;
DROP TABLE IF EXISTS tender_documents CASCADE;
DROP TABLE IF EXISTS tenders CASCADE;
DROP TABLE IF EXISTS company_projects CASCADE;
DROP TABLE IF EXISTS company_personnel CASCADE;
DROP TABLE IF EXISTS company_certifications CASCADE;
DROP TABLE IF EXISTS company_financials CASCADE;
DROP TABLE IF EXISTS technical_dictionary CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop old tables from previous schema (if exist)
DROP TABLE IF EXISTS problematic_gate_conditions CASCADE;
DROP TABLE IF EXISTS tender_full_status CASCADE;
DROP TABLE IF EXISTS tender_reality_updates CASCADE;
DROP TABLE IF EXISTS tender_structure CASCADE;
DROP TABLE IF EXISTS hidden_work CASCADE;
DROP TABLE IF EXISTS quality_scoring_model CASCADE;
DROP TABLE IF EXISTS contract_clauses CASCADE;
DROP TABLE IF EXISTS company_profile CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Drop function if exists
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
