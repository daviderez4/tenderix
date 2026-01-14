/**
 * Add test data for workflow testing
 */

require('dotenv').config({ path: './config/.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function addTestData() {
    console.log('='.repeat(50));
    console.log('ADDING TEST DATA');
    console.log('='.repeat(50));

    const tenderId = '8c982353-78ea-479b-a31c-e1316cce15f2';

    // 1. Add tender document with gate conditions text
    console.log('\n1. Adding tender document...');

    const docData = {
        tender_id: tenderId,
        file_name: 'tender_requirements.pdf',
        document_type: 'requirements',
        extracted_text: `תנאי סף למכרז:

1. ניסיון מוכח: על המציע להציג ניסיון של לפחות 5 שנים בתחום
2. מחזור כספי: מחזור שנתי של לפחות 10 מיליון ש"ח
3. אישור ISO: נדרש אישור ISO 9001 בתוקף
4. ערבות בנקאית: יש להמציא ערבות בנקאית בסך 100,000 ש"ח
5. רישיון קבלן: רישום בפנקס הקבלנים בסיווג מתאים
6. ביטוח: ביטוח אחריות מקצועית בסך 5 מיליון ש"ח לפחות
7. כוח אדם: צוות של לפחות 20 עובדים מקצועיים
8. הסמכות: הסמכה מטעם משרד הביטחון - יתרון

דרישות טכניות:
- יכולת לספק שירות 24/7
- מערכת ניהול פרויקטים מתקדמת
- צי רכבים של לפחות 5 כלי רכב`
    };

    const docRes = await fetch(`${SUPABASE_URL}/rest/v1/tender_documents`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(docData)
    });

    if (docRes.ok) {
        const doc = await docRes.json();
        console.log('   Document added:', doc[0]?.id || 'success');
    } else {
        const err = await docRes.text();
        console.log('   Error:', err);
    }

    // 2. Check if company_profiles table exists and add data
    console.log('\n2. Adding company profile...');

    const profileData = {
        company_name: 'Test Company Ltd',
        company_number: '12345678',
        experience_years: 10,
        employee_count: 50,
        annual_revenue: 20000000,
        certifications: JSON.stringify(['ISO 9001', 'ISO 27001']),
        specializations: ['IT', 'Software'],
        description: 'A test company with various capabilities'
    };

    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/company_profiles`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(profileData)
    });

    if (profileRes.ok) {
        const profile = await profileRes.json();
        console.log('   Profile added:', profile[0]?.id || 'success');
    } else {
        const err = await profileRes.text();
        console.log('   Error (table may not exist):', err.substring(0, 100));
    }

    console.log('\n' + '='.repeat(50));
    console.log('Test data ready!');
    console.log('='.repeat(50));
}

addTestData().catch(e => console.error('Error:', e.message));
