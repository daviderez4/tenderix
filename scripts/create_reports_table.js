// Try to create tender_reports table via different methods
const SUPABASE_URL = 'https://rerfjgjwjqodevkvhkxu.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5NDMwNywiZXhwIjoyMDgxMDcwMzA3fQ.HzsbNbVxrLXxRMNvlVuKaqduQ-PgcD3IrseKm_LcN34';

async function main() {
    console.log('🔧 Attempting to create tender_reports table...\n');

    // Method 1: Try SQL API (new format)
    console.log('Method 1: SQL RPC endpoint...');
    const sql = `
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
`;

    // Try different RPC function names that might exist
    const rpcNames = ['exec_sql', 'execute_sql', 'run_sql', 'sql_execute', 'query'];

    for (const rpcName of rpcNames) {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpcName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                },
                body: JSON.stringify({ query: sql, sql: sql })
            });

            if (response.ok) {
                console.log(`✅ Success via ${rpcName}!`);
                return true;
            }
        } catch (e) {
            // Continue to next method
        }
    }
    console.log('   No working RPC endpoint found');

    // Method 2: Try pg_graphql if available
    console.log('\nMethod 2: GraphQL mutation...');
    const graphqlQuery = {
        query: `mutation { executeRawSQL(sql: "${sql.replace(/"/g, '\\"').replace(/\n/g, ' ')}") }`
    };

    try {
        const gqlResponse = await fetch(`${SUPABASE_URL}/graphql/v1`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify(graphqlQuery)
        });

        if (gqlResponse.ok) {
            const result = await gqlResponse.json();
            if (!result.errors) {
                console.log('✅ Success via GraphQL!');
                return true;
            }
        }
    } catch (e) {
        // Continue
    }
    console.log('   GraphQL method not available');

    // Method 3: Check if table already exists after trying
    console.log('\nMethod 3: Checking if table exists...');
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/tender_reports?limit=0`, {
        method: 'GET',
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
    });

    if (checkResponse.ok) {
        console.log('✅ tender_reports table exists!');
        return true;
    }

    console.log('❌ Table does not exist yet');

    // Provide SQL for manual execution
    console.log('\n' + '='.repeat(50));
    console.log('📋 MANUAL STEP REQUIRED');
    console.log('='.repeat(50));
    console.log('\nPlease run this SQL in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/sql/new\n');
    console.log('--- COPY FROM HERE ---');
    console.log(sql);
    console.log('--- COPY TO HERE ---');

    // Also save to a file for easy copy
    const fs = require('fs');
    const sqlFile = 'C:\\dev\\tenderix-dev\\sql\\create_tender_reports.sql';
    fs.writeFileSync(sqlFile, sql);
    console.log(`\nSQL also saved to: ${sqlFile}`);

    return false;
}

main();
