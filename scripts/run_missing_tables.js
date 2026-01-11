/**
 * Run missing tables SQL directly against Supabase Postgres
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

// Supabase connection - using transaction pooler (port 6543)
const projectRef = 'rerfjgjwjqodevkvhkxu';
const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.argv[2];

if (!dbPassword) {
    console.log('❌ Database password required!');
    console.log('');
    console.log('Usage: node scripts/run_missing_tables.js <password>');
    console.log('');
    console.log('Or add to config/.env:');
    console.log('SUPABASE_DB_PASSWORD=your_password_here');
    console.log('');
    console.log('Get password from: https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/settings/database');
    process.exit(1);
}

const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

async function run() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

    try {
        console.log('🔌 Connecting to Supabase Postgres...');
        await client.connect();
        console.log('✅ Connected!\n');

        // Read the SQL file
        const sqlPath = path.join(__dirname, '../sql/FINAL_MISSING_TABLES_FIXED.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split into statements and execute
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📝 Executing ${statements.length} SQL statements...\n`);

        let success = 0;
        let skipped = 0;
        let failed = 0;

        for (const stmt of statements) {
            // Get a short description
            const match = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i) ||
                         stmt.match(/CREATE INDEX IF NOT EXISTS (\w+)/i) ||
                         stmt.match(/INSERT INTO (\w+)/i) ||
                         stmt.match(/CREATE EXTENSION/i) ||
                         stmt.match(/SELECT/i);

            const name = match ? (match[1] || match[0].substring(0, 30)) : stmt.substring(0, 40);

            try {
                await client.query(stmt);
                if (stmt.includes('CREATE TABLE')) {
                    console.log(`✅ Created: ${name}`);
                    success++;
                } else if (stmt.includes('CREATE INDEX')) {
                    console.log(`📇 Index: ${name}`);
                    success++;
                } else if (stmt.includes('INSERT INTO')) {
                    console.log(`📥 Seeded: ${name}`);
                    success++;
                } else {
                    skipped++;
                }
            } catch (err) {
                if (err.message.includes('already exists')) {
                    console.log(`⏭️  Exists: ${name}`);
                    skipped++;
                } else if (err.message.includes('duplicate key')) {
                    console.log(`⏭️  Data exists: ${name}`);
                    skipped++;
                } else {
                    console.log(`❌ Failed: ${name} - ${err.message.substring(0, 60)}`);
                    failed++;
                }
            }
        }

        console.log('\n════════════════════════════════════════');
        console.log(`✅ Success: ${success}`);
        console.log(`⏭️  Skipped: ${skipped}`);
        console.log(`❌ Failed: ${failed}`);
        console.log('════════════════════════════════════════\n');

        // Verify tables
        console.log('📊 Verifying new tables...\n');
        const verifyQuery = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN (
                'tender_reports', 'source_references', 'term_occurrences',
                'accumulation_items', 'potential_partners', 'document_versions',
                'tender_relations', 'similarity_definitions', 'condition_interpretations',
                'spec_boq_crossref', 'boq_comparisons', 'pricing_recommendations',
                'tender_results', 'tender_bids'
            )
            ORDER BY table_name
        `;

        const result = await client.query(verifyQuery);
        console.log(`Found ${result.rows.length} of the new tables:`);
        result.rows.forEach(row => console.log(`  ✅ ${row.table_name}`));

    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.message.includes('password authentication failed')) {
            console.log('\n⚠️  Wrong password. Get the correct one from:');
            console.log('https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/settings/database');
        }
    } finally {
        await client.end();
    }
}

run();
