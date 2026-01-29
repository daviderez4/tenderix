-- ==============================================
-- Tenderix - Fictitious Company Profiles for Testing
-- Creates 6 companies with different gap types
-- ==============================================

-- First, clean up any existing test data
DELETE FROM gate_condition_matches WHERE gate_condition_id IN (SELECT id FROM gate_conditions WHERE tender_id IN (SELECT id FROM tenders WHERE tender_name LIKE '%[TEST]%'));
DELETE FROM company_projects WHERE org_id IN (SELECT id FROM organizations WHERE name LIKE '%[TEST]%');
DELETE FROM company_certifications WHERE org_id IN (SELECT id FROM organizations WHERE name LIKE '%[TEST]%');
DELETE FROM company_personnel WHERE org_id IN (SELECT id FROM organizations WHERE name LIKE '%[TEST]%');
DELETE FROM company_financials WHERE org_id IN (SELECT id FROM organizations WHERE name LIKE '%[TEST]%');
DELETE FROM group_companies WHERE parent_org_id IN (SELECT id FROM organizations WHERE name LIKE '%[TEST]%');
DELETE FROM gate_conditions WHERE tender_id IN (SELECT id FROM tenders WHERE tender_name LIKE '%[TEST]%');
DELETE FROM tenders WHERE tender_name LIKE '%[TEST]%';
DELETE FROM organizations WHERE name LIKE '%[TEST]%';

-- ==============================================
-- COMPANY 1: "PERFECT" - Meets all typical requirements
-- ==============================================

INSERT INTO organizations (id, name, company_number, founding_year, address, phone, email, website, settings)
VALUES (
    'aaaaaaaa-1111-1111-1111-111111111111',
    '[TEST] Alpha Systems Ltd',
    '514123456',
    2005,
    'Tel Aviv, Israel',
    '03-1234567',
    'info@alpha-test.co.il',
    'https://alpha-test.co.il',
    '{"gap_type": "NONE", "test_profile": true}'::jsonb
);

-- Projects for Company 1 (5 large projects)
INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_details)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Port Security System', 'Israel Ports Company', 'GOVERNMENT', '2020-01-15', '2022-06-30', 'FINAL_ACCOUNT', 85000000, 60000000, 25000000, 36, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Axis P3245", "Axis Q6135"], "vms": "Milestone XProtect", "access_control": "Lenel"}', '{"cameras": 450, "access_points": 120, "servers": 8}', 'SLA 99.5% uptime, 2h response'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Israel Railways CCTV', 'Israel Railways Ltd', 'GOVERNMENT', '2019-03-01', '2021-12-31', 'DELIVERY', 72000000, 72000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Hikvision DS-2CD", "Axis M3046"], "vms": "Genetec Security Center"}', '{"cameras": 850, "nvr": 45}', 'Installation warranty 24 months'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Bank Hapoalim Security Upgrade', 'Bank Hapoalim Ltd', 'PRIVATE', '2021-06-01', '2023-08-15', 'WARRANTY', 55000000, 40000000, 15000000, 60, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Bosch FLEXIDOME"], "analytics": "BriefCam", "access_control": "HID Global"}', '{"cameras": 320, "analytics_channels": 320, "branches": 85}', 'SLA 99.9% for critical systems'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Toll Road LPR System', 'Cross Israel Highway', 'PRIVATE', '2018-09-01', '2020-03-31', 'FINAL_ACCOUNT', 48000000, 48000000, 0, 0, 'PRIMARY', 85, 'ESTABLISHMENT', '{"cameras": ["Tattile Vega"], "lpr_software": "ARH", "backend": "Custom Oracle"}', '{"lpr_cameras": 180, "lanes": 90}', 'Accuracy 99.2% required'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Tel Aviv Municipality Security Maintenance', 'Tel Aviv-Yafo Municipality', 'MUNICIPAL', '2022-01-01', '2024-12-31', 'DELIVERY', 36000000, 6000000, 30000000, 36, 'PRIMARY', 100, 'MAINTENANCE', '{"cameras": ["Mixed fleet"], "vms": "Milestone"}', '{"cameras": 2500, "sites": 150}', 'SLA 4h response city-wide');

-- Certifications for Company 1 (all required certs)
INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', 'ISO', 'ISO 9001:2015', 'Standards Institution of Israel', '2023-01-01', '2026-01-01', '{"scope": "Design and installation of security systems"}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'ISO', 'ISO 27001:2013', 'Standards Institution of Israel', '2023-03-15', '2026-03-15', '{"scope": "Information security management"}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'ISO', 'ISO 45001:2018', 'Standards Institution of Israel', '2022-06-01', '2025-06-01', '{"scope": "Occupational health and safety"}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'LICENSE', 'Main Electrical Contractor License', 'Ministry of Economy', '2020-01-01', '2027-01-01', '{"level": "Main", "voltage": "Up to 1000V"}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'CONTRACTOR_REG', 'Contractor Registration G-5', 'Ministry of Construction', '2021-04-01', '2026-04-01', '{"category": "100 - Electrical and Communications", "level": "G-5"}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'SECURITY_CLEARANCE', 'Security Clearance', 'Ministry of Defense', '2022-01-01', '2025-01-01', '{"level": "Secret"}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'TAX', 'Book Keeping Certificate', 'Tax Authority', '2024-01-01', '2024-12-31', '{}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'TAX', 'Withholding Tax Certificate', 'Tax Authority', '2024-01-01', '2024-12-31', '{}');

-- Personnel for Company 1 (experienced team)
INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, professional_certifications)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Avi Cohen', 'CEO', 'MBA Tel Aviv University, B.Sc Electrical Engineering', 28, ARRAY['PMP', 'CISSP']),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Ronit Levy', 'VP Operations', 'B.Sc Industrial Engineering', 22, ARRAY['Six Sigma Black Belt']),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Moshe David', 'Senior Project Manager', 'B.Sc Civil Engineering', 18, ARRAY['PMP', 'PRINCE2']),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Sara Israeli', 'Systems Engineer', 'M.Sc Computer Science', 15, ARRAY['CCNA', 'Milestone Certified']);

-- Financials for Company 1 (strong financials)
INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', 2023, 150000000, 12000000, 120),
    ('aaaaaaaa-1111-1111-1111-111111111111', 2022, 135000000, 10500000, 110),
    ('aaaaaaaa-1111-1111-1111-111111111111', 2021, 120000000, 9000000, 95);

-- ==============================================
-- COMPANY 2: "EXPERIENCE GAP" - Small projects, not enough experience
-- ==============================================

INSERT INTO organizations (id, name, company_number, founding_year, address, phone, email, website, settings)
VALUES (
    'bbbbbbbb-2222-2222-2222-222222222222',
    '[TEST] Beta Technologies Ltd',
    '514234567',
    2015,
    'Ramat Gan, Israel',
    '03-2345678',
    'info@beta-test.co.il',
    'https://beta-test.co.il',
    '{"gap_type": "EXPERIENCE", "test_profile": true}'::jsonb
);

-- Projects for Company 2 (small projects - GAP!)
INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_details)
VALUES
    ('bbbbbbbb-2222-2222-2222-222222222222', 'Industrial Factory Security', 'Electra Consumer Products', 'PRIVATE', '2022-03-01', '2022-09-30', 'DELIVERY', 12000000, 10000000, 2000000, 12, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Hikvision"], "vms": "Hikvision NVR"}', '{"cameras": 85}', 'Basic SLA'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'High School CCTV', 'Ramat Gan Municipality', 'MUNICIPAL', '2021-08-01', '2021-12-31', 'DELIVERY', 850000, 850000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Dahua"]}', '{"cameras": 45}', 'None'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'Office Building Maintenance', 'Ayalon Mall', 'PRIVATE', '2023-01-01', '2024-12-31', 'DELIVERY', 18000000, 3000000, 15000000, 24, 'PRIMARY', 100, 'MAINTENANCE', '{"cameras": ["Mixed"]}', '{"cameras": 120}', 'SLA 8h response'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'Office Access Control Installation', 'Tech Company', 'PRIVATE', '2023-06-01', '2023-08-31', 'DELIVERY', 2500000, 2500000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"access_control": ["HID"]}', '{"readers": 35}', 'Warranty 12 months');

-- Certifications for Company 2 (has ISO 9001 only - partial GAP)
INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('bbbbbbbb-2222-2222-2222-222222222222', 'ISO', 'ISO 9001:2015', 'Standards Institution of Israel', '2022-06-01', '2025-06-01', '{}'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'LICENSE', 'Electrical Contractor License', 'Ministry of Economy', '2020-01-01', '2027-01-01', '{"level": "Limited"}'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'TAX', 'Book Keeping Certificate', 'Tax Authority', '2024-01-01', '2024-12-31', '{}');

-- Personnel for Company 2 (less experienced team)
INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, professional_certifications)
VALUES
    ('bbbbbbbb-2222-2222-2222-222222222222', 'Yossi Mizrahi', 'CEO', 'B.A Business Administration', 12, ARRAY[]::TEXT[]),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'Dana Cohen', 'Project Manager', 'B.Sc Engineering', 7, ARRAY['PMP']);

-- Financials for Company 2 (moderate)
INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count)
VALUES
    ('bbbbbbbb-2222-2222-2222-222222222222', 2023, 38000000, 2800000, 35),
    ('bbbbbbbb-2222-2222-2222-222222222222', 2022, 32000000, 2200000, 30);

-- ==============================================
-- COMPANY 3: "CERTIFICATION GAP" - Missing ISO 27001, no contractor license
-- ==============================================

INSERT INTO organizations (id, name, company_number, founding_year, address, phone, email, website, settings)
VALUES (
    'cccccccc-3333-3333-3333-333333333333',
    '[TEST] Gamma Security Solutions Ltd',
    '514345678',
    2010,
    'Herzliya, Israel',
    '09-3456789',
    'info@gamma-test.co.il',
    'https://gamma-test.co.il',
    '{"gap_type": "CERTIFICATION", "test_profile": true}'::jsonb
);

-- Projects for Company 3 (good projects - no experience gap)
INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_details)
VALUES
    ('cccccccc-3333-3333-3333-333333333333', 'University Campus Security', 'Bar Ilan University', 'GOVERNMENT', '2020-06-01', '2022-03-31', 'FINAL_ACCOUNT', 52000000, 45000000, 7000000, 24, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Axis"], "vms": "Milestone"}', '{"cameras": 380}', 'SLA 99%'),
    ('cccccccc-3333-3333-3333-333333333333', 'Shopping Center CCTV', 'Big Fashion', 'PRIVATE', '2019-03-01', '2020-01-31', 'DELIVERY', 28000000, 28000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Bosch"]}', '{"cameras": 250}', 'Warranty'),
    ('cccccccc-3333-3333-3333-333333333333', 'Hospital Security Upgrade', 'Sheba Medical Center', 'GOVERNMENT', '2021-01-01', '2022-06-30', 'DELIVERY', 48000000, 38000000, 10000000, 36, 'PRIMARY', 80, 'COMBINED', '{"cameras": ["Axis"], "access_control": ["Lenel"]}', '{"cameras": 420, "readers": 200}', 'SLA 99.5%'),
    ('cccccccc-3333-3333-3333-333333333333', 'Defense Factory Security', 'IMI Systems', 'DEFENSE', '2018-09-01', '2019-12-31', 'FINAL_ACCOUNT', 35000000, 35000000, 0, 0, 'SUBCONTRACTOR', 60, 'ESTABLISHMENT', '{"cameras": ["Pelco"]}', '{"cameras": 180}', 'Defense grade');

-- Certifications for Company 3 (MISSING ISO 27001 and contractor license!)
INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('cccccccc-3333-3333-3333-333333333333', 'ISO', 'ISO 9001:2015', 'Standards Institution of Israel', '2021-01-01', '2024-01-01', '{}'),
    -- NO ISO 27001!
    -- NO CONTRACTOR REGISTRATION!
    ('cccccccc-3333-3333-3333-333333333333', 'LICENSE', 'Electrical Contractor License', 'Ministry of Economy', '2019-01-01', '2026-01-01', '{}'),
    ('cccccccc-3333-3333-3333-333333333333', 'TAX', 'Book Keeping Certificate', 'Tax Authority', '2024-01-01', '2024-12-31', '{}');

-- Personnel for Company 3
INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, professional_certifications)
VALUES
    ('cccccccc-3333-3333-3333-333333333333', 'Ami Shalom', 'CEO', 'M.Sc Engineering', 20, ARRAY['PMP']),
    ('cccccccc-3333-3333-3333-333333333333', 'Nurit Abraham', 'VP Engineering', 'B.Sc Electrical Engineering', 16, ARRAY['CCNA']);

-- Financials for Company 3 (good)
INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count)
VALUES
    ('cccccccc-3333-3333-3333-333333333333', 2023, 82000000, 6500000, 65),
    ('cccccccc-3333-3333-3333-333333333333', 2022, 75000000, 5800000, 58);

-- ==============================================
-- COMPANY 4: "YOUNG COMPANY" - Low seniority, few projects
-- ==============================================

INSERT INTO organizations (id, name, company_number, founding_year, address, phone, email, website, settings)
VALUES (
    'dddddddd-4444-4444-4444-444444444444',
    '[TEST] Delta Innovation Ltd',
    '514456789',
    2021,
    'Tel Aviv, Israel',
    '03-4567890',
    'info@delta-test.co.il',
    'https://delta-test.co.il',
    '{"gap_type": "SENIORITY", "test_profile": true}'::jsonb
);

-- Projects for Company 4 (few and small - company too young)
INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_details)
VALUES
    ('dddddddd-4444-4444-4444-444444444444', 'AI Face Recognition System', 'Tech Startup', 'PRIVATE', '2022-06-01', '2022-12-31', 'DELIVERY', 5500000, 5500000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Axis"], "analytics": "Custom AI"}', '{"cameras": 25}', 'POC'),
    ('dddddddd-4444-4444-4444-444444444444', 'Office System Installation', 'Small Tech Company', 'PRIVATE', '2023-03-01', '2023-05-31', 'DELIVERY', 1800000, 1800000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Hikvision"]}', '{"cameras": 35}', 'Basic');

-- Certifications for Company 4 (basic only)
INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('dddddddd-4444-4444-4444-444444444444', 'ISO', 'ISO 9001:2015', 'Standards Institution of Israel', '2023-01-01', '2026-01-01', '{}'),
    ('dddddddd-4444-4444-4444-444444444444', 'TAX', 'Book Keeping Certificate', 'Tax Authority', '2024-01-01', '2024-12-31', '{}');

-- Personnel for Company 4 (young team)
INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, professional_certifications)
VALUES
    ('dddddddd-4444-4444-4444-444444444444', 'Ron Tal', 'CEO & Founder', 'M.Sc Computer Science', 8, ARRAY['AWS Certified']),
    ('dddddddd-4444-4444-4444-444444444444', 'Michal Golan', 'CTO', 'B.Sc Software Engineering', 6, ARRAY['CCNA']);

-- Financials for Company 4 (low but growing)
INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count)
VALUES
    ('dddddddd-4444-4444-4444-444444444444', 2023, 18000000, 1200000, 18),
    ('dddddddd-4444-4444-4444-444444444444', 2022, 8000000, 400000, 12);

-- ==============================================
-- COMPANY 5: "FINANCIAL GAP" - Low revenue, can't provide bank guarantee
-- ==============================================

INSERT INTO organizations (id, name, company_number, founding_year, address, phone, email, website, settings)
VALUES (
    'eeeeeeee-5555-5555-5555-555555555555',
    '[TEST] Epsilon Security Services Ltd',
    '514567890',
    2012,
    'Netanya, Israel',
    '09-5678901',
    'info@epsilon-test.co.il',
    'https://epsilon-test.co.il',
    '{"gap_type": "FINANCIAL", "test_profile": true}'::jsonb
);

-- Projects for Company 5 (medium projects but company has low revenue)
INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_details)
VALUES
    ('eeeeeeee-5555-5555-5555-555555555555', 'Regional Council Security', 'Galilee Regional Council', 'MUNICIPAL', '2020-01-01', '2021-06-30', 'FINAL_ACCOUNT', 22000000, 18000000, 4000000, 24, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Axis"]}', '{"cameras": 180}', 'SLA municipal'),
    ('eeeeeeee-5555-5555-5555-555555555555', 'Traffic Camera Installation', 'Netanya Municipality', 'MUNICIPAL', '2019-06-01', '2020-03-31', 'DELIVERY', 15000000, 15000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Tattile"]}', '{"lpr_cameras": 45}', 'Accuracy 98%'),
    ('eeeeeeee-5555-5555-5555-555555555555', 'Council System Maintenance', 'Local Council', 'MUNICIPAL', '2022-01-01', '2024-12-31', 'DELIVERY', 8000000, 0, 8000000, 36, 'PRIMARY', 100, 'MAINTENANCE', '{}', '{"sites": 25}', 'SLA 24h');

-- Certifications for Company 5 (has most certs)
INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('eeeeeeee-5555-5555-5555-555555555555', 'ISO', 'ISO 9001:2015', 'Standards Institution of Israel', '2022-01-01', '2025-01-01', '{}'),
    ('eeeeeeee-5555-5555-5555-555555555555', 'ISO', 'ISO 27001:2013', 'Standards Institution of Israel', '2022-06-01', '2025-06-01', '{}'),
    ('eeeeeeee-5555-5555-5555-555555555555', 'CONTRACTOR_REG', 'Contractor Registration G-3', 'Ministry of Construction', '2021-01-01', '2026-01-01', '{"level": "G-3"}'),
    ('eeeeeeee-5555-5555-5555-555555555555', 'TAX', 'Book Keeping Certificate', 'Tax Authority', '2024-01-01', '2024-12-31', '{}');

-- Personnel for Company 5
INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, professional_certifications)
VALUES
    ('eeeeeeee-5555-5555-5555-555555555555', 'Gideon Peretz', 'CEO', 'B.A Economics', 18, ARRAY[]::TEXT[]),
    ('eeeeeeee-5555-5555-5555-555555555555', 'Orly Shemesh', 'Project Manager', 'Technician Diploma', 14, ARRAY[]::TEXT[]);

-- Financials for Company 5 (LOW REVENUE - GAP!)
INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count)
VALUES
    ('eeeeeeee-5555-5555-5555-555555555555', 2023, 15000000, 800000, 25),
    ('eeeeeeee-5555-5555-5555-555555555555', 2022, 14000000, 650000, 22),
    ('eeeeeeee-5555-5555-5555-555555555555', 2021, 12000000, 500000, 20);

-- ==============================================
-- COMPANY 6: "GROUP COMPANY" - Can leverage parent company
-- ==============================================

INSERT INTO organizations (id, name, company_number, founding_year, address, phone, email, website, settings)
VALUES (
    'ffffffff-6666-6666-6666-666666666666',
    '[TEST] Zeta Systems Ltd',
    '514678901',
    2018,
    'Haifa, Israel',
    '04-6789012',
    'info@zeta-test.co.il',
    'https://zeta-test.co.il',
    '{"gap_type": "PARTIAL_WITH_GROUP", "test_profile": true}'::jsonb
);

-- Projects for Company 6 (small projects as subsidiary)
INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_details)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 'Small Security System', 'Private Client', 'PRIVATE', '2022-01-01', '2022-06-30', 'DELIVERY', 8000000, 8000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Axis"]}', '{"cameras": 60}', 'Standard'),
    ('ffffffff-6666-6666-6666-666666666666', 'Ongoing Maintenance', 'Regular Client', 'PRIVATE', '2023-01-01', '2025-12-31', 'DELIVERY', 12000000, 0, 12000000, 36, 'PRIMARY', 100, 'MAINTENANCE', '{}', '{"sites": 15}', 'SLA 12h');

-- TANGENT PROJECTS - Projects the company is familiar with through the group
INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_details, is_tangent, tangent_description)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 'Haifa Port Project (Omega Group)', 'Haifa Port', 'GOVERNMENT', '2019-01-01', '2021-12-31', 'FINAL_ACCOUNT', 95000000, 80000000, 15000000, 36, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Axis", "Bosch"], "vms": "Milestone"}', '{"cameras": 650}', 'SLA 99.5%', TRUE, 'Project of parent company - Omega Group. Zeta team participated in implementation phase'),
    ('ffffffff-6666-6666-6666-666666666666', 'Prime Minister Office Project (Omega Group)', 'Prime Minister Office', 'GOVERNMENT', '2020-06-01', '2022-03-31', 'FINAL_ACCOUNT', 68000000, 68000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["High-security"]}', '{"cameras": 280}', 'Defense grade', TRUE, 'Project of parent company. High security clearance');

-- Certifications for Company 6
INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 'ISO', 'ISO 9001:2015', 'Standards Institution of Israel', '2023-01-01', '2026-01-01', '{}'),
    ('ffffffff-6666-6666-6666-666666666666', 'TAX', 'Book Keeping Certificate', 'Tax Authority', '2024-01-01', '2024-12-31', '{}');

-- Personnel for Company 6
INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, professional_certifications)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 'Tomer Ilan', 'CEO', 'MBA', 14, ARRAY['PMP']),
    ('ffffffff-6666-6666-6666-666666666666', 'Liat Cohen', 'Operations Manager', 'B.A', 10, ARRAY[]::TEXT[]);

-- Financials for Company 6
INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 2023, 25000000, 1800000, 28),
    ('ffffffff-6666-6666-6666-666666666666', 2022, 20000000, 1400000, 24);

-- ==============================================
-- SUMMARY VIEW - Easy access to test profiles
-- ==============================================

CREATE OR REPLACE VIEW test_company_profiles AS
SELECT
    o.id,
    o.name,
    o.settings->>'gap_type' as gap_type,
    o.founding_year,
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
INSERT INTO tenders (id, org_id, tender_name, tender_number, issuing_body, category, submission_deadline, status)
VALUES (
    '11111111-aaaa-bbbb-cccc-dddddddddddd',
    'aaaaaaaa-1111-1111-1111-111111111111',
    '[TEST] Sample Tender - Security Systems',
    'TEST-2024-001',
    'Tel Aviv-Yafo Municipality',
    'SECURITY_SYSTEMS',
    '2024-06-30',
    'ACTIVE'
) ON CONFLICT (id) DO NOTHING;

-- Sample gate conditions that will test different gaps
INSERT INTO gate_conditions (id, tender_id, condition_text, condition_type, requirement_type, required_amount, required_count, required_years, can_rely_on_subcontractor, legal_classification, status)
VALUES
    -- Experience requirement (tests EXPERIENCE gap)
    ('22222222-aaaa-bbbb-cccc-000000000001', '11111111-aaaa-bbbb-cccc-dddddddddddd',
     'The bidder must demonstrate experience in at least 3 projects valued at 50 million NIS each, in the last 5 years, in security systems',
     'GATE', 'EXPERIENCE', 50000000, 3, 5, FALSE, 'strict', 'PENDING'),

    -- Financial requirement (tests FINANCIAL gap)
    ('22222222-aaaa-bbbb-cccc-000000000002', '11111111-aaaa-bbbb-cccc-dddddddddddd',
     'The bidder must have annual revenue of at least 100 million NIS in each of the last 3 years',
     'GATE', 'FINANCIAL', 100000000, NULL, 3, FALSE, 'strict', 'PENDING'),

    -- Certification requirement (tests CERTIFICATION gap)
    ('22222222-aaaa-bbbb-cccc-000000000003', '11111111-aaaa-bbbb-cccc-dddddddddddd',
     'The bidder must present a valid ISO 27001 certificate',
     'GATE', 'CERTIFICATION', NULL, NULL, NULL, FALSE, 'strict', 'PENDING'),

    -- Contractor license (tests CERTIFICATION gap)
    ('22222222-aaaa-bbbb-cccc-000000000004', '11111111-aaaa-bbbb-cccc-dddddddddddd',
     'The bidder must be registered in the Contractor Registry at level G-5 or higher in category 100 (Electrical and Communications)',
     'GATE', 'CERTIFICATION', NULL, NULL, NULL, FALSE, 'strict', 'PENDING'),

    -- Seniority requirement (tests SENIORITY gap)
    ('22222222-aaaa-bbbb-cccc-000000000005', '11111111-aaaa-bbbb-cccc-dddddddddddd',
     'The company must be operating in the field for at least 7 years',
     'GATE', 'OTHER', NULL, NULL, 7, FALSE, 'strict', 'PENDING'),

    -- Personnel requirement
    ('22222222-aaaa-bbbb-cccc-000000000006', '11111111-aaaa-bbbb-cccc-dddddddddddd',
     'The bidder must present a project manager with at least 10 years experience in managing security projects',
     'GATE', 'PERSONNEL', NULL, NULL, 10, FALSE, 'strict', 'PENDING'),

    -- Subcontractor allowed requirement (tests group company)
    ('22222222-aaaa-bbbb-cccc-000000000007', '11111111-aaaa-bbbb-cccc-dddddddddddd',
     'The bidder may rely on experience of a parent company or sister company for experience requirements, subject to presenting a commitment',
     'GATE', 'EXPERIENCE', 50000000, 2, 5, TRUE, 'open', 'PENDING'),

    -- Scoring criteria (advantage, not gate)
    ('22222222-aaaa-bbbb-cccc-000000000008', '11111111-aaaa-bbbb-cccc-dddddddddddd',
     'Advantage for bidders with experience in government defense projects',
     'ADVANTAGE', 'EXPERIENCE', NULL, NULL, NULL, FALSE, 'open', 'PENDING')
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- VERIFICATION QUERY
-- ==============================================

SELECT 'Test profiles created successfully!' as status;
SELECT * FROM test_company_profiles;
