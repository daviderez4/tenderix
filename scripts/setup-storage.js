/**
 * Setup Storage Bucket for Tenderix
 * Creates and configures the tender-documents bucket
 */

const SUPABASE_URL = 'https://rerfjgjwjqodevkvhkxu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5NDMwNywiZXhwIjoyMDgxMDcwMzA3fQ.HzsbNbVxrLXxRMNvlVuKaqduQ-PgcD3IrseKm_LcN34';

async function setupStorage() {
    console.log('Setting up Supabase storage...\n');

    const headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
    };

    // 1. List existing buckets
    console.log('1. Checking existing buckets...');
    try {
        const listRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, { headers });
        const buckets = await listRes.json();
        console.log('   Existing buckets:', buckets.map(b => b.name).join(', ') || 'none');

        const bucketExists = buckets.some(b => b.name === 'tender-documents');

        if (!bucketExists) {
            // 2. Create bucket
            console.log('\n2. Creating tender-documents bucket...');
            const createRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    id: 'tender-documents',
                    name: 'tender-documents',
                    public: true,
                    file_size_limit: 52428800, // 50MB
                    allowed_mime_types: [
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'application/vnd.ms-excel',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    ]
                })
            });

            if (createRes.ok) {
                console.log('   Bucket created successfully!');
            } else {
                const err = await createRes.json();
                console.log('   Create response:', err);
            }
        } else {
            console.log('   Bucket already exists, updating...');

            // Update bucket to be public
            const updateRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket/tender-documents`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    public: true,
                    file_size_limit: 52428800,
                    allowed_mime_types: [
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'application/vnd.ms-excel',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    ]
                })
            });

            if (updateRes.ok) {
                console.log('   Bucket updated successfully!');
            } else {
                const err = await updateRes.json();
                console.log('   Update response:', err);
            }
        }

        // 3. Test upload
        console.log('\n3. Testing file upload...');
        const testContent = 'Test file content - ' + new Date().toISOString();
        const testFileName = 'test/upload-test.txt';

        const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/tender-documents/${testFileName}`, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'text/plain'
            },
            body: testContent
        });

        if (uploadRes.ok) {
            console.log('   Test upload successful!');

            // Get public URL
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/tender-documents/${testFileName}`;
            console.log('   Public URL:', publicUrl);

            // Clean up test file
            await fetch(`${SUPABASE_URL}/storage/v1/object/tender-documents/${testFileName}`, {
                method: 'DELETE',
                headers
            });
            console.log('   Test file cleaned up.');
        } else {
            const err = await uploadRes.json();
            console.log('   Upload test failed:', err);
        }

        console.log('\n✅ Storage setup complete!');
        console.log('\nBucket: tender-documents');
        console.log('Public: Yes');
        console.log('Max file size: 50MB');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

setupStorage();
