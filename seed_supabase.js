/**
 * Tenderix - Seed Sample Data to Supabase
 * Run with: node seed_supabase.js
 */

const SUPABASE_URL = 'https://rerfjgjwjqodevkvhkxu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5NDMwNywiZXhwIjoyMDgxMDcwMzA3fQ.HzsbNbVxrLXxRMNvlVuKaqduQ-PgcD3IrseKm_LcN34';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function insertData(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if (!res.ok) {
    console.error(`Error inserting into ${table}:`, result);
    return null;
  }
  console.log(`Inserted into ${table}:`, Array.isArray(result) ? result.length + ' rows' : '1 row');
  return result;
}

async function checkTable(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, { headers });
  return res.ok;
}

async function seed() {
  console.log('Seeding Tenderix sample data...\n');

  const tablesExist = await checkTable('organizations');
  if (!tablesExist) {
    console.error('Tables do not exist! Run the schema first.');
    return;
  }

  // 1. Organization
  const org = await insertData('organizations', {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Dekel Security Systems Ltd',
    company_number: '514832567',
    founding_year: 2008,
    address: 'Habarzel 34, Tel Aviv',
    phone: '03-6789000',
    email: 'info@dekel-security.co.il',
    website: 'https://dekel-security.co.il',
    settings: { default_currency: 'ILS', language: 'he' }
  });
  if (!org) return;

  // 2. Company Financials
  await insertData('company_financials', [
    { org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', fiscal_year: 2023, annual_revenue: 85000000, net_profit: 6800000, employee_count: 120, audited: true },
    { org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', fiscal_year: 2024, annual_revenue: 95000000, net_profit: 7600000, employee_count: 135, audited: true },
    { org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', fiscal_year: 2025, annual_revenue: 110000000, net_profit: 8800000, employee_count: 150, audited: true }
  ]);

  // 3. Certifications
  await insertData('company_certifications', [
    { org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', cert_type: 'ISO', cert_name: 'ISO 9001:2015', cert_number: 'IL-9001-2024-1234', issuing_body: 'Israel Standards Institute', valid_from: '2024-01-01', valid_until: '2027-01-01' },
    { org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', cert_type: 'ISO', cert_name: 'ISO 27001:2022', cert_number: 'IL-27001-2024-5678', issuing_body: 'Israel Standards Institute', valid_from: '2024-03-01', valid_until: '2027-03-01' },
    { org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', cert_type: 'CONTRACTOR_REG', cert_name: 'Contractor Registration 200', cert_number: 'K-200-5432', issuing_body: 'Contractor Registrar', valid_from: '2020-01-01', valid_until: '2026-12-31' },
    { org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', cert_type: 'SECURITY_CLEARANCE', cert_name: 'Security Clearance', cert_number: 'ML/2024/1234', issuing_body: 'MOD', valid_from: '2024-01-01', valid_until: '2026-01-01' },
    { org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', cert_type: 'TAX', cert_name: 'Tax Certificate', cert_number: 'NS-2025-001', issuing_body: 'Tax Authority', valid_from: '2025-01-01', valid_until: '2025-12-31' }
  ]);

  // 4. Personnel
  await insertData('company_personnel', [
    { id: 'b1000001-0000-0000-0000-000000000001', org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', full_name: 'Avi Dekel', id_number: '012345678', role: 'CEO', department: 'Management', education: 'MBA', education_institution: 'Tel Aviv University', years_experience: 25, hire_date: '2008-01-01', professional_certifications: ['PMP', 'Six Sigma Black Belt'], security_clearance: 'Top Secret' },
    { id: 'b1000003-0000-0000-0000-000000000003', org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', full_name: 'Moshe Katz', id_number: '034567890', role: 'Senior PM', department: 'Projects', education: 'BSc Electrical Engineering', education_institution: 'BGU', years_experience: 15, hire_date: '2015-01-01', professional_certifications: ['PMP', 'CCTV Designer', 'Milestone Certified'], security_clearance: 'Secret' },
    { id: 'b1000004-0000-0000-0000-000000000004', org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', full_name: 'Yael Golan', id_number: '045678901', role: 'Integration Manager', department: 'Technology', education: 'BSc Computer Science', education_institution: 'Hebrew University', years_experience: 12, hire_date: '2016-06-01', professional_certifications: ['CCNA', 'PSIM Certified', 'Genetec Certified'], security_clearance: 'Secret' }
  ]);

  // 5. Company Projects
  await insertData('company_projects', [
    {
      id: 'd0100001-0000-0000-0000-000000000001',
      org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      project_name: 'Municipal CCTV - Tel Aviv',
      project_number: 'P-2023-001',
      client_name: 'Tel Aviv Municipality',
      client_type: 'MUNICIPAL',
      start_date: '2022-03-01',
      end_date: '2023-12-31',
      end_date_type: 'FINAL_ACCOUNT',
      total_value: 45000000,
      establishment_value: 38000000,
      maintenance_value: 7000000,
      maintenance_months: 24,
      role_type: 'PRIMARY',
      role_percentage: 100,
      project_type: 'COMBINED',
      category: 'VIDEO',
      technologies: { cameras: ['Axis P3245-V', 'Axis Q6135-LE'], vms: 'Milestone XProtect Corporate', analytics: 'BriefCam' },
      quantities: { cameras: 850, servers: 12, storage_tb: 500, workstations: 25 },
      integrations: ['PSIM - CNL', 'Municipal Call Center', 'Police 100'],
      sla_details: 'SLA 99.5% uptime, 4h response',
      location: 'Tel Aviv',
      site_count: 1,
      project_manager_id: 'b1000003-0000-0000-0000-000000000003'
    },
    {
      id: 'd0100002-0000-0000-0000-000000000002',
      org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      project_name: 'Security System - IDF Base',
      project_number: 'P-2022-015',
      client_name: 'MOD - Tech Unit',
      client_type: 'DEFENSE',
      start_date: '2021-06-01',
      end_date: '2023-03-31',
      end_date_type: 'DELIVERY',
      total_value: 62000000,
      establishment_value: 55000000,
      maintenance_value: 7000000,
      maintenance_months: 36,
      role_type: 'PRIMARY',
      role_percentage: 85,
      project_type: 'COMBINED',
      category: 'COMBINED',
      technologies: { cameras: ['Bosch AUTODOME IP 5000i', 'Hanwha XNP-6400RW'], vms: 'Genetec Security Center', access_control: 'Lenel OnGuard' },
      quantities: { cameras: 420, access_readers: 180, barriers: 12 },
      integrations: ['C4I System', 'Perimeter Detection', 'Guard Tour'],
      sla_details: 'SLA 99.9% uptime, 2h response, 24/7',
      location: 'Central Israel',
      site_count: 1,
      project_manager_id: 'b1000003-0000-0000-0000-000000000003'
    },
    {
      id: 'd0100007-0000-0000-0000-000000000007',
      org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      project_name: 'Security Maintenance - Ministry of Education',
      project_number: 'P-2024-M-001',
      client_name: 'Ministry of Education',
      client_type: 'GOVERNMENT',
      start_date: '2024-01-01',
      end_date: '2026-12-31',
      end_date_type: 'WARRANTY',
      total_value: 9000000,
      establishment_value: 0,
      maintenance_value: 9000000,
      maintenance_months: 36,
      role_type: 'PRIMARY',
      role_percentage: 100,
      project_type: 'MAINTENANCE',
      category: 'VIDEO',
      technologies: { cameras: ['Mixed - Axis, Hikvision, Dahua'], vms: 'Mixed' },
      quantities: { cameras: 3200, sites: 180 },
      sla_details: 'SLA 99% uptime, 24h response, NBD parts',
      location: 'Nationwide',
      site_count: 180
    }
  ]);

  // 6. Tender
  await insertData('tenders', {
    id: 'e1e1e1e1-0000-0000-0000-000000000001',
    org_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    tender_number: 'Tender 2025/001',
    tender_name: 'Municipal CCTV System - Holon Municipality',
    issuing_body: 'Holon Municipality',
    issuing_body_type: 'MUNICIPAL',
    publish_date: '2025-01-01',
    clarification_deadline: '2025-01-25T14:00:00+02:00',
    submission_deadline: '2025-02-15T14:00:00+02:00',
    estimated_value: 25000000,
    guarantee_amount: 500000,
    guarantee_type: 'BANK',
    contract_duration_months: 36,
    scoring_method: 'QUALITY_PRICE',
    quality_weight: 40,
    price_weight: 60,
    category: 'VIDEO',
    current_step: 'GATES',
    status: 'ACTIVE',
    go_nogo_decision: 'PENDING'
  });

  // 7. Gate Conditions
  await insertData('gate_conditions', [
    {
      id: 'a1000001-0000-0000-0000-000000000001',
      tender_id: 'e1e1e1e1-0000-0000-0000-000000000001',
      condition_number: '1',
      condition_text: 'Average annual revenue of 50M NIS in the last 3 years (2022-2024)',
      condition_type: 'GATE',
      is_mandatory: true,
      requirement_type: 'CAPABILITY',
      entity_type: 'COMPANY',
      required_amount: 50000000,
      amount_currency: 'ILS',
      required_years: 3,
      status: 'UNKNOWN',
      source_page: 15,
      source_section: '2.1'
    },
    {
      id: 'a1000002-0000-0000-0000-000000000002',
      tender_id: 'e1e1e1e1-0000-0000-0000-000000000001',
      condition_number: '2',
      condition_text: 'Single project of at least 20M NIS in the last 5 years',
      condition_type: 'GATE',
      is_mandatory: true,
      requirement_type: 'EXECUTION',
      entity_type: 'PROJECT',
      required_amount: 20000000,
      required_count: 1,
      required_years: 5,
      status: 'UNKNOWN',
      source_page: 15,
      source_section: '2.2'
    },
    {
      id: 'a1000003-0000-0000-0000-000000000003',
      tender_id: 'e1e1e1e1-0000-0000-0000-000000000001',
      condition_number: '3',
      condition_text: 'Experience in municipal CCTV with at least 100 cameras',
      condition_type: 'GATE',
      is_mandatory: true,
      requirement_type: 'EXECUTION',
      entity_type: 'PROJECT',
      required_count: 100,
      required_years: 5,
      status: 'UNKNOWN',
      source_page: 16,
      source_section: '2.3'
    },
    {
      id: 'a1000004-0000-0000-0000-000000000004',
      tender_id: 'e1e1e1e1-0000-0000-0000-000000000001',
      condition_number: '4',
      condition_text: 'VMS integration experience (Milestone or Genetec) with municipal systems',
      condition_type: 'GATE',
      is_mandatory: true,
      requirement_type: 'EXECUTION',
      entity_type: 'PROJECT',
      required_count: 1,
      required_years: 5,
      status: 'UNKNOWN',
      source_page: 16,
      source_section: '2.4'
    },
    {
      id: 'a1000005-0000-0000-0000-000000000005',
      tender_id: 'e1e1e1e1-0000-0000-0000-000000000001',
      condition_number: '5',
      condition_text: 'Valid ISO 9001 certification',
      condition_type: 'GATE',
      is_mandatory: true,
      requirement_type: 'CAPABILITY',
      entity_type: 'CERTIFICATION',
      status: 'UNKNOWN',
      source_page: 17,
      source_section: '2.5'
    },
    {
      id: 'a1000008-0000-0000-0000-000000000008',
      tender_id: 'e1e1e1e1-0000-0000-0000-000000000001',
      condition_number: '8',
      condition_text: 'PMP certified PM with 10+ years experience in security projects',
      condition_type: 'GATE',
      is_mandatory: true,
      requirement_type: 'CAPABILITY',
      entity_type: 'PERSONNEL',
      required_count: 1,
      required_years: 10,
      status: 'UNKNOWN',
      source_page: 18,
      source_section: '2.8'
    }
  ]);

  // 8. Gate Conditions Summary
  await insertData('gate_conditions_summary', {
    tender_id: 'e1e1e1e1-0000-0000-0000-000000000001',
    total_conditions: 6,
    mandatory_count: 6,
    meets_count: 0,
    partially_meets_count: 0,
    does_not_meet_count: 0,
    unknown_count: 6,
    overall_eligibility: 'UNKNOWN',
    blocking_conditions: [],
    recommendations: ['Run automatic gate matching', 'Collect required documents']
  });

  // 9. BOQ Items
  await insertData('boq_items', [
    { tender_id: 'e1e1e1e1-0000-0000-0000-000000000001', item_number: '1.1', chapter: '1 - Cameras', description: 'IP Dome Camera 4MP - Axis P3245-V or equivalent', unit: 'unit', quantity: 120 },
    { tender_id: 'e1e1e1e1-0000-0000-0000-000000000001', item_number: '1.2', chapter: '1 - Cameras', description: 'IP PTZ Camera 2MP - Axis Q6135-LE or equivalent', unit: 'unit', quantity: 30 },
    { tender_id: 'e1e1e1e1-0000-0000-0000-000000000001', item_number: '2.1', chapter: '2 - Servers', description: 'Recording Server Dell PowerEdge R750', unit: 'unit', quantity: 4 },
    { tender_id: 'e1e1e1e1-0000-0000-0000-000000000001', item_number: '2.2', chapter: '2 - Servers', description: 'Milestone XProtect Corporate License - per channel', unit: 'unit', quantity: 200 },
    { tender_id: 'e1e1e1e1-0000-0000-0000-000000000001', item_number: '3.1', chapter: '3 - Infrastructure', description: 'Outdoor IP66 Cabinet', unit: 'unit', quantity: 25 },
    { tender_id: 'e1e1e1e1-0000-0000-0000-000000000001', item_number: '4.1', chapter: '4 - Fiber', description: 'Fiber optic cable - underground', unit: 'meter', quantity: 15000 }
  ]);

  console.log('\nSeeding completed successfully!');
  console.log('\nVerify with MCP tools:');
  console.log('  - list_tenders');
  console.log('  - get_gate_conditions tender_id=e1e1e1e1-0000-0000-0000-000000000001');
}

seed().catch(console.error);
