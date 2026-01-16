-- Migration 001: Full Traceability (עקיבות מלאה)
-- עקרון C1 מהאפיון - כל קביעה חייבת מקור מדויק
-- Run this in Supabase SQL Editor

-- =====================================================
-- GATE CONDITIONS - הוספת עקיבות מלאה
-- =====================================================

-- שדה לציטוט מדויק מהמסמך
ALTER TABLE gate_conditions ADD COLUMN IF NOT EXISTS source_quote TEXT;

-- שדה לשם הקובץ המקורי
ALTER TABLE gate_conditions ADD COLUMN IF NOT EXISTS source_file VARCHAR(255);

-- עדכון אינדקס
CREATE INDEX IF NOT EXISTS idx_gate_conditions_source
ON gate_conditions(tender_id, source_file, source_page);

-- =====================================================
-- COMPANY PROJECTS - הוספת שדות חסרים
-- =====================================================

-- הגדרת סיום פרויקט (P1.3)
ALTER TABLE company_projects ADD COLUMN IF NOT EXISTS completion_type VARCHAR(50)
  CHECK (completion_type IN ('handover', 'final_invoice', 'warranty_end'));

-- היקף הקמה נפרד
ALTER TABLE company_projects ADD COLUMN IF NOT EXISTS construction_scope NUMERIC(15,2);

-- היקף תחזוקה נפרד
ALTER TABLE company_projects ADD COLUMN IF NOT EXISTS maintenance_scope NUMERIC(15,2);

-- משך תחזוקה בחודשים
ALTER TABLE company_projects ADD COLUMN IF NOT EXISTS maintenance_duration_months INTEGER;

-- סוג פרויקט
ALTER TABLE company_projects ADD COLUMN IF NOT EXISTS project_type VARCHAR(50)
  CHECK (project_type IN ('construction', 'maintenance', 'combined'));

-- =====================================================
-- ORGANIZATIONS - הוספת חברות קבוצה
-- =====================================================

-- חברת אם
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES organizations(id);

-- האם זו חברת בת
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_subsidiary BOOLEAN DEFAULT FALSE;

-- =====================================================
-- TENDER DOCUMENTS - ניהול גרסאות (Module 1.1.5)
-- =====================================================

-- גרסת המסמך
ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- האם זו הגרסה המקורית
ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS is_original BOOLEAN DEFAULT TRUE;

-- מזהה הגרסה הקודמת
ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS previous_version_id UUID REFERENCES tender_documents(id);

-- תאריך עדכון
ALTER TABLE tender_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- TECHNICAL DICTIONARY - מילון טכני (C2)
-- =====================================================

CREATE TABLE IF NOT EXISTS technical_dictionaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,  -- video_cctv, communications, software, etc.
  term VARCHAR(255) NOT NULL,
  synonyms TEXT[],  -- מילים נרדפות
  equivalents TEXT[],  -- שוויונות ערך
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- אינדקס לחיפוש מהיר
CREATE INDEX IF NOT EXISTS idx_technical_dict_category
ON technical_dictionaries(category);

CREATE INDEX IF NOT EXISTS idx_technical_dict_term
ON technical_dictionaries(term);

-- =====================================================
-- INSERT INITIAL DICTIONARY DATA
-- =====================================================

INSERT INTO technical_dictionaries (category, term, synonyms, equivalents, description) VALUES
-- Video/CCTV
('video_cctv', 'CCTV', ARRAY['מצלמות אבטחה', 'מערכת מעקב', 'טלוויזיה במעגל סגור'], ARRAY['IP Camera', 'Analog Camera'], 'מערכות מצלמות אבטחה'),
('video_cctv', 'LPR', ARRAY['זיהוי לוחיות רישוי', 'ANPR'], ARRAY['מצלמת תנועה', 'מצלמת כביש'], 'זיהוי אוטומטי של לוחיות רישוי'),
('video_cctv', 'PTZ', ARRAY['מצלמה ממונעת', 'Pan Tilt Zoom'], NULL, 'מצלמה עם יכולת סיבוב והגדלה'),
('video_cctv', 'VMS', ARRAY['מערכת ניהול וידאו', 'Video Management'], ARRAY['NVR', 'DVR'], 'תוכנה לניהול מצלמות'),

-- Communications
('communications', 'רשת תקשורת', ARRAY['Network', 'תשתית רשת'], ARRAY['LAN', 'WAN'], 'תשתית תקשורת נתונים'),
('communications', 'סייבר', ARRAY['Cyber Security', 'אבטחת מידע'], NULL, 'הגנה על מערכות מחשוב'),
('communications', 'WiFi', ARRAY['אלחוטי', 'Wireless'], ARRAY['WLAN'], 'רשת אלחוטית'),

-- Software
('software', 'PSIM', ARRAY['מערכת ניהול אבטחה משולבת'], ARRAY['VMS', 'מוקד שליטה'], 'Physical Security Information Management'),
('software', 'API', ARRAY['ממשק תכנות', 'אינטגרציה'], NULL, 'Application Programming Interface'),

-- Access Control
('access_control', 'בקרת כניסה', ARRAY['Access Control', 'מערכת שליטה'], NULL, 'מערכת לניהול כניסות'),
('access_control', 'ביומטרי', ARRAY['Biometric', 'טביעת אצבע', 'זיהוי פנים'], NULL, 'זיהוי ביומטרי')

ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFY MIGRATION
-- =====================================================

SELECT 'gate_conditions columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'gate_conditions'
AND column_name IN ('source_quote', 'source_file');

SELECT 'company_projects columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'company_projects'
AND column_name IN ('completion_type', 'construction_scope', 'maintenance_scope', 'project_type');

SELECT 'technical_dictionaries count:' as info;
SELECT COUNT(*) FROM technical_dictionaries;
