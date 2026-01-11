/**
 * Run SQL directly via Supabase using the query endpoint
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

async function runSQL() {
    console.log('🚀 Deploying Tenderix v3.0 Database...\n');

    const statements = [
        // Extensions
        { name: 'pg_trgm extension', sql: `CREATE EXTENSION IF NOT EXISTS pg_trgm` },

        // Core tables
        { name: 'source_references', sql: `
            CREATE TABLE IF NOT EXISTS source_references (
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
            )` },

        { name: 'dictionary_categories', sql: `
            CREATE TABLE IF NOT EXISTS dictionary_categories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL UNIQUE,
                name_en TEXT,
                parent_id UUID REFERENCES dictionary_categories(id),
                description TEXT,
                keywords TEXT[],
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'dictionary_terms', sql: `
            CREATE TABLE IF NOT EXISTS dictionary_terms (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                category_id UUID REFERENCES dictionary_categories(id),
                term TEXT NOT NULL,
                term_normalized TEXT NOT NULL,
                synonyms TEXT[],
                definition TEXT,
                usage_count INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'accumulation_rules', sql: `
            CREATE TABLE IF NOT EXISTS accumulation_rules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                rule_name TEXT NOT NULL UNIQUE,
                entity_type TEXT NOT NULL,
                aggregation_method TEXT NOT NULL,
                dedup_fields TEXT[],
                time_window_months INTEGER,
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'accumulation_items', sql: `
            CREATE TABLE IF NOT EXISTS accumulation_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id UUID,
                item_type TEXT NOT NULL,
                item_data JSONB NOT NULL,
                dedup_hash TEXT NOT NULL,
                valid_from DATE,
                is_verified BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'gap_closure_options', sql: `
            CREATE TABLE IF NOT EXISTS gap_closure_options (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                gap_type TEXT NOT NULL,
                closure_method TEXT NOT NULL,
                description TEXT,
                typical_time_days INTEGER,
                requirements JSONB,
                risks TEXT[],
                active BOOLEAN DEFAULT true
            )` },

        { name: 'potential_partners', sql: `
            CREATE TABLE IF NOT EXISTS potential_partners (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_name TEXT NOT NULL,
                company_number TEXT UNIQUE,
                contact_name TEXT,
                capabilities JSONB,
                experience_categories TEXT[],
                rating DECIMAL(3,2),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'tender_definitions', sql: `
            CREATE TABLE IF NOT EXISTS tender_definitions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
                term TEXT NOT NULL,
                definition TEXT NOT NULL,
                section_reference TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'document_versions', sql: `
            CREATE TABLE IF NOT EXISTS document_versions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
                document_type TEXT NOT NULL,
                version_number INTEGER NOT NULL,
                file_name TEXT NOT NULL,
                file_url TEXT,
                is_current BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'tender_relations', sql: `
            CREATE TABLE IF NOT EXISTS tender_relations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
                related_tender_id UUID REFERENCES tenders(id),
                relation_type TEXT NOT NULL,
                similarity_score DECIMAL(3,2),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'similarity_definitions', sql: `
            CREATE TABLE IF NOT EXISTS similarity_definitions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                category TEXT NOT NULL,
                term TEXT NOT NULL,
                interpretation_type TEXT NOT NULL,
                criteria JSONB NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'condition_interpretations', sql: `
            CREATE TABLE IF NOT EXISTS condition_interpretations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                condition_id UUID REFERENCES tender_conditions(id) ON DELETE CASCADE,
                interpretation_type TEXT NOT NULL,
                interpretation TEXT NOT NULL,
                confidence DECIMAL(3,2),
                risk_level TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'specification_items', sql: `
            CREATE TABLE IF NOT EXISTS specification_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
                item_code TEXT,
                description TEXT NOT NULL,
                quantity DECIMAL,
                unit TEXT,
                requirements JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'boq_items', sql: `
            CREATE TABLE IF NOT EXISTS boq_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
                item_code TEXT,
                description TEXT NOT NULL,
                quantity DECIMAL,
                unit TEXT,
                unit_price DECIMAL,
                total_price DECIMAL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'spec_boq_crossref', sql: `
            CREATE TABLE IF NOT EXISTS spec_boq_crossref (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
                spec_item_id UUID REFERENCES specification_items(id),
                boq_item_id UUID REFERENCES boq_items(id),
                match_type TEXT NOT NULL,
                discrepancy_details JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'boq_comparisons', sql: `
            CREATE TABLE IF NOT EXISTS boq_comparisons (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tender_id UUID REFERENCES tenders(id),
                item_code TEXT,
                current_price DECIMAL,
                avg_historical_price DECIMAL,
                price_position TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'pricing_recommendations', sql: `
            CREATE TABLE IF NOT EXISTS pricing_recommendations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tender_id UUID REFERENCES tenders(id),
                boq_item_id UUID REFERENCES boq_items(id),
                recommended_price DECIMAL,
                price_basis TEXT,
                confidence DECIMAL(3,2),
                strategy TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'tender_results', sql: `
            CREATE TABLE IF NOT EXISTS tender_results (
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
            )` },

        { name: 'tender_bids', sql: `
            CREATE TABLE IF NOT EXISTS tender_bids (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tender_result_id UUID REFERENCES tender_results(id) ON DELETE CASCADE,
                bidder_name TEXT NOT NULL,
                bid_price DECIMAL,
                bid_rank INTEGER,
                disqualified BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'competitor_profiles', sql: `
            CREATE TABLE IF NOT EXISTS competitor_profiles (
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
                last_activity DATE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )` },

        { name: 'tender_reports', sql: `
            CREATE TABLE IF NOT EXISTS tender_reports (
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
                generated_at TIMESTAMPTZ DEFAULT NOW()
            )` }
    ];

    let success = 0;
    let failed = 0;

    for (const stmt of statements) {
        try {
            // Use raw SQL execution via database function
            const { data, error } = await supabase.rpc('exec_sql', { query: stmt.sql });

            if (error) {
                // If exec_sql doesn't exist, try a different approach
                throw error;
            }

            console.log(`✅ ${stmt.name}`);
            success++;
        } catch (err) {
            // Tables might already exist, that's OK
            if (err.message?.includes('already exists')) {
                console.log(`⏭️  ${stmt.name} (already exists)`);
                success++;
            } else {
                console.log(`⚠️  ${stmt.name}: ${err.message?.substring(0, 50)}`);
                failed++;
            }
        }
    }

    console.log('\n========================================');
    console.log(`✅ Success: ${success}`);
    console.log(`⚠️  Issues: ${failed}`);
    console.log('');
    console.log('Note: If tables show errors, they may need to be created');
    console.log('via Supabase SQL Editor. The SQL file is ready at:');
    console.log('sql/tenderix_complete_v3.sql');
}

// Alternative: Check if tables exist
async function checkTables() {
    console.log('\n📊 Checking existing tables...');

    const tablesToCheck = [
        'source_references', 'dictionary_categories', 'dictionary_terms',
        'accumulation_rules', 'gap_closure_options', 'tender_definitions',
        'boq_items', 'tender_results', 'competitor_profiles', 'tender_reports'
    ];

    for (const table of tablesToCheck) {
        try {
            const { data, error, count } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.log(`❌ ${table}: not found`);
            } else {
                console.log(`✅ ${table}: exists (${count || 0} rows)`);
            }
        } catch (e) {
            console.log(`❌ ${table}: ${e.message?.substring(0, 30)}`);
        }
    }
}

async function main() {
    await checkTables();
    console.log('\n');
    console.log('To create missing tables, run the SQL in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/rerfjgjwjqodevkvhkxu/sql/new');
}

main().catch(console.error);
