-- ==============================================
-- Tenderix - Fictitious Company Profiles for Testing
-- ==============================================

-- Clean up existing test data
DELETE FROM gate_condition_matches WHERE gate_condition_id IN (SELECT id FROM gate_conditions WHERE tender_id IN (SELECT id FROM tenders WHERE tender_name LIKE '%[TEST]%'));
DELETE FROM company_projects WHERE org_id IN (SELECT id FROM organizations WHERE name LIKE '%[TEST]%');
DELETE FROM company_certifications WHERE org_id IN (SELECT id FROM organizations WHERE name LIKE '%[TEST]%');
DELETE FROM company_personnel WHERE org_id IN (SELECT id FROM organizations WHERE name LIKE '%[TEST]%');
DELETE FROM company_financials WHERE org_id IN (SELECT id FROM organizations WHERE name LIKE '%[TEST]%');
DELETE FROM gate_conditions WHERE tender_id IN (SELECT id FROM tenders WHERE tender_name LIKE '%[TEST]%');
DELETE FROM tenders WHERE tender_name LIKE '%[TEST]%';
DELETE FROM organizations WHERE name LIKE '%[TEST]%';

-- COMPANY 1: "PERFECT" - Meets all requirements
INSERT INTO organizations (id, name, company_number, founding_year, address, phone, email, website, settings)
VALUES ('aaaaaaaa-1111-1111-1111-111111111111', '[TEST] Alpha Systems Ltd', '514123456', 2005, 'Tel Aviv, Israel', '03-1234567', 'info@alpha-test.co.il', 'https://alpha-test.co.il', '{"gap_type": "NONE", "test_profile": true}'::jsonb);

INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_details)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Port Security System', 'Israel Ports Company', 'GOVERNMENT', '2020-01-15', '2022-06-30', 'FINAL_ACCOUNT', 85000000, 60000000, 25000000, 36, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Axis"]}', '{"cameras": 450}', 'SLA 99.5%'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Israel Railways CCTV', 'Israel Railways Ltd', 'GOVERNMENT', '2019-03-01', '2021-12-31', 'DELIVERY', 72000000, 72000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Hikvision"]}', '{"cameras": 850}', 'Warranty 24m'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Bank Hapoalim Security', 'Bank Hapoalim Ltd', 'PRIVATE', '2021-06-01', '2023-08-15', 'WARRANTY', 55000000, 40000000, 15000000, 60, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Bosch"]}', '{"cameras": 320}', 'SLA 99.9%'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Toll Road LPR System', 'Cross Israel Highway', 'PRIVATE', '2018-09-01', '2020-03-31', 'FINAL_ACCOUNT', 48000000, 48000000, 0, 0, 'PRIMARY', 85, 'ESTABLISHMENT', '{"cameras": ["Tattile"]}', '{"lpr_cameras": 180}', 'Accuracy 99.2%'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Tel Aviv Municipality', 'Tel Aviv-Yafo Municipality', 'MUNICIPAL', '2022-01-01', '2024-12-31', 'DELIVERY', 36000000, 6000000, 30000000, 36, 'PRIMARY', 100, 'MAINTENANCE', '{"cameras": ["Mixed"]}', '{"cameras": 2500}', 'SLA 4h');

INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', 'ISO', 'ISO 9001:2015', 'Standards Institution of Israel', '2023-01-01', '2026-01-01', '{}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'ISO', 'ISO 27001:2013', 'Standards Institution of Israel', '2023-03-15', '2026-03-15', '{}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'ISO', 'ISO 45001:2018', 'Standards Institution of Israel', '2022-06-01', '2025-06-01', '{}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'LICENSE', 'Main Electrical Contractor License', 'Ministry of Economy', '2020-01-01', '2027-01-01', '{}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'CONTRACTOR_REG', 'Contractor Registration G-5', 'Ministry of Construction', '2021-04-01', '2026-04-01', '{"level": "G-5"}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'SECURITY_CLEARANCE', 'Security Clearance', 'Ministry of Defense', '2022-01-01', '2025-01-01', '{}'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'TAX', 'Book Keeping Certificate', 'Tax Authority', '2024-01-01', '2024-12-31', '{}');

INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, professional_certifications)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Avi Cohen', 'CEO', 'MBA, B.Sc Electrical Engineering', 28, ARRAY['PMP', 'CISSP']),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Ronit Levy', 'VP Operations', 'B.Sc Industrial Engineering', 22, ARRAY['Six Sigma']),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Moshe David', 'Senior Project Manager', 'B.Sc Civil Engineering', 18, ARRAY['PMP', 'PRINCE2']),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'Sara Israeli', 'Systems Engineer', 'M.Sc Computer Science', 15, ARRAY['CCNA']);

INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', 2023, 150000000, 12000000, 120),
    ('aaaaaaaa-1111-1111-1111-111111111111', 2022, 135000000, 10500000, 110),
    ('aaaaaaaa-1111-1111-1111-111111111111', 2021, 120000000, 9000000, 95);

-- COMPANY 2: "EXPERIENCE GAP"
INSERT INTO organizations (id, name, company_number, founding_year, address, phone, email, website, settings)
VALUES ('bbbbbbbb-2222-2222-2222-222222222222', '[TEST] Beta Technologies Ltd', '514234567', 2015, 'Ramat Gan, Israel', '03-2345678', 'info@beta-test.co.il', 'https://beta-test.co.il', '{"gap_type": "EXPERIENCE", "test_profile": true}'::jsonb);

INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_details)
VALUES
    ('bbbbbbbb-2222-2222-2222-222222222222', 'Industrial Factory Security', 'Electra', 'PRIVATE', '2022-03-01', '2022-09-30', 'DELIVERY', 12000000, 10000000, 2000000, 12, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Hikvision"]}', '{"cameras": 85}', 'Basic SLA'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'High School CCTV', 'Ramat Gan Municipality', 'MUNICIPAL', '2021-08-01', '2021-12-31', 'DELIVERY', 850000, 850000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Dahua"]}', '{"cameras": 45}', 'None'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'Office Building Maintenance', 'Ayalon Mall', 'PRIVATE', '2023-01-01', '2024-12-31', 'DELIVERY', 18000000, 3000000, 15000000, 24, 'PRIMARY', 100, 'MAINTENANCE', '{"cameras": ["Mixed"]}', '{"cameras": 120}', 'SLA 8h');

INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('bbbbbbbb-2222-2222-2222-222222222222', 'ISO', 'ISO 9001:2015', 'Standards Institution of Israel', '2022-06-01', '2025-06-01', '{}'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'LICENSE', 'Electrical Contractor License', 'Ministry of Economy', '2020-01-01', '2027-01-01', '{}'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'TAX', 'Book Keeping Certificate', 'Tax Authority', '2024-01-01', '2024-12-31', '{}');

INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, professional_certifications)
VALUES
    ('bbbbbbbb-2222-2222-2222-222222222222', 'Yossi Mizrahi', 'CEO', 'B.A Business Administration', 12, ARRAY[]::TEXT[]),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'Dana Cohen', 'Project Manager', 'B.Sc Engineering', 7, ARRAY['PMP']);

INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count)
VALUES
    ('bbbbbbbb-2222-2222-2222-222222222222', 2023, 38000000, 2800000, 35),
    ('bbbbbbbb-2222-2222-2222-222222222222', 2022, 32000000, 2200000, 30);

-- COMPANY 3: "CERTIFICATION GAP"
INSERT INTO organizations (id, name, company_number, founding_year, address, phone, email, website, settings)
VALUES ('cccccccc-3333-3333-3333-333333333333', '[TEST] Gamma Security Solutions Ltd', '514345678', 2010, 'Herzliya, Israel', '09-3456789', 'info@gamma-test.co.il', 'https://gamma-test.co.il', '{"gap_type": "CERTIFICATION", "test_profile": true}'::jsonb);

INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_details)
VALUES
    ('cccccccc-3333-3333-3333-333333333333', 'University Campus Security', 'Bar Ilan University', 'GOVERNMENT', '2020-06-01', '2022-03-31', 'FINAL_ACCOUNT', 52000000, 45000000, 7000000, 24, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Axis"]}', '{"cameras": 380}', 'SLA 99%'),
    ('cccccccc-3333-3333-3333-333333333333', 'Shopping Center CCTV', 'Big Fashion', 'PRIVATE', '2019-03-01', '2020-01-31', 'DELIVERY', 28000000, 28000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Bosch"]}', '{"cameras": 250}', 'Warranty'),
    ('cccccccc-3333-3333-3333-333333333333', 'Hospital Security Upgrade', 'Sheba Medical Center', 'GOVERNMENT', '2021-01-01', '2022-06-30', 'DELIVERY', 48000000, 38000000, 10000000, 36, 'PRIMARY', 80, 'COMBINED', '{"cameras": ["Axis"]}', '{"cameras": 420}', 'SLA 99.5%');

INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('cccccccc-3333-3333-3333-333333333333', 'ISO', 'ISO 9001:2015', 'Standards Institution of Israel', '2021-01-01', '2024-01-01', '{}'),
    ('cccccccc-3333-3333-3333-333333333333', 'LICENSE', 'Electrical Contractor License', 'Ministry of Economy', '2019-01-01', '2026-01-01', '{}'),
    ('cccccccc-3333-3333-3333-333333333333', 'TAX', 'Book Keeping Certificate', 'Tax Authority', '2024-01-01', '2024-12-31', '{}');

INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, professional_certifications)
VALUES
    ('cccccccc-3333-3333-3333-333333333333', 'Ami Shalom', 'CEO', 'M.Sc Engineering', 20, ARRAY['PMP']),
    ('cccccccc-3333-3333-3333-333333333333', 'Nurit Abraham', 'VP Engineering', 'B.Sc Electrical Engineering', 16, ARRAY['CCNA']);

INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count)
VALUES
    ('cccccccc-3333-3333-3333-333333333333', 2023, 82000000, 6500000, 65),
    ('cccccccc-3333-3333-3333-333333333333', 2022, 75000000, 5800000, 58);

-- COMPANY 4: "SENIORITY GAP"
INSERT INTO organizations (id, name, company_number, founding_year, address, phone, email, website, settings)
VALUES ('dddddddd-4444-4444-4444-444444444444', '[TEST] Delta Innovation Ltd', '514456789', 2021, 'Tel Aviv, Israel', '03-4567890', 'info@delta-test.co.il', 'https://delta-test.co.il', '{"gap_type": "SENIORITY", "test_profile": true}'::jsonb);

INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_details)
VALUES
    ('dddddddd-4444-4444-4444-444444444444', 'AI Face Recognition System', 'Tech Startup', 'PRIVATE', '2022-06-01', '2022-12-31', 'DELIVERY', 5500000, 5500000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Axis"]}', '{"cameras": 25}', 'POC'),
    ('dddddddd-4444-4444-4444-444444444444', 'Office System Installation', 'Small Tech Company', 'PRIVATE', '2023-03-01', '2023-05-31', 'DELIVERY', 1800000, 1800000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Hikvision"]}', '{"cameras": 35}', 'Basic');

INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('dddddddd-4444-4444-4444-444444444444', 'ISO', 'ISO 9001:2015', 'Standards Institution of Israel', '2023-01-01', '2026-01-01', '{}'),
    ('dddddddd-4444-4444-4444-444444444444', 'TAX', 'Book Keeping Certificate', 'Tax Authority', '2024-01-01', '2024-12-31', '{}');

INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, professional_certifications)
VALUES
    ('dddddddd-4444-4444-4444-444444444444', 'Ron Tal', 'CEO & Founder', 'M.Sc Computer Science', 8, ARRAY['AWS Certified']),
    ('dddddddd-4444-4444-4444-444444444444', 'Michal Golan', 'CTO', 'B.Sc Software Engineering', 6, ARRAY['CCNA']);

INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count)
VALUES
    ('dddddddd-4444-4444-4444-444444444444', 2023, 18000000, 1200000, 18),
    ('dddddddd-4444-4444-4444-444444444444', 2022, 8000000, 400000, 12);

-- COMPANY 5: "FINANCIAL GAP"
INSERT INTO organizations (id, name, company_number, founding_year, address, phone, email, website, settings)
VALUES ('eeeeeeee-5555-5555-5555-555555555555', '[TEST] Epsilon Security Services Ltd', '514567890', 2012, 'Netanya, Israel', '09-5678901', 'info@epsilon-test.co.il', 'https://epsilon-test.co.il', '{"gap_type": "FINANCIAL", "test_profile": true}'::jsonb);

INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_details)
VALUES
    ('eeeeeeee-5555-5555-5555-555555555555', 'Regional Council Security', 'Galilee Regional Council', 'MUNICIPAL', '2020-01-01', '2021-06-30', 'FINAL_ACCOUNT', 22000000, 18000000, 4000000, 24, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Axis"]}', '{"cameras": 180}', 'SLA municipal'),
    ('eeeeeeee-5555-5555-5555-555555555555', 'Traffic Camera Installation', 'Netanya Municipality', 'MUNICIPAL', '2019-06-01', '2020-03-31', 'DELIVERY', 15000000, 15000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Tattile"]}', '{"lpr_cameras": 45}', 'Accuracy 98%');

INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('eeeeeeee-5555-5555-5555-555555555555', 'ISO', 'ISO 9001:2015', 'Standards Institution of Israel', '2022-01-01', '2025-01-01', '{}'),
    ('eeeeeeee-5555-5555-5555-555555555555', 'ISO', 'ISO 27001:2013', 'Standards Institution of Israel', '2022-06-01', '2025-06-01', '{}'),
    ('eeeeeeee-5555-5555-5555-555555555555', 'CONTRACTOR_REG', 'Contractor Registration G-3', 'Ministry of Construction', '2021-01-01', '2026-01-01', '{"level": "G-3"}'),
    ('eeeeeeee-5555-5555-5555-555555555555', 'TAX', 'Book Keeping Certificate', 'Tax Authority', '2024-01-01', '2024-12-31', '{}');

INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, professional_certifications)
VALUES
    ('eeeeeeee-5555-5555-5555-555555555555', 'Gideon Peretz', 'CEO', 'B.A Economics', 18, ARRAY[]::TEXT[]),
    ('eeeeeeee-5555-5555-5555-555555555555', 'Orly Shemesh', 'Project Manager', 'Technician Diploma', 14, ARRAY[]::TEXT[]);

INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count)
VALUES
    ('eeeeeeee-5555-5555-5555-555555555555', 2023, 15000000, 800000, 25),
    ('eeeeeeee-5555-5555-5555-555555555555', 2022, 14000000, 650000, 22);

-- COMPANY 6: "GROUP COMPANY"
INSERT INTO organizations (id, name, company_number, founding_year, address, phone, email, website, settings)
VALUES ('ffffffff-6666-6666-6666-666666666666', '[TEST] Zeta Systems Ltd', '514678901', 2018, 'Haifa, Israel', '04-6789012', 'info@zeta-test.co.il', 'https://zeta-test.co.il', '{"gap_type": "PARTIAL_WITH_GROUP", "test_profile": true}'::jsonb);

INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_details)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 'Small Security System', 'Private Client', 'PRIVATE', '2022-01-01', '2022-06-30', 'DELIVERY', 8000000, 8000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["Axis"]}', '{"cameras": 60}', 'Standard'),
    ('ffffffff-6666-6666-6666-666666666666', 'Ongoing Maintenance', 'Regular Client', 'PRIVATE', '2023-01-01', '2025-12-31', 'DELIVERY', 12000000, 0, 12000000, 36, 'PRIMARY', 100, 'MAINTENANCE', '{}', '{"sites": 15}', 'SLA 12h');

INSERT INTO company_projects (org_id, project_name, client_name, client_type, start_date, end_date, end_date_type, total_value, establishment_value, maintenance_value, maintenance_months, role_type, role_percentage, project_type, technologies, quantities, sla_details, is_tangent, tangent_description)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 'Haifa Port Project (Omega Group)', 'Haifa Port', 'GOVERNMENT', '2019-01-01', '2021-12-31', 'FINAL_ACCOUNT', 95000000, 80000000, 15000000, 36, 'PRIMARY', 100, 'COMBINED', '{"cameras": ["Axis", "Bosch"]}', '{"cameras": 650}', 'SLA 99.5%', TRUE, 'Project of parent company'),
    ('ffffffff-6666-6666-6666-666666666666', 'Prime Minister Office (Omega Group)', 'Prime Minister Office', 'GOVERNMENT', '2020-06-01', '2022-03-31', 'FINAL_ACCOUNT', 68000000, 68000000, 0, 0, 'PRIMARY', 100, 'ESTABLISHMENT', '{"cameras": ["High-security"]}', '{"cameras": 280}', 'Defense grade', TRUE, 'Project of parent company');

INSERT INTO company_certifications (org_id, cert_type, cert_name, issuing_body, valid_from, valid_until, metadata)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 'ISO', 'ISO 9001:2015', 'Standards Institution of Israel', '2023-01-01', '2026-01-01', '{}'),
    ('ffffffff-6666-6666-6666-666666666666', 'TAX', 'Book Keeping Certificate', 'Tax Authority', '2024-01-01', '2024-12-31', '{}');

INSERT INTO company_personnel (org_id, full_name, role, education, years_experience, professional_certifications)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 'Tomer Ilan', 'CEO', 'MBA', 14, ARRAY['PMP']),
    ('ffffffff-6666-6666-6666-666666666666', 'Liat Cohen', 'Operations Manager', 'B.A', 10, ARRAY[]::TEXT[]);

INSERT INTO company_financials (org_id, fiscal_year, annual_revenue, net_profit, employee_count)
VALUES
    ('ffffffff-6666-6666-6666-666666666666', 2023, 25000000, 1800000, 28),
    ('ffffffff-6666-6666-6666-666666666666', 2022, 20000000, 1400000, 24);

-- TEST TENDER
INSERT INTO tenders (id, org_id, tender_name, tender_number, issuing_body, category, submission_deadline, status)
VALUES ('11111111-aaaa-bbbb-cccc-dddddddddddd', 'aaaaaaaa-1111-1111-1111-111111111111', '[TEST] Sample Tender - Security Systems', 'TEST-2024-001', 'Tel Aviv-Yafo Municipality', 'SECURITY_SYSTEMS', '2024-06-30', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- GATE CONDITIONS (without legal_classification)
INSERT INTO gate_conditions (id, tender_id, condition_text, condition_type, requirement_type, required_amount, required_count, required_years, can_rely_on_subcontractor, status)
VALUES
    ('22222222-aaaa-bbbb-cccc-000000000001', '11111111-aaaa-bbbb-cccc-dddddddddddd', 'Experience: 3 projects of 50M+ NIS in last 5 years', 'GATE', 'EXPERIENCE', 50000000, 3, 5, FALSE, 'PENDING'),
    ('22222222-aaaa-bbbb-cccc-000000000002', '11111111-aaaa-bbbb-cccc-dddddddddddd', 'Financial: Annual revenue 100M+ NIS for 3 years', 'GATE', 'FINANCIAL', 100000000, NULL, 3, FALSE, 'PENDING'),
    ('22222222-aaaa-bbbb-cccc-000000000003', '11111111-aaaa-bbbb-cccc-dddddddddddd', 'Certification: Valid ISO 27001', 'GATE', 'CERTIFICATION', NULL, NULL, NULL, FALSE, 'PENDING'),
    ('22222222-aaaa-bbbb-cccc-000000000004', '11111111-aaaa-bbbb-cccc-dddddddddddd', 'Contractor Registration G-5', 'GATE', 'CERTIFICATION', NULL, NULL, NULL, FALSE, 'PENDING'),
    ('22222222-aaaa-bbbb-cccc-000000000005', '11111111-aaaa-bbbb-cccc-dddddddddddd', 'Seniority: Company operating 7+ years', 'GATE', 'OTHER', NULL, NULL, 7, FALSE, 'PENDING'),
    ('22222222-aaaa-bbbb-cccc-000000000006', '11111111-aaaa-bbbb-cccc-dddddddddddd', 'Personnel: PM with 10+ years experience', 'GATE', 'PERSONNEL', NULL, NULL, 10, FALSE, 'PENDING'),
    ('22222222-aaaa-bbbb-cccc-000000000007', '11111111-aaaa-bbbb-cccc-dddddddddddd', 'Can rely on parent company experience', 'GATE', 'EXPERIENCE', 50000000, 2, 5, TRUE, 'PENDING'),
    ('22222222-aaaa-bbbb-cccc-000000000008', '11111111-aaaa-bbbb-cccc-dddddddddddd', 'Advantage: Defense project experience', 'ADVANTAGE', 'EXPERIENCE', NULL, NULL, NULL, FALSE, 'PENDING')
ON CONFLICT (id) DO NOTHING;

SELECT 'Test profiles created successfully!' as status;
