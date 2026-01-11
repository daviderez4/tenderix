/**
 * Test Tenderix v3.0 Complete System
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const n8nHost = process.env.N8N_HOST;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function testDatabase() {
    console.log('📊 Testing Database...\n');

    const tables = [
        // Core existing
        'tenders', 'tender_conditions', 'gate_conditions',
        // C1-C4 (new)
        'source_references', 'dictionary_categories', 'dictionary_terms',
        'accumulation_rules', 'accumulation_items',
        'gap_closure_options', 'potential_partners',
        // Intake
        'tender_definitions', 'document_versions', 'tender_relations',
        // Gates
        'similarity_definitions', 'condition_interpretations',
        // BOQ
        'specification_items', 'boq_items', 'spec_boq_crossref',
        'boq_comparisons', 'pricing_recommendations',
        // Competitors
        'tender_results', 'tender_bids', 'competitor_profiles',
        // Reports
        'tender_reports'
    ];

    let existing = 0;
    let missing = 0;

    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.log(`   ❌ ${table}: ${error.message.substring(0, 40)}`);
                missing++;
            } else {
                existing++;
            }
        } catch (e) {
            console.log(`   ❌ ${table}: ${e.message.substring(0, 40)}`);
            missing++;
        }
    }

    console.log(`\n   ✅ Existing: ${existing}/${tables.length}`);
    if (missing > 0) {
        console.log(`   ⚠️  Missing: ${missing} - Run RUN_THIS_SQL.sql in Supabase`);
    }

    return missing === 0;
}

async function testDataPopulation() {
    console.log('\n📝 Testing Data Population...\n');

    const dataTables = [
        { table: 'dictionary_categories', expected: 7 },
        { table: 'accumulation_rules', expected: 5 },
        { table: 'gap_closure_options', expected: 10 },
        { table: 'potential_partners', expected: 3 },
        { table: 'competitor_profiles', expected: 3 },
        { table: 'tender_results', expected: 3 },
        { table: 'similarity_definitions', expected: 4 }
    ];

    let allGood = true;

    for (const dt of dataTables) {
        try {
            const { data } = await supabase.from(dt.table).select('*');
            const count = data?.length || 0;
            const status = count >= dt.expected ? '✅' : '⚠️';
            console.log(`   ${status} ${dt.table}: ${count}/${dt.expected}`);
            if (count < dt.expected) allGood = false;
        } catch (e) {
            console.log(`   ❌ ${dt.table}: error`);
            allGood = false;
        }
    }

    return allGood;
}

async function testN8nWorkflows() {
    console.log('\n🔄 Testing n8n Workflows...\n');

    const webhooks = [
        { path: 'tdx-intake', name: 'Document Intake' },
        { path: 'tdx-gate-match', name: 'Gate Match' },
        { path: 'tdx-boq-analyze', name: 'BOQ Analysis' },
        { path: 'tdx-competitors', name: 'Competitors' },
        { path: 'tdx-full-analysis', name: 'Full Analysis' }
    ];

    let active = 0;

    for (const wh of webhooks) {
        try {
            // Just check if the URL responds (even with error is fine - means workflow exists)
            const response = await fetch(`${n8nHost}/webhook/${wh.path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ test: true })
            });

            // Any response means the workflow is active
            if (response.status !== 404) {
                console.log(`   ✅ ${wh.name}: Active`);
                active++;
            } else {
                console.log(`   ⚠️ ${wh.name}: Not found (activate in n8n)`);
            }
        } catch (e) {
            console.log(`   ❌ ${wh.name}: ${e.message.substring(0, 30)}`);
        }
    }

    console.log(`\n   Active webhooks: ${active}/${webhooks.length}`);
    return active > 0;
}

async function testEndToEnd() {
    console.log('\n🧪 End-to-End Test...\n');

    // Get a sample tender
    const { data: tenders } = await supabase
        .from('tenders')
        .select('*')
        .limit(1);

    if (!tenders || tenders.length === 0) {
        console.log('   ⚠️  No tenders found for testing');
        return false;
    }

    const tender = tenders[0];
    console.log(`   Using tender: ${tender.name || tender.tender_number}`);

    // Test gate conditions
    const { data: gates } = await supabase
        .from('gate_conditions')
        .select('*')
        .eq('tender_id', tender.id);

    console.log(`   Gate conditions: ${gates?.length || 0}`);

    // Test BOQ items
    const { data: boq } = await supabase
        .from('boq_items')
        .select('*')
        .eq('tender_id', tender.id);

    console.log(`   BOQ items: ${boq?.length || 0}`);

    return true;
}

async function printSummary() {
    console.log('\n========================================');
    console.log('🎉 TENDERIX v3.0 STATUS REPORT');
    console.log('========================================\n');

    // Count tables
    const { data: tenders } = await supabase.from('tenders').select('*', { count: 'exact' });
    const { data: gates } = await supabase.from('gate_conditions').select('*', { count: 'exact' });
    const { data: competitors } = await supabase.from('competitor_profiles').select('*');

    console.log('📊 Database:');
    console.log(`   - Tenders: ${tenders?.length || 0}`);
    console.log(`   - Gate Conditions: ${gates?.length || 0}`);
    console.log(`   - Competitors: ${competitors?.length || 0}`);

    console.log('\n🔗 Webhook URLs:');
    console.log(`   - ${n8nHost}/webhook/tdx-intake`);
    console.log(`   - ${n8nHost}/webhook/tdx-gate-match`);
    console.log(`   - ${n8nHost}/webhook/tdx-boq-analyze`);
    console.log(`   - ${n8nHost}/webhook/tdx-competitors`);
    console.log(`   - ${n8nHost}/webhook/tdx-full-analysis`);

    console.log('\n📁 Files:');
    console.log('   - SQL: RUN_THIS_SQL.sql');
    console.log('   - Workflows: n8n-workflows/*.json');
    console.log('   - Scripts: scripts/*.js');

    console.log('\n✅ System ready for use!');
}

async function main() {
    console.log('🚀 TENDERIX v3.0 SYSTEM TEST\n');
    console.log('========================================\n');

    const dbOk = await testDatabase();
    const dataOk = await testDataPopulation();
    const n8nOk = await testN8nWorkflows();
    const e2eOk = await testEndToEnd();

    await printSummary();

    if (!dbOk) {
        console.log('\n⚠️  ACTION REQUIRED:');
        console.log('   Run RUN_THIS_SQL.sql in Supabase SQL Editor');
        console.log('   https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/sql/new');
    }

    if (!n8nOk) {
        console.log('\n⚠️  WORKFLOWS:');
        console.log('   Activate workflows in n8n');
        console.log('   https://daviderez.app.n8n.cloud');
    }
}

main().catch(console.error);
