# Tenderix Core Principles - עקרונות ליבה

## Description
עקרונות רוחביים שחלים על כל המודולים במערכת Tenderix.

## Trigger
- User asks about "עקרונות" or "כללי עבודה"
- Referenced by other skills

---

## C1: Full Traceability (עקיבות מלאה)

### Rule
כל קביעה של המערכת **חייבת** לכלול מקור מדויק במסמכי המכרז.

### Required Fields
1. **שם הקובץ** - מאיזה מסמך (מכרז.pdf, מפרט.docx)
2. **עמוד** - מספר עמוד מדויק
3. **סעיף** - מספר סעיף/פרק
4. **ציטוט קצר** - הטקסט הרלוונטי עצמו

### Format
```
📄 מכרז_2024_001.pdf | עמ' 12 | סעיף 3.2.1
"המציע יציג ניסיון בלפחות 3 פרויקטים בהיקף של 50 מיליון ש"ח כל אחד"
```

### Implementation
```json
{
  "traceability": {
    "source_file": "מכרז_2024_001.pdf",
    "source_page": 12,
    "source_section": "3.2.1",
    "source_quote": "המציע יציג ניסיון בלפחות 3 פרויקטים..."
  }
}
```

### Why Critical
**בלי מקור = אי אפשר לעבוד מול מנכ"ל או יועמ"ש. זה לא אופציה.**

---

## C2: Technical Dictionary by Category (מילון טכני)

### Rule
ידע מקצועי לפי סוג מכרז - **פרשנות לפי יכולות ולא לפי שמות**.

### Categories
| Category | Examples |
|----------|----------|
| וידאו ומצלמות | CCTV, LPR, אנליטיקה |
| תקשורת | רשתות, סייבר, WiFi |
| תוכנה | VMS, PSIM, אינטגרציות |
| בקרת גישה | קוראים, מנעולים |
| תשתיות | חשמל, תקשורת, אזרחי |

### Interpretation Logic (עידו)
המנוע המקצועי צריך להציע פרשנויות **התואמות את הפרויקטים של המציע**.

**Example**: מצלמת תנועה יכולה להיחשב כמצלמת אבטחה כי:
- אותה טכנולוגיה (IP camera)
- אותן יכולות (הקלטה, צפייה מרחוק)
- ייעוד שונה אבל מאפיינים טכניים זהים

### Dictionary Loading
```json
{
  "tender_category": "VIDEO_CCTV",
  "dictionary_loaded": "video_security_v2",
  "equivalence_rules": [
    {
      "term": "מצלמת אבטחה",
      "equivalents": ["מצלמת IP", "מצלמת תנועה", "מצלמת CCTV"],
      "conditions": "same resolution, same features"
    }
  ]
}
```

---

## C3: Correct Accumulation Logic (לוגיקת הצטברות)

### Rule
מנגנון שמונע ספירה כפולה וחישוב שגוי.

### Automatic Checks
1. **פרויקט לא נספר פעמיים לאותה דרישה**
2. **סכומים לא מצטרפים אם מאותו פרויקט**
3. **תאריכים נבדקים לפי הגדרת המכרז**

### Exception (אליצח)
**פרויקט יכול להיספר גם לתנאי סף וגם לניקוד - זה מותר!**

### Optimization Logic (עידו)
**מינימום לעמידה בתנאי סף מול מקסימום ניקוד**

The system should optimize what project is shown where to:
- Meet threshold with minimum projects
- Maximize scoring with remaining projects

### Implementation
```json
{
  "accumulation_check": {
    "project_id": "uuid",
    "used_for_gates": ["condition_1", "condition_2"],
    "used_for_scoring": ["scoring_item_1"],
    "duplicate_alert": false,
    "optimization_applied": true
  }
}
```

---

## C4: Gap Closure Options (מסלולי סגירת פערים)

### Rule
**רלוונטי לעמוד 2 (תנאי סף) בלבד** - כשיש פער בתנאי סף, אלה האפשרויות לסגירה.

### Important
המערכת **מציעה** אפשרויות - לא חובה! המשתמש מחליט.

### Options
| Option | Description | When Applicable |
|--------|-------------|-----------------|
| 🤝 קבלן משנה | הסתמכות על ניסיון ק"מ | אם המכרז מתיר |
| 👥 שותפות/קונסורציום | שיתוף פעולה עם חברה אחרת | אם המכרז מתיר |
| 📄 מסמך חלופי/משלים | הצגת ראיה אלטרנטיבית | תלוי בדרישה |
| 🛠️ פיתוח/התאמה | פיתוח יכולת חדשה | אם יש זמן |
| 📝 שאלת הבהרה | בירור עם המזמין | תמיד אפשרי |
| ⛔ חוסם | אין פתרון ריאלי | סוף הדרך |

### Implementation Notes

**עידו**: אם אין מניעה מפורשת בהגדרות או בהוראות המכרז:
- המערכת תציע להגיש שאלת הבהרה **אך לא חובה**
- או לגשת עם קבלן משנה/שותף

**אליצח**: אם אפשר להסתמך על ק.משנה:
- **לחזור עם רשימת חברות פוטנציאליות** מחיפוש של מי יכול להיות שותף ועומד בתנאי הסף

### Gap Closure Output
```json
{
  "gap": {
    "condition_id": "uuid",
    "condition_text": "ניסיון ב-3 פרויקטים של 50M",
    "current_status": "GAP",
    "missing": "רק 2 פרויקטים מתאימים"
  },
  "closure_options": [
    {
      "type": "subcontractor",
      "feasibility": "HIGH",
      "potential_partners": [
        {"name": "חברת X", "has_experience": true, "known_collaboration": true}
      ],
      "notes": "המכרז מתיר הסתמכות עד 30%"
    },
    {
      "type": "clarification_question",
      "feasibility": "MEDIUM",
      "suggested_question": "נבקש לחדד האם ניתן להציג פרויקט Y כ'פרויקט דומה'",
      "notes": "פרויקט Y דומה טכנית אבל שונה בייעוד"
    },
    {
      "type": "blocker",
      "feasibility": "LOW",
      "notes": "אם האפשרויות הקודמות נכשלות"
    }
  ],
  "recommendation": "נסו קודם שאלת הבהרה, במקביל צרו קשר עם חברת X"
}
```

---

## Usage in Other Skills

All skills MUST implement these principles:

```markdown
## Traceability (C1)
[Include traceability format]

## Technical Dictionary (C2)
[Load appropriate dictionary]

## Accumulation Logic (C3)
[Check for duplicates]

## Gap Closure (C4) - P2 only
[Suggest closure options]
```

## Invocation
```
/core-principles
מה עקרונות העבודה?
איך מתעדים מקורות?
```
