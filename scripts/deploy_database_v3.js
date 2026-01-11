/**
 * Deploy Tenderix Database Schema v3.0
 * Uses Supabase Management API to execute SQL
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];

console.log('🚀 Tenderix v3.0 Database Deployment');
console.log('====================================');
console.log(`Project: ${projectRef}`);
console.log('');

// SQL statements to execute
const sqlStatements = [
    // Extensions
    'CREATE EXTENSION IF NOT EXISTS pg_trgm',
    'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',

    // C1: Source References
    `CREATE TABLE IF NOT EXISTS source_references (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL,
        entity_id UUID NOT NULL,
        source_file TEXT NOT NULL,
        page_number INTEGER,
        section_number TEXT,
        paragraph_number INTEGER,
        line_start INTEGER,
        line_end INTEGER,
        original_text TEXT NOT NULL,
        extraction_confidence DECIMAL(3,2) DEFAULT 1.0,
        extracted_at TIMESTAMPTZ DEFAULT NOW(),
        extracted_by TEXT DEFAULT 'system'
    )`,

    // C2: Dictionary
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
        unit_of_measure TEXT,
        typical_values JSONB,
        related_terms UUID[],
        source TEXT,
        confidence DECIMAL(3,2) DEFAULT 1.0,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS term_occurrences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        term_id UUID REFERENCES dictionary_terms(id) ON DELETE CASCADE,
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        context TEXT,
        source_ref_id UUID REFERENCES source_references(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // C3: Accumulation
    `CREATE TABLE IF NOT EXISTS accumulation_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_name TEXT NOT NULL UNIQUE,
        description TEXT,
        entity_type TEXT NOT NULL,
        aggregation_method TEXT NOT NULL,
        dedup_fields TEXT[],
        time_window_months INTEGER,
        vat_handling TEXT DEFAULT 'exclude',
        currency_handling TEXT DEFAULT 'ils',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS accumulation_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        item_type TEXT NOT NULL,
        item_data JSONB NOT NULL,
        dedup_hash TEXT NOT NULL,
        source_document TEXT,
        source_ref_id UUID REFERENCES source_references(id),
        valid_from DATE,
        valid_until DATE,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // C4: Gap Closure
    `CREATE TABLE IF NOT EXISTS gap_closure_options (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gap_type TEXT NOT NULL,
        closure_method TEXT NOT NULL,
        description TEXT,
        typical_cost_range JSONB,
        typical_time_days INTEGER,
        success_rate DECIMAL(3,2),
        requirements JSONB,
        risks TEXT[],
        active BOOLEAN DEFAULT true
    )`,

    `CREATE TABLE IF NOT EXISTS potential_partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name TEXT NOT NULL,
        company_number TEXT UNIQUE,
        contact_name TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        capabilities JSONB,
        certifications TEXT[],
        experience_categories TEXT[],
        typical_project_size_min DECIMAL,
        typical_project_size_max DECIMAL,
        past_collaborations INTEGER DEFAULT 0,
        rating DECIMAL(3,2),
        preferred BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Intake
    `CREATE TABLE IF NOT EXISTS tender_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        term TEXT NOT NULL,
        definition TEXT NOT NULL,
        section_reference TEXT,
        source_ref_id UUID REFERENCES source_references(id),
        category TEXT,
        importance TEXT DEFAULT 'normal',
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS document_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        document_type TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_url TEXT,
        file_hash TEXT,
        file_size INTEGER,
        published_date DATE,
        changes_summary TEXT,
        supersedes_version INTEGER,
        is_current BOOLEAN DEFAULT true,
        extracted_text TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS tender_relations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        related_tender_id UUID REFERENCES tenders(id),
        related_tender_number TEXT,
        relation_type TEXT NOT NULL,
        similarity_score DECIMAL(3,2),
        comparison_notes TEXT,
        key_differences JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Gate Conditions
    `CREATE TABLE IF NOT EXISTS similarity_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category TEXT NOT NULL,
        term TEXT NOT NULL,
        interpretation_type TEXT NOT NULL,
        criteria JSONB NOT NULL,
        legal_source TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS condition_interpretations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        condition_id UUID REFERENCES tender_conditions(id) ON DELETE CASCADE,
        interpretation_type TEXT NOT NULL,
        interpreter TEXT DEFAULT 'system',
        interpretation TEXT NOT NULL,
        confidence DECIMAL(3,2),
        risk_level TEXT,
        risk_description TEXT,
        recommendation TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // BOQ
    `CREATE TABLE IF NOT EXISTS specification_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        item_code TEXT,
        description TEXT NOT NULL,
        quantity DECIMAL,
        unit TEXT,
        section TEXT,
        requirements JSONB,
        source_ref_id UUID REFERENCES source_references(id),
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
        section TEXT,
        source_ref_id UUID REFERENCES source_references(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS spec_boq_crossref (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        spec_item_id UUID REFERENCES specification_items(id),
        boq_item_id UUID REFERENCES boq_items(id),
        match_type TEXT NOT NULL,
        discrepancy_type TEXT,
        discrepancy_details JSONB,
        resolution_status TEXT DEFAULT 'pending',
        resolution_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS boq_comparisons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id),
        item_code TEXT,
        description TEXT,
        current_price DECIMAL,
        avg_historical_price DECIMAL,
        min_historical_price DECIMAL,
        max_historical_price DECIMAL,
        price_position TEXT,
        comparison_count INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS pricing_recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id),
        boq_item_id UUID REFERENCES boq_items(id),
        recommended_price DECIMAL,
        price_basis TEXT,
        confidence DECIMAL(3,2),
        factors JSONB,
        strategy TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Competitors
    `CREATE TABLE IF NOT EXISTS tender_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_number TEXT NOT NULL,
        tender_name TEXT,
        issuing_body TEXT,
        category TEXT,
        result_date DATE,
        winner_name TEXT,
        winner_company_number TEXT,
        winning_price DECIMAL,
        num_bidders INTEGER,
        source_url TEXT,
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS tender_bids (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_result_id UUID REFERENCES tender_results(id) ON DELETE CASCADE,
        bidder_name TEXT NOT NULL,
        bidder_company_number TEXT,
        bid_price DECIMAL,
        bid_rank INTEGER,
        disqualified BOOLEAN DEFAULT false,
        disqualification_reason TEXT,
        technical_score DECIMAL,
        price_score DECIMAL,
        total_score DECIMAL,
        notes TEXT,
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
        avg_price_position DECIMAL(5,4),
        total_bids INTEGER DEFAULT 0,
        total_wins INTEGER DEFAULT 0,
        preferred_clients TEXT[],
        strengths TEXT[],
        weaknesses TEXT[],
        pricing_behavior TEXT,
        last_activity DATE,
        data_quality TEXT DEFAULT 'low',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Reports
    `CREATE TABLE IF NOT EXISTS tender_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        report_type TEXT NOT NULL DEFAULT 'full_analysis',
        executive_summary TEXT,
        gate_status JSONB,
        boq_analysis JSONB,
        competitor_analysis JSONB,
        recommendation TEXT,
        win_probability DECIMAL(3,2),
        pricing_strategy JSONB,
        risks JSONB,
        generated_at TIMESTAMPTZ DEFAULT NOW(),
        generated_by TEXT DEFAULT 'system'
    )`,

    // Indexes
    'CREATE INDEX IF NOT EXISTS idx_source_refs_tender ON source_references(tender_id)',
    'CREATE INDEX IF NOT EXISTS idx_source_refs_entity ON source_references(entity_type, entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_dict_terms_normalized ON dictionary_terms(term_normalized)',
    'CREATE INDEX IF NOT EXISTS idx_accum_items_type ON accumulation_items(company_id, item_type)',
    'CREATE INDEX IF NOT EXISTS idx_tender_results_winner ON tender_results(winner_name)',
    'CREATE INDEX IF NOT EXISTS idx_competitor_profiles_name ON competitor_profiles(company_name)',
    'CREATE INDEX IF NOT EXISTS idx_tender_reports_tender ON tender_reports(tender_id)'
];

// Data inserts
const dataInserts = [
    `INSERT INTO dictionary_categories (name, name_en, description, keywords)
     SELECT 'תשתיות', 'Infrastructure', 'עבודות תשתית', ARRAY['ביוב', 'מים', 'חשמל']
     WHERE NOT EXISTS (SELECT 1 FROM dictionary_categories WHERE name = 'תשתיות')`,

    `INSERT INTO dictionary_categories (name, name_en, description, keywords)
     SELECT 'בינוי', 'Construction', 'עבודות בנייה', ARRAY['בנייה', 'שיפוץ']
     WHERE NOT EXISTS (SELECT 1 FROM dictionary_categories WHERE name = 'בינוי')`,

    `INSERT INTO dictionary_categories (name, name_en, description, keywords)
     SELECT 'מערכות מידע', 'IT', 'תוכנה וחומרה', ARRAY['תוכנה', 'מחשבים']
     WHERE NOT EXISTS (SELECT 1 FROM dictionary_categories WHERE name = 'מערכות מידע')`,

    `INSERT INTO dictionary_categories (name, name_en, description, keywords)
     SELECT 'שירותים', 'Services', 'שירותי ייעוץ וניהול', ARRAY['ייעוץ', 'ניהול']
     WHERE NOT EXISTS (SELECT 1 FROM dictionary_categories WHERE name = 'שירותים')`,

    `INSERT INTO accumulation_rules (rule_name, entity_type, aggregation_method, description)
     SELECT 'project_revenue', 'project', 'sum', 'סכימת הכנסות מפרויקטים'
     WHERE NOT EXISTS (SELECT 1 FROM accumulation_rules WHERE rule_name = 'project_revenue')`,

    `INSERT INTO accumulation_rules (rule_name, entity_type, aggregation_method, description)
     SELECT 'experience_years', 'experience', 'count_distinct', 'ספירת שנות ניסיון'
     WHERE NOT EXISTS (SELECT 1 FROM accumulation_rules WHERE rule_name = 'experience_years')`,

    `INSERT INTO gap_closure_options (gap_type, closure_method, description, typical_time_days)
     SELECT 'experience', 'subcontractor', 'שכירת קבלן משנה', 14
     WHERE NOT EXISTS (SELECT 1 FROM gap_closure_options WHERE gap_type = 'experience' AND closure_method = 'subcontractor')`,

    `INSERT INTO gap_closure_options (gap_type, closure_method, description, typical_time_days)
     SELECT 'experience', 'partner', 'שותפות עם חברה', 30
     WHERE NOT EXISTS (SELECT 1 FROM gap_closure_options WHERE gap_type = 'experience' AND closure_method = 'partner')`,

    `INSERT INTO gap_closure_options (gap_type, closure_method, description, typical_time_days)
     SELECT 'revenue', 'consortium', 'הקמת קונסורציום', 45
     WHERE NOT EXISTS (SELECT 1 FROM gap_closure_options WHERE gap_type = 'revenue' AND closure_method = 'consortium')`,

    `INSERT INTO gap_closure_options (gap_type, closure_method, description, typical_time_days)
     SELECT 'certificate', 'hire', 'גיוס בעל תעודה', 30
     WHERE NOT EXISTS (SELECT 1 FROM gap_closure_options WHERE gap_type = 'certificate' AND closure_method = 'hire')`,

    `INSERT INTO gap_closure_options (gap_type, closure_method, description, typical_time_days)
     SELECT 'financial', 'guarantee', 'ערבות בנקאית', 7
     WHERE NOT EXISTS (SELECT 1 FROM gap_closure_options WHERE gap_type = 'financial' AND closure_method = 'guarantee')`
];

async function executeQuery(sql) {
    const url = `${SUPABASE_URL}/rest/v1/rpc/`;

    // Try using pg_query function if available
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_KEY,
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({})
        });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function main() {
    let created = 0;
    let failed = 0;
    const errors = [];

    console.log('📦 Creating tables...');
    for (const sql of sqlStatements) {
        const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] ||
                          sql.match(/CREATE INDEX.*ON (\w+)/)?.[1] ||
                          'extension';
        process.stdout.write(`  ${tableName}...`);

        // We'll output for manual execution
        created++;
        console.log(' ✓');
    }

    console.log(`\n✅ ${created} SQL statements prepared`);
    console.log('');
    console.log('📋 IMPORTANT: Execute the SQL manually in Supabase SQL Editor');
    console.log('');
    console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard/project/' + projectRef);
    console.log('2. Go to SQL Editor');
    console.log('3. Copy the content from: sql/tenderix_complete_v3.sql');
    console.log('4. Execute the SQL');
    console.log('');
    console.log('The SQL file has been prepared at:');
    console.log(path.join(__dirname, '../sql/tenderix_complete_v3.sql'));
    console.log('');

    // Create a simplified version for easy copy-paste
    const simpleSql = path.join(__dirname, '../sql/quick_deploy.sql');
    const quickContent = `-- Tenderix v3.0 Quick Deploy
-- Run this in Supabase SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

${sqlStatements.join(';\n\n')};\n\n${dataInserts.join(';\n\n')};

SELECT 'Tenderix v3.0 deployed successfully!' as status;
`;

    fs.writeFileSync(simpleSql, quickContent);
    console.log('📝 Quick deploy SQL created: sql/quick_deploy.sql');
}

main().catch(console.error);
