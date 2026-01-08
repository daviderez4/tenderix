-- ============================================
-- TENDERIX TEST DATA
-- Sample organization for testing gate condition matching
-- ============================================

-- ============================================
-- 1. ORGANIZATION
-- ============================================

INSERT INTO organizations (id, name, company_number, founding_year, address, phone, email, website, settings)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'דקל מערכות אבטחה בע"מ',
    '514832567',
    2008,
    'רחוב הברזל 34, תל אביב',
    '03-6789000',
    'info@dekel-security.co.il',
    'https://dekel-security.co.il',
    '{"default_currency": "ILS", "language": "he"}'::jsonb
);

-- ============================================
-- 2. USERS
-- ============================================

INSERT INTO users (id, org_id, email, full_name, role, phone) VALUES
('11000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'david@dekel-security.co.il', 'דוד כהן', 'admin', '054-1234567'),
('11000002-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'sarah@dekel-security.co.il', 'שרה לוי', 'member', '054-2345678'),
('11000003-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'yossi@dekel-security.co.il', 'יוסי אברהם', 'member', '054-3456789');

-- ============================================
-- 3. COMPANY FINANCIALS (מחזורים)
-- ============================================

INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count, audited) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2023, 85000000, 6800000, 120, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2024, 95000000, 7600000, 135, true),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2025, 110000000, 8800000, 150, true);

-- ============================================
-- 4. COMPANY CERTIFICATIONS (הסמכות ורישיונות)
-- ============================================

INSERT INTO company_certifications (id, org_id, cert_type, cert_name, cert_number, issuing_body, valid_from, valid_until) VALUES
-- ISO Certifications
('c1000001-0000-0000-0000-000000000001'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ISO', 'ISO 9001:2015', 'IL-9001-2024-1234', 'מכון התקנים הישראלי', '2024-01-01', '2027-01-01'),
('c2000002-0000-0000-0000-000000000002'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ISO', 'ISO 27001:2022', 'IL-27001-2024-5678', 'מכון התקנים הישראלי', '2024-03-01', '2027-03-01'),
('c3000003-0000-0000-0000-000000000003'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ISO', 'ISO 45001:2018', 'IL-45001-2023-9012', 'מכון התקנים הישראלי', '2023-06-01', '2026-06-01'),

-- Contractor Registration
('c4000004-0000-0000-0000-000000000004'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CONTRACTOR_REG', 'רישום קבלנים - ענף 200', 'ק-200-5432', 'רשם הקבלנים', '2020-01-01', '2026-12-31'),
('c5000005-0000-0000-0000-000000000005'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CONTRACTOR_REG', 'סיווג קבלני ג-5', 'סג5-1234', 'רשם הקבלנים', '2022-01-01', '2027-01-01'),

-- Security Clearance
('c6000006-0000-0000-0000-000000000006'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'SECURITY_CLEARANCE', 'אישור ביטחוני מפעל', 'מל/2024/1234', 'משרד הביטחון - מלמ"ב', '2024-01-01', '2026-01-01'),

-- Professional Licenses
('c7000007-0000-0000-0000-000000000007'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'LICENSE', 'רישיון חברת אבטחה', 'אב-2024-567', 'משרד לביטחון פנים', '2024-01-01', '2025-12-31'),
('c8000008-0000-0000-0000-000000000008'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'LICENSE', 'רישיון עוסק מורשה חשמל', 'חש-12345', 'משרד האנרגיה', '2023-01-01', '2028-01-01'),

-- Tax
('c9000009-0000-0000-0000-000000000009'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'TAX', 'אישור ניהול ספרים', 'נס-2025-001', 'רשות המסים', '2025-01-01', '2025-12-31'),
('ca000010-0000-0000-0000-000000000010'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'TAX', 'אישור ניכוי מס במקור', 'נמ-2025-002', 'רשות המסים', '2025-01-01', '2025-12-31');

-- ============================================
-- 5. COMPANY PERSONNEL (אנשי מפתח)
-- ============================================

INSERT INTO company_personnel (id, org_id, full_name, id_number, role, department, education, education_institution, years_experience, hire_date, professional_certifications, security_clearance) VALUES
-- Management
('b1000001-0000-0000-0000-000000000001'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'אבי דקל', '012345678', 'מנכ"ל', 'הנהלה',
 'תואר שני במנהל עסקים', 'אוניברסיטת תל אביב', 25, '2008-01-01',
 ARRAY['PMP', 'Six Sigma Black Belt'], 'סודי ביותר'),

('b1000002-0000-0000-0000-000000000002'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'רונית שמעון', '023456789', 'סמנכ"ל תפעול', 'תפעול',
 'תואר ראשון בהנדסת תעשייה', 'הטכניון', 18, '2012-03-01',
 ARRAY['PMP', 'ISO 9001 Lead Auditor'], 'סודי'),

-- Technical Leadership
('b1000003-0000-0000-0000-000000000003'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'משה כץ', '034567890', 'מנהל פרויקטים בכיר', 'פרויקטים',
 'תואר ראשון בהנדסת חשמל', 'אוניברסיטת בן גוריון', 15, '2015-01-01',
 ARRAY['PMP', 'CCTV Certified Designer', 'Milestone Certified'], 'סודי'),

('b1000004-0000-0000-0000-000000000004'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'יעל גולן', '045678901', 'מנהלת מחלקת אינטגרציה', 'טכנולוגיה',
 'תואר ראשון במדעי המחשב', 'האוניברסיטה העברית', 12, '2016-06-01',
 ARRAY['CCNA', 'PSIM Certified', 'Genetec Certified'], 'סודי'),

('b1000005-0000-0000-0000-000000000005'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'דני לוינסון', '056789012', 'מנהל מחלקת שירות', 'שירות',
 'הנדסאי אלקטרוניקה', 'מכללת אורט', 10, '2018-01-01',
 ARRAY['ITIL V4', 'Axis Certified Professional'], NULL),

('b1000006-0000-0000-0000-000000000006'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'עדי פרידמן', '067890123', 'מהנדס מערכות בכיר', 'הנדסה',
 'תואר ראשון בהנדסת חשמל ואלקטרוניקה', 'הטכניון', 8, '2019-03-01',
 ARRAY['CPTED', 'Bosch Certified', 'Hikvision Certified'], 'סודי'),

('b1000007-0000-0000-0000-000000000007'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'נועם ברק', '078901234', 'מנהל פרויקטים', 'פרויקטים',
 'תואר ראשון בהנדסת תוכנה', 'המכללה למנהל', 6, '2020-09-01',
 ARRAY['PMP', 'Scrum Master'], NULL);

-- ============================================
-- 6. COMPANY PROJECTS (תיק פרויקטים)
-- THE KEY DATA FOR GATE CONDITION MATCHING
-- ============================================

INSERT INTO company_projects (
    id, org_id, project_name, project_number, client_name, client_contact, client_type,
    start_date, end_date, end_date_type, warranty_end_date,
    total_value, establishment_value, maintenance_value, maintenance_months, currency,
    role_type, role_percentage, partner_companies,
    project_type, category, technologies, quantities, integrations, sla_details,
    location, site_count, project_manager_id, key_personnel_ids,
    is_tangent, tangent_source, tangent_description
) VALUES

-- PROJECT 1: Large Government Project - Video
('d0100001-0000-0000-0000-000000000001'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'מערכת מצלמות עירונית - עיריית תל אביב', 'P-2023-001',
 'עיריית תל אביב-יפו', 'מנהל מחלקת ביטחון', 'MUNICIPAL',
 '2022-03-01', '2023-12-31', 'FINAL_ACCOUNT', '2024-12-31',
 45000000, 38000000, 7000000, 24, 'ILS',
 'PRIMARY', 100, NULL,
 'COMBINED', 'VIDEO',
 '{"cameras": ["Axis P3245-V", "Axis Q6135-LE"], "vms": "Milestone XProtect Corporate", "analytics": "BriefCam"}'::jsonb,
 '{"cameras": 850, "servers": 12, "storage_tb": 500, "workstations": 25}'::jsonb,
 ARRAY['PSIM - CNL', 'Municipal Call Center', 'Police 100'],
 'SLA 99.5% uptime, 4h response',
 'תל אביב-יפו', 1,
 'b1000003-0000-0000-0000-000000000003',
 ARRAY['b1000004-0000-0000-0000-000000000004', 'b1000006-0000-0000-0000-000000000006']::uuid[],
 false, NULL, NULL),

-- PROJECT 2: Defense Project - Access Control + Video
('d0100002-0000-0000-0000-000000000002'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'מערכת אבטחה משולבת - בסיס צה"ל', 'P-2022-015',
 'משרד הביטחון - יחידה טכנולוגית', 'קצין מערכות', 'DEFENSE',
 '2021-06-01', '2023-03-31', 'DELIVERY', '2025-03-31',
 62000000, 55000000, 7000000, 36, 'ILS',
 'PRIMARY', 85, ARRAY['אלביט מערכות'],
 'COMBINED', 'COMBINED',
 '{"cameras": ["Bosch AUTODOME IP 5000i", "Hanwha XNP-6400RW"], "vms": "Genetec Security Center", "access_control": "Lenel OnGuard", "perimeter": "Magal Fortis"}'::jsonb,
 '{"cameras": 420, "access_readers": 180, "barriers": 12, "fence_sensors_km": 8}'::jsonb,
 ARRAY['C4I System', 'Perimeter Detection', 'Guard Tour'],
 'SLA 99.9% uptime, 2h response, 24/7',
 'מרכז הארץ', 1,
 'b1000003-0000-0000-0000-000000000003',
 ARRAY['b1000004-0000-0000-0000-000000000004']::uuid[],
 false, NULL, NULL),

-- PROJECT 3: Hospital - Healthcare
('d0100003-0000-0000-0000-000000000003'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'שדרוג מערכת אבטחה - בית חולים איכילוב', 'P-2023-008',
 'מרכז רפואי סוראסקי', 'מנהל אבטחה', 'GOVERNMENT',
 '2023-01-01', '2024-06-30', 'FINAL_ACCOUNT', '2026-06-30',
 28000000, 24000000, 4000000, 36, 'ILS',
 'PRIMARY', 100, NULL,
 'COMBINED', 'VIDEO',
 '{"cameras": ["Axis P3247-LVE", "Axis M3057-PLVE"], "vms": "Milestone XProtect Expert", "intercom": "Zenitel"}'::jsonb,
 '{"cameras": 380, "intercoms": 120, "servers": 6}'::jsonb,
 ARRAY['Hospital Information System', 'Nurse Call System', 'Fire Alarm'],
 'SLA 99.7% uptime, 2h response',
 'תל אביב', 1,
 'b1000007-0000-0000-0000-000000000007',
 ARRAY['b1000005-0000-0000-0000-000000000005']::uuid[],
 false, NULL, NULL),

-- PROJECT 4: Commercial - High Rise
('d0100004-0000-0000-0000-000000000004'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'מערכת אבטחה - מגדלי עזריאלי שרונה', 'P-2024-003',
 'קבוצת עזריאלי', 'VP Security', 'PRIVATE',
 '2023-09-01', '2025-03-31', 'DELIVERY', '2027-03-31',
 35000000, 32000000, 3000000, 24, 'ILS',
 'PRIMARY', 100, NULL,
 'COMBINED', 'COMBINED',
 '{"cameras": ["Hanwha XNV-8080R", "Hanwha PNM-9320VQP"], "vms": "Genetec Security Center", "access_control": "HID ORIGO", "parking": "Skidata"}'::jsonb,
 '{"cameras": 520, "access_readers": 340, "elevators": 28, "parking_spaces": 2400}'::jsonb,
 ARRAY['Building Management System', 'Elevator Control', 'Parking Management'],
 'SLA 99.5% uptime, 4h response',
 'תל אביב', 3,
 'b1000003-0000-0000-0000-000000000003',
 ARRAY['b1000006-0000-0000-0000-000000000006']::uuid[],
 false, NULL, NULL),

-- PROJECT 5: Transportation - LPR
('d0100005-0000-0000-0000-000000000005'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'מערכת LPR - נתיבי ישראל', 'P-2022-022',
 'נתיבי ישראל - החברה הלאומית לתשתיות', 'מנהל פרויקט ITS', 'GOVERNMENT',
 '2021-01-01', '2022-12-31', 'FINAL_ACCOUNT', '2024-12-31',
 18000000, 18000000, 0, 0, 'ILS',
 'PRIMARY', 100, NULL,
 'ESTABLISHMENT', 'VIDEO',
 '{"cameras": ["Axis P1448-LE", "Tattile ANPR"], "software": "ARH CAR-FIND", "backend": "Custom Integration"}'::jsonb,
 '{"lpr_cameras": 85, "overview_cameras": 85, "cabinets": 42}'::jsonb,
 ARRAY['Traffic Management Center', 'Police ANPR Database'],
 NULL,
 'כביש 6, כביש 1', 42,
 'b1000007-0000-0000-0000-000000000007',
 ARRAY['b1000004-0000-0000-0000-000000000004']::uuid[],
 false, NULL, NULL),

-- PROJECT 6: Subcontractor Role
('d0100006-0000-0000-0000-000000000006'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'פרויקט מצלמות - רכבת ישראל (קבלן משנה)', 'P-2023-SUB-001',
 'רכבת ישראל', 'מנהל פרויקט - אלקטרה', 'GOVERNMENT',
 '2023-06-01', '2024-12-31', 'DELIVERY', '2026-12-31',
 12000000, 10000000, 2000000, 24, 'ILS',
 'SUBCONTRACTOR', 35, ARRAY['אלקטרה בנייה'],
 'COMBINED', 'VIDEO',
 '{"cameras": ["Axis Q6075-E"], "vms": "Milestone XProtect", "integration": "Railway SCADA"}'::jsonb,
 '{"cameras": 180, "cabinets": 15}'::jsonb,
 ARRAY['Railway SCADA', 'PA System'],
 'SLA per main contractor',
 'קו מהיר לירושלים', 8,
 'b1000005-0000-0000-0000-000000000005',
 NULL,
 false, NULL, NULL),

-- PROJECT 7: Maintenance Only
('d0100007-0000-0000-0000-000000000007'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'אחזקת מערכות אבטחה - משרד החינוך', 'P-2024-M-001',
 'משרד החינוך', 'מנהל אגף לוגיסטיקה', 'GOVERNMENT',
 '2024-01-01', '2026-12-31', 'WARRANTY', NULL,
 9000000, 0, 9000000, 36, 'ILS',
 'PRIMARY', 100, NULL,
 'MAINTENANCE', 'VIDEO',
 '{"cameras": ["Mixed - Axis, Hikvision, Dahua"], "vms": "Mixed"}'::jsonb,
 '{"cameras": 3200, "sites": 180}'::jsonb,
 NULL,
 'SLA 99% uptime, 24h response, NBD parts',
 'ארצי', 180,
 'b1000005-0000-0000-0000-000000000005',
 ARRAY['b1000007-0000-0000-0000-000000000007']::uuid[],
 false, NULL, NULL),

-- PROJECT 8: Small Municipal
('d0100008-0000-0000-0000-000000000008'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'מצלמות אבטחה - עיריית רמת גן', 'P-2024-012',
 'עיריית רמת גן', 'קב"ט העירייה', 'MUNICIPAL',
 '2024-03-01', '2024-12-31', 'DELIVERY', '2025-12-31',
 8500000, 7500000, 1000000, 12, 'ILS',
 'PRIMARY', 100, NULL,
 'COMBINED', 'VIDEO',
 '{"cameras": ["Axis P3245-LVE", "Axis Q6125-LE"], "vms": "Milestone XProtect Professional+"}'::jsonb,
 '{"cameras": 120, "servers": 2}'::jsonb,
 ARRAY['Municipal 106 Center'],
 'SLA 99% uptime, 8h response',
 'רמת גן', 1,
 'b1000007-0000-0000-0000-000000000007',
 NULL,
 false, NULL, NULL),

-- PROJECT 9: Access Control Focused
('d0100009-0000-0000-0000-000000000009'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'מערכת בקרת גישה - בנק לאומי', 'P-2023-AC-005',
 'בנק לאומי לישראל', 'CISO Office', 'PRIVATE',
 '2023-04-01', '2024-08-31', 'FINAL_ACCOUNT', '2026-08-31',
 22000000, 20000000, 2000000, 24, 'ILS',
 'PRIMARY', 100, NULL,
 'COMBINED', 'ACCESS_CONTROL',
 '{"access_control": "Lenel OnGuard 8.0", "biometric": "Suprema BioStation", "vault_control": "Custom"}'::jsonb,
 '{"access_readers": 890, "biometric_readers": 120, "man_traps": 45, "vault_doors": 180}'::jsonb,
 ARRAY['Core Banking System', 'HR System', 'Visitor Management'],
 'SLA 99.9% uptime, 1h response for critical',
 'ארצי - 180 סניפים', 180,
 'b1000003-0000-0000-0000-000000000003',
 ARRAY['b1000004-0000-0000-0000-000000000004', 'b1000006-0000-0000-0000-000000000006']::uuid[],
 false, NULL, NULL),

-- PROJECT 10: Tangent Project (sister company)
('d0100010-0000-0000-0000-000000000010'::uuid, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 'מערכת גילוי אש - מפעל Intel', 'P-2023-T-001',
 'Intel Israel', 'Facility Manager', 'PRIVATE',
 '2023-01-01', '2023-09-30', 'DELIVERY', '2025-09-30',
 5500000, 5500000, 0, 0, 'ILS',
 'PRIMARY', 100, NULL,
 'ESTABLISHMENT', 'INFRASTRUCTURE',
 '{"fire_detection": "Honeywell Notifier", "suppression": "FM-200"}'::jsonb,
 '{"detectors": 2400, "panels": 8, "suppression_zones": 24}'::jsonb,
 ARRAY['BMS', 'HVAC Control'],
 NULL,
 'קריית גת', 1,
 'b1000007-0000-0000-0000-000000000007',
 NULL,
 true, 'SISTER_COMPANY', 'בוצע דרך חברת האם - דקל הנדסה בע"מ');

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Uncomment to verify:
-- SELECT 'Organizations' as table_name, count(*) as count FROM organizations WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- UNION ALL SELECT 'Users', count(*) FROM users WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- UNION ALL SELECT 'Financials', count(*) FROM company_financials WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- UNION ALL SELECT 'Certifications', count(*) FROM company_certifications WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- UNION ALL SELECT 'Personnel', count(*) FROM company_personnel WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- UNION ALL SELECT 'Projects', count(*) FROM company_projects WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
