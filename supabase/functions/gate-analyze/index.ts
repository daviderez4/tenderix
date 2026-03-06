import { getSupabaseAdmin, corsHeaders } from "../_shared/supabase-client.ts";
import { callClaude } from "../_shared/ai-client.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const { tender_id, org_id } = await req.json();
    if (!tender_id || !org_id) {
      return new Response(
        JSON.stringify({ error: "tender_id and org_id are required" }),
        { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch gate conditions for this tender
    const { data: conditions, error: condErr } = await supabase
      .from("gate_conditions")
      .select("*")
      .eq("tender_id", tender_id)
      .order("condition_number");

    if (condErr) throw condErr;
    if (!conditions?.length) {
      return new Response(
        JSON.stringify({ error: "No gate conditions found for this tender" }),
        { status: 404, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch company profile data in parallel
    const [
      { data: org },
      { data: financials },
      { data: certifications },
      { data: projects },
      { data: personnel },
    ] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", org_id).single(),
      supabase.from("company_financials").select("*").eq("org_id", org_id).order("fiscal_year", { ascending: false }),
      supabase.from("company_certifications").select("*").eq("org_id", org_id),
      supabase.from("company_projects").select("*").eq("org_id", org_id),
      supabase.from("company_personnel").select("*").eq("org_id", org_id),
    ]);

    if (!org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch tender info for context
    const { data: tender } = await supabase
      .from("tenders")
      .select("*")
      .eq("id", tender_id)
      .single();

    // 4. Build company profile summary for AI
    const companyProfile = buildCompanyProfile(org, financials || [], certifications || [], projects || [], personnel || []);

    // 5. Analyze each gate condition
    const results = [];
    for (const condition of conditions) {
      const analysis = await analyzeGateCondition(condition, companyProfile, tender);
      results.push(analysis);

      // Save result to DB
      await supabase
        .from("gate_conditions")
        .update({
          status: analysis.status,
          company_evidence: analysis.evidence,
          gap_description: analysis.gap_description,
          closure_options: analysis.closure_options,
          ai_summary: analysis.ai_summary,
          ai_confidence: analysis.ai_confidence,
          ai_analyzed_at: new Date().toISOString(),
        })
        .eq("id", condition.id);
    }

    // 6. Generate summary
    const summary = generateSummary(tender_id, org_id, conditions, results);

    // Upsert summary
    await supabase
      .from("gate_conditions_summary")
      .upsert({
        tender_id,
        org_id,
        ...summary,
        updated_at: new Date().toISOString(),
      }, { onConflict: "tender_id,org_id" });

    return new Response(
      JSON.stringify({
        success: true,
        tender_id,
        org_id,
        org_name: org.name,
        conditions: results,
        summary,
      }),
      { headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("gate-analyze error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }
});

// ─── Company Profile Builder ─────────────────────────────

interface CompanyProfile {
  name: string;
  founding_year: number;
  financials: Array<{ year: number; revenue: number; profit: number; employees: number }>;
  certifications: Array<{ type: string; name: string; valid_until: string; issuing_body: string }>;
  projects: Array<{
    name: string;
    client: string;
    client_type: string;
    value: number;
    category: string;
    project_type: string;
    start_date: string;
    end_date: string;
    role_type: string;
    location: string;
    technologies: Record<string, unknown>;
    quantities: Record<string, unknown>;
    site_count: number;
  }>;
  personnel: Array<{ name: string; role: string; experience_years: number; education: string; certifications: string[] }>;
  summary_text: string;
}

function buildCompanyProfile(
  org: Record<string, unknown>,
  financials: Record<string, unknown>[],
  certifications: Record<string, unknown>[],
  projects: Record<string, unknown>[],
  personnel: Record<string, unknown>[]
): CompanyProfile {
  const profile: CompanyProfile = {
    name: org.name as string,
    founding_year: org.founding_year as number,
    financials: financials.map((f) => ({
      year: f.fiscal_year as number,
      revenue: f.annual_revenue as number,
      profit: f.net_profit as number,
      employees: f.employee_count as number,
    })),
    certifications: certifications.map((c) => ({
      type: c.cert_type as string,
      name: c.cert_name as string,
      valid_until: c.valid_until as string,
      issuing_body: c.issuing_body as string,
    })),
    projects: projects.map((p) => ({
      name: p.project_name as string,
      client: p.client_name as string,
      client_type: p.client_type as string || "",
      value: p.total_value as number,
      category: p.category as string || "",
      project_type: p.project_type as string || "",
      start_date: p.start_date as string || "",
      end_date: p.end_date as string || "",
      role_type: p.role_type as string || "PRIMARY",
      location: p.location as string || "",
      technologies: (p.technologies as Record<string, unknown>) || {},
      quantities: (p.quantities as Record<string, unknown>) || {},
      site_count: p.site_count as number || 0,
    })),
    personnel: personnel.map((p) => ({
      name: p.full_name as string,
      role: p.role as string,
      experience_years: p.years_experience as number || 0,
      education: p.education as string || "",
      certifications: (p.professional_certifications as string[]) || [],
    })),
    summary_text: "",
  };

  // Build text summary
  const avgRevenue = profile.financials.length > 0
    ? profile.financials.reduce((sum, f) => sum + f.revenue, 0) / profile.financials.length
    : 0;

  profile.summary_text = `
Company: ${profile.name}
Founded: ${profile.founding_year}
Average Annual Revenue (last ${profile.financials.length} years): ${(avgRevenue / 1000000).toFixed(1)}M ILS
Employees: ${profile.financials[0]?.employees || "N/A"}
Active Certifications: ${profile.certifications.map((c) => c.name).join(", ")}
Project Portfolio (${profile.projects.length} projects):
${profile.projects.map((p) => `  - ${p.name} | Client: ${p.client} (${p.client_type}) | Value: ${(p.value / 1000000).toFixed(1)}M | Category: ${p.category} | Type: ${p.project_type}`).join("\n")}
Key Personnel (${profile.personnel.length}):
${profile.personnel.slice(0, 5).map((p) => `  - ${p.name} | ${p.role} | ${p.experience_years}y exp | ${p.certifications.join(", ")}`).join("\n")}
  `.trim();

  return profile;
}

// ─── Gate Condition Analyzer ─────────────────────────────

interface AnalysisResult {
  condition_id: string;
  condition_number: string;
  condition_text: string;
  status: "MEETS" | "PARTIALLY_MEETS" | "DOES_NOT_MEET";
  evidence: string;
  gap_description: string | null;
  closure_options: string[];
  ai_summary: string;
  ai_confidence: number;
}

async function analyzeGateCondition(
  condition: Record<string, unknown>,
  profile: CompanyProfile,
  tender: Record<string, unknown> | null
): Promise<AnalysisResult> {
  const systemPrompt = `You are an expert Israeli public tender eligibility analyst (מומחה זכאות במכרזים ציבוריים).
Your job is to determine if a company meets a specific gate condition (תנאי סף) based on the company's profile data.

CRITICAL RULES:
1. Be STRICT and PRECISE. A gate condition must be met EXACTLY as specified.
2. If a tender requires "municipal camera system projects" - construction or transportation projects do NOT count.
3. If a tender requires specific certifications - similar but different certifications do NOT count.
4. Match the EXACT requirement: project type, scope, client type, financial thresholds, time periods.
5. When comparing project types to requirements, analyze the SUBSTANCE of what was done, not just the name.
6. A transportation project is NOT a camera/security project even if it might have had some cameras.
7. A construction project is NOT a technology/systems project.

You MUST respond in valid JSON with this exact structure:
{
  "status": "MEETS" | "PARTIALLY_MEETS" | "DOES_NOT_MEET",
  "evidence": "Hebrew text explaining what evidence from the company profile supports or contradicts meeting this condition",
  "gap_description": "Hebrew text explaining the gap if status is not MEETS, or null if MEETS",
  "closure_options": ["Hebrew suggestions for how to close the gap"],
  "ai_summary": "Hebrew one-line summary of the analysis",
  "confidence": 0.0 to 1.0
}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;

  const userMessage = `
## Tender Information
Tender: ${tender?.tender_name || "Unknown"}
Issuing Body: ${tender?.issuing_body || "Unknown"}
Category: ${tender?.category || "General"}

## Gate Condition to Analyze
Condition #${condition.condition_number}: ${condition.condition_text}
Type: ${condition.condition_type} | Mandatory: ${condition.is_mandatory}
Requirement Type: ${condition.requirement_type || "Not specified"}
Required Amount: ${condition.required_amount || "N/A"} ${condition.amount_currency || ""}
Required Count: ${condition.required_count || "N/A"}
Required Years: ${condition.required_years || "N/A"}

## Company Profile
${profile.summary_text}

Analyze if this company meets this specific gate condition. Be precise and strict.`;

  try {
    const response = await callClaude(systemPrompt, [{ role: "user", content: userMessage }]);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      condition_id: condition.id as string,
      condition_number: condition.condition_number as string,
      condition_text: condition.condition_text as string,
      status: parsed.status || "DOES_NOT_MEET",
      evidence: parsed.evidence || "",
      gap_description: parsed.gap_description || null,
      closure_options: parsed.closure_options || [],
      ai_summary: parsed.ai_summary || "",
      ai_confidence: parsed.confidence || 0.5,
    };
  } catch (err) {
    console.error(`AI analysis failed for condition ${condition.condition_number}:`, err);
    return {
      condition_id: condition.id as string,
      condition_number: condition.condition_number as string,
      condition_text: condition.condition_text as string,
      status: "DOES_NOT_MEET",
      evidence: `שגיאה בניתוח: ${err.message}`,
      gap_description: "לא ניתן היה לנתח את התנאי. נדרשת בדיקה ידנית.",
      closure_options: ["בדיקה ידנית של התנאי"],
      ai_summary: "שגיאה בניתוח AI",
      ai_confidence: 0,
    };
  }
}

// ─── Summary Generator ─────────────────────────────

function generateSummary(
  tenderId: string,
  orgId: string,
  conditions: Record<string, unknown>[],
  results: AnalysisResult[]
) {
  const total = results.length;
  const meets = results.filter((r) => r.status === "MEETS").length;
  const partial = results.filter((r) => r.status === "PARTIALLY_MEETS").length;
  const doesNot = results.filter((r) => r.status === "DOES_NOT_MEET").length;

  const mandatoryConditions = conditions.filter((c) => c.is_mandatory);
  const mandatoryResults = results.filter((r) => {
    const cond = conditions.find((c) => (c.id as string) === r.condition_id);
    return cond?.is_mandatory;
  });
  const mandatoryMet = mandatoryResults.filter((r) => r.status === "MEETS").length;
  const mandatoryTotal = mandatoryConditions.length;

  const blockingConditions = results
    .filter((r) => {
      const cond = conditions.find((c) => (c.id as string) === r.condition_id);
      return cond?.is_mandatory && r.status === "DOES_NOT_MEET";
    })
    .map((r) => `תנאי ${r.condition_number}: ${r.condition_text.substring(0, 80)}...`);

  let eligibility: string;
  if (mandatoryMet === mandatoryTotal && doesNot === 0) {
    eligibility = "ELIGIBLE";
  } else if (blockingConditions.length === 0 && partial > 0) {
    eligibility = "PARTIALLY_ELIGIBLE";
  } else {
    eligibility = "NOT_ELIGIBLE";
  }

  const recommendations: string[] = [];
  if (eligibility === "ELIGIBLE") {
    recommendations.push("החברה עומדת בכל תנאי הסף - מומלץ להגיש הצעה");
  } else if (eligibility === "PARTIALLY_ELIGIBLE") {
    recommendations.push("יש תנאים שנדרשת השלמה - יש לבדוק אפשרות לשותף או קבלן משנה");
  } else {
    recommendations.push("החברה לא עומדת בתנאי סף מהותיים - מומלץ לבדוק אפשרות שותפות או לוותר על המכרז");
    if (blockingConditions.length > 0) {
      recommendations.push(`תנאים חוסמים: ${blockingConditions.length} מתוך ${mandatoryTotal}`);
    }
  }

  const avgConfidence = results.reduce((sum, r) => sum + r.ai_confidence, 0) / total;

  return {
    tender_id: tenderId,
    org_id: orgId,
    total_conditions: total,
    mandatory_count: mandatoryTotal,
    meets_count: meets,
    partially_meets_count: partial,
    does_not_meet_count: doesNot,
    overall_eligibility: eligibility,
    blocking_conditions: blockingConditions,
    recommendations,
    avg_confidence: Math.round(avgConfidence * 100) / 100,
    go_recommendation: eligibility === "ELIGIBLE" ? "GO" : eligibility === "PARTIALLY_ELIGIBLE" ? "CONDITIONAL" : "NO_GO",
  };
}
