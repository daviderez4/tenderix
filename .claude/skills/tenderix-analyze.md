# Tenderix Full Tender Analysis

## Description
סקיל ראשי לניתוח מכרזים מקיף - מתאם את כל 4 העמודים ומייצר דוח GO/NO-GO מלא.

**Master Orchestrator** - קורא לכל הסקילים הנדרשים בסדר הנכון.

## Trigger
- User says "/tenderix-analyze" or "/analyze-tender"
- User uploads tender documents and asks for full analysis
- User mentions "ניתוח מכרז מלא" or "GO/NO-GO"

## Workflow

### Phase 1: Intake (עמוד 1)
Use `/p1-intake` skill to:
1. Upload and identify documents (1.1)
2. Version control setup (1.1.5)
3. Extract metadata and structure (1.2)
4. Normalize Hebrew text (1.3)
5. Extract definitions dictionary (1.4)
6. Identify tender category (1.5)
7. Analyze previous tender if exists (1.6)

### Phase 2: Gate Conditions (עמוד 2)
Use `/p2-gates` skill to:
1. Extract and classify gate conditions (2.1)
2. Quantitative breakdown (2.2)
3. Identify bearer entity (2.3)
4. Interpret "similar" requirements (2.4)
5. Dual interpretation mechanism (2.5)
6. Compare to company profile (2.6)
7. Optimize threshold vs scoring (2.6.5)
8. Generate clarification requests (2.7)
9. Strategic competitor questions (2.7.5)
10. Analyze others' questions (2.7.6)
11. Required documents list (2.8)
12. Assessment and recommendation (2.9)
13. Re-analysis after clarifications (2.10)

### Phase 3: Specs & BOQ (עמוד 3)
Use `/p3-specs` skill to:
1. Technical specification analysis (3.1)
2. BOQ breakdown (3.2)
3. Work scope understanding (3.3)
4. Identify discrepancies (3.4)
5. Compare to similar tenders (3.4.5)
6. Pricing risk analysis (3.5)

### Phase 4: Competitor Intelligence (עמוד 4)
Use `/p4-competitors` skill to:
1. Collect winning bids (4.1)
2. Map competitors (4.2)
3. Analyze competitor pricing (4.3)
4. Competitive intelligence (4.4)

### Phase 5: Decision Report (פלט)
Generate GO/NO-GO report with:
- Executive summary
- Gate conditions status table (with sources!)
- Scope and pricing summary
- Competitive landscape
- Action items and timeline

## Core Principles (עקרונות ליבה)

### C1: Full Traceability (עקיבות מלאה)
Every assertion MUST include:
- **Source file**: Which document
- **Page number**: Exact page
- **Section**: Section/clause number
- **Quote**: The relevant text itself

Example format:
```
📄 מכרז_2024_001.pdf | עמ' 12 | סעיף 3.2.1
"המציע יציג ניסיון בלפחות 3 פרויקטים בהיקף של 50 מיליון ש"ח כל אחד"
```

### C2: Technical Dictionary by Category
Use domain-specific terminology:
- Video & Cameras (CCTV, LPR, Analytics)
- Communications (Networks, Cyber, WiFi)
- Software (VMS, PSIM, Integrations)
- Access Control (Readers, Locks)
- Infrastructure (Electrical, Civil)

### C3: Correct Accumulation Logic
- A project is NOT counted twice for the same requirement
- Amounts don't accumulate if from same project
- Exception: A project CAN count for both threshold AND scoring

### C4: Gap Closure Options (for Gate Conditions only)
When a gap exists in threshold requirements:
- Subcontractor (if allowed)
- Partnership/Consortium
- Alternative document
- Development/Adaptation
- Clarification question
- Blocker (no realistic solution)

## MCP Tools Available
- `mcp__tenderix__list_tenders` - List all tenders
- `mcp__tenderix__get_tender` - Get tender details
- `mcp__tenderix__get_gate_conditions` - Get gate conditions
- `mcp__tenderix__get_gate_summary` - Get eligibility summary
- `mcp__tenderix__get_boq_items` - Get BOQ items
- `mcp__tenderix__search_tenders` - Search tenders
- `mcp__tenderix__trigger_n8n_workflow` - Trigger workflows
- `mcp__gate-extractor__professional_gate_extraction` - Full 4-agent extraction
- `mcp__gate-extractor__extract_definitions` - Extract definitions
- `mcp__gate-extractor__scan_for_conditions` - Scan for conditions
- `mcp__gate-extractor__analyze_conditions` - Analyze conditions
- `mcp__gate-extractor__validate_and_finalize` - Validate extraction
- `mcp__gate-extractor__save_extracted_conditions` - Save to database

## Output Format

### Hebrew Report Structure:
```markdown
# דוח GO/NO-GO - [שם המכרז]

## תקציר מנהלים
- **המלצה**: GO / NO-GO / CONDITIONAL
- **רמת ביטחון**: X%
- **סיכון כולל**: LOW / MEDIUM / HIGH
- **סיכויי זכייה**: X%

## סיכום תנאי סף
| תנאי | סטטוס | מקור | פער | מסלול סגירה |
|------|-------|------|-----|-------------|
| ... | עומד ✅ | עמ' X סעיף Y | - | - |

## היקף ותמחור
- היקף: ...
- חריגים שזוהו: ...
- סיכוני תמחור: ...
- המלצה: שמרני / איזון / אגרסיבי

## נוף תחרותי
- מתחרים צפויים: ...
- טווח מחירים: ...
- הבידול שלנו: ...

## משימות לביצוע
### לפני החלטה:
- [ ] סגירת פערים חוסמים
### אם GO:
- [ ] שליחת בקשות הבהרה עד DD.MM
- [ ] הגשה עד DD.MM
```

## Language
Primary: Hebrew (עברית)
Technical terms: English when industry standard

## Invocation Examples
```
/tenderix-analyze
/analyze-tender tender_id=xxx
נתח את המכרז הזה בצורה מלאה
תן לי GO/NO-GO על מכרז X
```
