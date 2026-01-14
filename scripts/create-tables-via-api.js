/**
 * Create tables using Supabase REST API workarounds
 * Since we can't execute DDL directly, we'll try alternative methods
 */

const SUPABASE_URL = 'https://rerfjgjwjqodevkvhkxu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5NDMwNywiZXhwIjoyMDgxMDcwMzA3fQ.HzsbNbVxrLXxRMNvlVuKaqduQ-PgcD3IrseKm_LcN34';

const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

// Tables to create with their columns
const tables = {
    company_profiles: {
        columns: ['id', 'user_id', 'company_name', 'bn_number', 'year_founded', 'annual_revenue', 'employee_count', 'business_sectors', 'contractor_classifications', 'parent_subsidiary_companies', 'created_at', 'updated_at']
    },
    company_certifications: {
        columns: ['id', 'company_id', 'cert_type', 'cert_name', 'issuing_body', 'valid_from', 'valid_until', 'document_path', 'created_at']
    },
    company_personnel: {
        columns: ['id', 'company_id', 'full_name', 'role', 'education', 'years_experience', 'certifications', 'led_projects', 'created_at']
    },
    company_projects: {
        columns: ['id', 'company_id', 'project_name', 'client_name', 'start_date', 'end_date', 'total_value', 'our_share_percent', 'role', 'project_type', 'construction_value', 'maintenance_value', 'maintenance_months', 'completion_type', 'technologies', 'quantities', 'integrations', 'sla_provided', 'supporting_documents', 'unique_identifier', 'created_at', 'updated_at']
    },
    tangent_projects: {
        columns: ['id', 'company_id', 'description', 'source_type', 'related_company', 'can_sign_agreement', 'created_at']
    }
};

async function checkAndCreateTables() {
    console.log('Checking table existence...\n');

    const existingTables = [];
    const missingTables = [];

    for (const tableName of Object.keys(tables)) {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=0`, { headers });

            if (res.ok) {
                console.log(`✅ ${tableName} - exists`);
                existingTables.push(tableName);
            } else if (res.status === 404 || res.status === 406) {
                console.log(`❌ ${tableName} - missing`);
                missingTables.push(tableName);
            } else {
                const err = await res.text();
                console.log(`⚠️ ${tableName} - status ${res.status}: ${err.substring(0, 50)}`);
                missingTables.push(tableName);
            }
        } catch (e) {
            console.log(`❌ ${tableName} - error: ${e.message}`);
            missingTables.push(tableName);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Existing tables: ${existingTables.length}`);
    console.log(`Missing tables: ${missingTables.length}`);

    if (missingTables.length > 0) {
        console.log('\n⚠️  The following tables need to be created:');
        missingTables.forEach(t => console.log(`   - ${t}`));

        console.log('\n📋 SQL to run in Supabase Dashboard:');
        console.log('   https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/sql');
        console.log('\n   File: sql/001_company_profile_tables.sql');
    } else {
        console.log('\n✅ All company profile tables exist!');
    }

    return { existingTables, missingTables };
}

checkAndCreateTables().catch(console.error);
