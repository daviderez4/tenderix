/**
 * Extended Prompts for Tenderix System
 * פרומפטים נוספים לעמודים 1, 3, 4 ודוח GO/NO-GO
 */

// ============================================
// PILLAR 1: TENDER INTAKE PROMPTS
// ============================================

export const DOCUMENT_CLASSIFIER_PROMPT = `זהה את סוג המסמך מתוך הטקסט הבא.

טקסט:
---
{document_text}
---

סוגי מסמכים אפשריים:
- INVITATION_TO_BID: הזמנה להציע הצעות (מכרז ראשי)
- TECHNICAL_SPEC: מפרט טכני
- BOQ: כתב כמויות
- CONTRACT: חוזה התקשרות
- CLARIFICATIONS: מסמך הבהרות
- FORMS: טפסים למילוי
- APPENDIX: נספח
- OTHER: אחר

החזר JSON בלבד:
{
  "document_type": "INVITATION_TO_BID",
  "confidence": 0.95,
  "indicators": ["תנאי סף", "תאריך הגשה", "ערבות בנקאית"],
  "contains_gates_section": true,
  "estimated_pages": 45,
  "language": "he",
  "title_detected": "מכרז מס' 2024/123"
}`;

export const METADATA_EXTRACTION_PROMPT = `חלץ את המטא-דאטה של המכרז מהטקסט הבא.

טקסט:
---
{document_text}
---

חלץ את הפרטים הבאים (החזר null אם לא נמצא):

1. פרטי זיהוי:
   - מספר מכרז
   - שם המכרז
   - גוף מזמין

2. תאריכים:
   - תאריך פרסום
   - מועד אחרון להגשת שאלות הבהרה
   - מועד אחרון להגשת הצעות (תאריך + שעה)

3. פרטים כספיים:
   - סכום ערבות הצעה
   - סכום ערבות ביצוע (אם מצוין)
   - אומדן/תקציב (אם מצוין)

4. תקופת התקשרות:
   - תקופה בסיסית (בחודשים)
   - אופציות הארכה

5. משקלים (אם יש ניקוד):
   - משקל מחיר
   - משקל איכות
   - רכיבי איכות

6. מבנה המכרז:
   - רשימת פרקים
   - כמות טבלאות
   - כמות נספחים

החזר JSON בלבד:
{
  "tender_number": "2024/123",
  "tender_name": "אספקת מערכות אבטחה",
  "issuing_body": "עיריית תל אביב",
  "publication_date": "2024-01-15",
  "clarification_deadline": "2024-01-30T14:00:00",
  "submission_deadline": "2024-02-15T14:00:00",
  "bid_bond_amount": 100000,
  "performance_bond_amount": null,
  "estimated_budget": null,
  "contract_period_months": 24,
  "extension_options": [12, 12],
  "scoring_weights": {
    "price": 40,
    "quality": 60,
    "quality_components": ["ניסיון", "צוות", "מתודולוגיה"]
  },
  "structure": {
    "chapters": ["הגדרות", "תנאי סף", "מפרט", "BOQ"],
    "tables_count": 5,
    "appendices_count": 8
  },
  "extraction_notes": "נמצא מבנה ברור"
}`;

export const PREVIOUS_TENDER_ANALYSIS_PROMPT = `נתח את המכרז הנוכחי בהשוואה למכרז הקודם של אותו מזמין.

מכרז נוכחי:
---
{current_tender}
---

מכרז קודם (אם יש):
---
{previous_tender}
---

בצע את הניתוחים הבאים:

1. השוואת תכולה:
   - מה נוסף?
   - מה הוסר?
   - מה נשאר זהה?

2. שינויים בתנאי סף:
   - תנאים חדשים
   - תנאים שהוסרו
   - תנאים ששונו

3. ניתוח % העתקה:
   - כמה מהטקסט זהה?
   - אזורים שהשתנו

4. שאלות הבהרה קודמות:
   - שאלות רלוונטיות לא נענו הפעם?
   - תשובות שהשתנו?

החזר JSON בלבד:
{
  "previous_tender_found": true,
  "previous_tender_number": "2021/456",
  "winner": "חברת אבטחה בע\"מ",
  "winning_price": 5000000,
  "comparison": {
    "new_items": [...],
    "removed_items": [...],
    "unchanged_items": [...],
    "copy_percentage": 75
  },
  "gate_changes": {
    "new_conditions": [...],
    "removed_conditions": [...],
    "modified_conditions": [...]
  },
  "previous_clarifications": [
    {
      "question": "...",
      "answer": "...",
      "relevant_now": true,
      "addressed_in_current": false
    }
  ],
  "insights": [
    "המזמין העלה את דרישות הניסיון",
    "הוסיפו דרישת NDAA"
  ],
  "suggested_clarification_questions": [
    {
      "question": "...",
      "reason": "נשאל במכרז הקודם ולא מופיע כאן"
    }
  ]
}`;

// ============================================
// PILLAR 3: SPECS & BOQ PROMPTS
// ============================================

export const SPEC_ANALYSIS_PROMPT = `נתח את המפרט הטכני הבא וחלץ את כל הדרישות.

מפרט:
---
{spec_text}
---

לכל דרישה שזיהית, חלץ:

1. מזהה ותיאור
2. סוג: mandatory (חובה) / optional (אופציה) / advantage (יתרון)
3. קישור לסעיפי BOQ אם ניתן לזהות
4. מקור מדויק (עמוד, סעיף)
5. מפתח טכני (סוג ציוד, תקן וכו')

החזר JSON בלבד:
{
  "requirements": [
    {
      "id": "REQ-001",
      "description": "מצלמת IP ברזולוציה של 4MP",
      "type": "mandatory",
      "technical_key": "camera_resolution",
      "value": "4MP",
      "linked_boq_items": ["1.2.3"],
      "traceability": {
        "source_page": 15,
        "source_section": "5.2.1",
        "source_quote": "המצלמות יהיו ברזולוציה מינימלית של 4 מגה פיקסל"
      }
    }
  ],
  "general_requirements": {
    "standards": ["ISO 27001", "תקן ישראלי 2279"],
    "sla": "99.5% uptime",
    "warranty_months": 24
  },
  "work_phases": [
    {"phase": "תכנון", "description": "...", "duration_days": 30},
    {"phase": "אספקה", "description": "...", "duration_days": 60},
    {"phase": "התקנה", "description": "...", "duration_days": 90}
  ],
  "hidden_work_alerts": [
    {
      "text": "כל העבודות הנדרשות להשלמת המערכת",
      "location": "סעיף 4.5",
      "risk": "HIGH"
    }
  ]
}`;

export const BOQ_ANALYSIS_PROMPT = `נתח את כתב הכמויות הבא.

כתב כמויות:
---
{boq_text}
---

לכל שורה:
1. מזהה שורה
2. תיאור
3. יחידת מידה
4. כמות
5. קטגוריה: supply / work / service / maintenance
6. קישור לדרישות מפרט
7. הערות על שלמות התיאור

החזר JSON בלבד:
{
  "boq_items": [
    {
      "item_id": "1.2.3",
      "description": "אספקה והתקנת מצלמת IP 4MP",
      "unit": "יחידה",
      "quantity": 50,
      "category": "supply",
      "linked_spec_requirements": ["REQ-001"],
      "description_completeness": 0.8,
      "missing_details": ["סוג עדשה", "זווית צפייה"],
      "traceability": {
        "source_page": 3,
        "source_row": 15
      }
    }
  ],
  "summary": {
    "total_items": 85,
    "by_category": {
      "supply": 40,
      "work": 30,
      "service": 10,
      "maintenance": 5
    }
  },
  "issues": [
    {
      "item_id": "1.2.3",
      "issue": "תיאור לא מלא",
      "recommendation": "לברר סוג עדשה בשאלת הבהרה"
    }
  ]
}`;

export const DISCREPANCY_DETECTION_PROMPT = `השווה בין המפרט לכתב הכמויות וזהה אי-התאמות.

מפרט:
---
{spec_summary}
---

כתב כמויות:
---
{boq_summary}
---

זהה:
1. פריטים במפרט שאינם ב-BOQ (סיכון!)
2. פריטים ב-BOQ שאינם במפרט (הזדמנות?)
3. סתירות בין המסמכים (4MP vs 2MP)
4. פריטים חסרים בשניהם אך נדרשים לוגית

החזר JSON בלבד:
{
  "discrepancies": {
    "spec_not_in_boq": [
      {
        "item": "כבילת עמודים",
        "spec_location": "עמ' 20 סעיף 6.3",
        "risk": "תמחור ללא תשלום",
        "estimated_cost": 50000,
        "action": "חייב שאלת הבהרה"
      }
    ],
    "boq_not_in_spec": [
      {
        "item": "UPS",
        "boq_item": "2.4.1",
        "opportunity": "אולי לא נדרש?",
        "action": "לבדוק"
      }
    ],
    "contradictions": [
      {
        "subject": "רזולוציית מצלמה",
        "spec_says": "4MP",
        "spec_location": "עמ' 15",
        "boq_says": "2MP",
        "boq_location": "סעיף 1.2.3",
        "risk_level": "MEDIUM",
        "action": "לברר בשאלת הבהרה"
      }
    ],
    "missing_from_both": [
      {
        "item": "חיבורי חשמל לעמודים",
        "reason_needed": "נדרש לתפקוד המערכת",
        "estimated_cost": 30000,
        "action": "להציף"
      }
    ]
  },
  "exceptions_opportunity": [
    {
      "likely_exception": "שינוי מיקום מצלמות",
      "probability": 0.8,
      "typical_markup": 1.3,
      "strategic_note": "להכין תמחור אגרסיבי ב-BOQ, להרוויח בחריגים"
    }
  ],
  "risk_summary": {
    "high_risk_value": 80000,
    "medium_risk_value": 50000,
    "opportunity_value": 75000
  }
}`;

export const SIMILAR_TENDERS_COMPARISON_PROMPT = `השווה את המכרז הנוכחי ל-2 מכרזים דומים.

מכרז נוכחי:
---
{current_tender_summary}
---

מכרז דומה 1:
---
{similar_tender_1}
---

מכרז דומה 2:
---
{similar_tender_2}
---

בדוק סעיף סעיף:
1. מה יש במכרזים הדומים ולא כאן (שכחו?)
2. מה שונה (למה?)
3. מה התמחור הטיפוסי

החזר JSON בלבד:
{
  "similar_tenders": [
    {
      "tender_number": "2023/100",
      "issuer": "עיריית חיפה",
      "similarity_score": 0.85
    }
  ],
  "missing_items": [
    {
      "item": "UPS לחדר שרתים",
      "in_tender_A": true,
      "in_tender_B": true,
      "in_current": false,
      "needed": true,
      "typical_price": 25000,
      "action": "להציף בשאלת הבהרה"
    }
  ],
  "different_specs": [
    {
      "item": "רזולוציית מצלמות",
      "tender_A": "4MP",
      "tender_B": "4MP",
      "current": "2MP",
      "note": "ייתכן שטעות? או דרישה נמוכה יותר?"
    }
  ],
  "pricing_insights": [
    {
      "item": "מצלמת IP",
      "tender_A_price": 2500,
      "tender_B_price": 2800,
      "current_recommended": 2650
    }
  ]
}`;

export const PRICING_RISK_ANALYSIS_PROMPT = `נתח את סיכוני התמחור במכרז.

נתוני המכרז:
---
{tender_data}
---

חלק לרמות סיכון:
- HIGH: סעיפים עם "כל הנדרש", קנסות לא מוגבלים, אחריות בלתי מוגבלת
- MEDIUM: כמויות לא ברורות, אחריות מורחבת, SLA תובעני
- LOW: סעיפים סטנדרטיים

החזר JSON בלבד:
{
  "risk_analysis": {
    "high_risk_items": [
      {
        "item": "כל העבודות הנדרשות להשלמה",
        "location": "סעיף 4.5",
        "risk_type": "open_ended_scope",
        "estimated_exposure": 100000,
        "mitigation": "לבקש הגדרה מדויקת בשאלת הבהרה"
      }
    ],
    "medium_risk_items": [...],
    "low_risk_items": [...]
  },
  "recommendations": {
    "reserve_percentage": 10,
    "detailed_pricing_items": ["1.2.3", "2.4.5"],
    "lump_sum_items": ["general_conditions"],
    "strategy": "balanced",
    "notes": "המלצה על תמחור שמרני בשל 3 סעיפים מסוכנים"
  },
  "total_risk_exposure": {
    "high": 150000,
    "medium": 80000,
    "total_recommended_reserve": 50000
  }
}`;

// ============================================
// PILLAR 4: COMPETITOR ANALYSIS PROMPTS
// ============================================

export const COMPETITOR_PROFILE_PROMPT = `בנה פרופיל מתחרה מהמידע הבא.

מידע זמין:
---
{competitor_data}
---

בנה פרופיל:
1. פרטי החברה
2. היסטוריית זכיות
3. תחומי התמחות
4. אסטרטגיית תמחור
5. יתרונות וחולשות

החזר JSON בלבד:
{
  "competitor_profile": {
    "name": "מתחרה א' בע\"מ",
    "size": "large",
    "founded_year": 2005,
    "fields_of_expertise": ["CCTV", "בקרת כניסה"],
    "win_history": {
      "total_wins_5_years": 15,
      "average_winning_bid": 4500000,
      "win_rate": 0.35,
      "key_wins": [
        {"tender": "2023/100", "amount": 5000000, "issuer": "עיריית חיפה"}
      ]
    },
    "pricing_strategy": "aggressive",
    "known_strengths": ["מחירים נמוכים", "קשרי לקוחות"],
    "known_weaknesses": ["איכות נמוכה", "תמיכה גרועה"],
    "key_clients": ["עיריית ת\"א", "משרד הביטחון"]
  }
}`;

export const COMPETITOR_PRICING_ANALYSIS_PROMPT = `נתח את תמחור המתחרים ברמת שורת BOQ.

נתוני תמחור:
---
{pricing_data}
---

לכל סעיף:
1. מחיר שלנו
2. מחירי מתחרים
3. ממוצע שוק
4. זיהוי דפוסים

החזר JSON בלבד:
{
  "pricing_analysis": {
    "items": [
      {
        "item_id": "1.2.3",
        "description": "מצלמת IP 4MP",
        "our_price": 2650,
        "competitors": {
          "competitor_A": {"price": 2400, "tender": "2023/100"},
          "competitor_B": {"price": 2800, "tender": "2023/105"}
        },
        "market_average": 2600,
        "market_range": [2200, 3200],
        "position": "competitive"
      }
    ],
    "patterns": {
      "front_loading": ["competitor_A"],
      "back_loading": [],
      "equipment_heavy": ["competitor_B"]
    },
    "loss_items": [
      {
        "item": "כבילה תת-קרקעית",
        "competitor": "competitor_A",
        "their_price": 800,
        "estimated_cost": 1200,
        "our_opportunity": "תמחר נורמלי, הרווח בחריגים"
      }
    ]
  },
  "trends": {
    "cameras": "decreasing 5% YoY",
    "installation_work": "stable",
    "maintenance": "increasing 10% YoY"
  }
}`;

export const COMPETITIVE_INTELLIGENCE_PROMPT = `נתח את הנוף התחרותי למכרז זה.

נתוני המכרז:
---
{tender_data}
---

פרופילי מתחרים:
---
{competitor_profiles}
---

הניסיון שלנו:
---
{our_profile}
---

החזר ניתוח:
1. מי צפוי להגיש?
2. מה הסיכויים שלנו?
3. מה הבידול שלנו?
4. הזדמנויות לפסילת מתחרים (בעזרת שאלות הבהרה)

החזר JSON בלבד:
{
  "participation_forecast": [
    {
      "competitor": "מתחרה א'",
      "probability": 0.85,
      "reason": "זכו אצל המזמין בעבר",
      "expected_price_range": [4500000, 5000000],
      "expected_strategy": "aggressive"
    }
  ],
  "our_position": {
    "strengths": [
      {"factor": "נציגות בלעדית ל-VMS מוביל", "impact": "HIGH"},
      {"factor": "ניסיון עם מזמין זה", "impact": "MEDIUM"}
    ],
    "weaknesses": [
      {"factor": "מחירים גבוהים יותר ב-10%", "mitigation": "להדגיש איכות"}
    ],
    "overall": "FAVORABLE"
  },
  "win_probability": {
    "base": 0.25,
    "adjusted": 0.33,
    "factors": {
      "price_competitiveness": 0.9,
      "technical_advantage": 1.2,
      "past_relationship": 1.1
    }
  },
  "recommended_price_range": [4800000, 5200000],
  "sweet_spot_price": 5000000,
  "elimination_opportunities": [
    {
      "question": "להבהיר כי נדרשת מערכת VMS מסוג Enterprise",
      "eliminates": ["מתחרה ב'", "מתחרה ג'"],
      "we_comply": true,
      "risk": "LOW"
    }
  ]
}`;

// ============================================
// GO/NO-GO DECISION REPORT PROMPT
// ============================================

export const GO_NO_GO_REPORT_PROMPT = `צור דוח GO/NO-GO מסכם למכרז.

נתוני ניתוח תנאי סף (P2):
---
{gates_analysis}
---

נתוני מפרט ו-BOQ (P3):
---
{specs_analysis}
---

נתוני מתחרים (P4):
---
{competitors_analysis}
---

פרופיל החברה:
---
{company_profile}
---

צור דוח מנהלים:

1. תקציר - GO / NO-GO / CONDITIONAL
2. רמת ביטחון וסיכון
3. סיכום תנאי סף (טבלה עם מקורות!)
4. סיכום היקף ותמחור
5. נוף תחרותי
6. משימות לביצוע
7. לוח זמנים

החזר JSON בלבד:
{
  "decision_report": {
    "recommendation": "GO",
    "confidence_level": 0.85,
    "overall_risk": "MEDIUM",
    "win_probability": 0.33,
    "summary_sentence": "מומלץ להגיש עם סגירת 2 פערים בתנאי סף",

    "gates_summary": {
      "total_conditions": 12,
      "met": 10,
      "gaps": 2,
      "blockers": 0,
      "conditions_table": [
        {
          "condition": "ניסיון ב-3 פרויקטים",
          "status": "MET",
          "source": "עמ' 12 סעיף 3.2.1",
          "matched_projects": ["p1", "p2", "p3"],
          "notes": ""
        },
        {
          "condition": "ISO 27001",
          "status": "GAP",
          "source": "עמ' 13 סעיף 3.3",
          "matched_projects": [],
          "notes": "להסתמך על קבלן משנה",
          "closure_path": "subcontractor"
        }
      ],
      "clarification_requests_p1": [
        {
          "question": "נבקש לאפשר הסתמכות על קבלן משנה בתחום X",
          "impact": "סוגר פער בתנאי סף",
          "priority": "P1"
        }
      ],
      "strategic_questions": [
        {
          "question": "להבהיר כי נדרש VMS מסוג Enterprise",
          "purpose": "מגביל מתחרים",
          "eliminates": ["מתחרה ב'"]
        }
      ]
    },

    "scope_pricing_summary": {
      "total_scope_estimated": 5000000,
      "discrepancies_found": 5,
      "high_risk_items": 3,
      "risk_exposure": 150000,
      "recommended_reserve": "10%",
      "pricing_strategy": "balanced",
      "exceptions_opportunity": 75000
    },

    "competitive_landscape": {
      "expected_bidders": 4,
      "main_competitors": ["מתחרה א'", "מתחרה ב'"],
      "our_position": "FAVORABLE",
      "price_recommendation": {
        "range": [4800000, 5200000],
        "sweet_spot": 5000000
      },
      "differentiation": [
        "נציגות VMS בלעדית",
        "ניסיון עם המזמין"
      ]
    },

    "action_items": {
      "before_decision": [
        {
          "task": "סגירת פער ISO עם קבלן משנה",
          "owner": "מנהל עסקי",
          "deadline": "לפני החלטה",
          "status": "pending"
        }
      ],
      "if_go": [
        {
          "task": "שליחת בקשות הבהרה",
          "deadline": "2024-01-30",
          "items": ["הסתמכות על ק.משנה", "VMS Enterprise"]
        },
        {
          "task": "השלמת מסמכים חסרים",
          "deadline": "2024-02-10"
        },
        {
          "task": "תמחור סופי עם רזרבות",
          "deadline": "2024-02-12"
        }
      ]
    },

    "timeline": {
      "clarification_deadline": "2024-01-30",
      "submission_deadline": "2024-02-15",
      "decision_required_by": "2024-01-25",
      "internal_milestones": [
        {"milestone": "החלטת GO", "date": "2024-01-25"},
        {"milestone": "שליחת הבהרות", "date": "2024-01-28"},
        {"milestone": "קבלת תשובות", "date": "2024-02-05"},
        {"milestone": "הגשת הצעה", "date": "2024-02-15"}
      ]
    }
  }
}`;

// ============================================
// COMPANY PROFILE ENRICHMENT PROMPT
// ============================================

export const PROFILE_ENRICHMENT_PROMPT = `בהתבסס על ניתוח המכרז, זהה פערי מידע בפרופיל החברה.

דרישות המכרז:
---
{tender_requirements}
---

פרופיל נוכחי:
---
{current_profile}
---

זהה:
1. פרטים חסרים בפרויקטים קיימים
2. פרויקטים שכדאי להוסיף
3. הסמכות חסרות
4. אנשי מפתח חסרים

החזר JSON בלבד:
{
  "profile_gaps": {
    "project_details_needed": [
      {
        "project_id": "uuid",
        "project_name": "מערכת אבטחה עירייה",
        "missing_info": ["מספר מצלמות", "סוג VMS"],
        "question": "האם בפרויקט הותקנו יותר מ-50 מצלמות?",
        "if_yes_action": "עדכן פרופיל",
        "impact": "יכול לספק דרישת ניסיון נוספת"
      }
    ],
    "certifications_needed": [
      {
        "certification": "ISO 27001",
        "reason": "נדרש בתנאי סף",
        "alternatives": ["הסתמכות על ק.משנה", "תהליך הסמכה"]
      }
    ],
    "personnel_needed": [
      {
        "role": "מהנדס אבטחה מוסמך",
        "reason": "נדרש לפי סעיף 3.5",
        "current_team_check": "האם יש למישהו בצוות הסמכה זו?"
      }
    ]
  },
  "enrichment_questions": [
    {
      "question": "בפרויקט X - כמה מצלמות הותקנו?",
      "context": "נדרש לעמידה בתנאי סף",
      "if_answer_is": {
        ">50": "עדכן פרופיל, יכול לשמש לתנאי סף",
        "<50": "לא רלוונטי לתנאי ניסיון זה"
      }
    }
  ],
  "profile_optimization": {
    "for_gates": ["פרויקט A", "פרויקט B"],
    "for_scoring": ["פרויקט C", "פרויקט D"],
    "strategy": "מינימום לתנאי סף, מקסימום לניקוד"
  }
}`;

export default {
  // Pillar 1
  DOCUMENT_CLASSIFIER_PROMPT,
  METADATA_EXTRACTION_PROMPT,
  PREVIOUS_TENDER_ANALYSIS_PROMPT,

  // Pillar 3
  SPEC_ANALYSIS_PROMPT,
  BOQ_ANALYSIS_PROMPT,
  DISCREPANCY_DETECTION_PROMPT,
  SIMILAR_TENDERS_COMPARISON_PROMPT,
  PRICING_RISK_ANALYSIS_PROMPT,

  // Pillar 4
  COMPETITOR_PROFILE_PROMPT,
  COMPETITOR_PRICING_ANALYSIS_PROMPT,
  COMPETITIVE_INTELLIGENCE_PROMPT,

  // Decision
  GO_NO_GO_REPORT_PROMPT,

  // Profile
  PROFILE_ENRICHMENT_PROMPT
};
