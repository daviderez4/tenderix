# P4: Competitor Analysis - ניתוח מתחרים

## Description
עמוד 4 במערכת Tenderix - מודיעין תחרותי, ניתוח הצעות קודמות, וחיזוי התמחרות.

## Trigger
- User says "/p4-competitors" or "/competitors"
- User asks about "מתחרים" or "מי יגיש?" or "מחירי שוק"
- After P3 completion

## Prerequisites
- P1, P2, P3 completed
- Access to tender databases (mr.gov.il)

## Modules

### 4.1 Winning Bids Collection (אליצח)
איסוף נתונים ממכרזים קודמים.

**Data sources**:
- mr.gov.il (מרכבה)
- גופים ממשלתיים (משרדים, רשויות)
- מכרזי עירייה ספציפיים
- פרוטוקולי ועדות מכרזים

**Data collected**:
```json
{
  "winning_bids": [
    {
      "tender_number": "2023/100",
      "issuer": "עיריית חיפה",
      "winner": "חברת אבטחה בע\"מ",
      "winning_price": 5000000,
      "second_place_price": 5500000,
      "number_of_bidders": 5,
      "date": "2023-06-15",
      "boq_available": true,
      "priced_boq_url": "https://..."
    }
  ]
}
```

**אליצח - חוק חופש המידע**:
אפשרות להגשת בקשות אוטומטית לקבלת פרטי מכרזים!

### 4.2 Competitor Mapping
בניית פרופיל לכל מתחרה.

**For each competitor**:
```json
{
  "company_name": "מתחרה א' בע\"מ",
  "company_size": "large", // small | medium | large
  "fields_of_expertise": ["CCTV", "בקרת כניסה"],
  "win_history": {
    "total_wins_5_years": 15,
    "average_winning_bid": 4500000,
    "win_rate": 0.35
  },
  "pricing_strategy": "aggressive", // aggressive | conservative | mixed
  "known_strengths": ["מחירים נמוכים", "קשרי לקוחות"],
  "known_weaknesses": ["איכות נמוכה", "תמיכה גרועה"],
  "key_clients": ["עיריית ת\"א", "משרד הביטחון"],
  "win_loss_against_us": {
    "we_won": 3,
    "they_won": 5,
    "total_encounters": 8
  }
}
```

### 4.3 Competitor Pricing Analysis (אליצח)
השוואת מחירים ברמת שורת BOQ.

**For each BOQ item**:
```json
{
  "item_id": "1.2.3",
  "description": "מצלמת IP 4MP",
  "our_price": 2650,
  "competitor_prices": {
    "competitor_A": {
      "price": 2400,
      "tender": "2023/100"
    },
    "competitor_B": {
      "price": 2800,
      "tender": "2023/105"
    }
  },
  "market_average": 2600,
  "market_min": 2200,
  "market_max": 3200
}
```

**Pricing patterns to identify**:
- **Front Loading**: גבוה בהתחלה - מקבלים כסף מהר
- **Back Loading**: גבוה בסוף - נעילת לקוח
- **Equipment Heavy**: רווח בציוד, הפסד בעבודה

**אליצח**:
- **סוג מחיר**: הנחה ממחירון או מספר פתוח?
- **מחיר מקסימום** = סעיף הפסדי למתחרה → הזדמנות!
- **גרפים של מגמות במחירים**

**אליצח**: "צריך לשים לב שמשווים תפוחים לתפוחים - כי זה לא בהכרח סעיפים דומים"

**Output**:
```json
{
  "pricing_analysis": {
    "items_analyzed": 85,
    "we_are_competitive_in": 60,
    "we_are_expensive_in": 15,
    "we_are_cheap_in": 10,
    "competitors_loss_items": [
      {
        "item": "כבילה תת-קרקעית",
        "competitor": "מתחרה א'",
        "their_price": 800,
        "actual_cost": 1200,
        "our_opportunity": "price normally, win on exceptions"
      }
    ]
  },
  "pricing_trends": {
    "cameras": "decreasing 5% YoY",
    "installation_work": "stable",
    "maintenance": "increasing 10% YoY"
  }
}
```

### 4.4 Competitive Intelligence
תחזית השתתפות וניתוח בידול.

**Participation prediction**:
```json
{
  "likely_bidders": [
    {
      "competitor": "מתחרה א'",
      "probability": 0.85,
      "reason": "זכו אצל המזמין בעבר",
      "expected_price_range": [4500000, 5000000],
      "expected_strategy": "aggressive"
    },
    {
      "competitor": "מתחרה ב'",
      "probability": 0.70,
      "reason": "תחום ההתמחות שלהם",
      "expected_price_range": [5000000, 5500000],
      "expected_strategy": "conservative"
    }
  ],
  "total_expected_bidders": 4
}
```

**Differentiation analysis**:
```json
{
  "our_advantages": [
    {
      "advantage": "נציגות בלעדית ל-VMS מוביל",
      "impact": "יכול לגרום לפסילת מתחרים",
      "strategic_question": "להבהיר כי נדרש VMS מסוג X?"
    },
    {
      "advantage": "ניסיון עם מזמין זה",
      "impact": "אמון קיים",
      "leverage": "לציין בהצעה"
    }
  ],
  "our_weaknesses": [
    {
      "weakness": "מחירים גבוהים יותר ב-10%",
      "mitigation": "להדגיש איכות ו-SLA"
    }
  ],
  "competitive_position": "FAVORABLE" // FAVORABLE | NEUTRAL | CHALLENGING
}
```

**Win probability calculation**:
```json
{
  "base_probability": 0.25, // 1/4 bidders
  "adjusted_factors": {
    "price_competitiveness": 0.9,
    "technical_advantage": 1.2,
    "past_relationship": 1.1,
    "gate_conditions_fit": 1.0
  },
  "final_probability": 0.33,
  "recommended_price_range": [4800000, 5200000],
  "sweet_spot_price": 5000000
}
```

## Strategic Questions Integration (from P2)
Link back to strategic questions that can eliminate competitors:
```json
{
  "elimination_opportunities": [
    {
      "question": "להבהיר כי נדרשת מערכת VMS מסוג Enterprise",
      "eliminates": ["מתחרה ב'", "מתחרה ג'"],
      "we_comply": true,
      "submitted": false
    }
  ]
}
```

## Traceability (C1)
Every data point MUST include source:
```
📄 מכרז 2023/100 | mr.gov.il | פרוטוקול ועדה
"חברת X זכתה בסכום של Y ש\"ח"
```

## MCP Tools Used
- `mcp__tenderix__search_tenders` - Search historical tenders
- `mcp__tenderix__trigger_n8n_workflow` - Trigger competitor research

## Workflow Integration
After P4 completes, generate final GO/NO-GO report:
```
/tenderix-analyze --generate-report tender_id={tender_id}
```

## Output Format
```json
{
  "tender_id": "uuid",
  "analysis_date": "2024-01-20",
  "competitive_landscape": {
    "total_expected_bidders": 4,
    "main_competitors": [...],
    "our_position": "FAVORABLE",
    "win_probability": 0.33
  },
  "pricing_intelligence": {
    "market_average": 5000000,
    "market_range": [4500000, 5500000],
    "recommended_price": 5000000,
    "strategy": "balanced"
  },
  "competitor_profiles": [...],
  "elimination_opportunities": [...],
  "pricing_breakdown": [...],
  "recommendations": {
    "price_strategy": "Match market average, compete on quality",
    "key_differentiators": ["VMS expertise", "Past relationship"],
    "risks_to_monitor": ["Aggressive pricing from competitor A"]
  }
}
```

## Language
Hebrew primary, company names as-is

## Invocation
```
/p4-competitors
/competitors
מי צפוי להגיש למכרז הזה?
מה המחירים בשוק?
מה הסיכויים שלנו לזכות?
```
