// Create Report Workflow and Missing Tables
const SUPABASE_URL = 'https://rerfjgjwjqodevkvhkxu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5NDMwNywiZXhwIjoyMDgxMDcwMzA3fQ.HzsbNbVxrLXxRMNvlVuKaqduQ-PgcD3IrseKm_LcN34';
const N8N_HOST = 'https://daviderez.app.n8n.cloud';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3Yzc5YjQxYS02NWZiLTQ0ZjUtYWZjNy1lYjk1MjVjNGViNzciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NTkxMzA5LCJleHAiOjE3NzAxNTYwMDB9.qMc0NpvmC2TfCZ8ehEblQ0K3-5EJCgitKuOh4uJySFU';

async function tableExists(tableName) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=0`, {
        method: 'GET',
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
    });
    return response.ok;
}

async function insertData(tableName, data) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
    });
    return response.ok ? await response.json() : null;
}

async function getData(tableName, select = '*') {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=${select}`, {
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
    });
    if (!response.ok) return [];
    return response.json();
}

// ============================================
// CREATE REPORT WORKFLOW (Fixed - no tags)
// ============================================
async function createReportWorkflow() {
    console.log('\n🔄 CREATING REPORT GENERATION WORKFLOW');
    console.log('='.repeat(40));

    // Check existing workflows
    const response = await fetch(`${N8N_HOST}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });

    if (!response.ok) {
        console.log('❌ Could not connect to n8n');
        return false;
    }

    const { data: workflows } = await response.json();
    const existing = workflows.find(w => w.name === 'TDX-Report-Generation');

    if (existing) {
        console.log(`⏭️ Workflow already exists: ${existing.name} (ID: ${existing.id})`);
        return true;
    }

    // Create workflow without tags (which is read-only)
    const workflow = {
        name: 'TDX-Report-Generation',
        nodes: [
            {
                parameters: {
                    httpMethod: 'POST',
                    path: 'tenderix/generate-report',
                    responseMode: 'responseNode',
                    options: {}
                },
                id: 'webhook-1',
                name: 'Webhook',
                type: 'n8n-nodes-base.webhook',
                typeVersion: 2,
                position: [240, 300]
            },
            {
                parameters: {
                    jsCode: `
// Generate comprehensive tender report
const tenderId = $json.body?.tender_id || $json.query?.tender_id;

if (!tenderId) {
    return [{ json: { error: 'tender_id is required' } }];
}

// Fetch tender data
const supabaseUrl = 'https://rerfjgjwjqodevkvhkxu.supabase.co';
const supabaseKey = '${SUPABASE_SERVICE_KEY}';

const headers = {
    'apikey': supabaseKey,
    'Authorization': 'Bearer ' + supabaseKey
};

// Get tender
const tenderRes = await fetch(supabaseUrl + '/rest/v1/tenders?id=eq.' + tenderId, { headers });
const tenders = await tenderRes.json();
const tender = tenders[0];

if (!tender) {
    return [{ json: { error: 'Tender not found' } }];
}

// Get gate conditions
const conditionsRes = await fetch(supabaseUrl + '/rest/v1/gate_conditions?tender_id=eq.' + tenderId, { headers });
const conditions = await conditionsRes.json();

// Get competitors
const competitorsRes = await fetch(supabaseUrl + '/rest/v1/competitors?limit=10', { headers });
const competitors = await competitorsRes.json();

// Calculate stats
const met = conditions.filter(c => c.status === 'MET').length;
const total = conditions.length;
const eligibility = total > 0 ? met / total : 0;
const winProb = eligibility > 0.8 ? 0.65 : eligibility > 0.5 ? 0.4 : 0.2;
const recommendation = eligibility > 0.7 && conditions.filter(c => c.status === 'NOT_MET' && c.is_mandatory).length === 0 ? 'GO' : 'CONDITIONAL';

const report = {
    tender_id: tenderId,
    report_type: 'full_analysis',
    report_data: {
        tender_info: {
            id: tender.id,
            name: tender.tender_name,
            number: tender.tender_number,
            issuing_body: tender.issuing_body,
            deadline: tender.submission_deadline,
            estimated_value: tender.estimated_value
        },
        analysis_date: new Date().toISOString(),
        version: '1.0'
    },
    executive_summary: 'ניתוח מכרז ' + tender.tender_name + ': עמידה ב-' + met + '/' + total + ' תנאי סף (' + Math.round(eligibility * 100) + '%). ' + (recommendation === 'GO' ? 'מומלץ להגיש' : 'נדרש בחינה נוספת'),
    gate_status: {
        total: total,
        met: met,
        pending: conditions.filter(c => c.status === 'PENDING').length,
        not_met: conditions.filter(c => c.status === 'NOT_MET').length,
        eligibility_score: eligibility
    },
    boq_analysis: {
        items_count: 0,
        total_value: tender.estimated_value,
        pricing_confidence: 'MEDIUM'
    },
    competitor_analysis: {
        competitors_identified: competitors.length,
        main_competitors: competitors.slice(0, 4).map(c => c.name)
    },
    recommendation: recommendation,
    win_probability: winProb,
    risks: conditions.filter(c => c.status === 'NOT_MET').length > 0 ?
        [{ type: 'gate_conditions', severity: 'HIGH', description: 'תנאי סף לא מתקיימים' }] : [],
    generated_by: 'n8n_workflow'
};

return [{ json: report }];
`
                },
                id: 'code-1',
                name: 'Generate Report',
                type: 'n8n-nodes-base.code',
                typeVersion: 2,
                position: [460, 300]
            },
            {
                parameters: {
                    respondWith: 'json',
                    responseBody: '={{ JSON.stringify($json) }}'
                },
                id: 'respond-1',
                name: 'Respond',
                type: 'n8n-nodes-base.respondToWebhook',
                typeVersion: 1.1,
                position: [680, 300]
            }
        ],
        connections: {
            'Webhook': {
                main: [[{ node: 'Generate Report', type: 'main', index: 0 }]]
            },
            'Generate Report': {
                main: [[{ node: 'Respond', type: 'main', index: 0 }]]
            }
        },
        settings: {
            executionOrder: 'v1'
        }
    };

    const createResponse = await fetch(`${N8N_HOST}/api/v1/workflows`, {
        method: 'POST',
        headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflow)
    });

    if (createResponse.ok) {
        const created = await createResponse.json();
        console.log(`✅ Created workflow: ${created.name} (ID: ${created.id})`);

        // Activate it
        const activateResponse = await fetch(`${N8N_HOST}/api/v1/workflows/${created.id}/activate`, {
            method: 'POST',
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
        });

        if (activateResponse.ok) {
            console.log('✅ Workflow activated');
            console.log(`\n📍 Webhook URL: ${N8N_HOST}/webhook/tenderix/generate-report`);
        } else {
            console.log('⚠️ Workflow created but not activated');
        }

        return created.id;
    } else {
        const error = await createResponse.text();
        console.log(`❌ Failed to create workflow: ${error}`);
        return null;
    }
}

// ============================================
// GENERATE SAMPLE REPORTS
// ============================================
async function generateSampleReports() {
    console.log('\n📊 GENERATING SAMPLE REPORTS');
    console.log('='.repeat(40));

    const reportsExist = await tableExists('tender_reports');
    if (!reportsExist) {
        console.log('⚠️ tender_reports table does not exist');
        console.log('   Creating via workaround...');

        // We'll use final_decisions table to store report-like data
        // or create reports as JSON in an existing table
        console.log('   Reports will be generated when table is created');
        console.log('\n📋 SQL to create tender_reports table:');
        console.log(`
CREATE TABLE IF NOT EXISTS tender_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL DEFAULT 'full_analysis',
    report_data JSONB NOT NULL DEFAULT '{}',
    executive_summary TEXT,
    gate_status JSONB,
    boq_analysis JSONB,
    competitor_analysis JSONB,
    recommendation TEXT,
    win_probability DECIMAL(3,2),
    risks JSONB,
    generated_by TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_reports_tender ON tender_reports(tender_id);
`);
        return false;
    }

    // Generate reports for tenders
    const tenders = await getData('tenders');
    const conditions = await getData('gate_conditions');
    const competitors = await getData('competitors');

    const conditionsByTender = {};
    for (const c of conditions) {
        if (!conditionsByTender[c.tender_id]) conditionsByTender[c.tender_id] = [];
        conditionsByTender[c.tender_id].push(c);
    }

    let created = 0;

    for (const tender of tenders.slice(0, 10)) {
        const conds = conditionsByTender[tender.id] || [];
        const met = conds.filter(c => c.status === 'MET').length;
        const total = conds.length;
        const eligibility = total > 0 ? met / total : 0;
        const winProb = eligibility > 0.8 ? 0.65 : eligibility > 0.5 ? 0.4 : 0.2;

        const report = {
            tender_id: tender.id,
            report_type: 'full_analysis',
            report_data: {
                tender_info: {
                    name: tender.tender_name,
                    number: tender.tender_number,
                    issuing_body: tender.issuing_body
                },
                analysis_date: new Date().toISOString()
            },
            executive_summary: `ניתוח מכרז ${tender.tender_name || tender.tender_number}: עמידה ב-${met}/${total} תנאים (${Math.round(eligibility * 100)}%)`,
            gate_status: { total, met, eligibility_score: eligibility },
            boq_analysis: { items_count: 0, total_value: tender.estimated_value },
            competitor_analysis: { competitors_identified: competitors.length },
            recommendation: eligibility > 0.7 ? 'GO' : 'CONDITIONAL',
            win_probability: winProb,
            risks: [],
            generated_by: 'audit_script'
        };

        const result = await insertData('tender_reports', report);
        if (result) created++;
    }

    console.log(`✅ Created ${created} reports`);
    return created > 0;
}

// ============================================
// MAIN
// ============================================
async function main() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  TENDERIX - WORKFLOW & REPORTS CREATION            ║');
    console.log('╚════════════════════════════════════════════════════╝');

    // Create workflow
    const workflowId = await createReportWorkflow();

    // Generate reports
    await generateSampleReports();

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));

    if (workflowId) {
        console.log(`\n✅ Report Generation Workflow: Created`);
        console.log(`   Webhook: POST ${N8N_HOST}/webhook/tenderix/generate-report`);
        console.log(`   Body: { "tender_id": "<uuid>" }`);
    }

    console.log('\n📋 To complete setup, run this SQL in Supabase:');
    console.log('   https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/sql/new');
    console.log(`
CREATE TABLE IF NOT EXISTS tender_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL DEFAULT 'full_analysis',
    report_data JSONB NOT NULL DEFAULT '{}',
    executive_summary TEXT,
    gate_status JSONB,
    boq_analysis JSONB,
    competitor_analysis JSONB,
    recommendation TEXT,
    win_probability DECIMAL(3,2),
    risks JSONB,
    generated_by TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);
`);
}

main();
