/**
 * Definition-Aware Matching Engine
 * מנוע התאמה מבוסס הגדרות מכרז
 *
 * Core engine that:
 * 1. Extracts definitions from tender documents
 * 2. Links definitions to gate conditions
 * 3. Classifies projects semantically against definitions
 * 4. Generates detailed explanations
 * 5. Detects adversarial/misleading profiles
 * 6. Generates test profiles (passing/failing/adversarial)
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

import {
  DEFINITION_EXTRACTION_SYSTEM_PROMPT,
  EXTRACT_DEFINITIONS_PROMPT,
  LINK_DEFINITIONS_TO_GATES_PROMPT,
  CLASSIFY_PROJECT_AGAINST_DEFINITION_PROMPT,
  GENERATE_MATCH_EXPLANATION_PROMPT,
  GENERATE_TEST_PROFILE_PROMPT
} from './prompts-definition-extraction.js';

import {
  SEMANTIC_MATCHING_SYSTEM_PROMPT,
  FULL_SEMANTIC_MATCHING_PROMPT,
  QUICK_CLASSIFY_PROJECT_PROMPT,
  BATCH_CLASSIFY_PROJECTS_PROMPT,
  DEFINITION_CLARIFICATION_PROMPT
} from './prompts-semantic-matching.js';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const CLAUDE_MODEL_COMPLEX = 'claude-opus-4-5-20251101';

/**
 * Extract JSON from Claude response text
 */
function extractJson(text) {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch (e) { /* continue */ }
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch (e) { /* continue */ }
  }
  throw new Error('No valid JSON found in response');
}

/**
 * Call Claude API
 */
async function callClaude(anthropic, systemPrompt, userPrompt, model = CLAUDE_MODEL, maxTokens = 8000) {
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  });
  return response.content[0].text;
}

// ============================================
// 1. DEFINITION EXTRACTION
// ============================================

/**
 * Extract all definitions from a tender document
 * @param {Anthropic} anthropic - Anthropic client
 * @param {string} documentText - Full tender document text
 * @param {Array} gateConditions - Existing gate conditions (optional)
 * @returns {Object} Extracted definitions
 */
export async function extractDefinitions(anthropic, documentText, gateConditions = []) {
  const gateConditionsText = gateConditions.length > 0
    ? gateConditions.map((g, i) => `${i + 1}. [${g.condition_number || ''}] ${g.condition_text}`).join('\n')
    : 'לא זוהו עדיין';

  const prompt = EXTRACT_DEFINITIONS_PROMPT
    .replace('{document_text}', documentText.substring(0, 30000))
    .replace('{gate_conditions_text}', gateConditionsText);

  const response = await callClaude(
    anthropic,
    DEFINITION_EXTRACTION_SYSTEM_PROMPT,
    prompt,
    CLAUDE_MODEL_COMPLEX,
    12000
  );

  return extractJson(response);
}

/**
 * Save extracted definitions to database
 */
export async function saveDefinitions(supabase, tenderId, definitions) {
  const results = [];

  for (const def of definitions.definitions || []) {
    const record = {
      tender_id: tenderId,
      term: def.term,
      definition: def.definition_text,
      constraints: JSON.stringify(def.structured_constraints || {}),
      interpretation_type: def.interpretation_type || 'NEUTRAL',
      interpretation_notes: def.notes,
      definition_category: def.category,
      includes_examples: def.includes || [],
      excludes_examples: def.excludes || [],
      equivalent_terms: def.equivalent_terms || [],
      structured_constraints: def.structured_constraints || {},
      source_page: def.source?.page,
      source_section: def.source?.section,
      source_quote: def.source?.quote
    };

    const { data, error } = await supabase
      .from('tender_definitions')
      .upsert(record, { onConflict: 'tender_id,term' })
      .select()
      .single();

    if (error) {
      console.error(`Error saving definition '${def.term}':`, error);
      results.push({ term: def.term, error: error.message });
    } else {
      results.push({ term: def.term, id: data.id, saved: true });
    }
  }

  return results;
}

// ============================================
// 2. LINK DEFINITIONS TO GATE CONDITIONS
// ============================================

/**
 * Link definitions to gate conditions and resolve requirements
 */
export async function linkDefinitionsToGates(anthropic, definitions, gateConditions) {
  const prompt = LINK_DEFINITIONS_TO_GATES_PROMPT
    .replace('{definitions_json}', JSON.stringify(definitions, null, 2))
    .replace('{gate_conditions_json}', JSON.stringify(gateConditions, null, 2));

  const response = await callClaude(
    anthropic,
    DEFINITION_EXTRACTION_SYSTEM_PROMPT,
    prompt,
    CLAUDE_MODEL,
    8000
  );

  return extractJson(response);
}

/**
 * Save linked definitions to gate conditions
 */
export async function saveLinkedDefinitions(supabase, linkedConditions) {
  const results = [];

  for (const cond of linkedConditions.resolved_conditions || []) {
    if (!cond.condition_id) continue;

    const { error } = await supabase
      .from('gate_conditions')
      .update({
        linked_definition_ids: cond.linked_definition_ids || [],
        resolved_requirement: cond.resolved_requirement || {}
      })
      .eq('id', cond.condition_id);

    if (error) {
      results.push({ condition_id: cond.condition_id, error: error.message });
    } else {
      results.push({ condition_id: cond.condition_id, updated: true });
    }
  }

  return results;
}

// ============================================
// 3. SEMANTIC PROJECT CLASSIFICATION
// ============================================

/**
 * Classify a single project against a tender definition
 */
export async function classifyProjectAgainstDefinition(anthropic, definition, project) {
  const prompt = CLASSIFY_PROJECT_AGAINST_DEFINITION_PROMPT
    .replace('{definition_term}', definition.term || '')
    .replace('{definition_text}', definition.definition || definition.definition_text || '')
    .replace('{definition_includes}', JSON.stringify(definition.includes || definition.includes_examples || []))
    .replace('{definition_excludes}', JSON.stringify(definition.excludes || definition.excludes_examples || []))
    .replace('{definition_constraints}', JSON.stringify(definition.structured_constraints || {}))
    .replace('{project_name}', project.project_name || '')
    .replace('{project_description}', project.description || project.sla_details || '')
    .replace('{client_name}', project.client_name || '')
    .replace('{client_type}', project.client_type || '')
    .replace('{project_category}', project.category || '')
    .replace('{project_technologies}', JSON.stringify(project.technologies || {}))
    .replace('{project_value}', String(project.total_value || 0))
    .replace('{currency}', project.currency || 'ILS')
    .replace('{start_date}', project.start_date || '')
    .replace('{end_date}', project.end_date || '')
    .replace('{project_type}', project.project_type || '');

  const response = await callClaude(
    anthropic,
    SEMANTIC_MATCHING_SYSTEM_PROMPT,
    prompt,
    CLAUDE_MODEL,
    4000
  );

  return extractJson(response);
}

/**
 * Batch classify all projects against all definitions
 */
export async function batchClassifyProjects(anthropic, definitions, projects) {
  const defSummary = (definitions.definitions || definitions || []).map(d => ({
    term: d.term,
    definition: d.definition || d.definition_text,
    includes: d.includes || d.includes_examples || [],
    excludes: d.excludes || d.excludes_examples || []
  }));

  const projectSummary = projects.map(p => ({
    id: p.id,
    name: p.project_name,
    client: p.client_name,
    client_type: p.client_type,
    category: p.category,
    type: p.project_type,
    value: p.total_value,
    start: p.start_date,
    end: p.end_date,
    technologies: p.technologies,
    description: p.sla_details || p.description || ''
  }));

  const prompt = BATCH_CLASSIFY_PROJECTS_PROMPT
    .replace('{definitions}', JSON.stringify(defSummary, null, 2))
    .replace('{projects}', JSON.stringify(projectSummary, null, 2));

  const response = await callClaude(
    anthropic,
    SEMANTIC_MATCHING_SYSTEM_PROMPT,
    prompt,
    CLAUDE_MODEL,
    8000
  );

  return extractJson(response);
}

// ============================================
// 4. FULL SEMANTIC GATE MATCHING
// ============================================

/**
 * Perform full semantic gate matching
 * This is the main function that replaces keyword-based matching
 */
export async function performSemanticMatching(anthropic, supabase, tenderId, orgId) {
  // Step 1: Load all required data
  const [
    { data: gateConditions },
    { data: definitions },
    { data: projects },
    { data: financials },
    { data: certifications },
    { data: personnel }
  ] = await Promise.all([
    supabase.from('gate_conditions').select('*').eq('tender_id', tenderId).order('condition_number'),
    supabase.from('tender_definitions').select('*').eq('tender_id', tenderId),
    supabase.from('company_projects').select('*').eq('org_id', orgId).order('end_date', { ascending: false }),
    supabase.from('company_financials').select('*').eq('org_id', orgId).order('fiscal_year', { ascending: false }),
    supabase.from('company_certifications').select('*').eq('org_id', orgId),
    supabase.from('company_personnel').select('*').eq('org_id', orgId)
  ]);

  // Step 2: If no definitions yet, extract them first
  let currentDefinitions = definitions || [];
  if (currentDefinitions.length === 0) {
    // Try to get tender document text
    const { data: docs } = await supabase
      .from('tender_documents')
      .select('processed_text, ocr_text')
      .eq('tender_id', tenderId)
      .limit(1);

    if (docs && docs.length > 0) {
      const docText = docs[0].processed_text || docs[0].ocr_text || '';
      if (docText.length > 100) {
        const extracted = await extractDefinitions(anthropic, docText, gateConditions);
        await saveDefinitions(supabase, tenderId, extracted);
        currentDefinitions = extracted.definitions || [];
      }
    }
  }

  // Step 3: Perform semantic matching via AI
  const prompt = FULL_SEMANTIC_MATCHING_PROMPT
    .replace('{definitions}', JSON.stringify(currentDefinitions, null, 2))
    .replace('{gate_conditions}', JSON.stringify(
      (gateConditions || []).map(g => ({
        id: g.id,
        number: g.condition_number,
        text: g.condition_text,
        type: g.condition_type,
        is_mandatory: g.is_mandatory,
        required_amount: g.required_amount,
        required_count: g.required_count,
        required_years: g.required_years,
        resolved_requirement: g.resolved_requirement
      })),
      null, 2
    ))
    .replace('{projects}', JSON.stringify(
      (projects || []).map(p => ({
        id: p.id,
        name: p.project_name,
        client: p.client_name,
        client_type: p.client_type,
        start_date: p.start_date,
        end_date: p.end_date,
        total_value: p.total_value,
        type: p.project_type,
        category: p.category,
        technologies: p.technologies,
        role_type: p.role_type,
        role_percentage: p.role_percentage,
        description: p.sla_details || '',
        is_tangent: p.is_tangent
      })),
      null, 2
    ))
    .replace('{financials}', JSON.stringify(financials || [], null, 2))
    .replace('{certifications}', JSON.stringify(
      (certifications || []).map(c => ({
        id: c.id,
        type: c.cert_type,
        name: c.cert_name,
        issuing_body: c.issuing_body,
        valid_from: c.valid_from,
        valid_until: c.valid_until
      })),
      null, 2
    ))
    .replace('{personnel}', JSON.stringify(
      (personnel || []).map(p => ({
        id: p.id,
        name: p.full_name,
        role: p.role,
        education: p.education,
        years_experience: p.years_experience,
        certifications: p.professional_certifications
      })),
      null, 2
    ));

  const response = await callClaude(
    anthropic,
    SEMANTIC_MATCHING_SYSTEM_PROMPT,
    prompt,
    CLAUDE_MODEL_COMPLEX,
    16000
  );

  const matchingResult = extractJson(response);

  // Step 4: Save results to database
  await saveMatchingResults(supabase, tenderId, orgId, matchingResult, gateConditions);

  return matchingResult;
}

/**
 * Save matching results to database
 */
async function saveMatchingResults(supabase, tenderId, orgId, matchingResult, gateConditions) {
  const conditionMap = {};
  (gateConditions || []).forEach(g => { conditionMap[g.condition_number] = g.id; });

  // Update each gate condition status
  for (const result of matchingResult.matching_results || []) {
    const condId = result.condition_id || conditionMap[result.condition_number];
    if (!condId) continue;

    // Update gate condition status
    await supabase
      .from('gate_conditions')
      .update({
        status: result.status,
        company_evidence: result.explanation_hebrew,
        gap_description: result.gap_analysis?.gap_description,
        confidence_score: Math.round((result.confidence || 0) * 100),
        remediation_suggestion: result.gap_analysis?.closure_options?.[0]?.description
      })
      .eq('id', condId);

    // Save detailed explanation
    const explanation = {
      gate_condition_id: condId,
      tender_id: tenderId,
      org_id: orgId,
      definition_term: result.definition_used?.term,
      definition_text: result.definition_used?.text,
      overall_status: result.status,
      required_count: result.required_count,
      matching_count: result.matching_count,
      project_analyses: result.matching_assets || [],
      gap_description: result.gap_analysis?.gap_description,
      gap_closure_options: result.gap_analysis?.closure_options || [],
      restrictive_result: result.matching_assets?.[0]?.dual_interpretation?.restrictive || {},
      expansive_result: result.matching_assets?.[0]?.dual_interpretation?.expansive || {},
      explanation_markdown: result.explanation_hebrew
    };

    await supabase
      .from('gate_match_explanations')
      .upsert(explanation, { onConflict: 'gate_condition_id,org_id' });

    // Save individual matches
    for (const asset of result.matching_assets || []) {
      if (asset.asset_type === 'PROJECT' && asset.asset_id) {
        await supabase
          .from('gate_condition_matches')
          .upsert({
            gate_condition_id: condId,
            project_id: asset.asset_id,
            match_status: asset.match_status,
            match_confidence: Math.round((asset.confidence || result.confidence || 0) * 100),
            match_justification: asset.overall_reasoning,
            classification_reasoning: asset.overall_reasoning,
            definition_match_score: Math.round((asset.confidence || 0) * 100),
            adversarial_flags: asset.adversarial_flags || [],
            restrictive_interpretation: asset.dual_interpretation?.restrictive || {},
            expansive_interpretation: asset.dual_interpretation?.expansive || {}
          }, { onConflict: 'gate_condition_id,project_id' });
      }
    }
  }

  // Update summary
  const summary = matchingResult.overall_summary;
  if (summary) {
    await supabase
      .from('gate_conditions_summary')
      .upsert({
        tender_id: tenderId,
        total_conditions: summary.total_conditions,
        mandatory_count: summary.mandatory_count,
        meets_count: summary.meets_count,
        partially_meets_count: summary.partially_meets_count,
        does_not_meet_count: summary.does_not_meet_count,
        unknown_count: summary.unknown_count,
        overall_eligibility: summary.overall_eligibility,
        blocking_conditions: summary.blocking_conditions || [],
        recommendations: summary.recommended_actions || []
      }, { onConflict: 'tender_id' });
  }

  return { saved: true };
}

// ============================================
// 5. EXPLANATION GENERATION
// ============================================

/**
 * Generate a detailed explanation for a single gate condition match
 */
export async function generateMatchExplanation(anthropic, condition, definitions, projects, financials, certifications, personnel) {
  const relevantDefs = (definitions || [])
    .filter(d => condition.linked_definition_ids?.includes(d.id) || true)
    .map(d => `• ${d.term}: ${d.definition}`);

  const prompt = GENERATE_MATCH_EXPLANATION_PROMPT
    .replace('{condition_text}', condition.condition_text)
    .replace('{definitions}', relevantDefs.join('\n') || 'אין הגדרות')
    .replace('{resolved_requirement}', JSON.stringify(condition.resolved_requirement || {}))
    .replace('{project_classifications}', JSON.stringify(projects || []))
    .replace('{financial_data}', JSON.stringify(financials || []))
    .replace('{certifications}', JSON.stringify(certifications || []))
    .replace('{personnel}', JSON.stringify(personnel || []));

  const response = await callClaude(
    anthropic,
    SEMANTIC_MATCHING_SYSTEM_PROMPT,
    prompt,
    CLAUDE_MODEL,
    6000
  );

  return extractJson(response);
}

// ============================================
// 6. TEST PROFILE GENERATION
// ============================================

/**
 * Generate a test company profile based on tender requirements
 * @param {string} profileType - 'PASSING', 'FAILING', or 'ADVERSARIAL'
 */
export async function generateTestProfile(anthropic, gateConditions, definitions, profileType) {
  const prompt = GENERATE_TEST_PROFILE_PROMPT
    .replace('{gate_conditions}', JSON.stringify(
      gateConditions.map(g => ({
        number: g.condition_number,
        text: g.condition_text,
        type: g.condition_type,
        is_mandatory: g.is_mandatory,
        required_amount: g.required_amount,
        required_count: g.required_count,
        required_years: g.required_years,
        resolved: g.resolved_requirement
      })),
      null, 2
    ))
    .replace('{definitions}', JSON.stringify(definitions || [], null, 2))
    .replace('{profile_type}', profileType);

  const response = await callClaude(
    anthropic,
    DEFINITION_EXTRACTION_SYSTEM_PROMPT,
    prompt,
    CLAUDE_MODEL_COMPLEX,
    12000
  );

  return extractJson(response);
}

/**
 * Save a generated test profile to database
 */
export async function saveGeneratedProfile(supabase, tenderId, profile, profileType) {
  const record = {
    tender_id: tenderId,
    profile_type: profileType,
    profile_name: profile.profile_name || `פרופיל ${profileType}`,
    company_data: profile.company_data || {},
    generated_projects: profile.projects || [],
    generated_financials: profile.financials || [],
    generated_certifications: profile.certifications || [],
    generated_personnel: profile.personnel || [],
    expected_result: profile.expected_results || {},
    adversarial_tricks: profile.adversarial_tricks || []
  };

  const { data, error } = await supabase
    .from('generated_profiles')
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Load a generated profile into the company tables (as temp org)
 * and run matching against it
 */
export async function testGeneratedProfile(anthropic, supabase, tenderId, profileId) {
  // Load the profile
  const { data: profile, error } = await supabase
    .from('generated_profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error) throw error;

  // Create a temporary organization
  const { data: org } = await supabase
    .from('organizations')
    .insert({
      name: profile.profile_name + ' (בדיקה)',
      company_number: 'TEST-' + Date.now(),
      settings: { is_test: true, source_profile_id: profileId }
    })
    .select()
    .single();

  const tempOrgId = org.id;

  try {
    // Insert generated projects
    for (const proj of profile.generated_projects || []) {
      await supabase.from('company_projects').insert({
        org_id: tempOrgId,
        project_name: proj.project_name,
        client_name: proj.client_name,
        client_type: proj.client_type,
        start_date: proj.start_date,
        end_date: proj.end_date,
        total_value: proj.total_value,
        project_type: proj.project_type,
        category: proj.category,
        technologies: proj.technologies || {},
        role_type: proj.role_type || 'PRIMARY',
        role_percentage: 100
      });
    }

    // Insert generated financials
    for (const fin of profile.generated_financials || []) {
      await supabase.from('company_financials').insert({
        org_id: tempOrgId,
        fiscal_year: fin.fiscal_year,
        annual_revenue: fin.annual_revenue,
        net_profit: fin.net_profit,
        employee_count: fin.employee_count,
        audited: fin.audited || false
      });
    }

    // Insert generated certifications
    for (const cert of profile.generated_certifications || []) {
      await supabase.from('company_certifications').insert({
        org_id: tempOrgId,
        cert_type: cert.cert_type,
        cert_name: cert.cert_name,
        issuing_body: cert.issuing_body,
        valid_from: cert.valid_from,
        valid_until: cert.valid_until
      });
    }

    // Insert generated personnel
    for (const person of profile.generated_personnel || []) {
      await supabase.from('company_personnel').insert({
        org_id: tempOrgId,
        full_name: person.full_name,
        role: person.role,
        education: person.education,
        years_experience: person.years_experience,
        professional_certifications: person.professional_certifications || []
      });
    }

    // Run semantic matching
    const matchResult = await performSemanticMatching(anthropic, supabase, tenderId, tempOrgId);

    // Compare with expected results
    const expected = profile.expected_result;
    const actual = matchResult.overall_summary;

    const testPassed = expected.overall_eligibility === actual.overall_eligibility;

    // Update the profile with test results
    await supabase
      .from('generated_profiles')
      .update({
        test_run_at: new Date().toISOString(),
        test_result: {
          actual_eligibility: actual.overall_eligibility,
          expected_eligibility: expected.overall_eligibility,
          matching_results: matchResult.matching_results,
          overall_summary: actual
        },
        test_passed: testPassed
      })
      .eq('id', profileId);

    return {
      profile_id: profileId,
      profile_type: profile.profile_type,
      expected: expected.overall_eligibility,
      actual: actual.overall_eligibility,
      test_passed: testPassed,
      details: matchResult
    };

  } finally {
    // Cleanup: Delete temporary data
    await supabase.from('company_projects').delete().eq('org_id', tempOrgId);
    await supabase.from('company_financials').delete().eq('org_id', tempOrgId);
    await supabase.from('company_certifications').delete().eq('org_id', tempOrgId);
    await supabase.from('company_personnel').delete().eq('org_id', tempOrgId);
    await supabase.from('organizations').delete().eq('id', tempOrgId);
  }
}

// ============================================
// 7. CLARIFICATION QUESTION GENERATION
// ============================================

/**
 * Generate clarification questions for undefined terms
 */
export async function generateDefinitionClarifications(anthropic, undefinedTerms, conditionsContext, companyProfile) {
  const prompt = DEFINITION_CLARIFICATION_PROMPT
    .replace('{undefined_terms}', JSON.stringify(undefinedTerms, null, 2))
    .replace('{conditions_context}', JSON.stringify(conditionsContext, null, 2))
    .replace('{company_profile_summary}', JSON.stringify(companyProfile || {}, null, 2));

  const response = await callClaude(
    anthropic,
    DEFINITION_EXTRACTION_SYSTEM_PROMPT,
    prompt,
    CLAUDE_MODEL,
    4000
  );

  return extractJson(response);
}
