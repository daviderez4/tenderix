/**
 * Execute Storage Policies SQL directly on Supabase
 */

const { Pool } = require('pg');

const PROJECT_REF = 'rerfjgjwjqodevkvhkxu';
const DB_PASSWORD = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5NDMwNywiZXhwIjoyMDgxMDcwMzA3fQ.HzsbNbVxrLXxRMNvlVuKaqduQ-PgcD3IrseKm_LcN34';

// Try different connection strings
const connectionStrings = [
    // Session mode (port 5432)
    `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
    // Transaction mode (port 6543)
    `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
    // Direct connection
    `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`
];

const SQL = `
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public read tender-documents" ON storage.objects;
DROP POLICY IF EXISTS "Public upload tender-documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth update tender-documents" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete tender-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload" ON storage.objects;

-- Create new policies
CREATE POLICY "Public read tender-documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tender-documents');

CREATE POLICY "Public upload tender-documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'tender-documents');

CREATE POLICY "Auth update tender-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tender-documents');

CREATE POLICY "Auth delete tender-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tender-documents');
`;

async function executeSQL() {
    console.log('Executing storage policies SQL...\n');

    for (const connStr of connectionStrings) {
        const shortConn = connStr.replace(DB_PASSWORD, '***').substring(0, 80) + '...';
        console.log(`Trying: ${shortConn}`);

        const pool = new Pool({
            connectionString: connStr,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000
        });

        try {
            const client = await pool.connect();
            console.log('Connected!\n');

            // Split and execute SQL statements
            const statements = SQL.split(';').filter(s => s.trim());

            for (const stmt of statements) {
                if (stmt.trim()) {
                    try {
                        await client.query(stmt);
                        const action = stmt.includes('DROP') ? 'Dropped' : 'Created';
                        const policyMatch = stmt.match(/"([^"]+)"/);
                        if (policyMatch) {
                            console.log(`✅ ${action}: ${policyMatch[1]}`);
                        }
                    } catch (e) {
                        if (!e.message.includes('does not exist')) {
                            console.log(`⚠️ ${e.message.substring(0, 60)}`);
                        }
                    }
                }
            }

            client.release();
            await pool.end();

            console.log('\n✅ Storage policies created successfully!');
            return true;

        } catch (error) {
            console.log(`❌ Failed: ${error.message.substring(0, 50)}\n`);
            await pool.end();
        }
    }

    console.log('\n❌ Could not connect to database.');
    console.log('Please run the SQL manually in Supabase Dashboard > SQL Editor');
    return false;
}

executeSQL();
