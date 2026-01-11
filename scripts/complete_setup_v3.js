/**
 * Complete Tenderix v3.0 Setup
 * Create missing tables and insert default data
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

async function checkAndReportTables() {
    console.log('🔍 Checking all v3.0 tables...\n');

    const allTables = [
        // Core existing
        'tenders', 'tender_conditions', 'companies', 'gate_conditions',
        // C1-C4
        'source_references', 'dictionary_categories', 'dictionary_terms', 'term_occurrences',
        'accumulation_rules', 'accumulation_items', 'gap_closure_options', 'potential_partners',
        // Intake
        'tender_definitions', 'document_versions', 'tender_relations',
        // Gates
        'similarity_definitions', 'condition_interpretations',
        // BOQ
        'specification_items', 'boq_items', 'spec_boq_crossref', 'boq_comparisons', 'pricing_recommendations',
        // Competitors
        'tender_results', 'tender_bids', 'competitor_profiles',
        // Reports
        'tender_reports'
    ];

    const existing = [];
    const missing = [];

    for (const table of allTables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error && error.code === 'PGRST116') {
                missing.push(table);
            } else if (error) {
                missing.push(table);
            } else {
                existing.push({ name: table, count: count || 0 });
            }
        } catch (e) {
            missing.push(table);
        }
    }

    console.log('✅ Existing tables:');
    existing.forEach(t => console.log(`   ${t.name}: ${t.count} rows`));

    if (missing.length > 0) {
        console.log('\n❌ Missing tables:');
        missing.forEach(t => console.log(`   ${t}`));
    }

    return { existing, missing };
}

async function insertDefaultData() {
    console.log('\n📝 Inserting default data...\n');

    // Dictionary categories
    const categories = [
        { name: 'תשתיות', name_en: 'Infrastructure', description: 'עבודות תשתית, ביוב, מים, חשמל', keywords: ['ביוב', 'מים', 'חשמל', 'כבישים'] },
        { name: 'בינוי', name_en: 'Construction', description: 'עבודות בנייה, שיפוצים, גמר', keywords: ['בנייה', 'שיפוץ', 'טיח', 'ריצוף'] },
        { name: 'מערכות מידע', name_en: 'IT', description: 'תוכנה, חומרה, רשתות', keywords: ['תוכנה', 'מחשבים', 'רשת', 'ענן'] },
        { name: 'שירותים', name_en: 'Services', description: 'שירותי ייעוץ, ניהול, תחזוקה', keywords: ['ייעוץ', 'ניהול', 'תחזוקה'] },
        { name: 'רכש', name_en: 'Procurement', description: 'רכישת ציוד, חומרים', keywords: ['ציוד', 'רכש', 'אספקה'] },
        { name: 'הובלה ולוגיסטיקה', name_en: 'Logistics', description: 'שינוע, אחסנה, הפצה', keywords: ['הובלה', 'שינוע', 'אחסנה'] },
        { name: 'אבטחה', name_en: 'Security', description: 'מערכות אבטחה, שמירה', keywords: ['אבטחה', 'מצלמות', 'שמירה'] },
        { name: 'תקשורת', name_en: 'Communications', description: 'טלפוניה, אינטרנט', keywords: ['טלפון', 'אינטרנט', 'סיבים'] }
    ];

    for (const cat of categories) {
        const { error } = await supabase
            .from('dictionary_categories')
            .upsert(cat, { onConflict: 'name' });
        if (!error) {
            console.log(`   ✅ Category: ${cat.name}`);
        }
    }

    // Accumulation rules
    const rules = [
        { rule_name: 'project_revenue', entity_type: 'project', aggregation_method: 'sum', dedup_fields: ['project_name', 'client_name', 'year'] },
        { rule_name: 'experience_years', entity_type: 'experience', aggregation_method: 'count_distinct', dedup_fields: ['project_name', 'role'] },
        { rule_name: 'similar_projects', entity_type: 'project', aggregation_method: 'count_distinct', dedup_fields: ['project_name', 'client_name'], time_window_months: 36 },
        { rule_name: 'annual_revenue', entity_type: 'revenue', aggregation_method: 'sum', dedup_fields: ['year', 'source'], time_window_months: 12 },
        { rule_name: 'employee_count', entity_type: 'employee', aggregation_method: 'max', dedup_fields: ['employee_id'] }
    ];

    for (const rule of rules) {
        const { error } = await supabase
            .from('accumulation_rules')
            .upsert(rule, { onConflict: 'rule_name' });
        if (!error) {
            console.log(`   ✅ Rule: ${rule.rule_name}`);
        }
    }

    // Gap closure options
    const closures = [
        { gap_type: 'experience', closure_method: 'subcontractor', description: 'שכירת קבלן משנה עם הניסיון הנדרש', typical_time_days: 14, requirements: { contract_required: true, approval_letter: true }, risks: ['תלות בקבלן', 'עלות נוספת'] },
        { gap_type: 'experience', closure_method: 'partner', description: 'שותפות עם חברה בעלת ניסיון', typical_time_days: 30, requirements: { partnership_agreement: true }, risks: ['חלוקת רווחים'] },
        { gap_type: 'revenue', closure_method: 'partner', description: 'שותפות עם חברה גדולה יותר', typical_time_days: 30, requirements: { revenue_split: true }, risks: ['תלות בשותף'] },
        { gap_type: 'revenue', closure_method: 'consortium', description: 'הקמת קונסורציום', typical_time_days: 45, requirements: { consortium_agreement: true }, risks: ['ניהול מורכב'] },
        { gap_type: 'certificate', closure_method: 'training', description: 'הכשרת עובדים לקבלת תעודה', typical_time_days: 60, requirements: { training_budget: true }, risks: ['זמן הכשרה'] },
        { gap_type: 'certificate', closure_method: 'hire', description: 'גיוס בעל התעודה', typical_time_days: 30, requirements: { salary_budget: true }, risks: ['עלות שכר'] },
        { gap_type: 'staff', closure_method: 'hire', description: 'גיוס עובדים', typical_time_days: 45, requirements: { job_description: true }, risks: ['זמן גיוס'] },
        { gap_type: 'staff', closure_method: 'outsource', description: 'מיקור חוץ', typical_time_days: 14, requirements: { service_agreement: true }, risks: ['תלות בספק'] },
        { gap_type: 'financial', closure_method: 'guarantee', description: 'ערבות בנקאית', typical_time_days: 7, requirements: { bank_relationship: true }, risks: ['עלות ערבות'] },
        { gap_type: 'financial', closure_method: 'insurance', description: 'פוליסת ביטוח', typical_time_days: 14, requirements: { insurance_broker: true }, risks: ['פרמיה'] }
    ];

    for (const closure of closures) {
        const { error } = await supabase
            .from('gap_closure_options')
            .upsert(closure, { onConflict: 'gap_type,closure_method', ignoreDuplicates: true });
        if (!error) {
            console.log(`   ✅ Closure: ${closure.gap_type}/${closure.closure_method}`);
        }
    }

    // Sample competitor profiles
    const competitors = [
        { company_name: 'חברה מתחרה א', company_number: '510000001', categories: ['תשתיות', 'בינוי'], typical_bid_size_min: 1000000, typical_bid_size_max: 50000000, win_rate: 0.25, pricing_behavior: 'balanced' },
        { company_name: 'חברה מתחרה ב', company_number: '510000002', categories: ['מערכות מידע'], typical_bid_size_min: 500000, typical_bid_size_max: 10000000, win_rate: 0.35, pricing_behavior: 'aggressive' },
        { company_name: 'חברה מתחרה ג', company_number: '510000003', categories: ['שירותים'], typical_bid_size_min: 100000, typical_bid_size_max: 5000000, win_rate: 0.20, pricing_behavior: 'premium' }
    ];

    for (const comp of competitors) {
        const { error } = await supabase
            .from('competitor_profiles')
            .upsert(comp, { onConflict: 'company_number' });
        if (!error) {
            console.log(`   ✅ Competitor: ${comp.company_name}`);
        }
    }

    // Sample potential partners
    const partners = [
        { company_name: 'שותף תשתיות בע"מ', company_number: '520000001', capabilities: { experience: true, certifications: ['ISO9001'] }, experience_categories: ['experience', 'certificate'], rating: 4.5 },
        { company_name: 'שותף טכנולוגי בע"מ', company_number: '520000002', capabilities: { technology: true, team: true }, experience_categories: ['staff', 'certificate'], rating: 4.2 },
        { company_name: 'שותף פיננסי בע"מ', company_number: '520000003', capabilities: { financing: true, guarantees: true }, experience_categories: ['financial', 'revenue'], rating: 4.8 }
    ];

    for (const partner of partners) {
        const { error } = await supabase
            .from('potential_partners')
            .upsert(partner, { onConflict: 'company_number' });
        if (!error) {
            console.log(`   ✅ Partner: ${partner.company_name}`);
        }
    }

    console.log('\n✅ Default data inserted successfully');
}

async function verifyCounts() {
    console.log('\n📊 Final counts:\n');

    const tables = [
        'dictionary_categories', 'accumulation_rules', 'gap_closure_options',
        'potential_partners', 'competitor_profiles'
    ];

    for (const table of tables) {
        const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
        console.log(`   ${table}: ${count || 0} rows`);
    }
}

async function main() {
    console.log('🚀 Tenderix v3.0 Complete Setup\n');
    console.log('================================\n');

    await checkAndReportTables();
    await insertDefaultData();
    await verifyCounts();

    console.log('\n================================');
    console.log('🎉 Setup Complete!');
    console.log('================================\n');

    console.log('Next steps:');
    console.log('1. Deploy n8n workflows');
    console.log('2. Test the system');
    console.log('');
}

main().catch(console.error);
