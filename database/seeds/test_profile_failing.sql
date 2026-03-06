-- ============================================
-- TENDERIX TEST PROFILE B - FAILING COMPANY
-- "Boneh Derech Engineering" - a construction/transportation company
-- Has 3 transportation projects + 2 construction projects
-- High revenue but WRONG type of experience for camera tender
-- Should fail conditions 3, 4, 8, 9, 11 and partially meet others
-- ============================================

-- Use a fixed UUID for this test org
-- b2c3d4e5-f6a7-8901-bcde-f12345678901

INSERT INTO organizations (id, name, company_number, founding_year, address, phone, email, website, settings)
VALUES (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'בונה דרך הנדסה בע"מ',
    '516789234',
    2005,
    'רחוב ז''בוטינסקי 88, פתח תקווה',
    '03-9112233',
    'info@boneh-derech.co.il',
    'https://boneh-derech.co.il',
    '{"default_currency": "ILS", "language": "he"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================
-- FINANCIALS - Good revenue (passes condition 1)
-- ============================================

INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count, audited) VALUES
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 2023, 120000000, 9600000, 200, true),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 2024, 135000000, 10800000, 220, true),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 2025, 145000000, 11600000, 240, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- CERTIFICATIONS - Has ISO 9001 but NOT ISO 27001, NOT branch 200
-- ============================================

INSERT INTO company_certifications (org_id, cert_type, cert_name, cert_number, issuing_body, valid_from, valid_until) VALUES
-- Has ISO 9001 (passes condition 5)
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'ISO', 'ISO 9001:2015', 'IL-9001-2024-5555', 'SGS Israel', '2024-01-01', '2027-01-01'),
-- Has ISO 14001 (environmental - NOT what's needed, needs 27001)
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'ISO', 'ISO 14001:2015', 'IL-14001-2024-6666', 'SGS Israel', '2024-01-01', '2027-01-01'),
-- Has ISO 45001 (safety)
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'ISO', 'ISO 45001:2018', 'IL-45001-2024-7777', 'SGS Israel', '2024-01-01', '2027-01-01'),
-- Contractor Reg branch 100 (construction) NOT branch 200 (electrical/comms) - FAILS condition 7
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'CONTRACTOR_REG', 'רישום קבלנים - ענף 100', 'ק-100-8888', 'רשם הקבלנים', '2020-01-01', '2026-12-31'),
-- Contractor classification
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'CONTRACTOR_REG', 'סיווג קבלני ג-5', 'סג5-9999', 'רשם הקבלנים', '2022-01-01', '2027-01-01'),
-- Tax certs (passes condition 10)
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'TAX', 'אישור ניהול ספרים', 'נס-2025-555', 'רשות המסים', '2025-01-01', '2025-12-31'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'TAX', 'אישור ניכוי מס במקור', 'נמ-2025-666', 'רשות המסים', '2025-01-01', '2025-12-31')
ON CONFLICT DO NOTHING;

-- ============================================
-- PERSONNEL - Construction/infrastructure PMs, no VMS certifications
-- ============================================

INSERT INTO company_personnel (org_id, full_name, id_number, role, department, education, education_institution, years_experience, hire_date, professional_certifications, security_clearance) VALUES
-- CEO
('b2c3d4e5-f6a7-8901-bcde-f12345678901',
 'שמעון בונה', '111222333', 'מנכ"ל', 'הנהלה',
 'תואר שני בהנדסה אזרחית', 'הטכניון', 28, '2005-01-01',
 ARRAY['PMP', 'LEED AP'], NULL),
-- VP Operations
('b2c3d4e5-f6a7-8901-bcde-f12345678901',
 'מיכל כביש', '222333444', 'סמנכ"ל פרויקטים', 'פרויקטים',
 'תואר ראשון בהנדסה אזרחית', 'אוניברסיטת בן גוריון', 20, '2010-01-01',
 ARRAY['PMP', 'CCM'], NULL),
-- Senior PM - has PMP but in CONSTRUCTION not security (fails condition 8 - needs security experience)
('b2c3d4e5-f6a7-8901-bcde-f12345678901',
 'רועי גשר', '333444555', 'מנהל פרויקטים בכיר', 'פרויקטים',
 'תואר ראשון בהנדסה אזרחית', 'הטכניון', 15, '2012-01-01',
 ARRAY['PMP', 'Construction Safety Officer'], NULL),
-- Engineer - infrastructure, NOT VMS certified (fails condition 9)
('b2c3d4e5-f6a7-8901-bcde-f12345678901',
 'אורית מסילה', '444555666', 'מהנדסת תשתיות בכירה', 'הנדסה',
 'תואר ראשון בהנדסה אזרחית', 'אוניברסיטת תל אביב', 12, '2015-01-01',
 ARRAY['מהנדסת בטיחות מוסמכת', 'AutoCAD Professional'], NULL),
-- Electrician foreman
('b2c3d4e5-f6a7-8901-bcde-f12345678901',
 'דוד חשמל', '555666777', 'מנהל עבודה חשמל', 'ביצוע',
 'הנדסאי חשמל', 'מכללת אורט', 10, '2018-01-01',
 ARRAY['חשמלאי מוסמך'], NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- PROJECTS - 3 TRANSPORTATION + 2 CONSTRUCTION (no cameras/security!)
-- These should FAIL conditions 3, 4, 11 (municipal cameras, VMS, maintenance)
-- But PASS condition 2 (single project > 20M) and condition 13 partially
-- ============================================

INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, total_value, category, project_type, role_type, role_percentage, location, technologies, quantities, site_count) VALUES
-- TRANSPORTATION PROJECT 1 - Ayalon Highway
('b2c3d4e5-f6a7-8901-bcde-f12345678901',
 'שדרוג צומת ארלוזורוב - נתיבי איילון',
 'חברת נתיבי ישראל', 'GOVERNMENT',
 '2021-03-01', '2023-06-30',
 45000000, 'INFRASTRUCTURE', 'ESTABLISHMENT', 'PRIMARY', 100,
 'תל אביב - צומת ארלוזורוב',
 '{"type": "highway_junction", "lanes": 6, "traffic_lights": 12}'::jsonb,
 '{"asphalt_sqm": 25000, "concrete_m3": 8000}'::jsonb,
 1),

-- TRANSPORTATION PROJECT 2 - Light Rail Infrastructure
('b2c3d4e5-f6a7-8901-bcde-f12345678901',
 'תשתיות לרכבת קלה - קו סגול',
 'NTA - רכבת מטרופולינית', 'GOVERNMENT',
 '2022-01-01', '2024-12-31',
 78000000, 'INFRASTRUCTURE', 'ESTABLISHMENT', 'PRIMARY', 100,
 'גוש דן - קו סגול',
 '{"type": "light_rail_infrastructure", "stations": 5, "track_km": 8}'::jsonb,
 '{"concrete_m3": 45000, "steel_tons": 2500}'::jsonb,
 5),

-- TRANSPORTATION PROJECT 3 - Road Upgrade
('b2c3d4e5-f6a7-8901-bcde-f12345678901',
 'שדרוג כביש 40 - מקטע באר שבע',
 'חברת נתיבי ישראל', 'GOVERNMENT',
 '2023-06-01', '2025-09-30',
 32000000, 'INFRASTRUCTURE', 'ESTABLISHMENT', 'PRIMARY', 100,
 'באר שבע - צומת שוקת',
 '{"type": "road_upgrade", "km": 15, "lanes": 4}'::jsonb,
 '{"asphalt_sqm": 120000, "guardrails_m": 30000}'::jsonb,
 1),

-- CONSTRUCTION PROJECT 1 - Residential Complex
('b2c3d4e5-f6a7-8901-bcde-f12345678901',
 'בניית מתחם מגורים - שכונת הפארק',
 'קבוצת אזורים', 'PRIVATE',
 '2020-06-01', '2023-12-31',
 55000000, 'CONSTRUCTION', 'ESTABLISHMENT', 'PRIMARY', 100,
 'ראשון לציון',
 '{"type": "residential", "buildings": 3, "apartments": 180}'::jsonb,
 '{"concrete_m3": 35000, "steel_tons": 4000}'::jsonb,
 1),

-- CONSTRUCTION PROJECT 2 - School Building (municipal but construction, not cameras)
('b2c3d4e5-f6a7-8901-bcde-f12345678901',
 'בניית בית ספר יסודי - שכונת נווה עוז',
 'עיריית הרצליה', 'MUNICIPAL',
 '2023-01-01', '2025-03-31',
 28000000, 'CONSTRUCTION', 'ESTABLISHMENT', 'PRIMARY', 100,
 'הרצליה',
 '{"type": "educational", "classrooms": 24, "floors": 3}'::jsonb,
 '{"concrete_m3": 12000, "steel_tons": 1500}'::jsonb,
 1)
ON CONFLICT DO NOTHING;
