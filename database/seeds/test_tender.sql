-- ============================================
-- TENDERIX TEST TENDER
-- Sample tender with gate conditions for testing matching
-- ============================================

-- ============================================
-- 1. TENDER
-- ============================================

INSERT INTO tenders (
    id, org_id, tender_number, tender_name, issuing_body, issuing_body_type,
    publish_date, clarification_deadline, submission_deadline,
    estimated_value, guarantee_amount, guarantee_type, contract_duration_months,
    scoring_method, quality_weight, price_weight,
    category, current_step, status,
    go_nogo_decision
) VALUES (
    'e1e1e1e1-0000-0000-0000-000000000001'::uuid,
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'מכרז 2025/001',
    'הקמת מערכת מצלמות אבטחה עירונית - עיריית חולון',
    'עיריית חולון',
    'MUNICIPAL',
    '2025-01-01',
    '2025-01-25 14:00:00+02',
    '2025-02-15 14:00:00+02',
    25000000,
    500000,
    'BANK',
    36,
    'QUALITY_PRICE',
    40,
    60,
    'VIDEO',
    'GATES',
    'ACTIVE',
    'PENDING'
);

-- ============================================
-- 2. TENDER DOCUMENTS
-- ============================================

INSERT INTO tender_documents (id, tender_id, file_name, file_type, storage_path, doc_type, page_count, processing_status) VALUES
('f1f1f1f1-0000-0000-0000-000000000001'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001', 'מסמכי_מכרז_מלאים.pdf', 'PDF', '/uploads/holon_2025_001/tender_docs.pdf', 'INVITATION', 85, 'COMPLETED'),
('f1f1f1f1-0000-0000-0000-000000000002'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001', 'מפרט_טכני.pdf', 'PDF', '/uploads/holon_2025_001/technical_spec.pdf', 'SPECS', 42, 'COMPLETED'),
('f1f1f1f1-0000-0000-0000-000000000003'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001', 'כתב_כמויות.xlsx', 'XLSX', '/uploads/holon_2025_001/boq.xlsx', 'BOQ', 15, 'COMPLETED'),
('f1f1f1f1-0000-0000-0000-000000000004'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001', 'חוזה_התקשרות.pdf', 'PDF', '/uploads/holon_2025_001/contract.pdf', 'CONTRACT', 28, 'COMPLETED');

-- ============================================
-- 3. TENDER DEFINITIONS
-- ============================================

INSERT INTO tender_definitions (tender_id, term, definition, source_document_id, source_page) VALUES
('e1e1e1e1-0000-0000-0000-000000000001', 'היקף הפרויקט', 'הקמת מערכת מצלמות אבטחה עירונית הכוללת 200 מצלמות, מוקד שליטה ובקרה, ותחזוקה ל-24 חודשים', 'f1f1f1f1-0000-0000-0000-000000000001', 5),
('e1e1e1e1-0000-0000-0000-000000000001', 'תקופת אחריות', '24 חודשים מיום המסירה', 'f1f1f1f1-0000-0000-0000-000000000001', 12),
('e1e1e1e1-0000-0000-0000-000000000001', 'לוח זמנים', '12 חודשים מיום צו התחלת עבודה', 'f1f1f1f1-0000-0000-0000-000000000001', 8),
('e1e1e1e1-0000-0000-0000-000000000001', 'תנאי תשלום', '30% מקדמה, 50% לפי אבני דרך, 20% בסיום', 'f1f1f1f1-0000-0000-0000-000000000004', 15);

-- ============================================
-- 4. GATE CONDITIONS (תנאי סף)
-- ============================================

INSERT INTO gate_conditions (
    id, tender_id, condition_number, condition_text, condition_type, is_mandatory,
    requirement_type, entity_type,
    required_amount, amount_currency, required_count, required_years,
    status, company_evidence, gap_description,
    source_document_id, source_page, source_section
) VALUES

-- CONDITION 1: Financial - Annual Revenue (SHOULD PASS - company has 110M, needs 50M)
('a1000001-0000-0000-0000-000000000001'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '1', 'מחזור הכנסות שנתי ממוצע של 50 מיליון ש"ח לפחות בשלוש השנים האחרונות (2022-2024)',
 'GATE', true,
 'CAPABILITY', 'COMPANY',
 50000000, 'ILS', NULL, 3,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 15, '2.1'),

-- CONDITION 2: Financial - Single Project Value (SHOULD PASS - has 62M project, needs 20M)
('a1000002-0000-0000-0000-000000000002'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '2', 'ביצוע פרויקט בודד בהיקף של 20 מיליון ש"ח לפחות בחמש השנים האחרונות',
 'GATE', true,
 'EXECUTION', 'PROJECT',
 20000000, 'ILS', 1, 5,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 15, '2.2'),

-- CONDITION 3: Experience - Municipal Camera Projects (SHOULD PASS - has Tel Aviv municipal)
('a1000003-0000-0000-0000-000000000003'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '3', 'ניסיון בהקמת מערכת מצלמות אבטחה עירונית עבור רשות מקומית, בהיקף של לפחות 100 מצלמות',
 'GATE', true,
 'EXECUTION', 'PROJECT',
 NULL, NULL, 100, 5,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 16, '2.3'),

-- CONDITION 4: Experience - VMS Integration (SHOULD PASS - has Milestone experience)
('a1000004-0000-0000-0000-000000000004'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '4', 'ניסיון מוכח באינטגרציה של מערכת VMS (Milestone או Genetec) עם מערכות עירוניות',
 'GATE', true,
 'EXECUTION', 'PROJECT',
 NULL, NULL, 1, 5,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 16, '2.4'),

-- CONDITION 5: Certification - ISO 9001 (SHOULD PASS - has valid certification)
('a1000005-0000-0000-0000-000000000005'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '5', 'תעודת ISO 9001 בתוקף ממכון התקנים הישראלי או גוף מוסמך אחר',
 'GATE', true,
 'CAPABILITY', 'CERTIFICATION',
 NULL, NULL, NULL, NULL,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 17, '2.5'),

-- CONDITION 6: Certification - ISO 27001 (SHOULD PASS - has valid certification)
('a1000006-0000-0000-0000-000000000006'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '6', 'תעודת ISO 27001 בתוקף (אבטחת מידע)',
 'GATE', true,
 'CAPABILITY', 'CERTIFICATION',
 NULL, NULL, NULL, NULL,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 17, '2.6'),

-- CONDITION 7: Certification - Contractor Registration (SHOULD PASS - has ענף 200)
('a1000007-0000-0000-0000-000000000007'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '7', 'רישום בפנקס הקבלנים בענף 200 (עבודות חשמל ותקשורת)',
 'GATE', true,
 'CAPABILITY', 'CERTIFICATION',
 NULL, NULL, NULL, NULL,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 17, '2.7'),

-- CONDITION 8: Personnel - Project Manager (SHOULD PASS - has PMP certified PM)
('a1000008-0000-0000-0000-000000000008'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '8', 'מנהל פרויקט בעל הסמכת PMP או שווה ערך, עם ניסיון של 10 שנים לפחות בניהול פרויקטי אבטחה',
 'GATE', true,
 'CAPABILITY', 'PERSONNEL',
 NULL, NULL, 1, 10,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 18, '2.8'),

-- CONDITION 9: Personnel - System Engineer (SHOULD PASS - has certified engineers)
('a1000009-0000-0000-0000-000000000009'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '9', 'מהנדס מערכות בעל הסמכה מיצרן VMS (Milestone או Genetec)',
 'GATE', true,
 'CAPABILITY', 'PERSONNEL',
 NULL, NULL, 1, NULL,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 18, '2.9'),

-- CONDITION 10: Legal - Tax Certificate (SHOULD PASS - has valid tax certs)
('a1000010-0000-0000-0000-000000000010'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '10', 'אישור ניהול ספרים ואישור ניכוי מס במקור בתוקף',
 'GATE', true,
 'CAPABILITY', 'CERTIFICATION',
 NULL, NULL, NULL, NULL,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 19, '2.10'),

-- CONDITION 11: Experience - Maintenance Contract (SHOULD PASS - has Education Ministry maintenance)
('a1000011-0000-0000-0000-000000000011'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '11', 'ניסיון בתחזוקת מערכות מצלמות אבטחה בהיקף של לפחות 500 מצלמות',
 'GATE', true,
 'EXECUTION', 'PROJECT',
 NULL, NULL, 500, 5,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 19, '2.11'),

-- CONDITION 12: Security Clearance - OPTIONAL (SHOULD PASS - has clearance but not required)
('a1000012-0000-0000-0000-000000000012'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '12', 'יתרון למציע בעל סיווג ביטחוני מאושר',
 'ADVANTAGE', false,
 'CAPABILITY', 'CERTIFICATION',
 NULL, NULL, NULL, NULL,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 19, '2.12'),

-- CONDITION 13: Experience - Government Projects (SHOULD PASS - has multiple gov projects)
('a1000013-0000-0000-0000-000000000013'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '13', 'ניסיון ב-3 פרויקטים לפחות עבור גופים ממשלתיים או ציבוריים בחמש השנים האחרונות',
 'GATE', true,
 'EXECUTION', 'PROJECT',
 NULL, NULL, 3, 5,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 20, '2.13'),

-- CONDITION 14: Insurance (STANDARD - needs verification)
('a1000014-0000-0000-0000-000000000014'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '14', 'ביטוח אחריות מקצועית בסכום של לפחות 10 מיליון ש"ח',
 'GATE', true,
 'CAPABILITY', 'COMPANY',
 10000000, 'ILS', NULL, NULL,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 20, '2.14'),

-- CONDITION 15: Bank Guarantee (STANDARD - needs verification at submission)
('a1000015-0000-0000-0000-000000000015'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '15', 'ערבות בנקאית להצעה בסך 500,000 ש"ח',
 'GATE', true,
 'CAPABILITY', 'COMPANY',
 500000, 'ILS', NULL, NULL,
 'UNKNOWN', NULL, NULL,
 'f1f1f1f1-0000-0000-0000-000000000001', 21, '2.15');

-- ============================================
-- 5. GATE CONDITIONS SUMMARY
-- ============================================

INSERT INTO gate_conditions_summary (
    tender_id,
    total_conditions, mandatory_count,
    meets_count, partially_meets_count, does_not_meet_count, unknown_count,
    overall_eligibility,
    blocking_conditions,
    recommendations
) VALUES (
    'e1e1e1e1-0000-0000-0000-000000000001',
    15, 14,
    0, 0, 0, 15,
    'UNKNOWN',
    '{}',
    '["יש להריץ בדיקת התאמה אוטומטית", "לאסוף מסמכים נדרשים"]'::jsonb
);

-- ============================================
-- 6. BOQ ITEMS
-- ============================================

INSERT INTO boq_items (
    id, tender_id, item_number, chapter, description, unit, quantity
) VALUES
('b0a00001-0000-0000-0000-000000000001'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '1.1', '1 - מצלמות', 'מצלמת IP כיפה 4MP - Axis P3245-V או שווה ערך', 'יחידה', 120),

('b0a00002-0000-0000-0000-000000000002'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '1.2', '1 - מצלמות', 'מצלמת IP PTZ 2MP - Axis Q6135-LE או שווה ערך', 'יחידה', 30),

('b0a00003-0000-0000-0000-000000000003'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '1.3', '1 - מצלמות', 'מצלמת IP Bullet 4MP - Axis P1448-LE או שווה ערך', 'יחידה', 50),

('b0a00004-0000-0000-0000-000000000004'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '2.1', '2 - שרתים ואחסון', 'שרת הקלטה Dell PowerEdge R750', 'יחידה', 4),

('b0a00005-0000-0000-0000-000000000005'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '2.2', '2 - שרתים ואחסון', 'מערכת אחסון NAS 100TB', 'יחידה', 2),

('b0a00006-0000-0000-0000-000000000006'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '2.3', '2 - שרתים ואחסון', 'רישיון Milestone XProtect Corporate - לערוץ', 'יחידה', 200),

('b0a00007-0000-0000-0000-000000000007'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '3.1', '3 - תשתיות', 'ארון תקשורת חיצוני IP66', 'יחידה', 25),

('b0a00008-0000-0000-0000-000000000008'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '3.2', '3 - תשתיות', 'סוויצ PoE מנוהל 24 פורטים', 'יחידה', 25),

('b0a00009-0000-0000-0000-000000000009'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '4.1', '4 - סיבים אופטיים', 'כבל סיב אופטי - הנחה בקרקע', 'מטר', 15000),

('b0a00010-0000-0000-0000-000000000010'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '5.1', '5 - מוקד', 'עמדת מוקד כולל מסכים ועמדת עבודה', 'יחידה', 4),

('b0a00011-0000-0000-0000-000000000011'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '5.2', '5 - מוקד', 'קיר וידאו 3x3', 'יחידה', 1),

('b0a00012-0000-0000-0000-000000000012'::uuid, 'e1e1e1e1-0000-0000-0000-000000000001',
 '6.1', '6 - תחזוקה', 'תחזוקה שנתית מערכת מצלמות', 'שנה', 2);

-- ============================================
-- 7. BOQ SUMMARY
-- ============================================

INSERT INTO boq_summary (
    tender_id,
    total_items,
    pricing_confidence
) VALUES (
    'e1e1e1e1-0000-0000-0000-000000000001',
    12,
    'LOW'
);
