/**
 * Run SQL Setup Script for Tenderix
 * Uses Supabase service role to execute SQL
 */

require('dotenv').config({ path: './config/.env' });
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runSQL() {
    console.log('='.repeat(50));
    console.log('TENDERIX SQL SETUP');
    console.log('='.repeat(50));

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }

    // Read SQL file
    const sqlPath = path.join(__dirname, '../sql/setup-supabase-safe.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('SQL file loaded:', sqlPath);
    console.log('SQL length:', sql.length, 'characters');
    console.log('-'.repeat(50));

    // Split SQL into individual statements and execute each
    // We'll use the Supabase REST API to execute simple queries
    // For DDL statements, we need to use the Management API or pg directly

    // Since we can't run DDL via REST API, let's check what tables exist
    console.log('\nChecking existing tables...\n');

    const tablesResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
    });

    if (tablesResponse.ok) {
        const tables = await tablesResponse.json();
        console.log('Available tables/endpoints:', Object.keys(tables.paths || {}).length);
    }

    // Test connection by querying tenders
    console.log('\nTesting connection - querying tenders...');

    const tendersResponse = await fetch(`${SUPABASE_URL}/rest/v1/tenders?select=id,tender_name&limit=5`, {
        headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
    });

    if (tendersResponse.ok) {
        const tenders = await tendersResponse.json();
        console.log('Found', tenders.length, 'tenders');
        tenders.forEach(t => console.log('  -', t.tender_name || t.id));
    } else {
        console.log('Error querying tenders:', tendersResponse.status);
    }

    console.log('\n' + '='.repeat(50));
    console.log('NOTE: DDL statements (CREATE, ALTER, DROP) cannot be');
    console.log('executed via REST API. Please run the SQL manually:');
    console.log('');
    console.log('1. Go to: https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/sql/new');
    console.log('2. Paste the contents of: sql/setup-supabase-safe.sql');
    console.log('3. Click "Run"');
    console.log('='.repeat(50));

    // Create a simpler version that can be copy-pasted
    console.log('\n\nAlternatively, I will try to execute via Supabase CLI...\n');
}

runSQL().catch(console.error);
