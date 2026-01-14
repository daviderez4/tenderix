/**
 * Update n8n Workflows Script
 * Uploads fixed workflows to n8n Cloud
 */

require('dotenv').config({ path: './config/.env' });
const fs = require('fs');
const path = require('path');

const N8N_HOST = process.env.N8N_HOST;
const N8N_API_KEY = process.env.N8N_API_KEY;

const workflowsDir = path.join(__dirname, '../n8n-workflows');

// Map of workflow files to their target names in n8n
const workflowMap = {
    'gate-conditions-workflow-fixed.json': 'Gate Conditions',
    'boq-analysis-workflow-fixed.json': 'BOQ Analysis',
    'competitor-analysis-workflow-fixed.json': 'Competitor Analysis',
    'pricing-recommendation-workflow-fixed.json': 'Pricing Recommendation',
    'final-decision-workflow-fixed.json': 'Final Decision'
};

async function listWorkflows() {
    const res = await fetch(`${N8N_HOST}/api/v1/workflows`, {
        headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Accept': 'application/json'
        }
    });

    if (!res.ok) {
        throw new Error(`Failed to list workflows: ${res.status}`);
    }

    const data = await res.json();
    return data.data || [];
}

function cleanWorkflowForApi(workflow) {
    // n8n API only accepts specific fields
    return {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings || { executionOrder: 'v1' },
        staticData: workflow.staticData || null
    };
}

async function createWorkflow(workflow) {
    const cleanedWorkflow = cleanWorkflowForApi(workflow);

    const res = await fetch(`${N8N_HOST}/api/v1/workflows`, {
        method: 'POST',
        headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanedWorkflow)
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to create workflow: ${res.status} - ${err}`);
    }

    return await res.json();
}

async function updateWorkflow(id, workflow) {
    const cleanedWorkflow = cleanWorkflowForApi(workflow);

    const res = await fetch(`${N8N_HOST}/api/v1/workflows/${id}`, {
        method: 'PUT',
        headers: {
            'X-N8N-API-KEY': N8N_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanedWorkflow)
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to update workflow: ${res.status} - ${err}`);
    }

    return await res.json();
}

async function activateWorkflow(id) {
    const res = await fetch(`${N8N_HOST}/api/v1/workflows/${id}/activate`, {
        method: 'POST',
        headers: {
            'X-N8N-API-KEY': N8N_API_KEY
        }
    });

    return res.ok;
}

async function main() {
    console.log('='.repeat(50));
    console.log('N8N WORKFLOW UPDATER');
    console.log('='.repeat(50));
    console.log('Host:', N8N_HOST);
    console.log('');

    // List existing workflows
    console.log('1. Listing existing workflows...\n');
    const existing = await listWorkflows();

    existing.forEach(w => {
        console.log(`   [${w.active ? 'ON' : 'OFF'}] ${w.id}: ${w.name}`);
    });

    console.log('\n2. Processing workflow files...\n');

    for (const [filename, targetName] of Object.entries(workflowMap)) {
        const filepath = path.join(workflowsDir, filename);

        if (!fs.existsSync(filepath)) {
            console.log(`   [SKIP] ${filename} - file not found`);
            continue;
        }

        const workflowData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        workflowData.name = targetName;

        // Check if workflow exists
        const existingWorkflow = existing.find(w =>
            w.name.toLowerCase().includes(targetName.toLowerCase()) ||
            targetName.toLowerCase().includes(w.name.toLowerCase())
        );

        try {
            if (existingWorkflow) {
                // Update existing
                console.log(`   [UPDATE] ${targetName} (ID: ${existingWorkflow.id})`);
                await updateWorkflow(existingWorkflow.id, workflowData);
                await activateWorkflow(existingWorkflow.id);
                console.log(`            Updated and activated!`);
            } else {
                // Create new
                console.log(`   [CREATE] ${targetName}`);
                const created = await createWorkflow(workflowData);
                if (created.id) {
                    await activateWorkflow(created.id);
                    console.log(`            Created with ID: ${created.id}`);
                }
            }
        } catch (e) {
            console.log(`   [ERROR] ${targetName}: ${e.message}`);
        }
    }

    console.log('\n3. Final status...\n');

    const finalList = await listWorkflows();
    finalList.forEach(w => {
        console.log(`   [${w.active ? 'ON' : 'OFF'}] ${w.id}: ${w.name}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('DONE!');
    console.log('='.repeat(50));
}

main().catch(e => {
    console.error('Fatal error:', e.message);
    process.exit(1);
});
