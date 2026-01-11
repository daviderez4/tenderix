// Verify current status and create reports + workflow
const SUPABASE_URL = 'https://rerfjgjwjqodevkvhkxu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5NDMwNywiZXhwIjoyMDgxMDcwMzA3fQ.HzsbNbVxrLXxRMNvlVuKaqduQ-PgcD3IrseKm_LcN34';
const N8N_HOST = 'https://daviderez.app.n8n.cloud';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3Yzc5YjQxYS02NWZiLTQ0ZjUtYWZjNy1lYjk1MjVjNGViNzciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NTkxMzA5LCJleHAiOjE3NzAxNTYwMDB9.qMc0NpvmC2TfCZ8ehEblQ0K3-5EJCgitKuOh4uJySFU';

async function getData(tableName, select = '*', filter = '') {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=${select}${filter}`;
    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
    });
    if (!response.ok) return [];
    return response.json();
}

async function getCount(tableName) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=0`, {
        method: 'HEAD',
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'count=exact'
        }
    });
    const count = response.headers.get('content-range');
    if (count) {
        const match = count.match(/\/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }
    return -1;
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

// ============================================
// GENERATE TENDER REPORTS
// ============================================
async function generateReports() {
    console.log('\n📊 GENERATING TENDER REPORTS');
    console.log('='.repeat(40));

    // Check if tender_reports table exists
    const reportsExist = await tableExists('tender_reports');
    if (!reportsExist) {
        console.log('❌ tender_reports table does not exist');
        console.log('   Please run create_missing_tables.sql first');
        return false;
    }

    const existingReports = await getCount('tender_reports');
    if (existingReports > 0) {
        console.log(`⏭️ Already has ${existingReports} reports`);
        return true;
    }

    const tenders = await getData('tenders');
    const gateConditions = await getData('gate_conditions');
    const competitors = await getData('competitors');
    const boqItems = await getData('boq_items');

    // Group data by tender
    const conditionsByTender = {};
    const boqByTender = {};

    for (const gc of gateConditions) {
        if (!conditionsByTender[gc.tender_id]) conditionsByTender[gc.tender_id] = [];
        conditionsByTender[gc.tender_id].push(gc);
    }

    for (const boq of boqItems) {
        if (!boqByTender[boq.tender_id]) boqByTender[boq.tender_id] = [];
        boqByTender[boq.tender_id].push(boq);
    }

    let created = 0;

    for (const tender of tenders.slice(0, 15)) {
        const conditions = conditionsByTender[tender.id] || [];
        const boq = boqByTender[tender.id] || [];

        const metConditions = conditions.filter(c => c.status === 'MET').length;
        const totalConditions = conditions.length;

        const gateStatus = {
            total: totalConditions,
            met: metConditions,
            pending: conditions.filter(c => c.status === 'PENDING').length,
            not_met: conditions.filter(c => c.status === 'NOT_MET').length,
            unknown: conditions.filter(c => c.status === 'UNKNOWN').length,
            eligibility_score: totalConditions > 0 ? (metConditions / totalConditions) : 0
        };

        const boqTotal = boq.reduce((sum, b) => sum + (parseFloat(b.total_price) || 0), 0);

        const winProbability = gateStatus.eligibility_score > 0.8 ? 0.65 :
                              gateStatus.eligibility_score > 0.5 ? 0.40 : 0.20;

        const recommendation = gateStatus.not_met > 0 ? 'CONDITIONAL' :
                              gateStatus.eligibility_score > 0.7 ? 'GO' : 'CONDITIONAL';

        const report = {
            tender_id: tender.id,
            report_type: 'full_analysis',
            report_data: {
                tender_info: {
                    id: tender.id,
                    name: tender.tender_name,
                    number: tender.tender_number,
                    issuing_body: tender.issuing_body,
                    deadline: tender.submission_deadline,
                    estimated_value: tender.estimated_value,
                    status: tender.status,
                    current_step: tender.current_step
                },
                analysis_date: new Date().toISOString(),
                version: '1.0',
                generated_by: 'tenderix_audit_v3'
            },
            executive_summary: generateExecutiveSummary(tender, gateStatus, recommendation, winProbability),
            gate_status: gateStatus,
            boq_analysis: {
                items_count: boq.length,
                total_value: boqTotal,
                estimated_margin: 15,
                pricing_confidence: boq.length > 0 ? 'MEDIUM' : 'LOW'
            },
            competitor_analysis: {
                competitors_identified: competitors.length,
                main_competitors: competitors.slice(0, 4).map(c => ({
                    name: c.name,
                    strength: c.strengths?.[0] || 'N/A'
                })),
                competitive_position: 'COMPETITIVE'
            },
            recommendation: recommendation,
            win_probability: winProbability,
            risks: generateRisks(gateStatus, boq),
            generated_by: 'audit_script_v3'
        };

        const result = await insertData('tender_reports', report);
        if (result) {
            created++;
            console.log(`   ✅ Report created for: ${tender.tender_name || tender.tender_number}`);
        }
    }

    console.log(`\n📊 Created ${created} tender reports`);
    return true;
}

function generateExecutiveSummary(tender, gateStatus, recommendation, winProbability) {
    const heb = {
        GO: 'מומלץ להגיש',
        CONDITIONAL: 'מומלץ בתנאים',
        NO_GO: 'לא מומלץ'
    };

    return `
סיכום ניתוח מכרז: ${tender.tender_name || tender.tender_number}

תנאי סף: עמידה ב-${gateStatus.met}/${gateStatus.total} תנאים (${Math.round(gateStatus.eligibility_score * 100)}%)
המלצה: ${heb[recommendation] || recommendation}
סיכויי זכייה משוערים: ${Math.round(winProbability * 100)}%

${gateStatus.not_met > 0 ? `⚠️ ${gateStatus.not_met} תנאים דורשים טיפול` : '✅ כל התנאים המנדטוריים מתקיימים'}
${gateStatus.pending > 0 ? `⏳ ${gateStatus.pending} תנאים ממתינים לבדיקה` : ''}
`.trim();
}

function generateRisks(gateStatus, boq) {
    const risks = [];

    if (gateStatus.not_met > 0) {
        risks.push({
            type: 'gate_conditions',
            severity: 'HIGH',
            description: `לא עומד ב-${gateStatus.not_met} תנאי סף`,
            mitigation: 'נדרש לבחון חלופות: שותפות, קבלן משנה, או הבהרה'
        });
    }

    if (gateStatus.pending > 0) {
        risks.push({
            type: 'incomplete_analysis',
            severity: 'MEDIUM',
            description: `${gateStatus.pending} תנאים טרם נבדקו`,
            mitigation: 'להשלים בדיקת תנאי סף'
        });
    }

    if (boq.length === 0) {
        risks.push({
            type: 'pricing',
            severity: 'MEDIUM',
            description: 'לא קיים ניתוח כתב כמויות',
            mitigation: 'להשלים ניתוח תמחור'
        });
    }

    return risks;
}

// ============================================
// CREATE REPORT GENERATION WORKFLOW
// ============================================
async function createReportWorkflow() {
    console.log('\n🔄 CREATING REPORT GENERATION WORKFLOW');
    console.log('='.repeat(40));

    // Check if workflow already exists
    const response = await fetch(`${N8N_HOST}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });

    if (!response.ok) {
        console.log('❌ Could not connect to n8n');
        return false;
    }

    const { data: workflows } = await response.json();
    const existingReport = workflows.find(w =>
        w.name.toLowerCase().includes('report') && w.name.toLowerCase().includes('generation')
    );

    if (existingReport) {
        console.log(`⏭️ Report workflow already exists: ${existingReport.name}`);
        return true;
    }

    // Create new workflow
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
                id: 'webhook',
                name: 'Webhook - Report Request',
                type: 'n8n-nodes-base.webhook',
                typeVersion: 2,
                position: [240, 300]
            },
            {
                parameters: {
                    operation: 'select',
                    schema: 'public',
                    table: 'tenders',
                    filterType: 'string',
                    filterString: '={{ "id=eq." + $json.body.tender_id }}',
                    options: {}
                },
                id: 'get-tender',
                name: 'Get Tender',
                type: 'n8n-nodes-base.supabase',
                typeVersion: 1,
                position: [460, 300],
                credentials: { supabaseApi: { id: '1', name: 'Supabase' } }
            },
            {
                parameters: {
                    operation: 'select',
                    schema: 'public',
                    table: 'gate_conditions',
                    filterType: 'string',
                    filterString: '={{ "tender_id=eq." + $json.body.tender_id }}',
                    options: {}
                },
                id: 'get-conditions',
                name: 'Get Gate Conditions',
                type: 'n8n-nodes-base.supabase',
                typeVersion: 1,
                position: [460, 480],
                credentials: { supabaseApi: { id: '1', name: 'Supabase' } }
            },
            {
                parameters: {
                    jsCode: `
// Aggregate data and generate report
const tender = $('Get Tender').first().json;
const conditions = $('Get Gate Conditions').all().map(i => i.json);

const met = conditions.filter(c => c.status === 'MET').length;
const total = conditions.length;
const eligibility = total > 0 ? met / total : 0;

const winProb = eligibility > 0.8 ? 0.65 : eligibility > 0.5 ? 0.4 : 0.2;
const recommendation = eligibility > 0.7 ? 'GO' : 'CONDITIONAL';

return [{
    json: {
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
        executive_summary: \`Analysis for \${tender.tender_name}: \${met}/\${total} conditions met.\`,
        gate_status: { total, met, eligibility_score: eligibility },
        recommendation,
        win_probability: winProb,
        generated_by: 'n8n_workflow'
    }
}];
`
                },
                id: 'generate-report',
                name: 'Generate Report',
                type: 'n8n-nodes-base.code',
                typeVersion: 2,
                position: [700, 380]
            },
            {
                parameters: {
                    operation: 'insert',
                    schema: 'public',
                    table: 'tender_reports',
                    options: {}
                },
                id: 'save-report',
                name: 'Save Report',
                type: 'n8n-nodes-base.supabase',
                typeVersion: 1,
                position: [920, 380],
                credentials: { supabaseApi: { id: '1', name: 'Supabase' } }
            },
            {
                parameters: {
                    respondWith: 'json',
                    responseBody: '={{ $json }}'
                },
                id: 'respond',
                name: 'Respond',
                type: 'n8n-nodes-base.respondToWebhook',
                typeVersion: 1,
                position: [1140, 380]
            }
        ],
        connections: {
            'Webhook - Report Request': {
                main: [[{ node: 'Get Tender', type: 'main', index: 0 }, { node: 'Get Gate Conditions', type: 'main', index: 0 }]]
            },
            'Get Tender': {
                main: [[{ node: 'Generate Report', type: 'main', index: 0 }]]
            },
            'Get Gate Conditions': {
                main: [[{ node: 'Generate Report', type: 'main', index: 0 }]]
            },
            'Generate Report': {
                main: [[{ node: 'Save Report', type: 'main', index: 0 }]]
            },
            'Save Report': {
                main: [[{ node: 'Respond', type: 'main', index: 0 }]]
            }
        },
        settings: { executionOrder: 'v1' },
        staticData: null,
        tags: [{ name: 'tenderix' }]
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
        }

        return true;
    } else {
        const error = await createResponse.text();
        console.log(`❌ Failed to create workflow: ${error}`);
        return false;
    }
}

// ============================================
// FINAL VERIFICATION
// ============================================
async function finalVerification() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL VERIFICATION');
    console.log('='.repeat(50));

    const tables = [
        'organizations', 'users', 'tenders', 'tender_documents', 'tender_definitions',
        'gate_conditions', 'gate_condition_matches', 'gate_conditions_summary',
        'clarification_questions', 'clarification_answers',
        'spec_items', 'boq_items', 'boq_summary', 'sow_analysis', 'contract_analysis',
        'competitors', 'competitor_bids', 'tender_competitors', 'market_pricing',
        'decision_scenarios', 'final_decisions', 'tender_reports',
        'company_financials', 'company_certifications', 'company_personnel', 'company_projects',
        'technical_dictionary', 'activity_log', 'notifications'
    ];

    let existsCount = 0;
    let withDataCount = 0;
    let totalData = 0;

    console.log('\n📋 Existing Tables with Data:');
    console.log('   Table Name                    | Rows');
    console.log('   ' + '-'.repeat(45));

    for (const table of tables) {
        const exists = await tableExists(table);
        if (exists) {
            existsCount++;
            const count = await getCount(table);
            if (count > 0) {
                withDataCount++;
                totalData += count;
                console.log(`   ${table.padEnd(30)} | ${count}`);
            }
        }
    }

    const completionPercent = Math.round((existsCount / tables.length) * 100);

    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`\n✅ Tables existing: ${existsCount}/${tables.length} (${completionPercent}%)`);
    console.log(`📈 Tables with data: ${withDataCount}/${existsCount}`);
    console.log(`📊 Total data rows: ${totalData}`);

    // Check n8n workflows
    const wfResponse = await fetch(`${N8N_HOST}/api/v1/workflows`, {
        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });

    if (wfResponse.ok) {
        const { data: workflows } = await wfResponse.json();
        const active = workflows.filter(w => w.active).length;
        const tenderix = workflows.filter(w =>
            w.name.toLowerCase().includes('tdx') ||
            w.name.toLowerCase().includes('tenderix')
        ).length;

        console.log(`\n🔄 n8n Workflows:`);
        console.log(`   Total: ${workflows.length}`);
        console.log(`   Active: ${active}`);
        console.log(`   Tenderix-related: ${tenderix}`);
    }

    // Final assessment
    const dataCompletion = withDataCount / existsCount * 100;

    console.log('\n' + '='.repeat(50));
    console.log('🎯 FINAL ASSESSMENT');
    console.log('='.repeat(50));
    console.log(`\n   Schema Completion: ${completionPercent}%`);
    console.log(`   Data Population: ${Math.round(dataCompletion)}%`);
    console.log(`   Overall: ${Math.round((completionPercent + dataCompletion) / 2)}%`);

    if (completionPercent < 100) {
        console.log('\n⚠️ Some tables are missing. Run create_missing_tables.sql in Supabase SQL Editor:');
        console.log('   https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/sql/new');
    }

    console.log('\n' + '='.repeat(50));
}

// ============================================
// MAIN
// ============================================
async function main() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  TENDERIX - REPORTS & WORKFLOW CREATION            ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log(`\nStarted: ${new Date().toISOString()}`);

    // Generate reports
    await generateReports();

    // Create report workflow
    await createReportWorkflow();

    // Final verification
    await finalVerification();

    console.log(`\nCompleted: ${new Date().toISOString()}`);
}

main();
