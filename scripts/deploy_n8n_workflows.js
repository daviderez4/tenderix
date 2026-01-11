/**
 * Deploy Tenderix v3.0 Workflows to n8n
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const N8N_HOST = process.env.N8N_HOST;
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_HOST || !N8N_API_KEY) {
    console.error('Missing n8n credentials');
    process.exit(1);
}

const workflows = [
    { file: '01-document-intake-enhanced.json', name: 'Document Intake Enhanced' },
    { file: '02-gate-matching-enhanced.json', name: 'Gate Matching Enhanced' },
    { file: '03-boq-analysis-enhanced.json', name: 'BOQ Analysis Enhanced' },
    { file: '04-competitor-intelligence.json', name: 'Competitor Intelligence' },
    { file: '05-full-analysis-pipeline.json', name: 'Full Analysis Pipeline' }
];

async function deployWorkflows() {
    console.log('🚀 Deploying Tenderix v3.0 Workflows to n8n\n');
    console.log(`Host: ${N8N_HOST}\n`);

    for (const wf of workflows) {
        const filePath = path.join(__dirname, '../n8n-workflows', wf.file);

        if (!fs.existsSync(filePath)) {
            console.log(`❌ ${wf.name}: File not found`);
            continue;
        }

        try {
            const workflowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Check if workflow exists
            const listResponse = await fetch(`${N8N_HOST}/api/v1/workflows`, {
                headers: {
                    'X-N8N-API-KEY': N8N_API_KEY
                }
            });

            const existingWorkflows = await listResponse.json();
            const existing = existingWorkflows.data?.find(w => w.name === workflowData.name);

            if (existing) {
                // Update existing workflow
                const updateResponse = await fetch(`${N8N_HOST}/api/v1/workflows/${existing.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-N8N-API-KEY': N8N_API_KEY
                    },
                    body: JSON.stringify({
                        nodes: workflowData.nodes,
                        connections: workflowData.connections,
                        settings: workflowData.settings
                    })
                });

                if (updateResponse.ok) {
                    console.log(`✅ ${wf.name}: Updated (ID: ${existing.id})`);
                } else {
                    const error = await updateResponse.text();
                    console.log(`⚠️ ${wf.name}: Update failed - ${error.substring(0, 50)}`);
                }
            } else {
                // Create new workflow - use only required fields
                const createPayload = {
                    name: workflowData.name,
                    nodes: workflowData.nodes,
                    connections: workflowData.connections,
                    settings: workflowData.settings || {}
                };

                const createResponse = await fetch(`${N8N_HOST}/api/v1/workflows`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-N8N-API-KEY': N8N_API_KEY
                    },
                    body: JSON.stringify(createPayload)
                });

                if (createResponse.ok) {
                    const created = await createResponse.json();
                    console.log(`✅ ${wf.name}: Created (ID: ${created.id})`);

                    // Activate the workflow
                    await fetch(`${N8N_HOST}/api/v1/workflows/${created.id}/activate`, {
                        method: 'POST',
                        headers: { 'X-N8N-API-KEY': N8N_API_KEY }
                    });
                } else {
                    const error = await createResponse.text();
                    console.log(`⚠️ ${wf.name}: Create failed - ${error.substring(0, 100)}`);
                }
            }
        } catch (err) {
            console.log(`❌ ${wf.name}: ${err.message}`);
        }
    }

    console.log('\n========================================');
    console.log('📋 Webhook URLs:');
    console.log('========================================\n');

    console.log(`Intake:       ${N8N_HOST}/webhook/tdx-intake`);
    console.log(`Gate Match:   ${N8N_HOST}/webhook/tdx-gate-match`);
    console.log(`BOQ Analysis: ${N8N_HOST}/webhook/tdx-boq-analyze`);
    console.log(`Competitors:  ${N8N_HOST}/webhook/tdx-competitors`);
    console.log(`Full:         ${N8N_HOST}/webhook/tdx-full-analysis`);

    console.log('\n✅ Deployment complete!');
}

deployWorkflows().catch(console.error);
