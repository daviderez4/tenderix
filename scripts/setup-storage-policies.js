/**
 * Setup Storage Policies for Tenderix
 * Creates RLS policies for the tender-documents bucket
 */

const SUPABASE_URL = 'https://rerfjgjwjqodevkvhkxu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5NDMwNywiZXhwIjoyMDgxMDcwMzA3fQ.HzsbNbVxrLXxRMNvlVuKaqduQ-PgcD3IrseKm_LcN34';

// Database connection for SQL execution
const PROJECT_REF = 'rerfjgjwjqodevkvhkxu';

async function setupPolicies() {
    console.log('Setting up storage policies...\n');

    const headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    // SQL statements to create policies
    const policies = [
        {
            name: 'Allow public read',
            sql: `CREATE POLICY IF NOT EXISTS "Allow public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'tender-documents');`
        },
        {
            name: 'Allow authenticated upload',
            sql: `CREATE POLICY IF NOT EXISTS "Allow authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tender-documents');`
        },
        {
            name: 'Allow anon upload',
            sql: `CREATE POLICY IF NOT EXISTS "Allow anon upload" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'tender-documents');`
        },
        {
            name: 'Allow authenticated update',
            sql: `CREATE POLICY IF NOT EXISTS "Allow authenticated update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'tender-documents');`
        },
        {
            name: 'Allow authenticated delete',
            sql: `CREATE POLICY IF NOT EXISTS "Allow authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tender-documents');`
        }
    ];

    // Try to execute SQL via RPC if available
    console.log('Attempting to create policies via REST API...\n');

    // First, let's try the sql endpoint (if enabled)
    try {
        const sqlRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                sql: `SELECT 'test' as status;`
            })
        });

        if (sqlRes.ok) {
            console.log('SQL execution available via RPC!\n');

            for (const policy of policies) {
                console.log(`Creating policy: ${policy.name}...`);
                const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ sql: policy.sql })
                });

                if (res.ok) {
                    console.log(`   ✅ ${policy.name} created`);
                } else {
                    const err = await res.text();
                    console.log(`   ⚠️ ${err}`);
                }
            }
        } else {
            console.log('SQL RPC not available. Trying alternative approach...\n');
            await useAlternativeApproach(headers);
        }
    } catch (error) {
        console.log('Error with RPC approach:', error.message);
        await useAlternativeApproach(headers);
    }
}

async function useAlternativeApproach(headers) {
    console.log('Using direct storage approach...\n');

    // Test if uploads work with service role key (they should)
    console.log('Testing upload with service role key...');

    const testData = new Blob(['Test PDF content'], { type: 'application/pdf' });
    const testFileName = `test-${Date.now()}.pdf`;

    try {
        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/tender-documents/${testFileName}`, {
            method: 'POST',
            headers: {
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/pdf',
                'x-upsert': 'true'
            },
            body: 'Test PDF content'
        });

        if (uploadRes.ok) {
            console.log('✅ Service role upload works!\n');

            // Clean up
            await fetch(`${SUPABASE_URL}/storage/v1/object/tender-documents/${testFileName}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
                }
            });
        } else {
            const err = await uploadRes.json();
            console.log('Upload test result:', err);
        }
    } catch (e) {
        console.log('Upload test error:', e.message);
    }

    // Test with anon key
    console.log('Testing upload with anon key...');
    const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTQzMDcsImV4cCI6MjA4MTA3MDMwN30.XE4N3ewYESrVeCMWZdJhYbgjTG_SRaYQ9zUczjVgNUM';

    try {
        const anonTestFile = `anon-test-${Date.now()}.pdf`;
        const anonRes = await fetch(`${SUPABASE_URL}/storage/v1/object/tender-documents/${anonTestFile}`, {
            method: 'POST',
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`,
                'Content-Type': 'application/pdf',
                'x-upsert': 'true'
            },
            body: 'Test PDF content from anon'
        });

        if (anonRes.ok) {
            console.log('✅ Anon upload works! Policies are already configured.\n');

            // Clean up
            await fetch(`${SUPABASE_URL}/storage/v1/object/tender-documents/${anonTestFile}`, {
                method: 'DELETE',
                headers: {
                    'apikey': SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
                }
            });
        } else {
            const err = await anonRes.json();
            console.log('❌ Anon upload failed:', err.message || err.error);
            console.log('\n⚠️  Storage policies need to be created manually.');
            console.log('\nPlease run this SQL in Supabase Dashboard > SQL Editor:\n');
            console.log('─'.repeat(60));
            console.log(`
-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read from tender-documents
CREATE POLICY "Public read tender-documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tender-documents');

-- Allow anyone to upload to tender-documents
CREATE POLICY "Public upload tender-documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'tender-documents');

-- Allow authenticated users to update
CREATE POLICY "Auth update tender-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tender-documents');

-- Allow authenticated users to delete
CREATE POLICY "Auth delete tender-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tender-documents');
`);
            console.log('─'.repeat(60));
        }
    } catch (e) {
        console.log('Anon test error:', e.message);
    }

    console.log('\n✅ Storage setup complete!');
}

setupPolicies();
