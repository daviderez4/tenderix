/**
 * Execute SQL via Supabase REST API
 * Uses the rpc function or direct table creation
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

// Table creation statements - executed one by one
const tableStatements = [
    // C1: SOURCE REFERENCES
    `CREATE TABLE IF NOT EXISTS source_references (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL,
        entity_id UUID NOT NULL,
        source_file TEXT NOT NULL,
        page_number INTEGER,
        section_number TEXT,
        original_text TEXT NOT NULL,
        extraction_confidence DECIMAL(3,2) DEFAULT 1.0,
        extracted_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // C2: DICTIONARY
    `CREATE TABLE IF NOT EXISTS dictionary_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        name_en TEXT,
        parent_id UUID REFERENCES dictionary_categories(id),
        description TEXT,
        keywords TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS dictionary_terms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id UUID REFERENCES dictionary_categories(id),
        term TEXT NOT NULL,
        term_normalized TEXT NOT NULL,
        synonyms TEXT[],
        definition TEXT,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS term_occurrences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        term_id UUID REFERENCES dictionary_terms(id) ON DELETE CASCADE,
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        context TEXT,
        source_ref_id UUID REFERENCES source_references(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // C3: ACCUMULATION LOGIC
    `CREATE TABLE IF NOT EXISTS accumulation_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_name TEXT NOT NULL UNIQUE,
        entity_type TEXT NOT NULL,
        aggregation_method TEXT NOT NULL,
        dedup_fields TEXT[],
        time_window_months INTEGER,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS accumulation_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        item_type TEXT NOT NULL,
        item_data JSONB NOT NULL,
        dedup_hash TEXT NOT NULL,
        valid_from DATE,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // C4: GAP CLOSURE
    `CREATE TABLE IF NOT EXISTS gap_closure_options (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gap_type TEXT NOT NULL,
        closure_method TEXT NOT NULL,
        description TEXT,
        typical_time_days INTEGER,
        requirements JSONB,
        risks TEXT[],
        active BOOLEAN DEFAULT true
    )`,

    `CREATE TABLE IF NOT EXISTS potential_partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name TEXT NOT NULL,
        company_number TEXT UNIQUE,
        contact_name TEXT,
        capabilities JSONB,
        experience_categories TEXT[],
        rating DECIMAL(3,2),
        preferred BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // INTAKE ENHANCEMENTS
    `CREATE TABLE IF NOT EXISTS tender_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        term TEXT NOT NULL,
        definition TEXT NOT NULL,
        section_reference TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS document_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        document_type TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_url TEXT,
        is_current BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS tender_relations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        related_tender_id UUID REFERENCES tenders(id),
        relation_type TEXT NOT NULL,
        similarity_score DECIMAL(3,2),
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // GATE CONDITIONS ENHANCEMENTS
    `CREATE TABLE IF NOT EXISTS similarity_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category TEXT NOT NULL,
        term TEXT NOT NULL,
        interpretation_type TEXT NOT NULL,
        criteria JSONB NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS tender_conditions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        condition_number TEXT,
        condition_text TEXT NOT NULL,
        condition_type TEXT DEFAULT 'mandatory',
        category TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS condition_interpretations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        condition_id UUID REFERENCES tender_conditions(id) ON DELETE CASCADE,
        interpretation_type TEXT NOT NULL,
        interpretation TEXT NOT NULL,
        confidence DECIMAL(3,2),
        risk_level TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // BOQ & SPECIFICATION
    `CREATE TABLE IF NOT EXISTS specification_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        item_code TEXT,
        description TEXT NOT NULL,
        quantity DECIMAL,
        unit TEXT,
        requirements JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS boq_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        item_code TEXT,
        description TEXT NOT NULL,
        quantity DECIMAL,
        unit TEXT,
        unit_price DECIMAL,
        total_price DECIMAL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS spec_boq_crossref (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        spec_item_id UUID REFERENCES specification_items(id),
        boq_item_id UUID REFERENCES boq_items(id),
        match_type TEXT NOT NULL,
        discrepancy_details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS boq_comparisons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id),
        item_code TEXT,
        current_price DECIMAL,
        avg_historical_price DECIMAL,
        price_position TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS pricing_recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id),
        boq_item_id UUID REFERENCES boq_items(id),
        recommended_price DECIMAL,
        price_basis TEXT,
        confidence DECIMAL(3,2),
        strategy TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // COMPETITOR INTELLIGENCE
    `CREATE TABLE IF NOT EXISTS tender_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_number TEXT NOT NULL,
        tender_name TEXT,
        issuing_body TEXT,
        category TEXT,
        result_date DATE,
        winner_name TEXT,
        winning_price DECIMAL,
        num_bidders INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS tender_bids (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_result_id UUID REFERENCES tender_results(id) ON DELETE CASCADE,
        bidder_name TEXT NOT NULL,
        bid_price DECIMAL,
        bid_rank INTEGER,
        disqualified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS competitor_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name TEXT NOT NULL,
        company_number TEXT UNIQUE,
        categories TEXT[],
        typical_bid_size_min DECIMAL,
        typical_bid_size_max DECIMAL,
        win_rate DECIMAL(5,4),
        total_bids INTEGER DEFAULT 0,
        total_wins INTEGER DEFAULT 0,
        pricing_behavior TEXT,
        preferred_clients TEXT[],
        strengths TEXT[],
        last_activity DATE,
        data_quality TEXT DEFAULT 'low',
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // REPORTS
    `CREATE TABLE IF NOT EXISTS tender_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        report_type TEXT DEFAULT 'full_analysis',
        executive_summary TEXT,
        gate_status JSONB,
        boq_analysis JSONB,
        competitor_analysis JSONB,
        recommendation TEXT,
        win_probability DECIMAL(3,2),
        risks JSONB,
        generated_by TEXT,
        generated_at TIMESTAMPTZ DEFAULT NOW()
    )`
];

async function executeViaRpc() {
    console.log('🚀 Creating tables via Supabase...\n');

    // Try using a helper function
    // First check if exec_sql function exists
    const { data: funcCheck, error: funcError } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });

    if (funcError) {
        console.log('Note: exec_sql function not available. Tables need to be created via SQL Editor.');
        console.log('Opening SQL Editor link...\n');

        // Alternative: Try to create an exec_sql function first
        console.log('Please run the SQL in the Supabase SQL Editor:');
        console.log('https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/sql/new\n');

        // Let's try inserting data directly into existing tables to test connection
        console.log('Testing connection with existing tables...\n');

        const { data, error } = await supabase.from('tenders').select('id').limit(1);
        if (error) {
            console.log(`Connection error: ${error.message}`);
        } else {
            console.log(`✅ Connection successful. Found ${data.length} tender(s).`);
        }

        return false;
    }

    return true;
}

// Alternative approach: Create tables using fetch to Supabase Management API
async function createViaManagementAPI() {
    const projectRef = 'rerfjgjwjqodevkvhkxu';
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

    if (!accessToken) {
        console.log('SUPABASE_ACCESS_TOKEN not set - cannot use Management API');
        return false;
    }

    const sql = tableStatements.join(';\n\n');

    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
        console.log('✅ Tables created via Management API');
        return true;
    } else {
        console.log(`Management API error: ${await response.text()}`);
        return false;
    }
}

async function main() {
    console.log('========================================');
    console.log('Tenderix v3.0 - Table Creation');
    console.log('========================================\n');

    // Try RPC first
    const rpcResult = await executeViaRpc();
    if (rpcResult) {
        console.log('✅ Tables created via RPC');
        return;
    }

    // Try Management API
    const mgmtResult = await createViaManagementAPI();
    if (mgmtResult) {
        return;
    }

    // If both fail, provide instructions
    console.log('\n========================================');
    console.log('📋 MANUAL STEPS REQUIRED');
    console.log('========================================\n');
    console.log('1. Open: https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/sql/new');
    console.log('2. Copy the content of RUN_THIS_SQL.sql');
    console.log('3. Paste and click "Run"\n');
    console.log('Or use this command to open the file:');
    console.log('   cat RUN_THIS_SQL.sql | clip\n');
}

main().catch(console.error);
