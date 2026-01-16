-- Migration 003: Advanced Features
-- Group Companies, Pricing Risks, Document Validity
-- Run this in Supabase SQL Editor

-- =====================================================
-- GROUP COMPANIES TABLE (C4 - חברות קבוצה)
-- =====================================================

CREATE TABLE IF NOT EXISTS group_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  company_number VARCHAR(50),

  -- סוג קשר
  relationship_type VARCHAR(50) NOT NULL CHECK (
    relationship_type IN ('SUBSIDIARY', 'SISTER', 'PARENT', 'AFFILIATE')
  ),

  -- אחוז בעלות
  ownership_percentage NUMERIC(5,2),

  -- מה ניתן להשתמש
  can_use_experience BOOLEAN DEFAULT FALSE,
  can_use_financials BOOLEAN DEFAULT FALSE,

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- אינדקס
CREATE INDEX IF NOT EXISTS idx_group_companies_parent
ON group_companies(parent_org_id);

-- =====================================================
-- REQUIRED DOCUMENTS - מעקב תוקף מסמכים
-- =====================================================

CREATE TABLE IF NOT EXISTS required_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- קטגוריה
  category VARCHAR(100),
  source_condition VARCHAR(50),  -- תנאי סף שממנו נגזרה הדרישה

  -- סטטוס
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (
    status IN ('AVAILABLE', 'MISSING', 'EXPIRED', 'PENDING')
  ),

  -- תוקף
  validity_date DATE,
  is_expired BOOLEAN GENERATED ALWAYS AS (validity_date < CURRENT_DATE) STORED,

  -- קובץ
  file_path VARCHAR(500),

  -- משימות
  prep_time VARCHAR(100),
  responsible_person VARCHAR(255),
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- אינדקס
CREATE INDEX IF NOT EXISTS idx_required_docs_tender
ON required_documents(tender_id);

CREATE INDEX IF NOT EXISTS idx_required_docs_status
ON required_documents(status);

CREATE INDEX IF NOT EXISTS idx_required_docs_validity
ON required_documents(validity_date);

-- =====================================================
-- PRICING RISKS - ניתוח סיכוני תמחור
-- =====================================================

CREATE TABLE IF NOT EXISTS pricing_risk_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

  -- ציון כולל
  overall_risk_score INTEGER CHECK (overall_risk_score BETWEEN 0 AND 100),

  -- ניתוח פריטים
  risk_items JSONB,  -- [{item_number, description, risk_type, risk_level, suggested_markup_percent}]

  -- המלצת רזרבה
  reserve_min_percent NUMERIC(5,2),
  reserve_recommended_percent NUMERIC(5,2),
  reserve_max_percent NUMERIC(5,2),
  reserve_reasoning TEXT,

  -- אסטרטגיית תמחור
  pricing_approach VARCHAR(100),
  pricing_reasoning TEXT,
  key_items_to_focus TEXT[],

  -- אזהרות
  warnings TEXT[],

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- אינדקס
CREATE INDEX IF NOT EXISTS idx_pricing_risks_tender
ON pricing_risk_analysis(tender_id);

-- =====================================================
-- PRIORITIZED QUESTIONS - שאלות עם עדיפויות
-- =====================================================

CREATE TABLE IF NOT EXISTS prioritized_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

  -- עדיפות
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('P1', 'P2', 'P3')),

  -- תוכן
  question TEXT NOT NULL,
  rationale TEXT,
  deadline VARCHAR(100),

  -- קישור לתנאי סף
  gate_condition_id UUID REFERENCES gate_conditions(id),

  -- סטטוס
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'ASKED', 'ANSWERED', 'IRRELEVANT')
  ),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- אינדקס
CREATE INDEX IF NOT EXISTS idx_prioritized_questions_tender
ON prioritized_questions(tender_id);

CREATE INDEX IF NOT EXISTS idx_prioritized_questions_priority
ON prioritized_questions(priority);

-- =====================================================
-- CERTIFICATIONS VALIDITY - מעקב תוקף הסמכות
-- =====================================================

-- הוספת שדות תוקף לטבלת הסמכות קיימת
ALTER TABLE company_certifications ADD COLUMN IF NOT EXISTS validity_date DATE;
ALTER TABLE company_certifications ADD COLUMN IF NOT EXISTS renewal_reminder_days INTEGER DEFAULT 30;

-- =====================================================
-- ORGANIZATIONS - הוספת התמחויות
-- =====================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS specializations TEXT;

-- =====================================================
-- VERIFY
-- =====================================================

SELECT 'group_companies created' as info WHERE EXISTS (
  SELECT FROM information_schema.tables WHERE table_name = 'group_companies'
);

SELECT 'required_documents created' as info WHERE EXISTS (
  SELECT FROM information_schema.tables WHERE table_name = 'required_documents'
);

SELECT 'pricing_risk_analysis created' as info WHERE EXISTS (
  SELECT FROM information_schema.tables WHERE table_name = 'pricing_risk_analysis'
);

SELECT 'prioritized_questions created' as info WHERE EXISTS (
  SELECT FROM information_schema.tables WHERE table_name = 'prioritized_questions'
);
