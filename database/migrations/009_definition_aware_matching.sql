-- Migration 009: Definition-Aware Gate Matching
-- Adds support for semantic matching based on tender-specific definitions
-- Enables precise project classification against tender requirements
-- Supports adversarial detection and detailed explanations

-- ============================================
-- PHASE 1: ENHANCE tender_definitions TABLE
-- ============================================

-- Add structured constraints extraction
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tender_definitions'
                   AND column_name = 'structured_constraints') THEN
        ALTER TABLE tender_definitions ADD COLUMN structured_constraints JSONB DEFAULT '{}';
        COMMENT ON COLUMN tender_definitions.structured_constraints IS
            'Parsed constraints: {min_value, max_value, domain, time_range, entity_type, etc.}';
    END IF;
END $$;

-- Add category field to definitions (which domain does this definition belong to)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tender_definitions'
                   AND column_name = 'definition_category') THEN
        ALTER TABLE tender_definitions ADD COLUMN definition_category TEXT;
        COMMENT ON COLUMN tender_definitions.definition_category IS
            'Category: PROJECT_TYPE, FINANCIAL, EXPERIENCE, PERSONNEL, CERTIFICATION, SCOPE, OTHER';
    END IF;
END $$;

-- Add includes/excludes lists for precise matching
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tender_definitions'
                   AND column_name = 'includes_examples') THEN
        ALTER TABLE tender_definitions ADD COLUMN includes_examples TEXT[];
        COMMENT ON COLUMN tender_definitions.includes_examples IS
            'Examples explicitly included in definition (e.g., רכבת, אוטובוס, מטרו)';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tender_definitions'
                   AND column_name = 'excludes_examples') THEN
        ALTER TABLE tender_definitions ADD COLUMN excludes_examples TEXT[];
        COMMENT ON COLUMN tender_definitions.excludes_examples IS
            'Examples explicitly excluded from definition (e.g., כביש, גשר, מנהרה)';
    END IF;
END $$;

-- Add equivalent terms from this tender context
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tender_definitions'
                   AND column_name = 'equivalent_terms') THEN
        ALTER TABLE tender_definitions ADD COLUMN equivalent_terms TEXT[];
        COMMENT ON COLUMN tender_definitions.equivalent_terms IS
            'Terms considered equivalent in this tender context';
    END IF;
END $$;

-- ============================================
-- PHASE 2: LINK gate_conditions TO definitions
-- ============================================

-- Link gate conditions to the definitions they reference
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'linked_definition_ids') THEN
        ALTER TABLE gate_conditions ADD COLUMN linked_definition_ids UUID[];
        COMMENT ON COLUMN gate_conditions.linked_definition_ids IS
            'References to tender_definitions that affect this condition interpretation';
    END IF;
END $$;

-- Add the resolved interpretation of this condition based on definitions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_conditions'
                   AND column_name = 'resolved_requirement') THEN
        ALTER TABLE gate_conditions ADD COLUMN resolved_requirement JSONB DEFAULT '{}';
        COMMENT ON COLUMN gate_conditions.resolved_requirement IS
            'Resolved requirement after applying tender definitions: {domain, min_value, min_count, time_range_years, includes, excludes}';
    END IF;
END $$;

-- ============================================
-- PHASE 3: ENHANCE gate_condition_matches
-- For semantic classification and explanations
-- ============================================

-- Add classification reasoning for each match attempt
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_condition_matches'
                   AND column_name = 'classification_reasoning') THEN
        ALTER TABLE gate_condition_matches ADD COLUMN classification_reasoning TEXT;
        COMMENT ON COLUMN gate_condition_matches.classification_reasoning IS
            'Detailed Hebrew explanation of why this project matches/doesn''t match the condition';
    END IF;
END $$;

-- Add definition match score (how well does the project match the tender definition)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_condition_matches'
                   AND column_name = 'definition_match_score') THEN
        ALTER TABLE gate_condition_matches ADD COLUMN definition_match_score DECIMAL(5,2);
        COMMENT ON COLUMN gate_condition_matches.definition_match_score IS
            'How well the asset matches the tender definition (0-100)';
    END IF;
END $$;

-- Add adversarial flags
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_condition_matches'
                   AND column_name = 'adversarial_flags') THEN
        ALTER TABLE gate_condition_matches ADD COLUMN adversarial_flags JSONB DEFAULT '[]';
        COMMENT ON COLUMN gate_condition_matches.adversarial_flags IS
            'Red flags: [{flag_type, description, severity}] - e.g., misleading name, boundary value, out of range';
    END IF;
END $$;

-- Add dual interpretation results (restrictive + expansive)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_condition_matches'
                   AND column_name = 'restrictive_interpretation') THEN
        ALTER TABLE gate_condition_matches ADD COLUMN restrictive_interpretation JSONB DEFAULT '{}';
        COMMENT ON COLUMN gate_condition_matches.restrictive_interpretation IS
            '{status, reasoning} - strict legal interpretation';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'gate_condition_matches'
                   AND column_name = 'expansive_interpretation') THEN
        ALTER TABLE gate_condition_matches ADD COLUMN expansive_interpretation JSONB DEFAULT '{}';
        COMMENT ON COLUMN gate_condition_matches.expansive_interpretation IS
            '{status, reasoning} - broader technical interpretation';
    END IF;
END $$;

-- ============================================
-- PHASE 4: GATE MATCH EXPLANATIONS TABLE
-- Stores detailed human-readable explanations
-- ============================================

CREATE TABLE IF NOT EXISTS gate_match_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_condition_id UUID NOT NULL REFERENCES gate_conditions(id) ON DELETE CASCADE,
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,

    -- The definition used for matching
    definition_term TEXT,
    definition_text TEXT,
    definition_id UUID REFERENCES tender_definitions(id),

    -- Overall result
    overall_status TEXT NOT NULL, -- MEETS, PARTIALLY_MEETS, DOES_NOT_MEET
    required_count INTEGER,
    matching_count INTEGER,

    -- Detailed per-project analysis
    project_analyses JSONB DEFAULT '[]',
    -- Each entry: {
    --   project_id, project_name, project_value, project_year,
    --   classification: "תחבורה ציבורית" | "בינוי" | etc,
    --   matches_definition: true/false,
    --   matches_value: true/false,
    --   matches_timeframe: true/false,
    --   overall_match: true/false,
    --   reasoning: "הסבר בעברית למה כן/לא מתאים",
    --   adversarial_flags: [{type, description}]
    -- }

    -- Gap analysis
    gap_description TEXT, -- Hebrew description of what's missing
    gap_closure_options JSONB DEFAULT '[]',
    -- Each entry: {
    --   option: "SUBCONTRACTOR" | "PARTNERSHIP" | "CLARIFICATION" | etc,
    --   description: "הסבר בעברית",
    --   feasibility: "HIGH" | "MEDIUM" | "LOW",
    --   action_items: ["..."]
    -- }

    -- Dual interpretation
    restrictive_result JSONB DEFAULT '{}', -- {status, count, reasoning}
    expansive_result JSONB DEFAULT '{}',   -- {status, count, reasoning}
    recommended_interpretation TEXT,

    -- Full Hebrew explanation (rendered)
    explanation_html TEXT,
    explanation_markdown TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(gate_condition_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_gate_match_explanations_tender
    ON gate_match_explanations(tender_id);
CREATE INDEX IF NOT EXISTS idx_gate_match_explanations_org
    ON gate_match_explanations(org_id);

-- ============================================
-- PHASE 5: PROFILE GENERATION TABLE
-- Stores auto-generated test profiles
-- ============================================

CREATE TABLE IF NOT EXISTS generated_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,

    -- Profile type
    profile_type TEXT NOT NULL, -- 'PASSING', 'FAILING', 'ADVERSARIAL'
    profile_name TEXT NOT NULL, -- "חברת דוגמה - עוברת" / "חברת דוגמה - נכשלת"

    -- Generated company data
    company_data JSONB NOT NULL DEFAULT '{}',
    -- {name, company_number, founding_year, address, ...}

    -- Generated projects
    generated_projects JSONB NOT NULL DEFAULT '[]',
    -- Each: {project_name, client_name, client_type, start_date, end_date,
    --        total_value, project_type, category, domain_classification,
    --        why_matches_or_not: "הסבר"}

    -- Generated financials
    generated_financials JSONB NOT NULL DEFAULT '[]',

    -- Generated certifications
    generated_certifications JSONB NOT NULL DEFAULT '[]',

    -- Generated personnel
    generated_personnel JSONB NOT NULL DEFAULT '[]',

    -- Expected matching result
    expected_result JSONB NOT NULL DEFAULT '{}',
    -- {overall_eligibility, per_condition: [{condition_id, expected_status, expected_reasoning}]}

    -- Adversarial details (for ADVERSARIAL type)
    adversarial_tricks JSONB DEFAULT '[]',
    -- [{trick_type, description, target_condition_id, expected_detection}]

    -- Test result (after running matching)
    test_run_at TIMESTAMPTZ,
    test_result JSONB DEFAULT '{}',
    test_passed BOOLEAN,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_profiles_tender
    ON generated_profiles(tender_id);

-- ============================================
-- PHASE 6: TECHNICAL DICTIONARY ENHANCEMENTS
-- ============================================

-- Add domain relationships (what is/isn't part of a domain)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'technical_dictionary'
                   AND column_name = 'includes') THEN
        ALTER TABLE technical_dictionary ADD COLUMN includes TEXT[];
        COMMENT ON COLUMN technical_dictionary.includes IS
            'Sub-domains/items included (e.g., תחבורה ציבורית includes: רכבת, אוטובוס, מטרו)';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'technical_dictionary'
                   AND column_name = 'excludes') THEN
        ALTER TABLE technical_dictionary ADD COLUMN excludes TEXT[];
        COMMENT ON COLUMN technical_dictionary.excludes IS
            'Items explicitly NOT part of this domain (e.g., תחבורה ציבורית excludes: כביש, גשר)';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'technical_dictionary'
                   AND column_name = 'parent_term') THEN
        ALTER TABLE technical_dictionary ADD COLUMN parent_term TEXT;
        COMMENT ON COLUMN technical_dictionary.parent_term IS
            'Parent domain (e.g., רכבת קלה parent = תחבורה ציבורית)';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'technical_dictionary'
                   AND column_name = 'common_confusions') THEN
        ALTER TABLE technical_dictionary ADD COLUMN common_confusions JSONB DEFAULT '[]';
        COMMENT ON COLUMN technical_dictionary.common_confusions IS
            'Common confusions: [{term, why_confused, actually_is}] - e.g., כביש גישה confused with תחבורה';
    END IF;
END $$;

-- ============================================
-- PHASE 7: SEED TECHNICAL DICTIONARY
-- Common domains for Israeli tenders
-- ============================================

-- Transportation domain
INSERT INTO technical_dictionary (category, term, term_he, synonyms, definition, definition_he, includes, excludes, common_confusions)
VALUES
    ('TRANSPORTATION', 'public_transportation', 'תחבורה ציבורית',
     ARRAY['תח"צ', 'תחבורת ציבור', 'תחבורה ציבורית'],
     'Public transportation systems for mass transit of passengers',
     'מערכות תחבורה ציבורית להסעת נוסעים המונית',
     ARRAY['רכבת', 'רכבת קלה', 'אוטובוס', 'מטרו', 'מונורייל', 'רכבת כבדה', 'תחנות רכבת', 'מערכות כרטוס'],
     ARRAY['כביש', 'גשר', 'מנהרה', 'כביש גישה', 'מחלף', 'תאורת כבישים'],
     '[{"term": "תשתיות תחבורה", "why_confused": "שם דומה אך כולל גם בינוי כבישים", "actually_is": "תשתיות - יכול לכלול גם כבישים וגשרים"},
       {"term": "כביש גישה לתחנת רכבת", "why_confused": "קשור לרכבת אך הוא פרויקט בינוי", "actually_is": "בינוי תשתיות"},
       {"term": "מסוף אוטובוסים", "why_confused": "קשור לאוטובוסים אך מדובר בבינוי מבנה", "actually_is": "בינוי - אלא אם כולל מערכות תפעול"}]'::jsonb
    ),
    ('TRANSPORTATION', 'rail', 'רכבת',
     ARRAY['רכבת ישראל', 'רכ"ל', 'מסילת ברזל'],
     'Rail transportation systems',
     'מערכות תחבורה ברכבת',
     ARRAY['רכבת כבדה', 'רכבת קלה', 'רכבת פרברים', 'מערכות איתות רכבתי', 'מערכות בקרת תנועה רכבתית'],
     ARRAY['רכבל', 'רכב שטח'],
     '[]'::jsonb
    ),
    ('CONSTRUCTION', 'civil_construction', 'בינוי',
     ARRAY['בנייה', 'הקמה', 'בניה אזרחית'],
     'Civil construction and building projects',
     'פרויקטים של בניה אזרחית והקמה',
     ARRAY['בניית מבנים', 'תשתיות', 'כבישים', 'גשרים', 'מנהרות', 'מחלפים', 'ביוב', 'ניקוז'],
     ARRAY['תחבורה ציבורית', 'מערכות IT', 'תוכנה'],
     '[]'::jsonb
    ),
    ('IT_SYSTEMS', 'security_systems', 'מערכות אבטחה',
     ARRAY['אבטחה אלקטרונית', 'מערכות מיגון', 'CCTV'],
     'Electronic security and surveillance systems',
     'מערכות אבטחה אלקטרונית ומעקב',
     ARRAY['מצלמות אבטחה', 'בקרת גישה', 'גילוי פריצה', 'מערכות VMS', 'מערכות PSIM', 'גדרות אלקטרוניות'],
     ARRAY['שמירה פיזית', 'אבטחה פיזית', 'שומרים'],
     '[]'::jsonb
    ),
    ('SOFTWARE', 'software_development', 'פיתוח תוכנה',
     ARRAY['פיתוח מערכות', 'פיתוח אפליקציות', 'IT'],
     'Software development and IT systems',
     'פיתוח תוכנה ומערכות מידע',
     ARRAY['פיתוח אפליקציות', 'מערכות ERP', 'מערכות CRM', 'אתרי אינטרנט', 'מערכות BI', 'ענן'],
     ARRAY['תשתיות פיזיות', 'חומרה', 'רשתות'],
     '[]'::jsonb
    ),
    ('WATER', 'water_infrastructure', 'תשתיות מים',
     ARRAY['מים וביוב', 'תשתיות מים', 'מקורות'],
     'Water and sewage infrastructure projects',
     'פרויקטים של תשתיות מים וביוב',
     ARRAY['קווי מים', 'ביוב', 'מכוני טיהור', 'התפלה', 'השקיה', 'מאגרי מים'],
     ARRAY['בינוי כללי', 'כבישים'],
     '[]'::jsonb
    ),
    ('ENERGY', 'energy_infrastructure', 'תשתיות אנרגיה',
     ARRAY['חשמל', 'אנרגיה', 'חברת חשמל'],
     'Energy and electricity infrastructure',
     'תשתיות אנרגיה וחשמל',
     ARRAY['קווי חשמל', 'תחנות כוח', 'אנרגיה סולארית', 'טורבינות רוח', 'שנאים', 'רשתות חשמל'],
     ARRAY['תאורה', 'חשמלאות מבנים'],
     '[]'::jsonb
    )
ON CONFLICT (category, term) DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE gate_match_explanations IS
    'Stores detailed human-readable explanations of gate matching results per condition per company';

COMMENT ON TABLE generated_profiles IS
    'Auto-generated test company profiles (passing/failing/adversarial) for testing gate matching quality';
