-- ============================================
-- TENDERIX COMPLETE DATABASE SCHEMA v3.0
-- Full System Implementation
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE FUNCTION: Update timestamp trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- C1: TRACEABILITY - Source References
-- ============================================

-- Source references table
CREATE TABLE IF NOT EXISTS source_references (
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
);

CREATE INDEX IF NOT EXISTS idx_source_refs_tender ON source_references(tender_id);
CREATE INDEX IF NOT EXISTS idx_source_refs_entity ON source_references(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_source_refs_file ON source_references(source_file);

-- Function to save source reference
CREATE OR REPLACE FUNCTION save_source_reference(
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
$$ LANGUAGE plpgsql;

-- View for entity with sources
CREATE OR REPLACE VIEW entity_with_sources AS
SELECT
    sr.entity_type,
    sr.entity_id,
    sr.tender_id,
    json_agg(json_build_object(
        'file', sr.source_file,
        'page', sr.page_number,
        'section', sr.section_number,
        'text', LEFT(sr.original_text, 200),
        'confidence', sr.extraction_confidence
    ) ORDER BY sr.page_number, sr.section_number) as sources
FROM source_references sr
GROUP BY sr.entity_type, sr.entity_id, sr.tender_id;

-- ============================================
-- C2: TECHNICAL DICTIONARY
-- ============================================

-- Dictionary categories
CREATE TABLE IF NOT EXISTS dictionary_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    name_en TEXT,
    parent_id UUID REFERENCES dictionary_categories(id),
    description TEXT,
    keywords TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dictionary terms
CREATE TABLE IF NOT EXISTS dictionary_terms (
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
);

CREATE INDEX IF NOT EXISTS idx_dict_terms_normalized ON dictionary_terms(term_normalized);
CREATE INDEX IF NOT EXISTS idx_dict_terms_category ON dictionary_terms(category_id);
CREATE INDEX IF NOT EXISTS idx_dict_terms_synonyms ON dictionary_terms USING GIN(synonyms);

-- Term occurrences
CREATE TABLE IF NOT EXISTS term_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    term_id UUID REFERENCES dictionary_terms(id) ON DELETE CASCADE,
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    context TEXT,
    source_ref_id UUID REFERENCES source_references(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO dictionary_categories (name, name_en, description, keywords) VALUES
('תשתיות', 'Infrastructure', 'עבודות תשתית, ביוב, מים, חשמל', ARRAY['ביוב', 'מים', 'חשמל', 'כבישים', 'גשרים']),
('בינוי', 'Construction', 'עבודות בנייה, שיפוצים, גמר', ARRAY['בנייה', 'שיפוץ', 'טיח', 'ריצוף', 'צבע']),
('מערכות מידע', 'IT', 'תוכנה, חומרה, רשתות', ARRAY['תוכנה', 'מחשבים', 'רשת', 'ענן', 'אבטחת מידע']),
('שירותים', 'Services', 'שירותי ייעוץ, ניהול, תחזוקה', ARRAY['ייעוץ', 'ניהול', 'תחזוקה', 'ניקיון', 'שמירה']),
('רכש', 'Procurement', 'רכישת ציוד, חומרים', ARRAY['ציוד', 'רכש', 'אספקה', 'חומרים']),
('הובלה ולוגיסטיקה', 'Logistics', 'שינוע, אחסנה, הפצה', ARRAY['הובלה', 'שינוע', 'אחסנה', 'הפצה']),
('אבטחה', 'Security', 'מערכות אבטחה, שמירה', ARRAY['אבטחה', 'מצלמות', 'בקרת כניסה', 'שמירה']),
('תקשורת', 'Communications', 'טלפוניה, אינטרנט, שידור', ARRAY['טלפון', 'אינטרנט', 'סיבים', 'אלחוט'])
ON CONFLICT (name) DO NOTHING;

-- Function to find or create term
CREATE OR REPLACE FUNCTION find_or_create_term(
    p_term TEXT,
    p_category_name TEXT DEFAULT NULL,
    p_definition TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_normalized TEXT;
    v_term_id UUID;
    v_category_id UUID;
BEGIN
    v_normalized := lower(regexp_replace(p_term, '[^\u0590-\u05FFa-zA-Z0-9\s]', '', 'g'));

    SELECT id INTO v_term_id
    FROM dictionary_terms
    WHERE term_normalized = v_normalized
    LIMIT 1;

    IF v_term_id IS NOT NULL THEN
        UPDATE dictionary_terms
        SET usage_count = usage_count + 1, updated_at = NOW()
        WHERE id = v_term_id;
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
$$ LANGUAGE plpgsql;

-- Function to search terms
CREATE OR REPLACE FUNCTION search_terms(
    p_query TEXT,
    p_category TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE(
    term_id UUID,
    term TEXT,
    definition TEXT,
    category TEXT,
    similarity_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dt.id,
        dt.term,
        dt.definition,
        dc.name,
        similarity(dt.term_normalized, lower(p_query))
    FROM dictionary_terms dt
    LEFT JOIN dictionary_categories dc ON dt.category_id = dc.id
    WHERE
        (p_category IS NULL OR dc.name = p_category)
        AND (
            dt.term_normalized % lower(p_query)
            OR lower(p_query) = ANY(dt.synonyms)
        )
    ORDER BY similarity(dt.term_normalized, lower(p_query)) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- C3: ACCUMULATION LOGIC
-- ============================================

-- Accumulation rules
CREATE TABLE IF NOT EXISTS accumulation_rules (
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
);

-- Accumulation items
CREATE TABLE IF NOT EXISTS accumulation_items (
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
);

CREATE INDEX IF NOT EXISTS idx_accum_items_type ON accumulation_items(company_id, item_type);
CREATE INDEX IF NOT EXISTS idx_accum_items_hash ON accumulation_items(dedup_hash);

-- Default accumulation rules
INSERT INTO accumulation_rules (rule_name, entity_type, aggregation_method, dedup_fields, time_window_months, description) VALUES
('project_revenue', 'project', 'sum', ARRAY['project_name', 'client_name', 'year'], NULL, 'סכימת הכנסות מפרויקטים'),
('experience_years', 'experience', 'count_distinct', ARRAY['project_name', 'role'], NULL, 'ספירת שנות ניסיון'),
('similar_projects', 'project', 'count_distinct', ARRAY['project_name', 'client_name'], 36, 'פרויקטים דומים ב-3 שנים'),
('annual_revenue', 'revenue', 'sum', ARRAY['year', 'source'], 12, 'מחזור שנתי'),
('employee_count', 'employee', 'max', ARRAY['employee_id'], NULL, 'מספר עובדים')
ON CONFLICT (rule_name) DO NOTHING;

-- Function to calculate accumulation
CREATE OR REPLACE FUNCTION calculate_accumulation(
    p_company_id UUID,
    p_rule_name TEXT,
    p_as_of_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB AS $$
DECLARE
    v_rule accumulation_rules%ROWTYPE;
    v_result JSONB;
    v_total DECIMAL;
    v_count INTEGER;
    v_items JSONB;
BEGIN
    SELECT * INTO v_rule FROM accumulation_rules WHERE rule_name = p_rule_name AND active = true;
    IF v_rule IS NULL THEN
        RETURN jsonb_build_object('error', 'Rule not found: ' || p_rule_name);
    END IF;

    WITH filtered_items AS (
        SELECT DISTINCT ON (dedup_hash) *
        FROM accumulation_items
        WHERE company_id = p_company_id
          AND item_type = v_rule.entity_type
          AND (v_rule.time_window_months IS NULL
               OR valid_from >= p_as_of_date - (v_rule.time_window_months || ' months')::interval)
        ORDER BY dedup_hash, created_at DESC
    )
    SELECT
        CASE v_rule.aggregation_method
            WHEN 'sum' THEN COALESCE(SUM((item_data->>'amount')::decimal), 0)
            WHEN 'max' THEN COALESCE(MAX((item_data->>'amount')::decimal), 0)
            WHEN 'count_distinct' THEN COUNT(*)::decimal
            WHEN 'weighted_sum' THEN COALESCE(SUM((item_data->>'amount')::decimal * COALESCE((item_data->>'weight')::decimal, 1)), 0)
        END,
        COUNT(*),
        jsonb_agg(item_data)
    INTO v_total, v_count, v_items
    FROM filtered_items;

    RETURN jsonb_build_object(
        'rule', p_rule_name,
        'method', v_rule.aggregation_method,
        'total', v_total,
        'count', v_count,
        'items', v_items,
        'calculated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to add accumulation item with dedup
CREATE OR REPLACE FUNCTION add_accumulation_item(
    p_company_id UUID,
    p_item_type TEXT,
    p_item_data JSONB,
    p_dedup_fields TEXT[],
    p_source_document TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_hash TEXT;
    v_item_id UUID;
    v_is_new BOOLEAN;
BEGIN
    -- Create hash from relevant fields
    SELECT md5(string_agg(COALESCE(p_item_data->>field, ''), '|'))
    INTO v_hash
    FROM unnest(p_dedup_fields) as field;

    -- Try to insert
    INSERT INTO accumulation_items (company_id, item_type, item_data, dedup_hash, source_document)
    VALUES (p_company_id, p_item_type, p_item_data, v_hash, p_source_document)
    ON CONFLICT (company_id, item_type, dedup_hash) DO UPDATE
    SET item_data = EXCLUDED.item_data,
        source_document = COALESCE(EXCLUDED.source_document, accumulation_items.source_document)
    RETURNING id, (xmax = 0) INTO v_item_id, v_is_new;

    RETURN jsonb_build_object(
        'item_id', v_item_id,
        'is_new', v_is_new,
        'dedup_hash', v_hash
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- C4: GAP CLOSURE OPTIONS
-- ============================================

-- Gap closure options
CREATE TABLE IF NOT EXISTS gap_closure_options (
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
);

-- Potential partners repository
CREATE TABLE IF NOT EXISTS potential_partners (
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
);

CREATE INDEX IF NOT EXISTS idx_partners_capabilities ON potential_partners USING GIN(capabilities);
CREATE INDEX IF NOT EXISTS idx_partners_categories ON potential_partners USING GIN(experience_categories);

-- Default gap closure options
INSERT INTO gap_closure_options (gap_type, closure_method, description, typical_time_days, requirements, risks) VALUES
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
ON CONFLICT (gap_type, closure_method) DO NOTHING;

-- Function to suggest gap closures
CREATE OR REPLACE FUNCTION suggest_gap_closures(
    p_tender_id UUID,
    p_condition_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_condition RECORD;
    v_gap_type TEXT;
    v_suggestions JSONB;
    v_partners JSONB;
BEGIN
    SELECT * INTO v_condition FROM tender_conditions WHERE id = p_condition_id;

    -- Identify gap type
    v_gap_type := CASE
        WHEN v_condition.condition_text ~* 'ניסיון|פרויקט|ביצע' THEN 'experience'
        WHEN v_condition.condition_text ~* 'מחזור|הכנסות|כספי' THEN 'revenue'
        WHEN v_condition.condition_text ~* 'תעודה|הסמכה|רישיון|ISO' THEN 'certificate'
        WHEN v_condition.condition_text ~* 'עובד|צוות|כוח אדם|מהנדס' THEN 'staff'
        WHEN v_condition.condition_text ~* 'ערבות|ביטוח|בטוחה' THEN 'financial'
        ELSE 'other'
    END;

    -- Find potential partners
    SELECT jsonb_agg(jsonb_build_object(
        'name', pp.company_name,
        'rating', pp.rating,
        'past_collaborations', pp.past_collaborations,
        'contact', pp.contact_name
    ))
    INTO v_partners
    FROM potential_partners pp
    WHERE v_gap_type = ANY(pp.experience_categories)
       OR pp.capabilities ? v_gap_type
    ORDER BY pp.rating DESC NULLS LAST, pp.past_collaborations DESC
    LIMIT 5;

    -- Find closure options
    SELECT jsonb_agg(jsonb_build_object(
        'method', gco.closure_method,
        'description', gco.description,
        'time_days', gco.typical_time_days,
        'requirements', gco.requirements,
        'risks', gco.risks,
        'success_rate', gco.success_rate
    ) ORDER BY gco.typical_time_days)
    INTO v_suggestions
    FROM gap_closure_options gco
    WHERE gco.gap_type = v_gap_type AND gco.active = true;

    RETURN jsonb_build_object(
        'condition_id', p_condition_id,
        'condition_text', v_condition.condition_text,
        'gap_type', v_gap_type,
        'suggestions', COALESCE(v_suggestions, '[]'::jsonb),
        'potential_partners', COALESCE(v_partners, '[]'::jsonb),
        'generated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1.4-1.6: INTAKE ENHANCEMENTS
-- ============================================

-- Tender definitions
CREATE TABLE IF NOT EXISTS tender_definitions (
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
);

CREATE INDEX IF NOT EXISTS idx_tender_defs_tender ON tender_definitions(tender_id);

-- Document versions
CREATE TABLE IF NOT EXISTS document_versions (
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
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_tender ON document_versions(tender_id);

-- Tender relations
CREATE TABLE IF NOT EXISTS tender_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
    related_tender_id UUID REFERENCES tenders(id),
    related_tender_number TEXT,
    relation_type TEXT NOT NULL,
    similarity_score DECIMAL(3,2),
    comparison_notes TEXT,
    key_differences JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to extract definitions
CREATE OR REPLACE FUNCTION extract_definitions(
    p_tender_id UUID,
    p_text TEXT
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_match RECORD;
BEGIN
    -- Search for common definition patterns
    FOR v_match IN
        SELECT
            (regexp_matches(p_text, '"([^"]+)"\s*[-–:]\s*([^.;]+[.;])', 'g'))[1] as term,
            (regexp_matches(p_text, '"([^"]+)"\s*[-–:]\s*([^.;]+[.;])', 'g'))[2] as def
        UNION ALL
        SELECT
            (regexp_matches(p_text, '([א-ת\s]+)\s*[-–]\s*משמעו\s+([^.;]+[.;])', 'gi'))[1],
            (regexp_matches(p_text, '([א-ת\s]+)\s*[-–]\s*משמעו\s+([^.;]+[.;])', 'gi'))[2]
    LOOP
        INSERT INTO tender_definitions (tender_id, term, definition)
        VALUES (p_tender_id, trim(v_match.term), trim(v_match.def))
        ON CONFLICT (tender_id, term) DO UPDATE SET definition = EXCLUDED.definition;
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to compare document versions
CREATE OR REPLACE FUNCTION compare_document_versions(
    p_tender_id UUID,
    p_doc_type TEXT,
    p_old_version INTEGER,
    p_new_version INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_old document_versions%ROWTYPE;
    v_new document_versions%ROWTYPE;
BEGIN
    SELECT * INTO v_old FROM document_versions
    WHERE tender_id = p_tender_id AND document_type = p_doc_type AND version_number = p_old_version;

    SELECT * INTO v_new FROM document_versions
    WHERE tender_id = p_tender_id AND document_type = p_doc_type AND version_number = p_new_version;

    RETURN jsonb_build_object(
        'old_version', v_old.version_number,
        'new_version', v_new.version_number,
        'old_file', v_old.file_name,
        'new_file', v_new.file_name,
        'old_date', v_old.published_date,
        'new_date', v_new.published_date,
        'changes_summary', v_new.changes_summary,
        'size_change', v_new.file_size - COALESCE(v_old.file_size, 0),
        'hash_changed', v_old.file_hash IS DISTINCT FROM v_new.file_hash
    );
END;
$$ LANGUAGE plpgsql;

-- Function to find previous tender
CREATE OR REPLACE FUNCTION find_previous_tender(
    p_tender_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_tender RECORD;
    v_matches JSONB;
BEGIN
    SELECT * INTO v_tender FROM tenders WHERE id = p_tender_id;

    SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'tender_number', t.tender_number,
        'name', t.name,
        'issuing_body', t.issuing_body,
        'submission_date', t.submission_date,
        'status', t.status,
        'match_reason', CASE
            WHEN t.tender_number ~ ('^' || regexp_replace(v_tender.tender_number, '[0-9]+$', '')) THEN 'מספר מכרז דומה'
            WHEN t.issuing_body = v_tender.issuing_body AND t.category = v_tender.category THEN 'אותו גוף ותחום'
            ELSE 'שם דומה'
        END,
        'similarity', similarity(t.name, v_tender.name)
    ) ORDER BY t.submission_date DESC)
    INTO v_matches
    FROM tenders t
    WHERE t.id != p_tender_id
      AND t.created_at < v_tender.created_at
      AND (
          t.tender_number ~ ('^' || regexp_replace(v_tender.tender_number, '[0-9]+$', ''))
          OR (t.issuing_body = v_tender.issuing_body AND t.category = v_tender.category)
          OR similarity(t.name, v_tender.name) > 0.5
      )
    LIMIT 5;

    -- Save relations
    INSERT INTO tender_relations (tender_id, related_tender_id, relation_type, similarity_score)
    SELECT
        p_tender_id,
        (match->>'id')::uuid,
        'previous_iteration',
        (match->>'similarity')::decimal
    FROM jsonb_array_elements(v_matches) as match
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
        'tender_id', p_tender_id,
        'matches', COALESCE(v_matches, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2.2-2.6.5: GATE CONDITIONS ENHANCEMENTS
-- ============================================

-- Add columns to tender_conditions if not exist
DO $$
BEGIN
    ALTER TABLE tender_conditions ADD COLUMN IF NOT EXISTS vat_included BOOLEAN;
    ALTER TABLE tender_conditions ADD COLUMN IF NOT EXISTS execution_definition TEXT;
    ALTER TABLE tender_conditions ADD COLUMN IF NOT EXISTS measurement_method TEXT;
    ALTER TABLE tender_conditions ADD COLUMN IF NOT EXISTS verification_documents TEXT[];
    ALTER TABLE tender_conditions ADD COLUMN IF NOT EXISTS scoring_weight DECIMAL(5,2);
    ALTER TABLE tender_conditions ADD COLUMN IF NOT EXISTS parsed_data JSONB;
EXCEPTION WHEN undefined_table THEN
    NULL;
END $$;

-- Similarity definitions
CREATE TABLE IF NOT EXISTS similarity_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    term TEXT NOT NULL,
    interpretation_type TEXT NOT NULL,
    criteria JSONB NOT NULL,
    legal_source TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category, term)
);

-- Condition interpretations
CREATE TABLE IF NOT EXISTS condition_interpretations (
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
);

-- Default similarity definitions
INSERT INTO similarity_definitions (category, term, interpretation_type, criteria, notes) VALUES
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
ON CONFLICT (category, term) DO NOTHING;

-- Function to parse quantitative condition
CREATE OR REPLACE FUNCTION parse_quantitative_condition(
    p_condition_text TEXT
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB := '{}'::jsonb;
    v_amount_match TEXT[];
    v_amount DECIMAL;
    v_unit TEXT;
BEGIN
    -- Extract amount
    v_amount_match := regexp_match(p_condition_text, '([0-9,]+(?:\.[0-9]+)?)\s*(מיליון|מליון|אלף|₪|ש"ח|שקל)?', 'i');
    IF v_amount_match IS NOT NULL THEN
        v_amount := replace(v_amount_match[1], ',', '')::decimal;
        IF v_amount_match[2] ~* 'מיליון|מליון' THEN
            v_amount := v_amount * 1000000;
            v_unit := 'מיליון ₪';
        ELSIF v_amount_match[2] ~* 'אלף' THEN
            v_amount := v_amount * 1000;
            v_unit := 'אלף ₪';
        ELSE
            v_unit := '₪';
        END IF;
    END IF;

    -- Identify other units
    IF p_condition_text ~* 'שנ(ה|ים|ות)' THEN v_unit := 'שנים'; END IF;
    IF p_condition_text ~* 'עובד(ים)?' THEN v_unit := 'עובדים'; END IF;
    IF p_condition_text ~* 'פרויקט(ים)?' THEN v_unit := 'פרויקטים'; END IF;

    v_result := jsonb_build_object(
        'amount', v_amount,
        'unit', v_unit,
        'vat_mentioned', p_condition_text ~* 'מע"מ|מעמ|VAT',
        'vat_included', p_condition_text ~* 'כולל מע"מ|כולל מעמ',
        'vat_excluded', p_condition_text ~* '(ללא|לא כולל|לפני)\s*מע"מ',
        'minimum', p_condition_text ~* 'לפחות|מינימום|minimum|min',
        'maximum', p_condition_text ~* 'עד|מקסימום|maximum|max|לכל היותר',
        'execution_words', ARRAY(
            SELECT word FROM unnest(ARRAY['בוצע', 'הושלם', 'סיים', 'מימש', 'ביצע', 'השלים']) as word
            WHERE p_condition_text ~* word
        ),
        'time_period', CASE
            WHEN p_condition_text ~* '3\s*שנ|שלוש\s*שנ' THEN '3_years'
            WHEN p_condition_text ~* '5\s*שנ|חמש\s*שנ' THEN '5_years'
            WHEN p_condition_text ~* 'שנה\s*אחרונה|12\s*חודש' THEN '1_year'
            ELSE NULL
        END
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate dual interpretation
CREATE OR REPLACE FUNCTION generate_dual_interpretation(
    p_condition_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_condition RECORD;
    v_legal JSONB;
    v_technical JSONB;
    v_parsed JSONB;
BEGIN
    SELECT * INTO v_condition FROM tender_conditions WHERE id = p_condition_id;
    v_parsed := parse_quantitative_condition(v_condition.condition_text);

    -- Legal interpretation
    v_legal := jsonb_build_object(
        'type', 'legal',
        'strict_reading', CASE
            WHEN v_condition.condition_text ~* 'בלבד|אך ורק|רק' THEN 'פרשנות צרה - אין גמישות'
            WHEN v_condition.condition_text ~* 'לפחות|מינימום' THEN 'סף מינימלי מחייב'
            WHEN v_condition.condition_text ~* 'יכול|רשאי|ניתן' THEN 'גמישות - לא חובה מוחלטת'
            ELSE 'פרשנות רגילה'
        END,
        'ambiguities', ARRAY(
            SELECT CASE
                WHEN v_condition.condition_text ~* 'דומה|מקביל|דוגמת' THEN 'הגדרת "דומה" לא ברורה'
                WHEN v_condition.condition_text ~* 'ניסיון מוכח' THEN 'הגדרת "מוכח" לא ברורה'
                WHEN v_condition.condition_text ~* 'לשביעות רצון' THEN 'קריטריון סובייקטיבי'
                ELSE NULL
            END
            WHERE 1=1
        ),
        'appeal_potential', CASE
            WHEN v_condition.condition_text ~* 'בלבד|אך ורק' THEN 'low'
            WHEN v_condition.condition_text ~* 'דומה|מקביל' THEN 'high'
            ELSE 'medium'
        END,
        'legal_precedents', '[]'::jsonb
    );

    -- Technical interpretation
    v_technical := jsonb_build_object(
        'type', 'technical',
        'practical_meaning', CASE
            WHEN v_parsed->>'unit' = 'שנים' THEN 'יש להציג ניסיון של ' || (v_parsed->>'amount') || ' שנים לפחות'
            WHEN v_parsed->>'unit' = 'פרויקטים' THEN 'יש להציג ' || (v_parsed->>'amount') || ' פרויקטים רלוונטיים'
            WHEN (v_parsed->>'amount')::decimal > 0 THEN 'יש להציג היקף של ' || (v_parsed->>'amount') || ' ' || (v_parsed->>'unit')
            ELSE 'יש לעמוד בתנאי כמתואר'
        END,
        'verification_options', ARRAY['חשבוניות', 'חוזים חתומים', 'אישורי ביצוע', 'המלצות'],
        'measurement_method', CASE
            WHEN v_parsed->>'vat_included' = 'true' THEN 'כולל מע"מ'
            WHEN v_parsed->>'vat_excluded' = 'true' THEN 'ללא מע"מ'
            ELSE 'יש לברר מול המזמין'
        END,
        'gray_areas', ARRAY(
            SELECT CASE
                WHEN v_condition.condition_text ~* 'דומה' THEN 'הגדרת פרויקט דומה'
                WHEN v_condition.condition_text ~* 'ניסיון' THEN 'חישוב שנות ניסיון'
                WHEN v_condition.condition_text ~* 'מחזור' THEN 'חישוב מחזור - שנה קלנדרית או 12 חודשים?'
                ELSE NULL
            END
            WHERE 1=1
        ),
        'parsed_data', v_parsed
    );

    -- Save interpretations
    INSERT INTO condition_interpretations (condition_id, interpretation_type, interpretation, confidence, risk_level)
    VALUES
        (p_condition_id, 'legal', v_legal->>'strict_reading', 0.8, v_legal->>'appeal_potential'),
        (p_condition_id, 'technical', v_technical->>'practical_meaning', 0.9, 'medium')
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
        'condition_id', p_condition_id,
        'original_text', v_condition.condition_text,
        'legal', v_legal,
        'technical', v_technical,
        'combined_risk', CASE
            WHEN v_legal->>'appeal_potential' = 'high' OR jsonb_array_length(v_technical->'gray_areas') > 1 THEN 'high'
            WHEN v_legal->>'appeal_potential' = 'low' AND jsonb_array_length(v_technical->'gray_areas') = 0 THEN 'low'
            ELSE 'medium'
        END,
        'recommendation', 'יש לוודא עמידה בשתי הפרשנויות. במקרה של ספק - שאלת הבהרה.'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to optimize bid strategy
CREATE OR REPLACE FUNCTION optimize_bid_strategy(
    p_tender_id UUID,
    p_company_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_conditions JSONB;
    v_mandatory_count INTEGER;
    v_scoring_conditions JSONB;
BEGIN
    -- Count mandatory conditions
    SELECT COUNT(*) INTO v_mandatory_count
    FROM tender_conditions WHERE tender_id = p_tender_id AND is_mandatory = true;

    -- Get scoring conditions
    SELECT jsonb_agg(jsonb_build_object(
        'id', tc.id,
        'text', LEFT(tc.condition_text, 100),
        'weight', COALESCE(tc.scoring_weight, 0),
        'type', tc.condition_type
    ) ORDER BY tc.scoring_weight DESC NULLS LAST)
    INTO v_scoring_conditions
    FROM tender_conditions tc
    WHERE tc.tender_id = p_tender_id AND tc.scoring_weight > 0;

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
            jsonb_build_object(
                'priority', 1,
                'area', 'תנאי סף',
                'action', 'וודא עמידה ב-100% של תנאי הסף',
                'impact', 'critical'
            ),
            jsonb_build_object(
                'priority', 2,
                'area', 'ניסיון',
                'action', 'הצג את הפרויקטים הגדולים והרלוונטיים ביותר',
                'impact', 'high'
            ),
            jsonb_build_object(
                'priority', 3,
                'area', 'צוות',
                'action', 'הדגש הסמכות ותארים רלוונטיים',
                'impact', 'medium'
            ),
            jsonb_build_object(
                'priority', 4,
                'area', 'מחיר',
                'action', 'תמחר באמצע השוק או מעט מתחת',
                'impact', 'high'
            )
        ),
        'generated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3.4-3.5: SPECIFICATION & BOQ
-- ============================================

-- Specification items
CREATE TABLE IF NOT EXISTS specification_items (
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
);

-- BOQ items
CREATE TABLE IF NOT EXISTS boq_items (
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
);

-- Spec-BOQ cross references
CREATE TABLE IF NOT EXISTS spec_boq_crossref (
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
);

-- BOQ comparisons
CREATE TABLE IF NOT EXISTS boq_comparisons (
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
);

-- Pricing recommendations
CREATE TABLE IF NOT EXISTS pricing_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID REFERENCES tenders(id),
    boq_item_id UUID REFERENCES boq_items(id),
    recommended_price DECIMAL,
    price_basis TEXT,
    confidence DECIMAL(3,2),
    factors JSONB,
    strategy TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to cross reference spec and BOQ
CREATE OR REPLACE FUNCTION cross_reference_spec_boq(
    p_tender_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_inserted INTEGER := 0;
    v_mismatches INTEGER := 0;
BEGIN
    -- Cross reference items
    INSERT INTO spec_boq_crossref (tender_id, spec_item_id, boq_item_id, match_type, discrepancy_type, discrepancy_details)
    SELECT
        p_tender_id,
        s.id,
        b.id,
        CASE
            WHEN b.id IS NULL THEN 'missing_in_boq'
            WHEN s.id IS NULL THEN 'missing_in_spec'
            WHEN s.item_code = b.item_code AND ABS(COALESCE(s.quantity,0) - COALESCE(b.quantity,0)) < 0.01 THEN 'exact'
            ELSE 'partial'
        END,
        CASE
            WHEN s.quantity IS DISTINCT FROM b.quantity THEN 'quantity'
            WHEN s.unit IS DISTINCT FROM b.unit THEN 'unit'
            WHEN similarity(COALESCE(s.description,''), COALESCE(b.description,'')) < 0.8 THEN 'description'
            ELSE 'none'
        END,
        jsonb_build_object(
            'spec_quantity', s.quantity,
            'boq_quantity', b.quantity,
            'spec_unit', s.unit,
            'boq_unit', b.unit,
            'description_similarity', similarity(COALESCE(s.description,''), COALESCE(b.description,''))
        )
    FROM specification_items s
    FULL OUTER JOIN boq_items b ON
        s.tender_id = b.tender_id AND
        (s.item_code = b.item_code OR similarity(s.description, b.description) > 0.6)
    WHERE (s.tender_id = p_tender_id OR b.tender_id = p_tender_id)
      AND NOT EXISTS (
          SELECT 1 FROM spec_boq_crossref x
          WHERE x.tender_id = p_tender_id
            AND x.spec_item_id IS NOT DISTINCT FROM s.id
            AND x.boq_item_id IS NOT DISTINCT FROM b.id
      );

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    SELECT COUNT(*) INTO v_mismatches
    FROM spec_boq_crossref
    WHERE tender_id = p_tender_id AND match_type != 'exact';

    RETURN jsonb_build_object(
        'tender_id', p_tender_id,
        'items_processed', v_inserted,
        'mismatches_found', v_mismatches,
        'mismatch_details', (
            SELECT jsonb_agg(jsonb_build_object(
                'type', match_type,
                'discrepancy', discrepancy_type,
                'details', discrepancy_details
            ))
            FROM spec_boq_crossref
            WHERE tender_id = p_tender_id AND match_type != 'exact'
            LIMIT 20
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to compare BOQ to historical
CREATE OR REPLACE FUNCTION compare_boq_to_historical(
    p_tender_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_comparisons JSONB;
BEGIN
    -- Delete old comparisons
    DELETE FROM boq_comparisons WHERE tender_id = p_tender_id;

    -- Insert new comparisons
    INSERT INTO boq_comparisons (tender_id, item_code, description, current_price,
                                  avg_historical_price, min_historical_price, max_historical_price,
                                  price_position, comparison_count)
    SELECT
        p_tender_id,
        b.item_code,
        b.description,
        b.unit_price,
        hist.avg_price,
        hist.min_price,
        hist.max_price,
        CASE
            WHEN b.unit_price < hist.avg_price * 0.8 THEN 'below_market'
            WHEN b.unit_price > hist.avg_price * 1.2 THEN 'above_market'
            ELSE 'market_rate'
        END,
        hist.cnt
    FROM boq_items b
    LEFT JOIN LATERAL (
        SELECT
            AVG(b2.unit_price) as avg_price,
            MIN(b2.unit_price) as min_price,
            MAX(b2.unit_price) as max_price,
            COUNT(*) as cnt
        FROM boq_items b2
        JOIN tenders t ON b2.tender_id = t.id
        WHERE (b2.item_code = b.item_code OR similarity(b2.description, b.description) > 0.7)
          AND b2.tender_id != p_tender_id
          AND b2.unit_price > 0
          AND t.created_at > NOW() - INTERVAL '2 years'
    ) hist ON true
    WHERE b.tender_id = p_tender_id AND b.unit_price > 0;

    SELECT jsonb_agg(jsonb_build_object(
        'item_code', item_code,
        'description', LEFT(description, 50),
        'current_price', current_price,
        'avg_historical', avg_historical_price,
        'position', price_position,
        'comparison_count', comparison_count
    ))
    INTO v_comparisons
    FROM boq_comparisons
    WHERE tender_id = p_tender_id;

    RETURN jsonb_build_object(
        'tender_id', p_tender_id,
        'comparisons', COALESCE(v_comparisons, '[]'::jsonb),
        'summary', (
            SELECT jsonb_build_object(
                'below_market', COUNT(*) FILTER (WHERE price_position = 'below_market'),
                'market_rate', COUNT(*) FILTER (WHERE price_position = 'market_rate'),
                'above_market', COUNT(*) FILTER (WHERE price_position = 'above_market'),
                'no_data', COUNT(*) FILTER (WHERE avg_historical_price IS NULL)
            )
            FROM boq_comparisons WHERE tender_id = p_tender_id
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate pricing recommendations
CREATE OR REPLACE FUNCTION generate_pricing_recommendations(
    p_tender_id UUID,
    p_strategy TEXT DEFAULT 'balanced'
) RETURNS JSONB AS $$
DECLARE
    v_multiplier DECIMAL;
    v_recommendations JSONB;
BEGIN
    v_multiplier := CASE p_strategy
        WHEN 'aggressive' THEN 0.85
        WHEN 'balanced' THEN 1.0
        WHEN 'conservative' THEN 1.15
        WHEN 'premium' THEN 1.30
        ELSE 1.0
    END;

    -- Delete old recommendations
    DELETE FROM pricing_recommendations WHERE tender_id = p_tender_id;

    -- Create new recommendations
    INSERT INTO pricing_recommendations (tender_id, boq_item_id, recommended_price, price_basis, confidence, factors, strategy)
    SELECT
        p_tender_id,
        b.id,
        CASE
            WHEN bc.avg_historical_price IS NOT NULL THEN bc.avg_historical_price * v_multiplier
            ELSE b.unit_price * v_multiplier
        END,
        CASE
            WHEN bc.avg_historical_price IS NOT NULL THEN 'historical'
            ELSE 'current'
        END,
        CASE
            WHEN bc.comparison_count >= 5 THEN 0.9
            WHEN bc.comparison_count >= 2 THEN 0.7
            ELSE 0.5
        END,
        jsonb_build_object(
            'historical_avg', bc.avg_historical_price,
            'historical_min', bc.min_historical_price,
            'historical_max', bc.max_historical_price,
            'comparison_count', bc.comparison_count,
            'multiplier_applied', v_multiplier
        ),
        p_strategy
    FROM boq_items b
    LEFT JOIN boq_comparisons bc ON b.tender_id = bc.tender_id AND b.item_code = bc.item_code
    WHERE b.tender_id = p_tender_id;

    SELECT jsonb_agg(jsonb_build_object(
        'item_code', b.item_code,
        'description', LEFT(b.description, 50),
        'current_price', b.unit_price,
        'recommended_price', pr.recommended_price,
        'basis', pr.price_basis,
        'confidence', pr.confidence,
        'change_percent', ROUND(((pr.recommended_price - b.unit_price) / NULLIF(b.unit_price, 0) * 100)::numeric, 1)
    ))
    INTO v_recommendations
    FROM pricing_recommendations pr
    JOIN boq_items b ON pr.boq_item_id = b.id
    WHERE pr.tender_id = p_tender_id;

    RETURN jsonb_build_object(
        'tender_id', p_tender_id,
        'strategy', p_strategy,
        'multiplier', v_multiplier,
        'recommendations', COALESCE(v_recommendations, '[]'::jsonb),
        'total_original', (SELECT SUM(total_price) FROM boq_items WHERE tender_id = p_tender_id),
        'total_recommended', (
            SELECT SUM(pr.recommended_price * b.quantity)
            FROM pricing_recommendations pr
            JOIN boq_items b ON pr.boq_item_id = b.id
            WHERE pr.tender_id = p_tender_id
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4.1-4.4: COMPETITOR INTELLIGENCE
-- ============================================

-- Tender results
CREATE TABLE IF NOT EXISTS tender_results (
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
);

CREATE INDEX IF NOT EXISTS idx_tender_results_number ON tender_results(tender_number);
CREATE INDEX IF NOT EXISTS idx_tender_results_winner ON tender_results(winner_name);

-- Tender bids
CREATE TABLE IF NOT EXISTS tender_bids (
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
);

CREATE INDEX IF NOT EXISTS idx_tender_bids_result ON tender_bids(tender_result_id);
CREATE INDEX IF NOT EXISTS idx_tender_bids_bidder ON tender_bids(bidder_name);

-- Competitor profiles
CREATE TABLE IF NOT EXISTS competitor_profiles (
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
);

CREATE INDEX IF NOT EXISTS idx_competitor_profiles_name ON competitor_profiles(company_name);
CREATE INDEX IF NOT EXISTS idx_competitor_profiles_categories ON competitor_profiles USING GIN(categories);

-- Function to update competitor profile
CREATE OR REPLACE FUNCTION update_competitor_profile(
    p_company_name TEXT,
    p_company_number TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
    v_stats RECORD;
    v_categories TEXT[];
    v_pricing TEXT;
BEGIN
    -- Calculate statistics
    WITH bid_stats AS (
        SELECT
            COUNT(*) as total_bids,
            COUNT(*) FILTER (WHERE bid_rank = 1) as wins,
            AVG(bid_price) as avg_price,
            MIN(bid_price) as min_price,
            MAX(bid_price) as max_price,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY bid_price) as median_price
        FROM tender_bids tb
        WHERE tb.bidder_name = p_company_name
           OR tb.bidder_company_number = p_company_number
    ),
    category_stats AS (
        SELECT ARRAY_AGG(DISTINCT tr.category) as cats
        FROM tender_bids tb
        JOIN tender_results tr ON tb.tender_result_id = tr.id
        WHERE tb.bidder_name = p_company_name
    )
    SELECT
        bs.total_bids, bs.wins, bs.avg_price, bs.min_price, bs.max_price,
        cs.cats,
        CASE
            WHEN bs.avg_price < bs.median_price * 0.9 THEN 'aggressive'
            WHEN bs.avg_price > bs.median_price * 1.1 THEN 'premium'
            ELSE 'balanced'
        END as pricing_type
    INTO v_stats
    FROM bid_stats bs, category_stats cs;

    -- Update or create profile
    INSERT INTO competitor_profiles (
        company_name, company_number,
        total_bids, total_wins, win_rate,
        categories, pricing_behavior,
        typical_bid_size_min, typical_bid_size_max,
        last_activity, updated_at
    )
    VALUES (
        p_company_name, p_company_number,
        v_stats.total_bids, v_stats.wins,
        v_stats.wins::decimal / NULLIF(v_stats.total_bids, 0),
        v_stats.cats, v_stats.pricing_type,
        v_stats.min_price, v_stats.max_price,
        CURRENT_DATE, NOW()
    )
    ON CONFLICT (company_number) DO UPDATE SET
        total_bids = EXCLUDED.total_bids,
        total_wins = EXCLUDED.total_wins,
        win_rate = EXCLUDED.win_rate,
        categories = EXCLUDED.categories,
        pricing_behavior = EXCLUDED.pricing_behavior,
        typical_bid_size_min = EXCLUDED.typical_bid_size_min,
        typical_bid_size_max = EXCLUDED.typical_bid_size_max,
        last_activity = EXCLUDED.last_activity,
        updated_at = NOW()
    RETURNING id INTO v_profile_id;

    RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql;

-- Function to predict competitors
CREATE OR REPLACE FUNCTION predict_competitors(
    p_tender_id UUID,
    p_limit INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
    v_tender RECORD;
    v_predictions JSONB;
BEGIN
    SELECT * INTO v_tender FROM tenders WHERE id = p_tender_id;

    SELECT jsonb_agg(prediction ORDER BY probability DESC)
    INTO v_predictions
    FROM (
        SELECT jsonb_build_object(
            'company_name', cp.company_name,
            'probability',
                CASE
                    WHEN v_tender.category = ANY(cp.categories)
                         AND v_tender.estimated_value BETWEEN cp.typical_bid_size_min AND cp.typical_bid_size_max
                    THEN 0.85
                    WHEN v_tender.category = ANY(cp.categories)
                    THEN 0.60
                    WHEN v_tender.issuing_body = ANY(cp.preferred_clients)
                    THEN 0.50
                    ELSE 0.25
                END,
            'win_rate', cp.win_rate,
            'total_bids', cp.total_bids,
            'pricing_behavior', cp.pricing_behavior,
            'expected_price_range', jsonb_build_object(
                'min', cp.typical_bid_size_min,
                'max', cp.typical_bid_size_max
            ),
            'strengths', cp.strengths,
            'last_activity', cp.last_activity
        ) as prediction
        FROM competitor_profiles cp
        WHERE cp.last_activity > CURRENT_DATE - INTERVAL '18 months'
          AND (
              cp.categories && ARRAY[v_tender.category]
              OR cp.preferred_clients && ARRAY[v_tender.issuing_body]
              OR cp.typical_bid_size_min <= v_tender.estimated_value * 1.5
          )
        ORDER BY
            CASE WHEN v_tender.category = ANY(cp.categories) THEN 0 ELSE 1 END,
            cp.win_rate DESC NULLS LAST
        LIMIT p_limit
    ) sub;

    RETURN jsonb_build_object(
        'tender_id', p_tender_id,
        'tender_name', v_tender.name,
        'category', v_tender.category,
        'estimated_value', v_tender.estimated_value,
        'predicted_competitors', COALESCE(v_predictions, '[]'::jsonb),
        'prediction_confidence', CASE
            WHEN jsonb_array_length(v_predictions) >= 5 THEN 'high'
            WHEN jsonb_array_length(v_predictions) >= 2 THEN 'medium'
            ELSE 'low'
        END,
        'generated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to analyze competition
CREATE OR REPLACE FUNCTION analyze_competition(
    p_tender_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_tender RECORD;
    v_similar_results JSONB;
    v_price_analysis JSONB;
BEGIN
    SELECT * INTO v_tender FROM tenders WHERE id = p_tender_id;

    -- Find similar tender results
    SELECT jsonb_agg(jsonb_build_object(
        'tender_number', tr.tender_number,
        'tender_name', tr.tender_name,
        'winner', tr.winner_name,
        'winning_price', tr.winning_price,
        'num_bidders', tr.num_bidders,
        'result_date', tr.result_date
    ) ORDER BY tr.result_date DESC)
    INTO v_similar_results
    FROM tender_results tr
    WHERE (tr.category = v_tender.category OR tr.issuing_body = v_tender.issuing_body)
      AND tr.result_date > CURRENT_DATE - INTERVAL '2 years'
    LIMIT 10;

    -- Price analysis
    SELECT jsonb_build_object(
        'avg_winning_price', AVG(tr.winning_price),
        'min_winning_price', MIN(tr.winning_price),
        'max_winning_price', MAX(tr.winning_price),
        'avg_bidders', AVG(tr.num_bidders),
        'total_similar_tenders', COUNT(*)
    )
    INTO v_price_analysis
    FROM tender_results tr
    WHERE tr.category = v_tender.category
      AND tr.result_date > CURRENT_DATE - INTERVAL '2 years';

    RETURN jsonb_build_object(
        'tender_id', p_tender_id,
        'similar_results', COALESCE(v_similar_results, '[]'::jsonb),
        'price_analysis', v_price_analysis,
        'market_insights', jsonb_build_object(
            'competition_level', CASE
                WHEN (v_price_analysis->>'avg_bidders')::decimal > 7 THEN 'high'
                WHEN (v_price_analysis->>'avg_bidders')::decimal > 4 THEN 'medium'
                ELSE 'low'
            END,
            'price_sensitivity', CASE
                WHEN (v_price_analysis->>'max_winning_price')::decimal > (v_price_analysis->>'min_winning_price')::decimal * 1.5 THEN 'low'
                ELSE 'high'
            END
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TENDER REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tender_reports (
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
);

CREATE INDEX IF NOT EXISTS idx_tender_reports_tender ON tender_reports(tender_id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all tables
DO $$
DECLARE
    v_tables TEXT[] := ARRAY[
        'source_references',
        'dictionary_categories',
        'dictionary_terms',
        'term_occurrences',
        'accumulation_rules',
        'accumulation_items',
        'gap_closure_options',
        'potential_partners',
        'tender_definitions',
        'document_versions',
        'tender_relations',
        'similarity_definitions',
        'condition_interpretations',
        'specification_items',
        'boq_items',
        'spec_boq_crossref',
        'boq_comparisons',
        'pricing_recommendations',
        'tender_results',
        'tender_bids',
        'competitor_profiles',
        'tender_reports'
    ];
    v_table TEXT;
    v_missing TEXT[] := '{}';
BEGIN
    FOREACH v_table IN ARRAY v_tables LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = v_table) THEN
            v_missing := array_append(v_missing, v_table);
        END IF;
    END LOOP;

    IF array_length(v_missing, 1) > 0 THEN
        RAISE NOTICE 'Missing tables: %', v_missing;
    ELSE
        RAISE NOTICE '✅ All tables created successfully';
    END IF;
END $$;

-- Check all functions
DO $$
DECLARE
    v_functions TEXT[] := ARRAY[
        'save_source_reference',
        'find_or_create_term',
        'search_terms',
        'calculate_accumulation',
        'add_accumulation_item',
        'suggest_gap_closures',
        'extract_definitions',
        'compare_document_versions',
        'find_previous_tender',
        'parse_quantitative_condition',
        'generate_dual_interpretation',
        'optimize_bid_strategy',
        'cross_reference_spec_boq',
        'compare_boq_to_historical',
        'generate_pricing_recommendations',
        'update_competitor_profile',
        'predict_competitors',
        'analyze_competition'
    ];
    v_func TEXT;
    v_missing TEXT[] := '{}';
BEGIN
    FOREACH v_func IN ARRAY v_functions LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = v_func) THEN
            v_missing := array_append(v_missing, v_func);
        END IF;
    END LOOP;

    IF array_length(v_missing, 1) > 0 THEN
        RAISE NOTICE 'Missing functions: %', v_missing;
    ELSE
        RAISE NOTICE '✅ All functions created successfully';
    END IF;
END $$;

SELECT '🎉 Tenderix Database v3.0 Setup Complete!' as status;
