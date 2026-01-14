/**
 * Run SQL Migration via n8n or direct Supabase
 */
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rerfjgjwjqodevkvhkxu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5NDMwNywiZXhwIjoyMDgxMDcwMzA3fQ.HzsbNbVxrLXxRMNvlVuKaqduQ-PgcD3IrseKm_LcN34';
const N8N_WEBHOOK = 'https://daviderez.app.n8n.cloud/webhook';

async function runMigration() {
    const sqlFile = process.argv[2] || 'sql/001_company_profile_tables.sql';
    const sqlPath = path.join(__dirname, '..', sqlFile);

    console.log('Running migration:', sqlFile);

    if (!fs.existsSync(sqlPath)) {
        console.error('SQL file not found:', sqlPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split into individual statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && s.length > 10);

    console.log(`Found ${statements.length} SQL statements\n`);

    // Try n8n first
    try {
        console.log('Attempting via n8n webhook...');
        const response = await fetch(N8N_WEBHOOK + '/tenderix/run-sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sql: sql,
                migration_name: sqlFile
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('n8n response:', result);
            if (result.success) {
                console.log('\n✅ Migration completed via n8n!');
                return;
            }
        }
    } catch (e) {
        console.log('n8n not available:', e.message);
    }

    // Fallback: Execute via Supabase REST RPC
    console.log('\nTrying direct Supabase execution...');

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const preview = stmt.substring(0, 60).replace(/\n/g, ' ') + '...';

        try {
            // For CREATE TABLE, we need to use the SQL endpoint
            // Supabase doesn't have a direct SQL execution endpoint for DDL
            // So we'll check if table exists via REST API

            if (stmt.toUpperCase().includes('CREATE TABLE')) {
                const tableMatch = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
                if (tableMatch) {
                    const tableName = tableMatch[1];
                    console.log(`[${i+1}/${statements.length}] Creating table: ${tableName}`);

                    // Check if table exists by trying to select from it
                    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=0`, {
                        headers: {
                            'apikey': SERVICE_KEY,
                            'Authorization': `Bearer ${SERVICE_KEY}`
                        }
                    });

                    if (checkRes.ok) {
                        console.log(`   ✓ Table ${tableName} already exists`);
                    } else if (checkRes.status === 404) {
                        console.log(`   ⚠ Table ${tableName} needs creation via SQL Editor`);
                    }
                }
            } else if (stmt.toUpperCase().includes('CREATE INDEX')) {
                console.log(`[${i+1}/${statements.length}] Index: ${preview}`);
            } else if (stmt.toUpperCase().includes('CREATE POLICY')) {
                console.log(`[${i+1}/${statements.length}] Policy: ${preview}`);
            } else if (stmt.toUpperCase().includes('ALTER TABLE')) {
                console.log(`[${i+1}/${statements.length}] Alter: ${preview}`);
            }
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('⚠️  DDL statements require Supabase SQL Editor');
    console.log('Please run the SQL file manually:');
    console.log(`\n1. Go to: https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/sql`);
    console.log(`2. Copy contents of: ${sqlFile}`);
    console.log('3. Paste and run in SQL Editor');
    console.log('='.repeat(60));
}

runMigration().catch(console.error);
