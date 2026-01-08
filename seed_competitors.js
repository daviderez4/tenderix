// Seed competitor data
const SUPABASE_URL = 'https://rerfjgjwjqodevkvhkxu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcmZqZ2p3anFvZGV2a3Zoa3h1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5NDMwNywiZXhwIjoyMDgxMDcwMzA3fQ.HzsbNbVxrLXxRMNvlVuKaqduQ-PgcD3IrseKm_LcN34';
const ORG_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const TENDER_ID = 'e1e1e1e1-0000-0000-0000-000000000001';

async function seedCompetitors() {
  console.log('=== Seeding Competitor Data ===\n');

  // Seed competitors
  const competitors = [
    {
      id: 'c0c0c0c0-0001-0000-0000-000000000001',
      org_id: ORG_ID,
      name: 'אלביט מערכות',
      company_number: '520043212',
      website: 'https://elbitsystems.com',
      strengths: ['טכנולוגיה ישראלית', 'ניסיון ביטחוני', 'R&D חזק'],
      weaknesses: ['מחירים גבוהים', 'זמני אספקה ארוכים'],
      typical_domains: ['VIDEO', 'MILITARY', 'SECURITY'],
      known_pricing_strategy: 'פרימיום - מחירים גבוהים עם ערך מוסף טכנולוגי',
      typical_margin_range: '25-35%'
    },
    {
      id: 'c0c0c0c0-0002-0000-0000-000000000001',
      org_id: ORG_ID,
      name: 'טלדור מערכות',
      company_number: '512345678',
      website: 'https://taldor.co.il',
      strengths: ['מחירים תחרותיים', 'יכולת ביצוע מהירה', 'קשרים עם רשויות'],
      weaknesses: ['פחות טכנולוגי', 'תלות בקבלני משנה'],
      typical_domains: ['VIDEO', 'COMMUNICATION', 'ACCESS_CONTROL'],
      known_pricing_strategy: 'אגרסיבי - מחירים נמוכים לזכייה',
      typical_margin_range: '12-18%'
    },
    {
      id: 'c0c0c0c0-0003-0000-0000-000000000001',
      org_id: ORG_ID,
      name: 'בזק בינלאומי',
      company_number: '511234567',
      website: 'https://bezeqint.co.il',
      strengths: ['תשתית קיימת', 'יכולת מימון', 'נוכחות ארצית'],
      weaknesses: ['ביורוקרטיה', 'איטיות בהתאמות'],
      typical_domains: ['COMMUNICATION', 'VIDEO', 'INFRASTRUCTURE'],
      known_pricing_strategy: 'בינוני - שילוב עם שירותי תקשורת',
      typical_margin_range: '20-28%'
    },
    {
      id: 'c0c0c0c0-0004-0000-0000-000000000001',
      org_id: ORG_ID,
      name: 'מוקד ארצי',
      company_number: '513456789',
      website: 'https://moked-artzi.co.il',
      strengths: ['מומחיות מוקדים', 'אינטגרציה עם 100/106', 'ניסיון עירוני'],
      weaknesses: ['פחות חומרה', 'תלות בשותפים'],
      typical_domains: ['VIDEO', 'COMMAND_CENTER', 'MONITORING'],
      known_pricing_strategy: 'ממוקד שירות - מחיר גבוה יותר עם SLA',
      typical_margin_range: '18-25%'
    }
  ];

  for (const comp of competitors) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/competitors`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(comp)
    });
    console.log(`Competitor ${comp.name}: ${res.ok ? 'OK' : 'FAIL ' + res.status}`);
  }

  // Seed competitor bids (historical data)
  const bids = [
    {
      competitor_id: 'c0c0c0c0-0001-0000-0000-000000000001',
      tender_issuing_body: 'עיריית תל אביב',
      tender_name: 'מכרז מצלמות עיר חכמה',
      tender_number: 'TLV-2024-156',
      tender_year: 2024,
      bid_amount: 45000000,
      won: true,
      quality_score: 92,
      price_score: 78,
      total_score: 86,
      rank: 1,
      price_per_unit: { camera_4mp: 3500, camera_ptz: 8500, nvr: 45000 },
      margin_estimate: 28,
      source_type: 'PUBLIC_RECORD',
      confidence_level: 'HIGH'
    },
    {
      competitor_id: 'c0c0c0c0-0002-0000-0000-000000000001',
      tender_issuing_body: 'עיריית באר שבע',
      tender_name: 'מערכת מצלמות אבטחה',
      tender_number: 'BS-2024-089',
      tender_year: 2024,
      bid_amount: 12500000,
      won: true,
      quality_score: 75,
      price_score: 95,
      total_score: 83,
      rank: 1,
      price_per_unit: { camera_4mp: 2200, camera_ptz: 5500, nvr: 28000 },
      margin_estimate: 14,
      source_type: 'PUBLIC_RECORD',
      confidence_level: 'HIGH'
    },
    {
      competitor_id: 'c0c0c0c0-0003-0000-0000-000000000001',
      tender_issuing_body: 'עיריית חולון',
      tender_name: 'מכרז תשתיות תקשורת',
      tender_number: 'HOL-2023-045',
      tender_year: 2023,
      bid_amount: 8500000,
      won: true,
      quality_score: 80,
      price_score: 88,
      total_score: 84,
      rank: 1,
      price_per_unit: { fiber_meter: 85, switch: 4500 },
      margin_estimate: 22,
      source_type: 'PUBLIC_RECORD',
      confidence_level: 'MEDIUM'
    },
    {
      competitor_id: 'c0c0c0c0-0004-0000-0000-000000000001',
      tender_issuing_body: 'עיריית נתניה',
      tender_name: 'מוקד עירוני משולב',
      tender_number: 'NET-2024-023',
      tender_year: 2024,
      bid_amount: 18000000,
      won: true,
      quality_score: 88,
      price_score: 82,
      total_score: 85,
      rank: 1,
      price_per_unit: { workstation: 35000, screen: 8000, camera_4mp: 2800 },
      margin_estimate: 20,
      source_type: 'PUBLIC_RECORD',
      confidence_level: 'HIGH'
    }
  ];

  console.log('\nSeeding competitor bids...');
  for (const bid of bids) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/competitor_bids`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(bid)
    });
    console.log(`Bid ${bid.tender_name.substring(0,20)}: ${res.ok ? 'OK' : 'FAIL ' + res.status}`);
  }

  // Seed tender_competitors (potential competitors for our test tender)
  const tenderComps = [
    {
      tender_id: TENDER_ID,
      competitor_id: 'c0c0c0c0-0001-0000-0000-000000000001',
      likelihood_to_bid: 'MEDIUM',
      estimated_advantage: 'הם יקרים יותר, אבל עם טכנולוגיה מתקדמת',
      estimated_bid_range_low: 22000000,
      estimated_bid_range_high: 28000000,
      their_strengths: ['טכנולוגיה עדיפה', 'ניסיון במכרזים דומים'],
      their_weaknesses: ['מחיר גבוה', 'זמני אספקה ארוכים'],
      our_counter_strategy: 'להדגיש יתרון מחיר ושירות מהיר'
    },
    {
      tender_id: TENDER_ID,
      competitor_id: 'c0c0c0c0-0002-0000-0000-000000000001',
      likelihood_to_bid: 'HIGH',
      estimated_advantage: 'מתחרה ישיר עם מחירים אגרסיביים',
      estimated_bid_range_low: 15000000,
      estimated_bid_range_high: 18000000,
      their_strengths: ['מחירים נמוכים', 'קשרים עם עיריית חולון'],
      their_weaknesses: ['איכות בינונית', 'תלות בקבלני משנה'],
      our_counter_strategy: 'להציע איכות גבוהה יותר ותמיכה טובה יותר'
    },
    {
      tender_id: TENDER_ID,
      competitor_id: 'c0c0c0c0-0004-0000-0000-000000000001',
      likelihood_to_bid: 'LOW',
      estimated_advantage: 'פחות רלוונטי - מומחי מוקדים',
      estimated_bid_range_low: 20000000,
      estimated_bid_range_high: 24000000,
      their_strengths: ['ניסיון במוקדים'],
      their_weaknesses: ['פחות ציוד שטח', 'לא מתמחים בהתקנות'],
      our_counter_strategy: 'לא צפוי להגיש'
    }
  ];

  console.log('\nSeeding tender competitors...');
  for (const tc of tenderComps) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tender_competitors`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(tc)
    });
    console.log(`Tender competitor: ${res.ok ? 'OK' : 'FAIL ' + res.status}`);
  }

  // Seed market pricing
  const pricing = [
    { category: 'VIDEO', item_type: 'camera_4mp_fixed', item_description: 'מצלמת IP קבועה 4MP', low_price: 1800, typical_price: 2500, high_price: 4000, unit: 'יחידה', based_on_bids: 45 },
    { category: 'VIDEO', item_type: 'camera_ptz_2mp', item_description: 'מצלמה ממונעת PTZ 2MP', low_price: 4500, typical_price: 6500, high_price: 12000, unit: 'יחידה', based_on_bids: 32 },
    { category: 'VIDEO', item_type: 'nvr_32ch', item_description: 'שרת הקלטה 32 ערוצים', low_price: 25000, typical_price: 35000, high_price: 55000, unit: 'יחידה', based_on_bids: 28 },
    { category: 'INFRASTRUCTURE', item_type: 'fiber_outdoor', item_description: 'סיב אופטי חיצוני', low_price: 60, typical_price: 85, high_price: 120, unit: 'מטר', based_on_bids: 50 },
    { category: 'INFRASTRUCTURE', item_type: 'cabinet_outdoor', item_description: 'ארון תקשורת חיצוני', low_price: 8000, typical_price: 12000, high_price: 18000, unit: 'יחידה', based_on_bids: 35 },
    { category: 'INSTALLATION', item_type: 'pole_installation', item_description: 'התקנת עמוד + מצלמה', low_price: 3500, typical_price: 5500, high_price: 8000, unit: 'נקודה', based_on_bids: 60 }
  ];

  console.log('\nSeeding market pricing...');
  for (const p of pricing) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/market_pricing`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(p)
    });
    console.log(`Market price ${p.item_type}: ${res.ok ? 'OK' : 'FAIL ' + res.status}`);
  }

  console.log('\n=== Seeding Complete ===');
}

seedCompetitors();
