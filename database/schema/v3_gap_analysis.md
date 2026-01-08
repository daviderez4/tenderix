# Tenderix v3 Gap Analysis
## Existing Schema vs v3 Architecture Requirements

Generated: 2026-01-05

---

## Summary

| Area | Existing | v3 Required | Gap |
|------|----------|-------------|-----|
| Core Modules | 1/4 | 4 | **3 missing** |
| P1 Intake | 3/6 | 6 | **3 missing** |
| P2 Gates | 6/12 | 12 | **6 missing** |
| P3 Specs | 4/5 | 5 | **1 missing** |
| P4 Competitors | 0/4 | 4 | **4 missing** |
| **Total** | **14/31** | **31** | **17 gaps** |

---

## Existing Tables (24)

```
activity_log          boq_items             boq_summary
clarification_answers clarification_questions company_profile
contract_analysis     contract_clauses      decision_scenarios
final_decisions       gate_conditions       gate_conditions_summary
hidden_work           notifications         organizations
problematic_gate_conditions                 quality_scoring_model
sow_analysis          tender_documents      tender_full_status
tender_reality_updates tender_structure     tenders
users
```

---

## Detailed Gap Analysis

### CORE MODULES (C1-C4)

| Module | Status | Current | Gap |
|--------|--------|---------|-----|
| C1: Traceability | ⚠️ Partial | `source_document`, `source_page` in gate_conditions | Missing: `source_section`, `source_quote` fields |
| C2: Technical Dictionary | ❌ Missing | - | Need `technical_dictionary` table |
| C3: Accumulation Logic | ❌ Missing | - | Need project-to-condition tracking to prevent double-counting |
| C4: Gap Closure Options | ⚠️ Partial | `remediation_suggestion` field | Missing: structured gap closure options, potential partners |

### P1: TENDER INTAKE (קליטת מכרז)

| Module | Status | Current | Gap |
|--------|--------|---------|-----|
| 1.1 Document Upload | ✅ OK | `tender_documents` table | - |
| 1.1.5 Version Control | ❌ Missing | - | Need `version`, `parent_version_id`, `is_original` |
| 1.2 Metadata Extraction | ✅ OK | `tenders.metadata`, `tender_structure` | - |
| 1.3 Text Normalization | ❌ Missing | - | Need `processed_text` field on documents |
| 1.4 Definitions | ❌ Missing | - | Need `tender_definitions` table |
| 1.5 Category | ⚠️ Partial | - | Need `category` field on tenders |
| 1.6 Previous Tender | ❌ Missing | - | Need `previous_tender_id`, comparison fields |

### P2: GATE CONDITIONS (תנאי סף)

| Module | Status | Current | Gap |
|--------|--------|---------|-----|
| 2.0 Company Profile | ⚠️ Partial | `company_profile` (basic) | Missing: `company_projects`, `company_personnel`, `company_certifications` tables |
| 2.1 Gate Extraction | ✅ OK | `gate_conditions` table | - |
| 2.2 Quantitative Decomposition | ❌ Missing | - | Need `required_amount`, `required_count`, `required_years` |
| 2.3 Entity Type | ❌ Missing | - | Need `entity_type`, `can_rely_on_subcontractor` |
| 2.4 "Similar" Interpretation | ❌ Missing | - | Need interpretation tracking |
| 2.5 Dual Interpretation | ❌ Missing | - | Need `is_dual_interpretation` flag |
| 2.6 Profile Comparison | ✅ OK | `company_evidence` field | - |
| 2.6.5 Optimization | ❌ Missing | - | Need gate vs score optimization |
| 2.7 Clarifications | ✅ OK | `clarification_questions`, `clarification_answers` | - |
| 2.7.5 Strategic Questions | ⚠️ Partial | - | Need `strategic_purpose`, `expected_impact` |
| 2.7.6 Others' Questions | ❌ Missing | - | Need `from_previous_tender` flag |
| 2.8 Document List | ❌ Missing | - | Need required documents tracking |
| 2.9 Evaluation | ✅ OK | `gate_conditions_summary` | - |
| 2.10 Re-analysis | ❌ Missing | - | Need analysis versioning |

### P3: SPECS & BOQ (מפרט)

| Module | Status | Current | Gap |
|--------|--------|---------|-----|
| 3.1 Tech Specs | ❌ Missing | - | Need `spec_items` table |
| 3.2 BOQ Analysis | ✅ OK | `boq_items`, `boq_summary` | - |
| 3.3 Scope of Work | ✅ OK | `sow_analysis` | - |
| 3.4 Exceptions | ✅ OK | `hidden_work`, `contract_clauses` | - |
| 3.4.5 Similar Comparison | ❌ Missing | - | Need similar tender comparison |
| 3.5 Pricing Risks | ✅ OK | `risk_level` in boq_items | - |

### P4: COMPETITORS (מתחרים)

| Module | Status | Current | Gap |
|--------|--------|---------|-----|
| 4.1 Winning Bids | ❌ Missing | - | Need `competitor_bids` table |
| 4.2 Competitor Mapping | ❌ Missing | - | Need `competitors` table |
| 4.3 Pricing Analysis | ❌ Missing | - | Need pricing history |
| 4.4 Competitive Intel | ❌ Missing | - | Need `tender_competitors` table |

### OUTPUT

| Module | Status | Current | Gap |
|--------|--------|---------|-----|
| GO/NO-GO Report | ✅ OK | `final_decisions` table | - |

---

## Priority Migrations

### HIGH PRIORITY (Core Functionality)

1. **Company Projects Table** - Required for gate condition matching
2. **Technical Dictionary** - Required for term interpretation
3. **Tender Definitions** - Required for accurate analysis
4. **Document Version Control** - Required for clarification tracking

### MEDIUM PRIORITY (Enhanced Analysis)

5. **Competitors Tables** - For P4 competitive analysis
6. **Spec Items Table** - For P3 technical specifications
7. **Gate Condition Enhancements** - Quantitative fields, entity types

### LOW PRIORITY (Polish)

8. **Traceability Enhancements** - source_section, source_quote
9. **Strategic Questions** - purpose, impact fields
10. **Similar Tender Comparison** - cross-tender analysis

---

## Recommended Migration Order

```
Migration 002: company_projects, company_personnel, company_certifications
Migration 003: technical_dictionary, tender_definitions
Migration 004: tender_documents version control columns
Migration 005: gate_conditions enhancement columns
Migration 006: competitors, competitor_bids, tender_competitors
Migration 007: spec_items table
Migration 008: traceability enhancement columns
```
