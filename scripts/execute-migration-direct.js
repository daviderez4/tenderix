/**
 * Execute SQL Migration directly to Supabase PostgreSQL
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'rerfjgjwjqodevkvhkxu';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5NDMwNywiZXhwIjoyMDgxMDcwMzA3fQ.HzsbNbVxrLXxRMNvlVuKaqduQ-PgcD3IrseKm_LcN34';

// Different connection options to try
const connectionConfigs = [
    {
        name: 'Pooler Session Mode',
        connectionString: `postgres://postgres.${PROJECT_REF}:${SERVICE_KEY}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
        ssl: { rejectUnauthorized: false }
    },
    {
        name: 'Pooler Transaction Mode',
        connectionString: `postgres://postgres.${PROJECT_REF}:${SERVICE_KEY}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
        ssl: { rejectUnauthorized: false }
    },
    {
        name: 'Direct Connection',
        connectionString: `postgres://postgres:${SERVICE_KEY}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
        ssl: { rejectUnauthorized: false }
    }
];

async function executeMigration() {
    const sqlFile = process.argv[2] || 'sql/001_company_profile_tables.sql';
    const sqlPath = path.resolve(__dirname, '..', sqlFile);

    console.log('='.repeat(60));
    console.log('TENDERIX - SQL Migration Executor');
    console.log('='.repeat(60));
    console.log('File:', sqlFile);
    console.log('');

    if (!fs.existsSync(sqlPath)) {
        console.error('❌ SQL file not found:', sqlPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('SQL loaded, length:', sql.length, 'characters\n');

    for (const config of connectionConfigs) {
        console.log(`Trying: ${config.name}...`);

        const client = new Client({
            connectionString: config.connectionString,
            ssl: config.ssl,
            connectionTimeoutMillis: 15000
        });

        try {
            await client.connect();
            console.log('✅ Connected!\n');

            // Execute the entire SQL file
            console.log('Executing SQL...\n');

            await client.query(sql);

            console.log('✅ Migration completed successfully!\n');

            // Verify tables were created
            const verifyQuery = `
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name IN ('company_profiles', 'company_certifications', 'company_personnel', 'company_projects', 'tangent_projects')
                ORDER BY table_name;
            `;

            const result = await client.query(verifyQuery);
            console.log('Tables created:');
            result.rows.forEach(row => console.log('  ✓', row.table_name));

            await client.end();
            return true;

        } catch (error) {
            console.log('❌ Failed:', error.message.substring(0, 80));
            try { await client.end(); } catch (e) {}
        }
        console.log('');
    }

    console.log('='.repeat(60));
    console.log('❌ Could not connect with any method');
    console.log('='.repeat(60));
    return false;
}

executeMigration()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
