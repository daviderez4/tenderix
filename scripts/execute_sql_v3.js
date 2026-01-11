/**
 * Execute Tenderix Complete SQL Schema v3.0
 * This script runs all SQL commands to set up the complete database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SQL statements broken down for execution
const sqlStatements = [
    // Extensions
    `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

    // Core function
    `CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql`,

    // C1: Source References
    `CREATE TABLE IF NOT EXISTS source_references (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL,
        entity_id UUID NOT NULL,
        source_file TEXT NOT NULL,
        page_number INTEGER,
        section_number TEXT,
        paragraph_number INTEGER,
        line_start INTEGER,
        line_end INTEGER,
        original_text TEXT NOT NULL,
        extraction_confidence DECIMAL(3,2) DEFAULT 1.0,
        extracted_at TIMESTAMPTZ DEFAULT NOW(),
        extracted_by TEXT DEFAULT 'system',
        UNIQUE(entity_type, entity_id, source_file, page_number, section_number)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_source_refs_tender ON source_references(tender_id)`,
    `CREATE INDEX IF NOT EXISTS idx_source_refs_entity ON source_references(entity_type, entity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_source_refs_file ON source_references(source_file)`,

    // C2: Dictionary Categories
    `CREATE TABLE IF NOT EXISTS dictionary_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        name_en TEXT,
        parent_id UUID REFERENCES dictionary_categories(id),
        description TEXT,
        keywords TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Dictionary Terms
    `CREATE TABLE IF NOT EXISTS dictionary_terms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id UUID REFERENCES dictionary_categories(id),
        term TEXT NOT NULL,
        term_normalized TEXT NOT NULL,
        synonyms TEXT[],
        definition TEXT,
        unit_of_measure TEXT,
        typical_values JSONB,
        related_terms UUID[],
        source TEXT,
        confidence DECIMAL(3,2) DEFAULT 1.0,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_dict_terms_normalized ON dictionary_terms(term_normalized)`,
    `CREATE INDEX IF NOT EXISTS idx_dict_terms_category ON dictionary_terms(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_dict_terms_synonyms ON dictionary_terms USING GIN(synonyms)`,

    // Term Occurrences
    `CREATE TABLE IF NOT EXISTS term_occurrences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        term_id UUID REFERENCES dictionary_terms(id) ON DELETE CASCADE,
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        context TEXT,
        source_ref_id UUID REFERENCES source_references(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // C3: Accumulation Rules
    `CREATE TABLE IF NOT EXISTS accumulation_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_name TEXT NOT NULL UNIQUE,
        description TEXT,
        entity_type TEXT NOT NULL,
        aggregation_method TEXT NOT NULL,
        dedup_fields TEXT[],
        time_window_months INTEGER,
        vat_handling TEXT DEFAULT 'exclude',
        currency_handling TEXT DEFAULT 'ils',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Accumulation Items
    `CREATE TABLE IF NOT EXISTS accumulation_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        item_type TEXT NOT NULL,
        item_data JSONB NOT NULL,
        dedup_hash TEXT NOT NULL,
        source_document TEXT,
        source_ref_id UUID REFERENCES source_references(id),
        valid_from DATE,
        valid_until DATE,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, item_type, dedup_hash)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_accum_items_type ON accumulation_items(company_id, item_type)`,
    `CREATE INDEX IF NOT EXISTS idx_accum_items_hash ON accumulation_items(dedup_hash)`,

    // C4: Gap Closure Options
    `CREATE TABLE IF NOT EXISTS gap_closure_options (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gap_type TEXT NOT NULL,
        closure_method TEXT NOT NULL,
        description TEXT,
        typical_cost_range JSONB,
        typical_time_days INTEGER,
        success_rate DECIMAL(3,2),
        requirements JSONB,
        risks TEXT[],
        active BOOLEAN DEFAULT true,
        UNIQUE(gap_type, closure_method)
    )`,

    // Potential Partners
    `CREATE TABLE IF NOT EXISTS potential_partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name TEXT NOT NULL,
        company_number TEXT UNIQUE,
        contact_name TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        capabilities JSONB,
        certifications TEXT[],
        experience_categories TEXT[],
        typical_project_size_min DECIMAL,
        typical_project_size_max DECIMAL,
        past_collaborations INTEGER DEFAULT 0,
        rating DECIMAL(3,2),
        preferred BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_partners_capabilities ON potential_partners USING GIN(capabilities)`,
    `CREATE INDEX IF NOT EXISTS idx_partners_categories ON potential_partners USING GIN(experience_categories)`,

    // Tender Definitions
    `CREATE TABLE IF NOT EXISTS tender_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        term TEXT NOT NULL,
        definition TEXT NOT NULL,
        section_reference TEXT,
        source_ref_id UUID REFERENCES source_references(id),
        category TEXT,
        importance TEXT DEFAULT 'normal',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tender_id, term)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_tender_defs_tender ON tender_definitions(tender_id)`,

    // Document Versions
    `CREATE TABLE IF NOT EXISTS document_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        document_type TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_url TEXT,
        file_hash TEXT,
        file_size INTEGER,
        published_date DATE,
        changes_summary TEXT,
        supersedes_version INTEGER,
        is_current BOOLEAN DEFAULT true,
        extracted_text TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tender_id, document_type, version_number)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_doc_versions_tender ON document_versions(tender_id)`,

    // Tender Relations
    `CREATE TABLE IF NOT EXISTS tender_relations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        related_tender_id UUID REFERENCES tenders(id),
        related_tender_number TEXT,
        relation_type TEXT NOT NULL,
        similarity_score DECIMAL(3,2),
        comparison_notes TEXT,
        key_differences JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Similarity Definitions
    `CREATE TABLE IF NOT EXISTS similarity_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category TEXT NOT NULL,
        term TEXT NOT NULL,
        interpretation_type TEXT NOT NULL,
        criteria JSONB NOT NULL,
        legal_source TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(category, term)
    )`,

    // Condition Interpretations
    `CREATE TABLE IF NOT EXISTS condition_interpretations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        condition_id UUID REFERENCES tender_conditions(id) ON DELETE CASCADE,
        interpretation_type TEXT NOT NULL,
        interpreter TEXT DEFAULT 'system',
        interpretation TEXT NOT NULL,
        confidence DECIMAL(3,2),
        risk_level TEXT,
        risk_description TEXT,
        recommendation TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Specification Items
    `CREATE TABLE IF NOT EXISTS specification_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        item_code TEXT,
        description TEXT NOT NULL,
        quantity DECIMAL,
        unit TEXT,
        section TEXT,
        requirements JSONB,
        source_ref_id UUID REFERENCES source_references(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // BOQ Items
    `CREATE TABLE IF NOT EXISTS boq_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        item_code TEXT,
        description TEXT NOT NULL,
        quantity DECIMAL,
        unit TEXT,
        unit_price DECIMAL,
        total_price DECIMAL,
        section TEXT,
        source_ref_id UUID REFERENCES source_references(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Spec-BOQ Cross References
    `CREATE TABLE IF NOT EXISTS spec_boq_crossref (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        spec_item_id UUID REFERENCES specification_items(id),
        boq_item_id UUID REFERENCES boq_items(id),
        match_type TEXT NOT NULL,
        discrepancy_type TEXT,
        discrepancy_details JSONB,
        resolution_status TEXT DEFAULT 'pending',
        resolution_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // BOQ Comparisons
    `CREATE TABLE IF NOT EXISTS boq_comparisons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id),
        item_code TEXT,
        description TEXT,
        current_price DECIMAL,
        avg_historical_price DECIMAL,
        min_historical_price DECIMAL,
        max_historical_price DECIMAL,
        price_position TEXT,
        comparison_count INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Pricing Recommendations
    `CREATE TABLE IF NOT EXISTS pricing_recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id),
        boq_item_id UUID REFERENCES boq_items(id),
        recommended_price DECIMAL,
        price_basis TEXT,
        confidence DECIMAL(3,2),
        factors JSONB,
        strategy TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Tender Results
    `CREATE TABLE IF NOT EXISTS tender_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_number TEXT NOT NULL,
        tender_name TEXT,
        issuing_body TEXT,
        category TEXT,
        result_date DATE,
        winner_name TEXT,
        winner_company_number TEXT,
        winning_price DECIMAL,
        num_bidders INTEGER,
        source_url TEXT,
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tender_number, winner_name)
    )`,

    `CREATE INDEX IF NOT EXISTS idx_tender_results_number ON tender_results(tender_number)`,
    `CREATE INDEX IF NOT EXISTS idx_tender_results_winner ON tender_results(winner_name)`,

    // Tender Bids
    `CREATE TABLE IF NOT EXISTS tender_bids (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_result_id UUID REFERENCES tender_results(id) ON DELETE CASCADE,
        bidder_name TEXT NOT NULL,
        bidder_company_number TEXT,
        bid_price DECIMAL,
        bid_rank INTEGER,
        disqualified BOOLEAN DEFAULT false,
        disqualification_reason TEXT,
        technical_score DECIMAL,
        price_score DECIMAL,
        total_score DECIMAL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_tender_bids_result ON tender_bids(tender_result_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tender_bids_bidder ON tender_bids(bidder_name)`,

    // Competitor Profiles
    `CREATE TABLE IF NOT EXISTS competitor_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name TEXT NOT NULL,
        company_number TEXT UNIQUE,
        categories TEXT[],
        typical_bid_size_min DECIMAL,
        typical_bid_size_max DECIMAL,
        win_rate DECIMAL(5,4),
        avg_price_position DECIMAL(5,4),
        total_bids INTEGER DEFAULT 0,
        total_wins INTEGER DEFAULT 0,
        preferred_clients TEXT[],
        strengths TEXT[],
        weaknesses TEXT[],
        pricing_behavior TEXT,
        last_activity DATE,
        data_quality TEXT DEFAULT 'low',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_competitor_profiles_name ON competitor_profiles(company_name)`,
    `CREATE INDEX IF NOT EXISTS idx_competitor_profiles_categories ON competitor_profiles USING GIN(categories)`,

    // Tender Reports
    `CREATE TABLE IF NOT EXISTS tender_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
        report_type TEXT NOT NULL DEFAULT 'full_analysis',
        executive_summary TEXT,
        gate_status JSONB,
        boq_analysis JSONB,
        competitor_analysis JSONB,
        recommendation TEXT,
        win_probability DECIMAL(3,2),
        pricing_strategy JSONB,
        risks JSONB,
        generated_at TIMESTAMPTZ DEFAULT NOW(),
        generated_by TEXT DEFAULT 'system'
    )`,

    `CREATE INDEX IF NOT EXISTS idx_tender_reports_tender ON tender_reports(tender_id)`
];

// Default data inserts
const dataInserts = [
    // Dictionary Categories
    `INSERT INTO dictionary_categories (name, name_en, description, keywords) VALUES
    ('תשתיות', 'Infrastructure', 'עבודות תשתית, ביוב, מים, חשמל', ARRAY['ביוב', 'מים', 'חשמל', 'כבישים', 'גשרים']),
    ('בינוי', 'Construction', 'עבודות בנייה, שיפוצים, גמר', ARRAY['בנייה', 'שיפוץ', 'טיח', 'ריצוף', 'צבע']),
    ('מערכות מידע', 'IT', 'תוכנה, חומרה, רשתות', ARRAY['תוכנה', 'מחשבים', 'רשת', 'ענן', 'אבטחת מידע']),
    ('שירותים', 'Services', 'שירותי ייעוץ, ניהול, תחזוקה', ARRAY['ייעוץ', 'ניהול', 'תחזוקה', 'ניקיון', 'שמירה']),
    ('רכש', 'Procurement', 'רכישת ציוד, חומרים', ARRAY['ציוד', 'רכש', 'אספקה', 'חומרים']),
    ('הובלה ולוגיסטיקה', 'Logistics', 'שינוע, אחסנה, הפצה', ARRAY['הובלה', 'שינוע', 'אחסנה', 'הפצה']),
    ('אבטחה', 'Security', 'מערכות אבטחה, שמירה', ARRAY['אבטחה', 'מצלמות', 'בקרת כניסה', 'שמירה']),
    ('תקשורת', 'Communications', 'טלפוניה, אינטרנט, שידור', ARRAY['טלפון', 'אינטרנט', 'סיבים', 'אלחוט'])
    ON CONFLICT (name) DO NOTHING`,

    // Accumulation Rules
    `INSERT INTO accumulation_rules (rule_name, entity_type, aggregation_method, dedup_fields, time_window_months, description) VALUES
    ('project_revenue', 'project', 'sum', ARRAY['project_name', 'client_name', 'year'], NULL, 'סכימת הכנסות מפרויקטים'),
    ('experience_years', 'experience', 'count_distinct', ARRAY['project_name', 'role'], NULL, 'ספירת שנות ניסיון'),
    ('similar_projects', 'project', 'count_distinct', ARRAY['project_name', 'client_name'], 36, 'פרויקטים דומים ב-3 שנים'),
    ('annual_revenue', 'revenue', 'sum', ARRAY['year', 'source'], 12, 'מחזור שנתי'),
    ('employee_count', 'employee', 'max', ARRAY['employee_id'], NULL, 'מספר עובדים')
    ON CONFLICT (rule_name) DO NOTHING`,

    // Gap Closure Options
    `INSERT INTO gap_closure_options (gap_type, closure_method, description, typical_time_days, requirements, risks) VALUES
    ('experience', 'subcontractor', 'שכירת קבלן משנה עם הניסיון הנדרש', 14,
     '{"contract_required": true, "approval_letter": true, "insurance": true}',
     ARRAY['תלות בקבלן', 'עלות נוספת', 'איכות לא מובטחת']),
    ('experience', 'partner', 'שותפות עם חברה בעלת ניסיון', 30,
     '{"partnership_agreement": true, "joint_guarantee": true, "profit_split": true}',
     ARRAY['חלוקת רווחים', 'קונפליקטים אפשריים', 'אחריות משותפת']),
    ('experience', 'acquisition', 'רכישת חברה או פעילות עם הניסיון', 90,
     '{"due_diligence": true, "legal_approval": true, "financing": true}',
     ARRAY['עלות גבוהה', 'זמן ארוך', 'סיכון אינטגרציה']),
    ('revenue', 'partner', 'שותפות עם חברה גדולה יותר', 30,
     '{"revenue_split": true, "lead_partner": true}',
     ARRAY['תלות בשותף', 'רווח נמוך יותר']),
    ('revenue', 'consortium', 'הקמת קונסורציום', 45,
     '{"consortium_agreement": true, "lead_entity": true}',
     ARRAY['ניהול מורכב', 'חלוקת אחריות']),
    ('certificate', 'training', 'הכשרת עובדים לקבלת תעודה', 60,
     '{"training_budget": true, "exam_scheduling": true, "time_off": true}',
     ARRAY['זמן הכשרה', 'עלות', 'אי-עמידה במבחן']),
    ('certificate', 'hire', 'גיוס בעל התעודה', 30,
     '{"salary_budget": true, "job_description": true}',
     ARRAY['עלות שכר', 'זמינות מועמדים']),
    ('staff', 'hire', 'גיוס עובדים', 45,
     '{"job_description": true, "budget_approval": true, "onboarding": true}',
     ARRAY['זמן גיוס', 'התאמה תרבותית']),
    ('staff', 'outsource', 'מיקור חוץ', 14,
     '{"service_agreement": true, "sla": true}',
     ARRAY['תלות בספק', 'איכות משתנה']),
    ('financial', 'guarantee', 'ערבות בנקאית', 7,
     '{"bank_relationship": true, "collateral": true}',
     ARRAY['עלות ערבות', 'הקפאת כספים']),
    ('financial', 'insurance', 'פוליסת ביטוח', 14,
     '{"insurance_broker": true, "coverage_limits": true}',
     ARRAY['פרמיה', 'החרגות'])
    ON CONFLICT (gap_type, closure_method) DO NOTHING`,

    // Similarity Definitions
    `INSERT INTO similarity_definitions (category, term, interpretation_type, criteria, notes) VALUES
    ('תשתיות', 'פרויקט דומה', 'flexible',
     '{"size_range": [0.5, 2.0], "same_sector": true, "same_technology": true, "same_client_type": false}',
     'פרויקט בהיקף 50%-200%, אותו תחום טכני'),
    ('מערכות מידע', 'מערכת דומה', 'strict',
     '{"same_technology_stack": true, "same_scale": true, "user_count_range": [0.5, 3.0]}',
     'אותה טכנולוגיה וסדר גודל'),
    ('בינוי', 'עבודה דומה', 'flexible',
     '{"size_range": [0.3, 3.0], "same_building_type": true}',
     'אותו סוג מבנה, היקף גמיש'),
    ('שירותים', 'שירות דומה', 'flexible',
     '{"same_service_type": true, "size_range": [0.3, 3.0]}',
     'אותו סוג שירות')
    ON CONFLICT (category, term) DO NOTHING`
];

// Functions to create
const functionsSql = [
    // save_source_reference
    `CREATE OR REPLACE FUNCTION save_source_reference(
        p_tender_id UUID,
        p_entity_type TEXT,
        p_entity_id UUID,
        p_source_file TEXT,
        p_page_number INTEGER,
        p_section_number TEXT,
        p_original_text TEXT,
        p_confidence DECIMAL DEFAULT 1.0
    ) RETURNS UUID AS $$
    DECLARE
        v_ref_id UUID;
    BEGIN
        INSERT INTO source_references (
            tender_id, entity_type, entity_id, source_file,
            page_number, section_number, original_text, extraction_confidence
        ) VALUES (
            p_tender_id, p_entity_type, p_entity_id, p_source_file,
            p_page_number, p_section_number, p_original_text, p_confidence
        )
        ON CONFLICT (entity_type, entity_id, source_file, page_number, section_number)
        DO UPDATE SET
            original_text = EXCLUDED.original_text,
            extraction_confidence = EXCLUDED.extraction_confidence,
            extracted_at = NOW()
        RETURNING id INTO v_ref_id;
        RETURN v_ref_id;
    END;
    $$ LANGUAGE plpgsql`,

    // find_or_create_term
    `CREATE OR REPLACE FUNCTION find_or_create_term(
        p_term TEXT,
        p_category_name TEXT DEFAULT NULL,
        p_definition TEXT DEFAULT NULL
    ) RETURNS UUID AS $$
    DECLARE
        v_normalized TEXT;
        v_term_id UUID;
        v_category_id UUID;
    BEGIN
        v_normalized := lower(regexp_replace(p_term, '[^א-תa-zA-Z0-9\\s]', '', 'g'));
        SELECT id INTO v_term_id FROM dictionary_terms WHERE term_normalized = v_normalized LIMIT 1;
        IF v_term_id IS NOT NULL THEN
            UPDATE dictionary_terms SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = v_term_id;
            RETURN v_term_id;
        END IF;
        IF p_category_name IS NOT NULL THEN
            SELECT id INTO v_category_id FROM dictionary_categories WHERE name = p_category_name;
        END IF;
        INSERT INTO dictionary_terms (term, term_normalized, category_id, definition, usage_count)
        VALUES (p_term, v_normalized, v_category_id, p_definition, 1)
        RETURNING id INTO v_term_id;
        RETURN v_term_id;
    END;
    $$ LANGUAGE plpgsql`,

    // parse_quantitative_condition
    `CREATE OR REPLACE FUNCTION parse_quantitative_condition(p_condition_text TEXT) RETURNS JSONB AS $$
    DECLARE
        v_result JSONB := '{}'::jsonb;
        v_amount DECIMAL;
        v_unit TEXT;
    BEGIN
        v_result := jsonb_build_object(
            'vat_mentioned', p_condition_text ~* 'מע"מ|מעמ|VAT',
            'vat_included', p_condition_text ~* 'כולל מע"מ|כולל מעמ',
            'vat_excluded', p_condition_text ~* '(ללא|לא כולל|לפני)\\s*מע"מ',
            'minimum', p_condition_text ~* 'לפחות|מינימום|minimum|min',
            'maximum', p_condition_text ~* 'עד|מקסימום|maximum|max|לכל היותר',
            'time_period', CASE
                WHEN p_condition_text ~* '3\\s*שנ|שלוש\\s*שנ' THEN '3_years'
                WHEN p_condition_text ~* '5\\s*שנ|חמש\\s*שנ' THEN '5_years'
                WHEN p_condition_text ~* 'שנה\\s*אחרונה|12\\s*חודש' THEN '1_year'
                ELSE NULL
            END
        );
        RETURN v_result;
    END;
    $$ LANGUAGE plpgsql`,

    // suggest_gap_closures
    `CREATE OR REPLACE FUNCTION suggest_gap_closures(p_tender_id UUID, p_condition_id UUID) RETURNS JSONB AS $$
    DECLARE
        v_condition RECORD;
        v_gap_type TEXT;
        v_suggestions JSONB;
        v_partners JSONB;
    BEGIN
        SELECT * INTO v_condition FROM tender_conditions WHERE id = p_condition_id;
        v_gap_type := CASE
            WHEN v_condition.condition_text ~* 'ניסיון|פרויקט|ביצע' THEN 'experience'
            WHEN v_condition.condition_text ~* 'מחזור|הכנסות|כספי' THEN 'revenue'
            WHEN v_condition.condition_text ~* 'תעודה|הסמכה|רישיון|ISO' THEN 'certificate'
            WHEN v_condition.condition_text ~* 'עובד|צוות|כוח אדם|מהנדס' THEN 'staff'
            WHEN v_condition.condition_text ~* 'ערבות|ביטוח|בטוחה' THEN 'financial'
            ELSE 'other'
        END;
        SELECT jsonb_agg(jsonb_build_object(
            'name', pp.company_name, 'rating', pp.rating,
            'past_collaborations', pp.past_collaborations, 'contact', pp.contact_name
        )) INTO v_partners FROM potential_partners pp
        WHERE v_gap_type = ANY(pp.experience_categories) OR pp.capabilities ? v_gap_type
        ORDER BY pp.rating DESC NULLS LAST LIMIT 5;
        SELECT jsonb_agg(jsonb_build_object(
            'method', gco.closure_method, 'description', gco.description,
            'time_days', gco.typical_time_days, 'requirements', gco.requirements, 'risks', gco.risks
        ) ORDER BY gco.typical_time_days) INTO v_suggestions
        FROM gap_closure_options gco WHERE gco.gap_type = v_gap_type AND gco.active = true;
        RETURN jsonb_build_object(
            'condition_id', p_condition_id, 'condition_text', v_condition.condition_text,
            'gap_type', v_gap_type, 'suggestions', COALESCE(v_suggestions, '[]'::jsonb),
            'potential_partners', COALESCE(v_partners, '[]'::jsonb), 'generated_at', NOW()
        );
    END;
    $$ LANGUAGE plpgsql`,

    // optimize_bid_strategy
    `CREATE OR REPLACE FUNCTION optimize_bid_strategy(p_tender_id UUID, p_company_id UUID DEFAULT NULL) RETURNS JSONB AS $$
    DECLARE
        v_mandatory_count INTEGER;
        v_scoring_conditions JSONB;
    BEGIN
        SELECT COUNT(*) INTO v_mandatory_count FROM tender_conditions WHERE tender_id = p_tender_id AND is_mandatory = true;
        SELECT jsonb_agg(jsonb_build_object(
            'id', tc.id, 'text', LEFT(tc.condition_text, 100),
            'weight', COALESCE(tc.scoring_weight, 0), 'type', tc.condition_type
        ) ORDER BY tc.scoring_weight DESC NULLS LAST) INTO v_scoring_conditions
        FROM tender_conditions tc WHERE tc.tender_id = p_tender_id AND tc.scoring_weight > 0;
        RETURN jsonb_build_object(
            'tender_id', p_tender_id,
            'analysis', jsonb_build_object(
                'mandatory_conditions', v_mandatory_count,
                'scoring_conditions', v_scoring_conditions,
                'total_weight', (SELECT SUM(scoring_weight) FROM tender_conditions WHERE tender_id = p_tender_id)
            ),
            'strategy', jsonb_build_object(
                'mandatory', 'עמידה מלאה בכל תנאי הסף - אין פשרות',
                'scoring', 'מקסום בתנאים עם משקל גבוה',
                'price', 'תמחור תחרותי - בדרך כלל 40-60% מהציון'
            ),
            'recommendations', jsonb_build_array(
                jsonb_build_object('priority', 1, 'area', 'תנאי סף', 'action', 'וודא עמידה ב-100% של תנאי הסף', 'impact', 'critical'),
                jsonb_build_object('priority', 2, 'area', 'ניסיון', 'action', 'הצג את הפרויקטים הגדולים והרלוונטיים ביותר', 'impact', 'high'),
                jsonb_build_object('priority', 3, 'area', 'צוות', 'action', 'הדגש הסמכות ותארים רלוונטיים', 'impact', 'medium'),
                jsonb_build_object('priority', 4, 'area', 'מחיר', 'action', 'תמחר באמצע השוק או מעט מתחת', 'impact', 'high')
            ),
            'generated_at', NOW()
        );
    END;
    $$ LANGUAGE plpgsql`,

    // predict_competitors
    `CREATE OR REPLACE FUNCTION predict_competitors(p_tender_id UUID, p_limit INTEGER DEFAULT 10) RETURNS JSONB AS $$
    DECLARE
        v_tender RECORD;
        v_predictions JSONB;
    BEGIN
        SELECT * INTO v_tender FROM tenders WHERE id = p_tender_id;
        SELECT jsonb_agg(prediction ORDER BY probability DESC) INTO v_predictions FROM (
            SELECT jsonb_build_object(
                'company_name', cp.company_name,
                'probability', CASE
                    WHEN v_tender.category = ANY(cp.categories) AND v_tender.estimated_value BETWEEN cp.typical_bid_size_min AND cp.typical_bid_size_max THEN 0.85
                    WHEN v_tender.category = ANY(cp.categories) THEN 0.60
                    WHEN v_tender.issuing_body = ANY(cp.preferred_clients) THEN 0.50
                    ELSE 0.25
                END,
                'win_rate', cp.win_rate, 'total_bids', cp.total_bids,
                'pricing_behavior', cp.pricing_behavior, 'last_activity', cp.last_activity
            ) as prediction
            FROM competitor_profiles cp
            WHERE cp.last_activity > CURRENT_DATE - INTERVAL '18 months'
            ORDER BY cp.win_rate DESC NULLS LAST LIMIT p_limit
        ) sub;
        RETURN jsonb_build_object(
            'tender_id', p_tender_id, 'tender_name', v_tender.name,
            'predicted_competitors', COALESCE(v_predictions, '[]'::jsonb),
            'prediction_confidence', CASE
                WHEN jsonb_array_length(v_predictions) >= 5 THEN 'high'
                WHEN jsonb_array_length(v_predictions) >= 2 THEN 'medium' ELSE 'low'
            END,
            'generated_at', NOW()
        );
    END;
    $$ LANGUAGE plpgsql`,

    // analyze_competition
    `CREATE OR REPLACE FUNCTION analyze_competition(p_tender_id UUID) RETURNS JSONB AS $$
    DECLARE
        v_tender RECORD;
        v_similar_results JSONB;
        v_price_analysis JSONB;
    BEGIN
        SELECT * INTO v_tender FROM tenders WHERE id = p_tender_id;
        SELECT jsonb_agg(jsonb_build_object(
            'tender_number', tr.tender_number, 'tender_name', tr.tender_name,
            'winner', tr.winner_name, 'winning_price', tr.winning_price,
            'num_bidders', tr.num_bidders, 'result_date', tr.result_date
        ) ORDER BY tr.result_date DESC) INTO v_similar_results
        FROM tender_results tr
        WHERE (tr.category = v_tender.category OR tr.issuing_body = v_tender.issuing_body)
          AND tr.result_date > CURRENT_DATE - INTERVAL '2 years' LIMIT 10;
        SELECT jsonb_build_object(
            'avg_winning_price', AVG(tr.winning_price),
            'min_winning_price', MIN(tr.winning_price),
            'max_winning_price', MAX(tr.winning_price),
            'avg_bidders', AVG(tr.num_bidders),
            'total_similar_tenders', COUNT(*)
        ) INTO v_price_analysis FROM tender_results tr
        WHERE tr.category = v_tender.category AND tr.result_date > CURRENT_DATE - INTERVAL '2 years';
        RETURN jsonb_build_object(
            'tender_id', p_tender_id,
            'similar_results', COALESCE(v_similar_results, '[]'::jsonb),
            'price_analysis', v_price_analysis,
            'market_insights', jsonb_build_object(
                'competition_level', CASE
                    WHEN (v_price_analysis->>'avg_bidders')::decimal > 7 THEN 'high'
                    WHEN (v_price_analysis->>'avg_bidders')::decimal > 4 THEN 'medium' ELSE 'low'
                END
            )
        );
    END;
    $$ LANGUAGE plpgsql`
];

async function executeSQL() {
    console.log('🚀 Starting Tenderix v3.0 Database Setup...\n');

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Execute table creation
    console.log('📦 Creating tables...');
    for (const sql of sqlStatements) {
        try {
            const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
            if (error) {
                // Try direct approach using REST API
                const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseServiceKey,
                        'Authorization': `Bearer ${supabaseServiceKey}`
                    },
                    body: JSON.stringify({ sql_query: sql })
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
            }
            successCount++;
            process.stdout.write('.');
        } catch (err) {
            errorCount++;
            errors.push({ sql: sql.substring(0, 50), error: err.message });
        }
    }
    console.log(`\n✅ Tables: ${successCount} created, ${errorCount} errors`);

    // Execute data inserts
    console.log('\n📝 Inserting default data...');
    for (const sql of dataInserts) {
        try {
            const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
            if (!error) successCount++;
        } catch (err) {
            errors.push({ sql: sql.substring(0, 50), error: err.message });
        }
    }

    // Execute function creation
    console.log('\n⚙️ Creating functions...');
    for (const sql of functionsSql) {
        try {
            const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
            if (!error) {
                successCount++;
                process.stdout.write('.');
            }
        } catch (err) {
            errors.push({ sql: sql.substring(0, 50), error: err.message });
        }
    }

    console.log('\n\n========================================');
    console.log('📊 SUMMARY');
    console.log('========================================');
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
        console.log('\n⚠️ Errors encountered:');
        errors.slice(0, 5).forEach(e => console.log(`  - ${e.sql}... : ${e.error}`));
    }

    console.log('\n🎉 Setup process completed!');
    console.log('Run the SQL file directly in Supabase SQL Editor for best results.');
}

executeSQL().catch(console.error);
