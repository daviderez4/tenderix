-- ==============================================
-- Tenderix - Fictitious Company Profiles for Testing
-- Creates 6 companies with different gap types
-- ==============================================

-- First, clean up any existing test data
DELETE FROM gate_condition_matches WHERE gate_condition_id IN (SELECT id FROM gate_conditions WHERE tender_id IN (SELECT id FROM tenders WHERE name LIKE '%[TEST]%'));
DELETE FROM company_projects WHERE org_id IN (SELECT id FROM organizations WHERE name LIKE '%[TEST]%');
DELETE FROM company_certifications WHERE org_id IN (SELECT id FROM organizations WHERE name LIKE '%[TEST]%');
DELETE FROM company_personnel WHERE org_id IN (SELECT id FROM organizations WHERE name LIKE '%[TEST]%');
DELETE FROM company_financials WHERE org_id IN (SELECT id FROM organizations WHERE name LIKE '%[TEST]%');
DELETE FROM group_companies WHERE parent_org_id IN (SELECT id FROM organizations WHERE name LIKE '%[TEST]%');
DELETE FROM organizations WHERE name LIKE '%[TEST]%';

-- ==============================================
-- COMPANY 1: "PERFECT" - Meets all typical requirements
-- חברה מושלמת - עומדת בכל תנאי סף
-- ==============================================

INSERT INTO organizations (id, name, legal_name, tax_id, founded_year, employee_count, description, industry, settings)
VALUES (
    'aaaaaaaa-1111-1111-1111-111111111111',
    '[TEST] אלפא מערכות בע"מ',
    'אלפא מערכות אבטחה וטכנולוגיות בע"מ',
    '514123456',
    2005,
    120,
    'חברת מערכות אבטחה ותקשורת מובילה עם 20 שנות ניסיון',
    'SECURITY_SYSTEMS',
    '{"gap_type": "NONE", "test_profile": true}'::jsonb
);

-- Projects for Company 1 (5 large projects)
INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_provided)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', 'מערכת אבטחה נמל אשדוד', 'חברת נמלי ישראל', 'GOVERNMENT', '2020-01-15', '2022-06-30', 'FINAL_ACCOUNT', 85000000, 60000000, 25000000, 36, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Axis P3245", "Axis Q6135"], "vms": "Milestone XProtect", "access_control": "Lenel"}', '{"cameras": 450, "access_points": 120, "servers": 8}', 'SLA 99.5% uptime, 2h response'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'מערכת CCTV רכבת ישראל', 'רכבת ישראל בע"מ', 'GOVERNMENT', '2019-03-01', '2021-12-31', 'DELIVERY', 72000000, 72000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Hikvision DS-2CD", "Axis M3046"], "vms": "Genetec Security Center"}', '{"cameras": 850, "nvr": 45}', 'Installation warranty 24 months'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'שדרוג מערכת אבטחה בנק הפועלים', 'בנק הפועלים בע"מ', 'PRIVATE', '2021-06-01', '2023-08-15', 'WARRANTY', 55000000, 40000000, 15000000, 60, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Bosch FLEXIDOME"], "analytics": "BriefCam", "access_control": "HID Global"}', '{"cameras": 320, "analytics_channels": 320, "branches": 85}', 'SLA 99.9% for critical systems'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'מערכת LPR כבישי אגרה', 'כביש חוצה ישראל', 'PRIVATE', '2018-09-01', '2020-03-31', 'FINAL_ACCOUNT', 48000000, 48000000, 0, 0, 'PRIMARY', 85, 'ESTABLISHMENT', '{"cameras": ["Tattile Vega"], "lpr_software": "ARH", "backend": "Custom Oracle"}', '{"lpr_cameras": 180, "lanes": 90}', 'Accuracy 99.2% required'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'אחזקת מערכות אבטחה עיריית ת"א', 'עיריית תל אביב-יפו', 'MUNICIPAL', '2022-01-01', '2024-12-31', 'DELIVERY', 36000000, 6000000, 30000000, 36, 'PRIMARY', 100, 'MAINTENANCE', '{"cameras": ["Mixed fleet"], "vms": "Milestone"}', '{"cameras": 2500, "sites": 150}', 'SLA 4h response city-wide');

-- Certifications for Company 1 (all required certs)
INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', 'ISO', 'ISO 9001:2015', 'מכון התקנים הישראלי', '2023-01-01', '2026-01-01', '{"scope": "Design and installation of security systems"}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'ISO', 'ISO 27001:2013', 'מכון התקנים הישראלי', '2023-03-15', '2026-03-15', '{"scope": "Information security management"}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'ISO', 'ISO 45001:2018', 'מכון התקנים הישראלי', '2022-06-01', '2025-06-01', '{"scope": "Occupational health and safety"}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'LICENSE', 'רישיון קבלן חשמל ראשי', 'משרד הכלכלה', '2020-01-01', '2027-01-01', '{"level": "ראשי", "voltage": "עד 1000V"}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'CONTRACTOR_REG', 'רישום קבלנים ג-5', 'משרד הבינוי והשיכון', '2021-04-01', '2026-04-01', '{"category": "100 - עבודות חשמל ותקשורת", "level": "ג-5"}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'SECURITY_CLEARANCE', 'סיווג בטחוני', 'משרד הביטחון', '2022-01-01', '2025-01-01', '{"level": "סודי"}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'TAX', 'אישור ניהול ספרים', 'רשות המסים', '2024-01-01', '2024-12-31', '{}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'TAX', 'אישור ניכוי מס במקור', 'רשות המסים', '2024-01-01', '2024-12-31', '{}');

-- Personnel for Company 1 (experienced team)
INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, certifications)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', 'אבי כהן', 'מנכ"ל', 'MBA אוניברסיטת תל אביב, B.Sc הנדסת חשמל', 28, ARRAY['PMP', 'CISSP']),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'רונית לוי', 'סמנכ"ל תפעול', 'B.Sc הנדסת תעשייה וניהול', 22, ARRAY['Six Sigma Black Belt']),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'משה דוד', 'מנהל פרויקטים בכיר', 'B.Sc הנדסה אזרחית', 18, ARRAY['PMP', 'PRINCE2']),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'שרה ישראלי', 'מהנדסת מערכות', 'M.Sc מדעי המחשב', 15, ARRAY['CCNA', 'Milestone Certified']);

-- Financials for Company 1 (strong financials)
INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count, equity)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', 2023, 150000000, 12000000, 120, 45000000),
    ('aaaaaaaa-1111-1111-1111-111111111111', 2022, 135000000, 10500000, 110, 38000000),
    ('aaaaaaaa-1111-1111-1111-111111111111', 2021, 120000000, 9000000, 95, 32000000);

-- ==============================================
-- COMPANY 2: "EXPERIENCE GAP" - Small projects, not enough experience
-- חברה עם חוסר ניסיון - פרויקטים קטנים
-- ==============================================

INSERT INTO organizations (id, name, legal_name, tax_id, founded_year, employee_count, description, industry, settings)
VALUES (
    'bbbbbbbb-2222-2222-2222-222222222222',
    '[TEST] בטא טכנולוגיות בע"מ',
    'בטא טכנולוגיות ומערכות בע"מ',
    '514234567',
    2015,
    35,
    'חברת מערכות אבטחה בצמיחה - מתמחה בפרויקטים קטנים-בינוניים',
    'SECURITY_SYSTEMS',
    '{"gap_type": "EXPERIENCE", "test_profile": true}'::jsonb
);

-- Projects for Company 2 (small projects - GAP!)
INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_provided)
VALUES
    ('bbbbbbbb-2222-2222-2222-222222222222', 'מערכת אבטחה מפעל תעשייתי', 'אלקטרה מוצרי צריכה', 'PRIVATE', '2022-03-01', '2022-09-30', 'DELIVERY', 12000000, 10000000, 2000000, 12, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Hikvision"], "vms": "Hikvision NVR"}', '{"cameras": 85}', 'Basic SLA'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'מצלמות בית ספר תיכון', 'עיריית רמת גן', 'MUNICIPAL', '2021-08-01', '2021-12-31', 'DELIVERY', 850000, 850000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Dahua"]}', '{"cameras": 45}', 'None'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'אחזקת מערכות בניין משרדים', 'קניון איילון', 'PRIVATE', '2023-01-01', '2024-12-31', 'DELIVERY', 18000000, 3000000, 15000000, 24, 'PRIMARY', 100, 'MAINTENANCE', '{"cameras": ["Mixed"]}', '{"cameras": 120}', 'SLA 8h response'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'התקנת בקרת כניסה למשרדים', 'חברת הייטק', 'PRIVATE', '2023-06-01', '2023-08-31', 'DELIVERY', 2500000, 2500000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"access_control": ["HID"]}', '{"readers": 35}', 'Warranty 12 months');

-- Certifications for Company 2 (has ISO 9001 only - partial GAP)
INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('bbbbbbbb-2222-2222-2222-222222222222', 'ISO', 'ISO 9001:2015', 'מכון התקנים הישראלי', '2022-06-01', '2025-06-01', '{}'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'LICENSE', 'רישיון קבלן חשמל', 'משרד הכלכלה', '2020-01-01', '2027-01-01', '{"level": "מוגבל"}'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'TAX', 'אישור ניהול ספרים', 'רשות המסים', '2024-01-01', '2024-12-31', '{}');

-- Personnel for Company 2 (less experienced team)
INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, certifications)
VALUES
    ('bbbbbbbb-2222-2222-2222-222222222222', 'יוסי מזרחי', 'מנכ"ל', 'B.A מנהל עסקים', 12, ARRAY[]),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'דנה כהן', 'מנהלת פרויקטים', 'B.Sc הנדסה', 7, ARRAY['PMP']);

-- Financials for Company 2 (moderate)
INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count, equity)
VALUES
    ('bbbbbbbb-2222-2222-2222-222222222222', 2023, 38000000, 2800000, 35, 8000000),
    ('bbbbbbbb-2222-2222-2222-222222222222', 2022, 32000000, 2200000, 30, 6500000);

-- ==============================================
-- COMPANY 3: "CERTIFICATION GAP" - Missing ISO 27001, no contractor license
-- חברה חסרת הסמכות - חסר ISO 27001 ורישיון קבלן
-- ==============================================

INSERT INTO organizations (id, name, legal_name, tax_id, founded_year, employee_count, description, industry, settings)
VALUES (
    'cccccccc-3333-3333-3333-333333333333',
    '[TEST] גמא פתרונות אבטחה בע"מ',
    'גמא פתרונות אבטחה בע"מ',
    '514345678',
    2010,
    65,
    'חברה עם ניסיון מוכח אך חסרה הסמכות מסוימות',
    'SECURITY_SYSTEMS',
    '{"gap_type": "CERTIFICATION", "test_profile": true}'::jsonb
);

-- Projects for Company 3 (good projects - no experience gap)
INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_provided)
VALUES
    ('cccccccc-3333-3333-3333-333333333333', 'מערכת אבטחה קמפוס אוניברסיטה', 'אוניברסיטת בר אילן', 'GOVERNMENT', '2020-06-01', '2022-03-31', 'FINAL_ACCOUNT', 52000000, 45000000, 7000000, 24, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Axis"], "vms": "Milestone"}', '{"cameras": 380}', 'SLA 99%'),
    ('cccccccc-3333-3333-3333-333333333333', 'מערכת CCTV מרכז קניות', 'Big Fashion', 'PRIVATE', '2019-03-01', '2020-01-31', 'DELIVERY', 28000000, 28000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Bosch"]}', '{"cameras": 250}', 'Warranty'),
    ('cccccccc-3333-3333-3333-333333333333', 'שדרוג מערכת בית חולים', 'בית חולים שיבא', 'GOVERNMENT', '2021-01-01', '2022-06-30', 'DELIVERY', 48000000, 38000000, 10000000, 36, 'PRIMARY', 80, 'COMBINED', '{"cameras": ["Axis"], "access_control": ["Lenel"]}', '{"cameras": 420, "readers": 200}', 'SLA 99.5%'),
    ('cccccccc-3333-3333-3333-333333333333', 'מערכת אבטחה מפעל', 'תע"ש', 'DEFENSE', '2018-09-01', '2019-12-31', 'FINAL_ACCOUNT', 35000000, 35000000, 0, 0, 'SUBCONTRACTOR', 60, 'ESTABLISHMENT', '{"cameras": ["Pelco"]}', '{"cameras": 180}', 'Defense grade');

-- Certifications for Company 3 (MISSING ISO 27001 and contractor license!)
INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('cccccccc-3333-3333-3333-333333333333', 'ISO', 'ISO 9001:2015', 'מכון התקנים הישראלי', '2021-01-01', '2024-01-01', '{}'),
    -- NO ISO 27001!
    -- NO CONTRACTOR REGISTRATION!
    ('cccccccc-3333-3333-3333-333333333333', 'LICENSE', 'רישיון קבלן חשמל', 'משרד הכלכלה', '2019-01-01', '2026-01-01', '{}'),
    ('cccccccc-3333-3333-3333-333333333333', 'TAX', 'אישור ניהול ספרים', 'רשות המסים', '2024-01-01', '2024-12-31', '{}');

-- Personnel for Company 3
INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, certifications)
VALUES
    ('cccccccc-3333-3333-3333-333333333333', 'עמי שלום', 'מנכ"ל', 'M.Sc הנדסה', 20, ARRAY['PMP']),
    ('cccccccc-3333-3333-3333-333333333333', 'נורית אברהם', 'סמנכ"ל הנדסה', 'B.Sc הנדסת חשמל', 16, ARRAY['CCNA']);

-- Financials for Company 3 (good)
INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count, equity)
VALUES
    ('cccccccc-3333-3333-3333-333333333333', 2023, 82000000, 6500000, 65, 18000000),
    ('cccccccc-3333-3333-3333-333333333333', 2022, 75000000, 5800000, 58, 15000000);

-- ==============================================
-- COMPANY 4: "YOUNG COMPANY" - Low seniority, few projects
-- חברה צעירה - ותק נמוך
-- ==============================================

INSERT INTO organizations (id, name, legal_name, tax_id, founded_year, employee_count, description, industry, settings)
VALUES (
    'dddddddd-4444-4444-4444-444444444444',
    '[TEST] דלתא חדשנות בע"מ',
    'דלתא חדשנות ומערכות בע"מ',
    '514456789',
    2021,
    18,
    'סטארטאפ מבטיח בתחום מערכות אבטחה חכמות - חברה בת 3 שנים',
    'SECURITY_SYSTEMS',
    '{"gap_type": "SENIORITY", "test_profile": true}'::jsonb
);

-- Projects for Company 4 (few and small - company too young)
INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_provided)
VALUES
    ('dddddddd-4444-4444-4444-444444444444', 'מערכת AI לזיהוי פנים', 'סטארטאפ טכנולוגי', 'PRIVATE', '2022-06-01', '2022-12-31', 'DELIVERY', 5500000, 5500000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Axis"], "analytics": "Custom AI"}', '{"cameras": 25}', 'POC'),
    ('dddddddd-4444-4444-4444-444444444444', 'התקנת מערכת במשרדים', 'חברת הייטק קטנה', 'PRIVATE', '2023-03-01', '2023-05-31', 'DELIVERY', 1800000, 1800000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Hikvision"]}', '{"cameras": 35}', 'Basic');

-- Certifications for Company 4 (basic only)
INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('dddddddd-4444-4444-4444-444444444444', 'ISO', 'ISO 9001:2015', 'מכון התקנים הישראלי', '2023-01-01', '2026-01-01', '{}'),
    ('dddddddd-4444-4444-4444-444444444444', 'TAX', 'אישור ניהול ספרים', 'רשות המסים', '2024-01-01', '2024-12-31', '{}');

-- Personnel for Company 4 (young team)
INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, certifications)
VALUES
    ('dddddddd-4444-4444-4444-444444444444', 'רון טל', 'מנכ"ל ומייסד', 'M.Sc מדעי המחשב', 8, ARRAY['AWS Certified']),
    ('dddddddd-4444-4444-4444-444444444444', 'מיכל גולן', 'CTO', 'B.Sc הנדסת תוכנה', 6, ARRAY['CCNA']);

-- Financials for Company 4 (low but growing)
INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count, equity)
VALUES
    ('dddddddd-4444-4444-4444-444444444444', 2023, 18000000, 1200000, 18, 4500000),
    ('dddddddd-4444-4444-4444-444444444444', 2022, 8000000, 400000, 12, 3000000);

-- ==============================================
-- COMPANY 5: "FINANCIAL GAP" - Low revenue, can't provide bank guarantee
-- חברה חסרת יכולת כספית - מחזור נמוך
-- ==============================================

INSERT INTO organizations (id, name, legal_name, tax_id, founded_year, employee_count, description, industry, settings)
VALUES (
    'eeeeeeee-5555-5555-5555-555555555555',
    '[TEST] אפסילון שירותי אבטחה בע"מ',
    'אפסילון שירותי אבטחה ומערכות בע"מ',
    '514567890',
    2012,
    25,
    'חברה מנוסה עם יכולת כספית מוגבלת',
    'SECURITY_SYSTEMS',
    '{"gap_type": "FINANCIAL", "test_profile": true}'::jsonb
);

-- Projects for Company 5 (medium projects but company has low revenue)
INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_provided)
VALUES
    ('eeeeeeee-5555-5555-5555-555555555555', 'מערכת אבטחה מועצה אזורית', 'מועצה אזורית גליל', 'MUNICIPAL', '2020-01-01', '2021-06-30', 'FINAL_ACCOUNT', 22000000, 18000000, 4000000, 24, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Axis"]}', '{"cameras": 180}', 'SLA municipal'),
    ('eeeeeeee-5555-5555-5555-555555555555', 'התקנת מצלמות תנועה', 'עיריית נתניה', 'MUNICIPAL', '2019-06-01', '2020-03-31', 'DELIVERY', 15000000, 15000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Tattile"]}', '{"lpr_cameras": 45}', 'Accuracy 98%'),
    ('eeeeeeee-5555-5555-5555-555555555555', 'אחזקת מערכות מועצה', 'מועצה מקומית', 'MUNICIPAL', '2022-01-01', '2024-12-31', 'DELIVERY', 8000000, 0, 8000000, 36, 'PRIMARY', 100, 'MAINTENANCE', '{}', '{"sites": 25}', 'SLA 24h');

-- Certifications for Company 5 (has most certs)
INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('eeeeeeee-5555-5555-5555-555555555555', 'ISO', 'ISO 9001:2015', 'מכון התקנים הישראלי', '2022-01-01', '2025-01-01', '{}'),
    ('eeeeeeee-5555-5555-5555-555555555555', 'ISO', 'ISO 27001:2013', 'מכון התקנים הישראלי', '2022-06-01', '2025-06-01', '{}'),
    ('eeeeeeee-5555-5555-5555-555555555555', 'CONTRACTOR_REG', 'רישום קבלנים ג-3', 'משרד הבינוי והשיכון', '2021-01-01', '2026-01-01', '{"level": "ג-3"}'),
    ('eeeeeeee-5555-5555-5555-555555555555', 'TAX', 'אישור ניהול ספרים', 'רשות המסים', '2024-01-01', '2024-12-31', '{}');

-- Personnel for Company 5
INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, certifications)
VALUES
    ('eeeeeeee-5555-5555-5555-555555555555', 'גדעון פרץ', 'מנכ"ל', 'B.A כלכלה', 18, ARRAY[]),
    ('eeeeeeee-5555-5555-5555-555555555555', 'אורלי שמש', 'מנהלת פרויקטים', 'הנדסאי', 14, ARRAY[]);

-- Financials for Company 5 (LOW REVENUE - GAP!)
INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count, equity)
VALUES
    ('eeeeeeee-5555-5555-5555-555555555555', 2023, 15000000, 800000, 25, 3500000),
    ('eeeeeeee-5555-5555-5555-555555555555', 2022, 14000000, 650000, 22, 3000000),
    ('eeeeeeee-5555-5555-5555-555555555555', 2021, 12000000, 500000, 20, 2500000);

-- ==============================================
-- COMPANY 6: "GROUP COMPANY" - Can leverage parent company
-- חברה עם חברת אם - יכולה להישען על הקבוצה
-- ==============================================

INSERT INTO organizations (id, name, legal_name, tax_id, founded_year, employee_count, description, industry, settings)
VALUES (
    'ffffffff-6666-6666-6666-666666666666',
    '[TEST] זטא מערכות בע"מ',
    'זטא מערכות - חברת בת של קבוצת אומגה',
    '514678901',
    2018,
    28,
    'חברת בת של קבוצת אומגה הגדולה - יכולה להסתמך על ניסיון הקבוצה',
    'SECURITY_SYSTEMS',
    '{"gap_type": "PARTIAL_WITH_GROUP", "test_profile": true}'::jsonb
);

-- Projects for Company 6 (small projects as subsidiary)
INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_provided)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 'מערכת אבטחה קטנה', 'לקוח פרטי', 'PRIVATE', '2022-01-01', '2022-06-30', 'DELIVERY', 8000000, 8000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Axis"]}', '{"cameras": 60}', 'Standard'),
    ('ffffffff-6666-6666-6666-666666666666', 'אחזקה שוטפת', 'לקוח קבוע', 'PRIVATE', '2023-01-01', '2025-12-31', 'DELIVERY', 12000000, 0, 12000000, 36, 'PRIMARY', 100, 'MAINTENANCE', '{}', '{"sites": 15}', 'SLA 12h');

-- TANGENT PROJECTS - Projects the company is familiar with through the group
INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_provided, is_tangent, tangent_description)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 'פרויקט נמל חיפה (קבוצת אומגה)', 'נמל חיפה', 'GOVERNMENT', '2019-01-01', '2021-12-31', 'FINAL_ACCOUNT', 95000000, 80000000, 15000000, 36, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Axis", "Bosch"], "vms": "Milestone"}', '{"cameras": 650}', 'SLA 99.5%', TRUE, 'פרויקט של חברת האם - קבוצת אומגה. צוות זטא השתתף בשלב ההטמעה'),
    ('ffffffff-6666-6666-6666-666666666666', 'פרויקט משרד ראש הממשלה (קבוצת אומגה)', 'משרד ראש הממשלה', 'GOVERNMENT', '2020-06-01', '2022-03-31', 'FINAL_ACCOUNT', 68000000, 68000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["High-security"]}', '{"cameras": 280}', 'Defense grade', TRUE, 'פרויקט של חברת האם. סיווג ביטחוני גבוה');

-- Group Companies relationship
INSERT INTO group_companies (parent_org_id, child_org_id, relationship_type, experience_sharing_allowed, experience_sharing_scope)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 'ffffffff-6666-6666-6666-666666666666', 'PARENT', TRUE, ARRAY['GATE_CONDITIONS', 'SCORING']);

-- Certifications for Company 6
INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 'ISO', 'ISO 9001:2015', 'מכון התקנים הישראלי', '2023-01-01', '2026-01-01', '{}'),
    ('ffffffff-6666-6666-6666-666666666666', 'TAX', 'אישור ניהול ספרים', 'רשות המסים', '2024-01-01', '2024-12-31', '{}');

-- Personnel for Company 6
INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, certifications)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 'תומר אילן', 'מנכ"ל', 'MBA', 14, ARRAY['PMP']),
    ('ffffffff-6666-6666-6666-666666666666', 'ליאת כהן', 'מנהלת תפעול', 'B.A', 10, ARRAY[]);

-- Financials for Company 6
INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count, equity)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 2023, 25000000, 1800000, 28, 6000000),
    ('ffffffff-6666-6666-6666-666666666666', 2022, 20000000, 1400000, 24, 5000000);

-- ==============================================
-- SUMMARY VIEW - Easy access to test profiles
-- ==============================================

CREATE OR REPLACE VIEW test_company_profiles AS
SELECT
    o.id,
    o.name,
    o.settings->>'gap_type' as gap_type,
    o.founded_year,
    o.employee_count,
    (SELECT COUNT(*) FROM company_projects cp WHERE cp.org_id = o.id AND NOT COALESCE(cp.is_tangent, FALSE)) as direct_projects,
    (SELECT COUNT(*) FROM company_projects cp WHERE cp.org_id = o.id AND COALESCE(cp.is_tangent, FALSE)) as tangent_projects,
    (SELECT COALESCE(SUM(total_value), 0) FROM company_projects cp WHERE cp.org_id = o.id AND NOT COALESCE(cp.is_tangent, FALSE)) as total_project_value,
    (SELECT COUNT(*) FROM company_certifications cc WHERE cc.org_id = o.id) as certifications,
    (SELECT annual_revenue FROM company_financials cf WHERE cf.org_id = o.id ORDER BY fiscal_year DESC LIMIT 1) as latest_revenue,
    CASE
        WHEN o.settings->>'gap_type' = 'NONE' THEN 'Should pass all typical gates'
        WHEN o.settings->>'gap_type' = 'EXPERIENCE' THEN 'Missing: Large projects (>50M)'
        WHEN o.settings->>'gap_type' = 'CERTIFICATION' THEN 'Missing: ISO 27001, Contractor license'
        WHEN o.settings->>'gap_type' = 'SENIORITY' THEN 'Missing: Company age, track record'
        WHEN o.settings->>'gap_type' = 'FINANCIAL' THEN 'Missing: Revenue threshold, bank guarantee capacity'
        WHEN o.settings->>'gap_type' = 'PARTIAL_WITH_GROUP' THEN 'Can leverage parent company for gaps'
    END as expected_gaps
FROM organizations o
WHERE o.settings->>'test_profile' = 'true'
ORDER BY o.name;

-- ==============================================
-- SAMPLE GATE CONDITIONS FOR TESTING
-- ==============================================

-- Create a sample tender for testing
INSERT INTO tenders (id, org_id, name, tender_number, issuing_body, category, submission_deadline, status)
VALUES (
    'tttttttt-test-test-test-testtest0001',
    'aaaaaaaa-1111-1111-1111-111111111111',
    '[TEST] מכרז לדוגמה - מערכות אבטחה',
    'TEST-2024-001',
    'עיריית תל אביב-יפו',
    'SECURITY_SYSTEMS',
    '2024-06-30',
    'ACTIVE'
) ON CONFLICT (id) DO NOTHING;

-- Sample gate conditions that will test different gaps
INSERT INTO gate_conditions (id, tender_id, condition_text, condition_type, requirement_type, required_amount, required_count, required_years, bearer_entity, legal_classification, status)
VALUES
    -- Experience requirement (tests EXPERIENCE gap)
    ('gggggggg-gate-0001-0001-000000000001', 'tttttttt-test-test-test-testtest0001',
     'המציע יציג ניסיון בביצוע לפחות 3 פרויקטים בהיקף של 50 מיליון ש"ח כל אחד, ב-5 השנים האחרונות, בתחום מערכות אבטחה',
     'GATE', 'EXPERIENCE', 50000000, 3, 5, 'bidder_only', 'strict', 'PENDING'),

    -- Financial requirement (tests FINANCIAL gap)
    ('gggggggg-gate-0002-0002-000000000002', 'tttttttt-test-test-test-testtest0001',
     'מחזור הכנסות שנתי של המציע יעמוד על לפחות 100 מיליון ש"ח בכל אחת מ-3 השנים האחרונות',
     'GATE', 'FINANCIAL', 100000000, NULL, 3, 'bidder_only', 'strict', 'PENDING'),

    -- Certification requirement (tests CERTIFICATION gap)
    ('gggggggg-gate-0003-0003-000000000003', 'tttttttt-test-test-test-testtest0001',
     'המציע יציג תעודת ISO 27001 בתוקף',
     'GATE', 'CERTIFICATION', NULL, NULL, NULL, 'bidder_only', 'strict', 'PENDING'),

    -- Contractor license (tests CERTIFICATION gap)
    ('gggggggg-gate-0004-0004-000000000004', 'tttttttt-test-test-test-testtest0001',
     'המציע רשום בפנקס הקבלנים בסיווג ג-5 לפחות בענף 100 (חשמל ותקשורת)',
     'GATE', 'CERTIFICATION', NULL, NULL, NULL, 'bidder_only', 'strict', 'PENDING'),

    -- Seniority requirement (tests SENIORITY gap)
    ('gggggggg-gate-0005-0005-000000000005', 'tttttttt-test-test-test-testtest0001',
     'החברה פועלת בתחום לפחות 7 שנים',
     'GATE', 'OTHER', NULL, NULL, 7, 'bidder_only', 'strict', 'PENDING'),

    -- Personnel requirement
    ('gggggggg-gate-0006-0006-000000000006', 'tttttttt-test-test-test-testtest0001',
     'המציע יציג מנהל פרויקט עם ניסיון של לפחות 10 שנים בניהול פרויקטי אבטחה',
     'GATE', 'PERSONNEL', NULL, NULL, 10, 'bidder_only', 'strict', 'PENDING'),

    -- Subcontractor allowed requirement (tests group company)
    ('gggggggg-gate-0007-0007-000000000007', 'tttttttt-test-test-test-testtest0001',
     'המציע רשאי להסתמך על ניסיון של חברת אם או חברה אחות לצורך עמידה בדרישת הניסיון, בכפוף להצגת התחייבות',
     'GATE', 'EXPERIENCE', 50000000, 2, 5, 'subcontractor_allowed', 'open', 'PENDING'),

    -- Scoring criteria (advantage, not gate)
    ('gggggggg-gate-0008-0008-000000000008', 'tttttttt-test-test-test-testtest0001',
     'יתרון למציע עם ניסיון בפרויקטים ממשלתיים ביטחוניים',
     'ADVANTAGE', 'EXPERIENCE', NULL, NULL, NULL, 'bidder_only', 'open', 'PENDING')
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- VERIFICATION QUERY
-- ==============================================

SELECT 'Test profiles created successfully!' as status;
SELECT * FROM test_company_profiles;
