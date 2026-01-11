/**
 * Force Seed Tenderix v3.0 Data
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

async function seed() {
    console.log('🌱 Force Seeding Tenderix v3.0 Data...\n');

    // 1. Dictionary Categories
    console.log('📚 Dictionary Categories...');
    const categories = [
        { name: 'תשתיות', name_en: 'Infrastructure', description: 'עבודות תשתית, ביוב, מים, חשמל', keywords: ['ביוב', 'מים', 'חשמל', 'כבישים', 'גשרים'] },
        { name: 'בינוי', name_en: 'Construction', description: 'עבודות בנייה, שיפוצים, גמר', keywords: ['בנייה', 'שיפוץ', 'טיח', 'ריצוף', 'צבע'] },
        { name: 'מערכות מידע', name_en: 'IT', description: 'תוכנה, חומרה, רשתות', keywords: ['תוכנה', 'מחשבים', 'רשת', 'ענן', 'אבטחת מידע'] },
        { name: 'שירותים', name_en: 'Services', description: 'שירותי ייעוץ, ניהול, תחזוקה', keywords: ['ייעוץ', 'ניהול', 'תחזוקה', 'ניקיון', 'שמירה'] },
        { name: 'רכש', name_en: 'Procurement', description: 'רכישת ציוד, חומרים', keywords: ['ציוד', 'רכש', 'אספקה', 'חומרים'] },
        { name: 'הובלה ולוגיסטיקה', name_en: 'Logistics', description: 'שינוע, אחסנה, הפצה', keywords: ['הובלה', 'שינוע', 'אחסנה', 'הפצה'] },
        { name: 'אבטחה', name_en: 'Security', description: 'מערכות אבטחה, שמירה', keywords: ['אבטחה', 'מצלמות', 'בקרת כניסה', 'שמירה'] },
        { name: 'תקשורת', name_en: 'Communications', description: 'טלפוניה, אינטרנט, שידור', keywords: ['טלפון', 'אינטרנט', 'סיבים', 'אלחוט'] }
    ];

    const { data: catData, error: catError } = await supabase
        .from('dictionary_categories')
        .insert(categories)
        .select();

    if (catError) {
        console.log(`   ❌ Error: ${catError.message}`);
        if (catError.message.includes('duplicate')) {
            console.log('   ℹ️  Data already exists');
        }
    } else {
        console.log(`   ✅ Inserted ${catData?.length || categories.length} categories`);
    }

    // 2. Accumulation Rules
    console.log('\n📊 Accumulation Rules...');
    const rules = [
        { rule_name: 'project_revenue', entity_type: 'project', aggregation_method: 'sum', dedup_fields: ['project_name', 'client_name', 'year'] },
        { rule_name: 'experience_years', entity_type: 'experience', aggregation_method: 'count_distinct', dedup_fields: ['project_name', 'role'] },
        { rule_name: 'similar_projects', entity_type: 'project', aggregation_method: 'count_distinct', dedup_fields: ['project_name', 'client_name'], time_window_months: 36 },
        { rule_name: 'annual_revenue', entity_type: 'revenue', aggregation_method: 'sum', dedup_fields: ['year', 'source'], time_window_months: 12 },
        { rule_name: 'employee_count', entity_type: 'employee', aggregation_method: 'max', dedup_fields: ['employee_id'] }
    ];

    const { data: ruleData, error: ruleError } = await supabase
        .from('accumulation_rules')
        .insert(rules)
        .select();

    if (ruleError) {
        console.log(`   ❌ Error: ${ruleError.message}`);
    } else {
        console.log(`   ✅ Inserted ${ruleData?.length || rules.length} rules`);
    }

    // 3. Gap Closure Options
    console.log('\n🔧 Gap Closure Options...');
    const closures = [
        { gap_type: 'experience', closure_method: 'subcontractor', description: 'שכירת קבלן משנה עם הניסיון הנדרש', typical_time_days: 14, requirements: { contract_required: true, approval_letter: true, insurance: true }, risks: ['תלות בקבלן', 'עלות נוספת'], active: true },
        { gap_type: 'experience', closure_method: 'partner', description: 'שותפות עם חברה בעלת ניסיון', typical_time_days: 30, requirements: { partnership_agreement: true, joint_guarantee: true }, risks: ['חלוקת רווחים', 'קונפליקטים אפשריים'], active: true },
        { gap_type: 'revenue', closure_method: 'partner', description: 'שותפות עם חברה גדולה יותר', typical_time_days: 30, requirements: { revenue_split: true }, risks: ['תלות בשותף'], active: true },
        { gap_type: 'revenue', closure_method: 'consortium', description: 'הקמת קונסורציום', typical_time_days: 45, requirements: { consortium_agreement: true }, risks: ['ניהול מורכב'], active: true },
        { gap_type: 'certificate', closure_method: 'training', description: 'הכשרת עובדים לקבלת תעודה', typical_time_days: 60, requirements: { training_budget: true }, risks: ['זמן הכשרה', 'עלות'], active: true },
        { gap_type: 'certificate', closure_method: 'hire', description: 'גיוס בעל התעודה', typical_time_days: 30, requirements: { salary_budget: true }, risks: ['עלות שכר'], active: true },
        { gap_type: 'staff', closure_method: 'hire', description: 'גיוס עובדים', typical_time_days: 45, requirements: { job_description: true }, risks: ['זמן גיוס'], active: true },
        { gap_type: 'staff', closure_method: 'outsource', description: 'מיקור חוץ', typical_time_days: 14, requirements: { service_agreement: true }, risks: ['תלות בספק'], active: true },
        { gap_type: 'financial', closure_method: 'guarantee', description: 'ערבות בנקאית', typical_time_days: 7, requirements: { bank_relationship: true }, risks: ['עלות ערבות'], active: true },
        { gap_type: 'financial', closure_method: 'insurance', description: 'פוליסת ביטוח', typical_time_days: 14, requirements: { insurance_broker: true }, risks: ['פרמיה'], active: true }
    ];

    const { data: closureData, error: closureError } = await supabase
        .from('gap_closure_options')
        .insert(closures)
        .select();

    if (closureError) {
        console.log(`   ❌ Error: ${closureError.message}`);
    } else {
        console.log(`   ✅ Inserted ${closureData?.length || closures.length} closure options`);
    }

    // 4. Potential Partners
    console.log('\n🤝 Potential Partners...');
    const partners = [
        { company_name: 'אקמה תשתיות בע"מ', company_number: '520000001', contact_name: 'יוסי כהן', capabilities: { experience: true, certifications: ['ISO9001'] }, experience_categories: ['experience', 'certificate'], rating: 4.5, preferred: true },
        { company_name: 'טק-פרו מערכות בע"מ', company_number: '520000002', contact_name: 'דנה לוי', capabilities: { technology: true, team: true }, experience_categories: ['staff', 'certificate'], rating: 4.2 },
        { company_name: 'פיננס פלוס בע"מ', company_number: '520000003', contact_name: 'אבי רוזן', capabilities: { financing: true, guarantees: true }, experience_categories: ['financial', 'revenue'], rating: 4.8, preferred: true }
    ];

    const { data: partnerData, error: partnerError } = await supabase
        .from('potential_partners')
        .insert(partners)
        .select();

    if (partnerError) {
        console.log(`   ❌ Error: ${partnerError.message}`);
    } else {
        console.log(`   ✅ Inserted ${partnerData?.length || partners.length} partners`);
    }

    // 5. Competitor Profiles
    console.log('\n🏢 Competitor Profiles...');
    const competitors = [
        { company_name: 'חברת תשתיות הצפון בע"מ', company_number: '510000001', categories: ['תשתיות', 'בינוי'], typical_bid_size_min: 1000000, typical_bid_size_max: 50000000, win_rate: 0.25, total_bids: 40, total_wins: 10, pricing_behavior: 'balanced', preferred_clients: ['משרד הביטחון'], strengths: ['ניסיון רב'], last_activity: '2026-01-01', data_quality: 'high' },
        { company_name: 'דיגיטל סולושנס בע"מ', company_number: '510000002', categories: ['מערכות מידע'], typical_bid_size_min: 500000, typical_bid_size_max: 10000000, win_rate: 0.35, total_bids: 20, total_wins: 7, pricing_behavior: 'aggressive', preferred_clients: ['משרד הבריאות'], strengths: ['טכנולוגיה מתקדמת'], last_activity: '2026-01-05', data_quality: 'medium' },
        { company_name: 'שירותי ניהול מתקדמים בע"מ', company_number: '510000003', categories: ['שירותים'], typical_bid_size_min: 100000, typical_bid_size_max: 5000000, win_rate: 0.20, total_bids: 50, total_wins: 10, pricing_behavior: 'premium', preferred_clients: ['עיריות'], strengths: ['שירות איכותי'], last_activity: '2025-12-20', data_quality: 'medium' }
    ];

    const { data: compData, error: compError } = await supabase
        .from('competitor_profiles')
        .insert(competitors)
        .select();

    if (compError) {
        console.log(`   ❌ Error: ${compError.message}`);
    } else {
        console.log(`   ✅ Inserted ${compData?.length || competitors.length} competitor profiles`);
    }

    // 6. Tender Results
    console.log('\n📋 Sample Tender Results...');
    const results = [
        { tender_number: 'HIS-2025-001', tender_name: 'פיתוח מערכת ניהול מידע', issuing_body: 'משרד הבריאות', category: 'מערכות מידע', result_date: '2025-11-15', winner_name: 'דיגיטל סולושנס בע"מ', winning_price: 3500000, num_bidders: 5 },
        { tender_number: 'MOD-2025-042', tender_name: 'שיפוץ מבנה מגורים', issuing_body: 'משרד הביטחון', category: 'בינוי', result_date: '2025-10-20', winner_name: 'חברת תשתיות הצפון בע"מ', winning_price: 12000000, num_bidders: 8 },
        { tender_number: 'IEC-2025-015', tender_name: 'התקנת תשתיות חשמל', issuing_body: 'חברת החשמל', category: 'תשתיות', result_date: '2025-09-01', winner_name: 'בונים ביחד בע"מ', winning_price: 25000000, num_bidders: 4 }
    ];

    const { data: resultData, error: resultError } = await supabase
        .from('tender_results')
        .insert(results)
        .select();

    if (resultError) {
        console.log(`   ❌ Error: ${resultError.message}`);
    } else {
        console.log(`   ✅ Inserted ${resultData?.length || results.length} tender results`);
    }

    // Final check
    console.log('\n========================================');
    console.log('📊 Final Data Summary');
    console.log('========================================\n');

    const tables = [
        'dictionary_categories', 'accumulation_rules', 'gap_closure_options',
        'potential_partners', 'competitor_profiles', 'tender_results'
    ];

    for (const table of tables) {
        const { data } = await supabase.from(table).select('*');
        console.log(`   ${table}: ${data?.length || 0} rows`);
    }

    console.log('\n✅ Seeding complete!');
}

seed().catch(console.error);
