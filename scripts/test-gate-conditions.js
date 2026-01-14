/**
 * Test Gate Conditions Workflow
 */

require('dotenv').config({ path: './config/.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const N8N_WEBHOOK = process.env.N8N_WEBHOOK_URL;

async function testGateConditions() {
    console.log('='.repeat(50));
    console.log('TESTING GATE CONDITIONS WORKFLOW');
    console.log('='.repeat(50));

    // 1. Get a tender
    console.log('\n1. Fetching a tender from Supabase...\n');

    const tendersRes = await fetch(`${SUPABASE_URL}/rest/v1/tenders?select=id,tender_name&limit=1`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    const tenders = await tendersRes.json();

    if (!tenders || tenders.length === 0) {
        console.log('No tenders found!');
        return;
    }

    const tender = tenders[0];
    console.log('   Tender ID:', tender.id);
    console.log('   Tender Name:', tender.tender_name);

    // 2. Trigger the workflow
    console.log('\n2. Triggering Gate Conditions workflow...\n');
    console.log('   Webhook:', N8N_WEBHOOK + '/gate-conditions');

    const startTime = Date.now();

    try {
        const webhookRes = await fetch(`${N8N_WEBHOOK}/gate-conditions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tender_id: tender.id
            })
        });

        const elapsed = Date.now() - startTime;

        console.log('   Status:', webhookRes.status);
        console.log('   Time:', elapsed + 'ms');

        if (webhookRes.ok) {
            const result = await webhookRes.json();
            console.log('\n3. Response:\n');
            console.log(JSON.stringify(result, null, 2));
        } else {
            const error = await webhookRes.text();
            console.log('\n3. Error Response:\n');
            console.log(error);
        }
    } catch (e) {
        console.log('\n3. Network Error:\n');
        console.log(e.message);
    }

    console.log('\n' + '='.repeat(50));
}

testGateConditions().catch(e => {
    console.error('Fatal error:', e.message);
    process.exit(1);
});
