-- ============================================
-- QA TEST SCENARIOS
-- תרחישי בדיקה לאיכות מנוע ההתאמה הסמנטית
-- ============================================
-- These scenarios test the system's ability to:
-- 1. Use tender definitions for matching (not keywords)
-- 2. Detect adversarial/misleading profiles
-- 3. Provide correct explanations
-- 4. Handle edge cases
-- ============================================

-- ============================================
-- SCENARIO 1: Transportation Tender
-- מכרז תחבורתי - הבדלה בין תחבורה ציבורית לבינוי
-- ============================================

-- Create test organization for passing profile
INSERT INTO organizations (id, name, company_number, founding_year)
VALUES ('aaaaaaaa-0001-0000-0000-000000000001', 'חברת בדיקה - עוברת תחבורה', 'TEST-PASS-TRANSPORT', 2010)
ON CONFLICT (company_number) DO NOTHING;

-- Create test organization for adversarial profile
INSERT INTO organizations (id, name, company_number, founding_year)
VALUES ('aaaaaaaa-0002-0000-0000-000000000001', 'חברת בדיקה - מטעה תחבורה', 'TEST-ADV-TRANSPORT', 2008)
ON CONFLICT (company_number) DO NOTHING;

-- Create test tender
INSERT INTO tenders (id, org_id, tender_name, tender_number, issuing_body, category, status, current_step)
VALUES (
  'bbbbbbbb-0001-0000-0000-000000000001',
  'aaaaaaaa-0001-0000-0000-000000000001',
  'מכרז למערכות תחבורה ציבורית - בדיקת איכות',
  'TEST-2026-TRANSPORT',
  'משרד התחבורה',
  'TRANSPORTATION',
  'ACTIVE',
  'GATES'
)
ON CONFLICT DO NOTHING;

-- Create tender definitions
INSERT INTO tender_definitions (id, tender_id, term, definition, interpretation_type, definition_category, includes_examples, excludes_examples, structured_constraints, source_page, source_section, source_quote)
VALUES
  (
    'cccccccc-0001-0000-0000-000000000001',
    'bbbbbbbb-0001-0000-0000-000000000001',
    'פרויקט תחבורתי',
    'פרויקט בתחום תחבורה ציבורית (רכבת, אוטובוס, מטרו, רכבת קלה) בהיקף של 10 מיליון ₪ לפחות, שבוצע ב-5 השנים האחרונות ממועד הגשת ההצעה',
    'RESTRICTIVE',
    'PROJECT_TYPE',
    ARRAY['רכבת', 'אוטובוס', 'מטרו', 'רכבת קלה', 'מערכות כרטוס', 'בקרת תנועה רכבתית'],
    ARRAY['כביש', 'גשר', 'מנהרה', 'כביש גישה', 'מחלף', 'תאורת כבישים', 'בינוי מסוף'],
    '{"min_value": 10000000, "currency": "ILS", "time_range_years": 5, "domain": "תחבורה ציבורית"}'::jsonb,
    3, '2.1', 'פרויקט תחבורתי - פרויקט בתחום תחבורה ציבורית (רכבת, אוטובוס, מטרו, רכבת קלה) בהיקף של 10 מיליון ₪ לפחות'
  ),
  (
    'cccccccc-0002-0000-0000-000000000001',
    'bbbbbbbb-0001-0000-0000-000000000001',
    'המציע',
    'התאגיד המגיש את ההצעה, ללא אפשרות להסתמך על קבלן משנה לצורך תנאי הסף',
    'RESTRICTIVE',
    'ENTITY',
    ARRAY['החברה המציעה', 'התאגיד'],
    ARRAY['קבלן משנה', 'שותף', 'חברת אם', 'חברת בת'],
    '{"entity_scope": "BIDDER_ONLY"}'::jsonb,
    2, '1.3', 'המציע - התאגיד המגיש את ההצעה'
  )
ON CONFLICT (tender_id, term) DO NOTHING;

-- Create gate conditions
INSERT INTO gate_conditions (id, tender_id, condition_number, condition_text, condition_type, is_mandatory, requirement_type, required_count, required_amount, required_years, linked_definition_ids, resolved_requirement, source_page, source_section, source_quote)
VALUES
  (
    'dddddddd-0001-0000-0000-000000000001',
    'bbbbbbbb-0001-0000-0000-000000000001',
    '1',
    'על המציע להציג 3 פרויקטים תחבורתיים שביצע ב-5 השנים האחרונות',
    'GATE',
    true,
    'EXPERIENCE',
    3,
    10000000,
    5,
    ARRAY['cccccccc-0001-0000-0000-000000000001'::uuid],
    '{"domain": "תחבורה ציבורית", "domain_includes": ["רכבת","אוטובוס","מטרו","רכבת קלה"], "domain_excludes": ["כביש","גשר","מנהרה","בינוי"], "min_value": 10000000, "min_count": 3, "time_range_years": 5}'::jsonb,
    5, '3.1', 'על המציע להציג 3 פרויקטים תחבורתיים כהגדרתם בסעיף ההגדרות'
  ),
  (
    'dddddddd-0002-0000-0000-000000000001',
    'bbbbbbbb-0001-0000-0000-000000000001',
    '2',
    'מחזור כספי שנתי ממוצע של 50 מיליון ₪ לפחות ב-3 השנים האחרונות',
    'GATE',
    true,
    'FINANCIAL',
    null,
    50000000,
    3,
    null,
    '{"min_value": 50000000, "time_range_years": 3, "calculation": "average"}'::jsonb,
    5, '3.2', 'מחזור כספי שנתי ממוצע של 50 מיליון ₪ לפחות ב-3 השנים האחרונות'
  ),
  (
    'dddddddd-0003-0000-0000-000000000001',
    'bbbbbbbb-0001-0000-0000-000000000001',
    '3',
    'אישור ISO 9001 תקף',
    'GATE',
    true,
    'CERTIFICATION',
    null,
    null,
    null,
    null,
    '{"cert_type": "ISO", "cert_name": "ISO 9001"}'::jsonb,
    5, '3.3', 'על המציע להציג אישור ISO 9001 בתוקף'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- PASSING PROFILE: Projects that match exactly
-- ============================================

-- Project 1: Clearly transportation (signal control)
INSERT INTO company_projects (id, org_id, project_name, client_name, client_type, start_date, end_date, total_value, project_type, category, role_type, role_percentage)
VALUES (
  'eeeeeeee-0001-0000-0000-000000000001',
  'aaaaaaaa-0001-0000-0000-000000000001',
  'מערכת בקרת תנועה רכבתית - קו ירושלים',
  'רכבת ישראל',
  'GOVERNMENT',
  '2022-01-15',
  '2024-06-30',
  15000000,
  'ESTABLISHMENT',
  'TRANSPORTATION',
  'PRIMARY',
  100
) ON CONFLICT DO NOTHING;

-- Project 2: Clearly transportation (ticketing)
INSERT INTO company_projects (id, org_id, project_name, client_name, client_type, start_date, end_date, total_value, project_type, category, role_type, role_percentage)
VALUES (
  'eeeeeeee-0002-0000-0000-000000000001',
  'aaaaaaaa-0001-0000-0000-000000000001',
  'מערכת כרטוס חכם לאוטובוסים - דן',
  'חברת דן',
  'GOVERNMENT',
  '2021-06-01',
  '2023-12-31',
  12000000,
  'ESTABLISHMENT',
  'TRANSPORTATION',
  'PRIMARY',
  100
) ON CONFLICT DO NOTHING;

-- Project 3: Clearly transportation (light rail)
INSERT INTO company_projects (id, org_id, project_name, client_name, client_type, start_date, end_date, total_value, project_type, category, role_type, role_percentage)
VALUES (
  'eeeeeeee-0003-0000-0000-000000000001',
  'aaaaaaaa-0001-0000-0000-000000000001',
  'מערכת ניהול תנועה רכבת קלה תל אביב',
  'נת"ע',
  'GOVERNMENT',
  '2023-03-01',
  '2025-09-30',
  18000000,
  'ESTABLISHMENT',
  'TRANSPORTATION',
  'PRIMARY',
  100
) ON CONFLICT DO NOTHING;

-- Project 4: Construction (should NOT count as transportation)
INSERT INTO company_projects (id, org_id, project_name, client_name, client_type, start_date, end_date, total_value, project_type, category, role_type, role_percentage)
VALUES (
  'eeeeeeee-0004-0000-0000-000000000001',
  'aaaaaaaa-0001-0000-0000-000000000001',
  'שדרוג מבנה משרדים',
  'חברת נדלן',
  'PRIVATE',
  '2023-01-01',
  '2024-06-30',
  8000000,
  'ESTABLISHMENT',
  'CONSTRUCTION',
  'PRIMARY',
  100
) ON CONFLICT DO NOTHING;

-- Financials for passing
INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count, audited)
VALUES
  ('aaaaaaaa-0001-0000-0000-000000000001', 2023, 60000000, 6000000, 120, true),
  ('aaaaaaaa-0001-0000-0000-000000000001', 2024, 65000000, 7000000, 130, true),
  ('aaaaaaaa-0001-0000-0000-000000000001', 2025, 70000000, 8000000, 140, true)
ON CONFLICT (org_id, fiscal_year) DO NOTHING;

-- ISO cert for passing
INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until)
VALUES ('aaaaaaaa-0001-0000-0000-000000000001', 'ISO', 'ISO 9001:2015', 'מכון התקנים', '2023-01-01', '2027-01-01')
ON CONFLICT DO NOTHING;

-- ============================================
-- ADVERSARIAL PROFILE: Looks good but doesn't meet
-- ============================================

-- Project 1: MISLEADING - "תחבורה" in name but actually road construction
INSERT INTO company_projects (id, org_id, project_name, client_name, client_type, start_date, end_date, total_value, project_type, category, role_type, role_percentage)
VALUES (
  'eeeeeeee-0011-0000-0000-000000000001',
  'aaaaaaaa-0002-0000-0000-000000000001',
  'שדרוג תשתיות תחבורה - כביש 6',
  'חברת כביש חוצה ישראל',
  'GOVERNMENT',
  '2022-03-01',
  '2024-08-30',
  20000000,
  'ESTABLISHMENT',
  'CONSTRUCTION',
  'PRIMARY',
  100
) ON CONFLICT DO NOTHING;

-- Project 2: Real transportation but below value threshold
INSERT INTO company_projects (id, org_id, project_name, client_name, client_type, start_date, end_date, total_value, project_type, category, role_type, role_percentage)
VALUES (
  'eeeeeeee-0012-0000-0000-000000000001',
  'aaaaaaaa-0002-0000-0000-000000000001',
  'מערכת כרטוס אוטובוסים - קו 5',
  'אגד',
  'GOVERNMENT',
  '2023-01-01',
  '2024-06-30',
  8000000,
  'ESTABLISHMENT',
  'TRANSPORTATION',
  'PRIMARY',
  100
) ON CONFLICT DO NOTHING;

-- Project 3: MISLEADING - "מסוף אוטובוסים" is construction, not public transport
INSERT INTO company_projects (id, org_id, project_name, client_name, client_type, start_date, end_date, total_value, project_type, category, role_type, role_percentage)
VALUES (
  'eeeeeeee-0013-0000-0000-000000000001',
  'aaaaaaaa-0002-0000-0000-000000000001',
  'בניית מסוף אוטובוסים מרכזי',
  'עיריית תל אביב',
  'MUNICIPAL',
  '2021-06-01',
  '2023-12-31',
  25000000,
  'ESTABLISHMENT',
  'CONSTRUCTION',
  'PRIMARY',
  100
) ON CONFLICT DO NOTHING;

-- Project 4: Real transportation but out of time range (6+ years ago)
INSERT INTO company_projects (id, org_id, project_name, client_name, client_type, start_date, end_date, total_value, project_type, category, role_type, role_percentage)
VALUES (
  'eeeeeeee-0014-0000-0000-000000000001',
  'aaaaaaaa-0002-0000-0000-000000000001',
  'מערכת איתות רכבתי - קו חיפה',
  'רכבת ישראל',
  'GOVERNMENT',
  '2017-01-01',
  '2019-06-30',
  15000000,
  'ESTABLISHMENT',
  'TRANSPORTATION',
  'PRIMARY',
  100
) ON CONFLICT DO NOTHING;

-- Project 5: Real transportation, meets value AND timeframe
INSERT INTO company_projects (id, org_id, project_name, client_name, client_type, start_date, end_date, total_value, project_type, category, role_type, role_percentage)
VALUES (
  'eeeeeeee-0015-0000-0000-000000000001',
  'aaaaaaaa-0002-0000-0000-000000000001',
  'מערכת ניהול רמזורים חכמים',
  'נתיבי ישראל',
  'GOVERNMENT',
  '2022-01-01',
  '2024-12-31',
  14000000,
  'ESTABLISHMENT',
  'TRANSPORTATION',
  'PRIMARY',
  100
) ON CONFLICT DO NOTHING;

-- Financials for adversarial (below threshold)
INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count, audited)
VALUES
  ('aaaaaaaa-0002-0000-0000-000000000001', 2023, 45000000, 4000000, 80, true),
  ('aaaaaaaa-0002-0000-0000-000000000001', 2024, 48000000, 4500000, 85, true),
  ('aaaaaaaa-0002-0000-0000-000000000001', 2025, 52000000, 5000000, 90, true)
ON CONFLICT (org_id, fiscal_year) DO NOTHING;

-- ISO cert for adversarial (expired!)
INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until)
VALUES ('aaaaaaaa-0002-0000-0000-000000000001', 'ISO', 'ISO 9001:2015', 'מכון התקנים', '2020-01-01', '2024-01-01')
ON CONFLICT DO NOTHING;

-- ============================================
-- EXPECTED RESULTS DOCUMENTATION
-- ============================================

/*
PASSING PROFILE (aaaaaaaa-0001):
  Gate #1 (3 transportation projects): MEETS
    ✅ מערכת בקרת תנועה רכבתית (15M, 2022-2024) - תחבורה ציבורית
    ✅ מערכת כרטוס חכם (12M, 2021-2023) - תחבורה ציבורית
    ✅ מערכת ניהול תנועה רכבת קלה (18M, 2023-2025) - תחבורה ציבורית
    ℹ️ שדרוג מבנה משרדים (8M) - NOT counted (construction)
  Gate #2 (avg revenue 50M+): MEETS (avg = 65M)
  Gate #3 (ISO 9001): MEETS (valid until 2027)
  Overall: ELIGIBLE

ADVERSARIAL PROFILE (aaaaaaaa-0002):
  Gate #1 (3 transportation projects): DOES_NOT_MEET (only 1 valid out of 3 needed)
    ❌ "שדרוג תשתיות תחבורה" (20M, 2022) - MISLEADING! Road construction, NOT public transport
    ❌ "מערכת כרטוס אוטובוסים" (8M, 2023) - Real transport but VALUE TOO LOW (8M < 10M)
    ❌ "בניית מסוף אוטובוסים" (25M, 2021) - MISLEADING! Building construction, not transport ops
    ❌ "מערכת איתות רכבתי" (15M, 2017-2019) - OUT OF TIMEFRAME (>5 years)
    ✅ "מערכת ניהול רמזורים חכמים" (14M, 2022-2024) - Valid match
    Result: 1 out of 3 needed → DOES_NOT_MEET
  Gate #2 (avg revenue 50M+): PARTIALLY_MEETS (avg = 48.3M, close but below)
  Gate #3 (ISO 9001): DOES_NOT_MEET (expired 2024-01-01)
  Overall: NOT_ELIGIBLE
*/
