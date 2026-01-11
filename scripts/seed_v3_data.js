/**
 * Seed Tenderix v3.0 Data
 * Insert default data for all modules
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

async function clearAndSeed() {
    console.log('🌱 Seeding Tenderix v3.0 Data...\n');

    // 1. Dictionary Categories
    console.log('📚 Dictionary Categories...');

    // Check if data exists
    const { count: catCount } = await supabase
        .from('dictionary_categories')
        .select('*', { count: 'exact', head: true });

    if (catCount === 0) {
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

        const { error } = await supabase
            .from('dictionary_categories')
            .insert(categories);

        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
        } else {
            console.log(`   ✅ Inserted ${categories.length} categories`);
        }
    } else {
        console.log(`   ⏭️  Already has ${catCount} categories`);
    }

    // 2. Accumulation Rules
    console.log('\n📊 Accumulation Rules...');

    const { count: ruleCount } = await supabase
        .from('accumulation_rules')
        .select('*', { count: 'exact', head: true });

    if (ruleCount === 0) {
        const rules = [
            { rule_name: 'project_revenue', entity_type: 'project', aggregation_method: 'sum', dedup_fields: ['project_name', 'client_name', 'year'], description: 'סכימת הכנסות מפרויקטים' },
            { rule_name: 'experience_years', entity_type: 'experience', aggregation_method: 'count_distinct', dedup_fields: ['project_name', 'role'], description: 'ספירת שנות ניסיון' },
            { rule_name: 'similar_projects', entity_type: 'project', aggregation_method: 'count_distinct', dedup_fields: ['project_name', 'client_name'], time_window_months: 36, description: 'פרויקטים דומים ב-3 שנים' },
            { rule_name: 'annual_revenue', entity_type: 'revenue', aggregation_method: 'sum', dedup_fields: ['year', 'source'], time_window_months: 12, description: 'מחזור שנתי' },
            { rule_name: 'employee_count', entity_type: 'employee', aggregation_method: 'max', dedup_fields: ['employee_id'], description: 'מספר עובדים' }
        ];

        const { error } = await supabase
            .from('accumulation_rules')
            .insert(rules);

        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
        } else {
            console.log(`   ✅ Inserted ${rules.length} rules`);
        }
    } else {
        console.log(`   ⏭️  Already has ${ruleCount} rules`);
    }

    // 3. Gap Closure Options
    console.log('\n🔧 Gap Closure Options...');

    const { count: gapCount } = await supabase
        .from('gap_closure_options')
        .select('*', { count: 'exact', head: true });

    if (gapCount === 0) {
        const closures = [
            { gap_type: 'experience', closure_method: 'subcontractor', description: 'שכירת קבלן משנה עם הניסיון הנדרש', typical_time_days: 14, requirements: { contract_required: true, approval_letter: true, insurance: true }, risks: ['תלות בקבלן', 'עלות נוספת', 'איכות לא מובטחת'], active: true },
            { gap_type: 'experience', closure_method: 'partner', description: 'שותפות עם חברה בעלת ניסיון', typical_time_days: 30, requirements: { partnership_agreement: true, joint_guarantee: true, profit_split: true }, risks: ['חלוקת רווחים', 'קונפליקטים אפשריים', 'אחריות משותפת'], active: true },
            { gap_type: 'experience', closure_method: 'acquisition', description: 'רכישת חברה או פעילות עם הניסיון', typical_time_days: 90, requirements: { due_diligence: true, legal_approval: true, financing: true }, risks: ['עלות גבוהה', 'זמן ארוך', 'סיכון אינטגרציה'], active: true },
            { gap_type: 'revenue', closure_method: 'partner', description: 'שותפות עם חברה גדולה יותר', typical_time_days: 30, requirements: { revenue_split: true, lead_partner: true }, risks: ['תלות בשותף', 'רווח נמוך יותר'], active: true },
            { gap_type: 'revenue', closure_method: 'consortium', description: 'הקמת קונסורציום', typical_time_days: 45, requirements: { consortium_agreement: true, lead_entity: true }, risks: ['ניהול מורכב', 'חלוקת אחריות'], active: true },
            { gap_type: 'certificate', closure_method: 'training', description: 'הכשרת עובדים לקבלת תעודה', typical_time_days: 60, requirements: { training_budget: true, exam_scheduling: true, time_off: true }, risks: ['זמן הכשרה', 'עלות', 'אי-עמידה במבחן'], active: true },
            { gap_type: 'certificate', closure_method: 'hire', description: 'גיוס בעל התעודה', typical_time_days: 30, requirements: { salary_budget: true, job_description: true }, risks: ['עלות שכר', 'זמינות מועמדים'], active: true },
            { gap_type: 'staff', closure_method: 'hire', description: 'גיוס עובדים', typical_time_days: 45, requirements: { job_description: true, budget_approval: true, onboarding: true }, risks: ['זמן גיוס', 'התאמה תרבותית'], active: true },
            { gap_type: 'staff', closure_method: 'outsource', description: 'מיקור חוץ', typical_time_days: 14, requirements: { service_agreement: true, sla: true }, risks: ['תלות בספק', 'איכות משתנה'], active: true },
            { gap_type: 'financial', closure_method: 'guarantee', description: 'ערבות בנקאית', typical_time_days: 7, requirements: { bank_relationship: true, collateral: true }, risks: ['עלות ערבות', 'הקפאת כספים'], active: true },
            { gap_type: 'financial', closure_method: 'insurance', description: 'פוליסת ביטוח', typical_time_days: 14, requirements: { insurance_broker: true, coverage_limits: true }, risks: ['פרמיה', 'החרגות'], active: true }
        ];

        const { error } = await supabase
            .from('gap_closure_options')
            .insert(closures);

        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
        } else {
            console.log(`   ✅ Inserted ${closures.length} closure options`);
        }
    } else {
        console.log(`   ⏭️  Already has ${gapCount} options`);
    }

    // 4. Similarity Definitions
    console.log('\n🔍 Similarity Definitions...');

    const { count: simCount } = await supabase
        .from('similarity_definitions')
        .select('*', { count: 'exact', head: true });

    if (simCount === 0) {
        const similarities = [
            { category: 'תשתיות', term: 'פרויקט דומה', interpretation_type: 'flexible', criteria: { size_range: [0.5, 2.0], same_sector: true, same_technology: true, same_client_type: false }, notes: 'פרויקט בהיקף 50%-200%, אותו תחום טכני' },
            { category: 'מערכות מידע', term: 'מערכת דומה', interpretation_type: 'strict', criteria: { same_technology_stack: true, same_scale: true, user_count_range: [0.5, 3.0] }, notes: 'אותה טכנולוגיה וסדר גודל' },
            { category: 'בינוי', term: 'עבודה דומה', interpretation_type: 'flexible', criteria: { size_range: [0.3, 3.0], same_building_type: true }, notes: 'אותו סוג מבנה, היקף גמיש' },
            { category: 'שירותים', term: 'שירות דומה', interpretation_type: 'flexible', criteria: { same_service_type: true, size_range: [0.3, 3.0] }, notes: 'אותו סוג שירות' }
        ];

        const { error } = await supabase
            .from('similarity_definitions')
            .insert(similarities);

        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
        } else {
            console.log(`   ✅ Inserted ${similarities.length} similarity definitions`);
        }
    } else {
        console.log(`   ⏭️  Already has ${simCount} definitions`);
    }

    // 5. Potential Partners
    console.log('\n🤝 Potential Partners...');

    const { count: partnerCount } = await supabase
        .from('potential_partners')
        .select('*', { count: 'exact', head: true });

    if (partnerCount === 0) {
        const partners = [
            { company_name: 'אקמה תשתיות בע"מ', company_number: '520000001', contact_name: 'יוסי כהן', contact_phone: '050-1234567', capabilities: { experience: true, certifications: ['ISO9001', 'ISO14001'] }, experience_categories: ['experience', 'certificate'], rating: 4.5, preferred: true },
            { company_name: 'טק-פרו מערכות בע"מ', company_number: '520000002', contact_name: 'דנה לוי', contact_phone: '052-9876543', capabilities: { technology: true, team: true, agile: true }, experience_categories: ['staff', 'certificate'], rating: 4.2, preferred: false },
            { company_name: 'פיננס פלוס בע"מ', company_number: '520000003', contact_name: 'אבי רוזן', contact_phone: '054-5555555', capabilities: { financing: true, guarantees: true, insurance: true }, experience_categories: ['financial', 'revenue'], rating: 4.8, preferred: true },
            { company_name: 'בניה חכמה בע"מ', company_number: '520000004', contact_name: 'מיכל אברהם', contact_phone: '053-1112222', capabilities: { construction: true, certifications: ['ISO45001'] }, experience_categories: ['experience'], rating: 4.0, preferred: false }
        ];

        const { error } = await supabase
            .from('potential_partners')
            .insert(partners);

        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
        } else {
            console.log(`   ✅ Inserted ${partners.length} partners`);
        }
    } else {
        console.log(`   ⏭️  Already has ${partnerCount} partners`);
    }

    // 6. Competitor Profiles
    console.log('\n🏢 Competitor Profiles...');

    const { count: compCount } = await supabase
        .from('competitor_profiles')
        .select('*', { count: 'exact', head: true });

    if (compCount === 0) {
        const competitors = [
            { company_name: 'חברת תשתיות הצפון בע"מ', company_number: '510000001', categories: ['תשתיות', 'בינוי'], typical_bid_size_min: 1000000, typical_bid_size_max: 50000000, win_rate: 0.25, total_bids: 40, total_wins: 10, pricing_behavior: 'balanced', preferred_clients: ['משרד הביטחון', 'רכבת ישראל'], strengths: ['ניסיון רב', 'צוות מנוסה'], weaknesses: ['מחירים גבוהים'], last_activity: '2026-01-01', data_quality: 'high' },
            { company_name: 'דיגיטל סולושנס בע"מ', company_number: '510000002', categories: ['מערכות מידע'], typical_bid_size_min: 500000, typical_bid_size_max: 10000000, win_rate: 0.35, total_bids: 20, total_wins: 7, pricing_behavior: 'aggressive', preferred_clients: ['משרד הבריאות', 'ביטוח לאומי'], strengths: ['טכנולוגיה מתקדמת', 'תגובה מהירה'], weaknesses: ['צוות קטן'], last_activity: '2026-01-05', data_quality: 'medium' },
            { company_name: 'שירותי ניהול מתקדמים בע"מ', company_number: '510000003', categories: ['שירותים'], typical_bid_size_min: 100000, typical_bid_size_max: 5000000, win_rate: 0.20, total_bids: 50, total_wins: 10, pricing_behavior: 'premium', preferred_clients: ['עיריות', 'מועצות'], strengths: ['שירות איכותי', 'מוניטין טוב'], weaknesses: ['מחירים גבוהים', 'איטיים'], last_activity: '2025-12-20', data_quality: 'medium' },
            { company_name: 'בונים ביחד בע"מ', company_number: '510000004', categories: ['בינוי'], typical_bid_size_min: 5000000, typical_bid_size_max: 100000000, win_rate: 0.30, total_bids: 30, total_wins: 9, pricing_behavior: 'balanced', preferred_clients: ['משרד השיכון', 'חברת החשמל'], strengths: ['פרויקטים גדולים', 'יציבות פיננסית'], weaknesses: ['ריכוזיות'], last_activity: '2026-01-08', data_quality: 'high' }
        ];

        const { error } = await supabase
            .from('competitor_profiles')
            .insert(competitors);

        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
        } else {
            console.log(`   ✅ Inserted ${competitors.length} competitor profiles`);
        }
    } else {
        console.log(`   ⏭️  Already has ${compCount} competitors`);
    }

    // 7. Sample Tender Results
    console.log('\n📋 Sample Tender Results...');

    const { count: resultCount } = await supabase
        .from('tender_results')
        .select('*', { count: 'exact', head: true });

    if (resultCount === 0) {
        const results = [
            { tender_number: 'HIS-2025-001', tender_name: 'פיתוח מערכת ניהול מידע', issuing_body: 'משרד הבריאות', category: 'מערכות מידע', result_date: '2025-11-15', winner_name: 'דיגיטל סולושנס בע"מ', winner_company_number: '510000002', winning_price: 3500000, num_bidders: 5 },
            { tender_number: 'MOD-2025-042', tender_name: 'שיפוץ מבנה מגורים', issuing_body: 'משרד הביטחון', category: 'בינוי', result_date: '2025-10-20', winner_name: 'חברת תשתיות הצפון בע"מ', winner_company_number: '510000001', winning_price: 12000000, num_bidders: 8 },
            { tender_number: 'IEC-2025-015', tender_name: 'התקנת תשתיות חשמל', issuing_body: 'חברת החשמל', category: 'תשתיות', result_date: '2025-09-01', winner_name: 'בונים ביחד בע"מ', winner_company_number: '510000004', winning_price: 25000000, num_bidders: 4 },
            { tender_number: 'MUN-2025-088', tender_name: 'שירותי ניקיון למשרדים', issuing_body: 'עיריית תל אביב', category: 'שירותים', result_date: '2025-12-01', winner_name: 'שירותי ניהול מתקדמים בע"מ', winner_company_number: '510000003', winning_price: 800000, num_bidders: 12 }
        ];

        const { error } = await supabase
            .from('tender_results')
            .insert(results);

        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
        } else {
            console.log(`   ✅ Inserted ${results.length} tender results`);
        }
    } else {
        console.log(`   ⏭️  Already has ${resultCount} results`);
    }

    // Final summary
    console.log('\n========================================');
    console.log('📊 Final Data Summary');
    console.log('========================================\n');

    const tables = [
        'dictionary_categories', 'accumulation_rules', 'gap_closure_options',
        'similarity_definitions', 'potential_partners', 'competitor_profiles', 'tender_results'
    ];

    for (const table of tables) {
        const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
        console.log(`   ${table}: ${count || 0} rows`);
    }

    console.log('\n✅ Seeding complete!');
}

clearAndSeed().catch(console.error);
