-- ============================================
-- GATE CONDITION MATCHING SCRIPT
-- Evaluates דקל מערכות אבטחה against מכרז 2025/001 חולון
-- ============================================

-- Variables
-- org_id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
-- tender_id: e1e1e1e1-0000-0000-0000-000000000001

-- ============================================
-- CONDITION 1: Annual Revenue >= 50M (avg 3 years)
-- Company has: 2023: 85M, 2024: 95M, 2025: 110M = avg 96.67M
-- ============================================
UPDATE gate_conditions SET
    status = 'MEETS',
    company_evidence = 'מחזור ממוצע 3 שנים: ₪96.67M (2023: ₪85M, 2024: ₪95M, 2025: ₪110M)',
    confidence_score = 100
WHERE id = 'a1000001-0000-0000-0000-000000000001';

-- ============================================
-- CONDITION 2: Single Project >= 20M
-- Company has: בסיס צה"ל ₪62M, תל אביב ₪45M, עזריאלי ₪35M
-- ============================================
UPDATE gate_conditions SET
    status = 'MEETS',
    company_evidence = 'פרויקט מערכת אבטחה משולבת - בסיס צה"ל: ₪62M (2021-2023)',
    confidence_score = 100
WHERE id = 'a1000002-0000-0000-0000-000000000002';

-- ============================================
-- CONDITION 3: Municipal Camera Project >= 100 cameras
-- Company has: Tel Aviv 850 cameras
-- ============================================
UPDATE gate_conditions SET
    status = 'MEETS',
    company_evidence = 'מערכת מצלמות עירונית - עיריית תל אביב: 850 מצלמות (2022-2023)',
    confidence_score = 100
WHERE id = 'a1000003-0000-0000-0000-000000000003';

-- ============================================
-- CONDITION 4: VMS Integration (Milestone/Genetec) with municipal
-- Company has: Tel Aviv with Milestone XProtect Corporate
-- ============================================
UPDATE gate_conditions SET
    status = 'MEETS',
    company_evidence = 'אינטגרציית Milestone XProtect Corporate עם מוקד עירוני תל אביב, כולל PSIM-CNL ומוקד 100',
    confidence_score = 100
WHERE id = 'a1000004-0000-0000-0000-000000000004';

-- ============================================
-- CONDITION 5: ISO 9001
-- Company has: ISO 9001:2015 valid until 2027-01-01
-- ============================================
UPDATE gate_conditions SET
    status = 'MEETS',
    company_evidence = 'ISO 9001:2015 - מכון התקנים הישראלי, תקף עד 01/01/2027 (מס׳ IL-9001-2024-1234)',
    confidence_score = 100
WHERE id = 'a1000005-0000-0000-0000-000000000005';

-- ============================================
-- CONDITION 6: ISO 27001
-- Company has: ISO 27001:2022 valid until 2027-03-01
-- ============================================
UPDATE gate_conditions SET
    status = 'MEETS',
    company_evidence = 'ISO 27001:2022 - מכון התקנים הישראלי, תקף עד 01/03/2027 (מס׳ IL-27001-2024-5678)',
    confidence_score = 100
WHERE id = 'a1000006-0000-0000-0000-000000000006';

-- ============================================
-- CONDITION 7: Contractor Registration Branch 200
-- Company has: רישום קבלנים - ענף 200 valid until 2026-12-31
-- ============================================
UPDATE gate_conditions SET
    status = 'MEETS',
    company_evidence = 'רישום קבלנים ענף 200 - רשם הקבלנים, תקף עד 31/12/2026 (מס׳ ק-200-5432)',
    confidence_score = 100
WHERE id = 'a1000007-0000-0000-0000-000000000007';

-- ============================================
-- CONDITION 8: Project Manager with PMP + 10 years
-- Company has: משה כץ - PMP, 15 years experience
-- ============================================
UPDATE gate_conditions SET
    status = 'MEETS',
    company_evidence = 'משה כץ - מנהל פרויקטים בכיר, הסמכת PMP, 15 שנות ניסיון, תואר הנדסת חשמל',
    confidence_score = 100
WHERE id = 'a1000008-0000-0000-0000-000000000008';

-- ============================================
-- CONDITION 9: VMS Certified Engineer (Milestone/Genetec)
-- Company has: יעל גולן - Genetec Certified, משה כץ - Milestone Certified
-- ============================================
UPDATE gate_conditions SET
    status = 'MEETS',
    company_evidence = 'יעל גולן - Genetec Certified, PSIM Certified; משה כץ - Milestone Certified',
    confidence_score = 100
WHERE id = 'a1000009-0000-0000-0000-000000000009';

-- ============================================
-- CONDITION 10: Tax Certificates (ניהול ספרים + ניכוי מס)
-- Company has: Both valid until 2025-12-31
-- ============================================
UPDATE gate_conditions SET
    status = 'MEETS',
    company_evidence = 'אישור ניהול ספרים תקף עד 31/12/2025; אישור ניכוי מס במקור תקף עד 31/12/2025',
    confidence_score = 100
WHERE id = 'a1000010-0000-0000-0000-000000000010';

-- ============================================
-- CONDITION 11: Maintenance >= 500 cameras
-- Company has: משרד החינוך 3200 cameras maintenance
-- ============================================
UPDATE gate_conditions SET
    status = 'MEETS',
    company_evidence = 'אחזקת מערכות אבטחה - משרד החינוך: 3,200 מצלמות ב-180 אתרים (2024-2026)',
    confidence_score = 100
WHERE id = 'a1000011-0000-0000-0000-000000000011';

-- ============================================
-- CONDITION 12: Security Clearance (ADVANTAGE - optional)
-- Company has: אישור ביטחוני מפעל from מלמ"ב
-- ============================================
UPDATE gate_conditions SET
    status = 'MEETS',
    company_evidence = 'אישור ביטחוני מפעל - משרד הביטחון מלמ"ב, תקף עד 01/01/2026 (מס׳ מל/2024/1234)',
    confidence_score = 100
WHERE id = 'a1000012-0000-0000-0000-000000000012';

-- ============================================
-- CONDITION 13: 3+ Government Projects in 5 years
-- Company has: תל אביב (MUNICIPAL), בסיס צה"ל (DEFENSE), איכילוב (GOVERNMENT),
--              נתיבי ישראל (GOVERNMENT), רכבת ישראל (GOVERNMENT), משרד החינוך (GOVERNMENT)
-- ============================================
UPDATE gate_conditions SET
    status = 'MEETS',
    company_evidence = '6 פרויקטים ממשלתיים/ציבוריים: עיריית תל אביב, משרד הביטחון, סוראסקי, נתיבי ישראל, רכבת ישראל, משרד החינוך',
    confidence_score = 100
WHERE id = 'a1000013-0000-0000-0000-000000000013';

-- ============================================
-- CONDITION 14: Insurance >= 10M
-- Company: No insurance data in profile - NEEDS VERIFICATION
-- ============================================
UPDATE gate_conditions SET
    status = 'UNKNOWN',
    company_evidence = NULL,
    gap_description = 'אין מידע על ביטוח אחריות מקצועית בפרופיל החברה - נדרש לאסוף פוליסה',
    remediation_suggestion = 'לבקש העתק פוליסת ביטוח אחריות מקצועית מהחברה',
    confidence_score = 0
WHERE id = 'a1000014-0000-0000-0000-000000000014';

-- ============================================
-- CONDITION 15: Bank Guarantee 500K
-- This is submission-time requirement, not profile data
-- ============================================
UPDATE gate_conditions SET
    status = 'UNKNOWN',
    company_evidence = NULL,
    gap_description = 'ערבות בנקאית נדרשת בעת הגשה - לא רלוונטי לשלב בדיקת תנאי סף',
    remediation_suggestion = 'להכין ערבות בנקאית ע"ס ₪500,000 לפני מועד ההגשה',
    confidence_score = 0
WHERE id = 'a1000015-0000-0000-0000-000000000015';

-- ============================================
-- UPDATE SUMMARY
-- ============================================
UPDATE gate_conditions_summary SET
    meets_count = 13,
    partially_meets_count = 0,
    does_not_meet_count = 0,
    unknown_count = 2,
    overall_eligibility = 'ELIGIBLE',
    blocking_conditions = '{}',
    recommendations = '[
        "החברה עומדת ב-13 מתוך 15 תנאי סף",
        "2 תנאים דורשים השלמת מסמכים: ביטוח וערבות בנקאית",
        "יתרון: החברה מחזיקה באישור ביטחוני (+5 נקודות)",
        "המלצה: GO - להמשיך בהכנת ההצעה"
    ]'::jsonb,
    updated_at = NOW()
WHERE tender_id = 'e1e1e1e1-0000-0000-0000-000000000001';
