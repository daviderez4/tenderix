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

    // 5. Analyze ALL conditions in one call for better cross-condition optimization
    const results = await analyzeAllConditions(conditions, companyProfile, tender);

    // 6. Save results to DB
    for (const result of results) {
      await supabase
        .from("gate_conditions")
        .update({
          status: result.status,
          company_evidence: result.evidence,
          gap_description: result.gap_description,
          closure_options: result.closure_options,
          ai_summary: result.ai_summary,
          ai_confidence: result.ai_confidence,
          ai_analyzed_at: new Date().toISOString(),
        })
        .eq("id", result.condition_id);
    }

    // 7. Generate summary
    const summary = generateSummary(tender_id, org_id, conditions, results);

    // Save summary - delete old one first, then insert new
    await supabase
      .from("gate_conditions_summary")
      .delete()
      .eq("tender_id", tender_id)
      .eq("org_id", org_id);

    await supabase
      .from("gate_conditions_summary")
      .insert({
        tender_id,
        org_id,
        ...summary,
        updated_at: new Date().toISOString(),
      });

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

  // Build detailed text summary
  const avgRevenue = profile.financials.length > 0
    ? profile.financials.reduce((sum, f) => sum + f.revenue, 0) / profile.financials.length
    : 0;

  profile.summary_text = `
=== COMPANY PROFILE ===
Company: ${profile.name}
Founded: ${profile.founding_year}
Average Annual Revenue (last ${profile.financials.length} years): ${(avgRevenue / 1000000).toFixed(1)}M ILS
Revenue by Year: ${profile.financials.map((f) => `${f.year}: ${(f.revenue / 1000000).toFixed(1)}M`).join(", ")}
Employees (latest): ${profile.financials[0]?.employees || "N/A"}

=== CERTIFICATIONS (${profile.certifications.length}) ===
${profile.certifications.map((c) => `- ${c.name} | ${c.type} | Valid until: ${c.valid_until} | Issued by: ${c.issuing_body}`).join("\n")}

=== PROJECT PORTFOLIO (${profile.projects.length} projects) ===
${profile.projects.map((p, i) => `
Project ${i + 1}: ${p.name}
  Client: ${p.client} (${p.client_type})
  Value: ${(p.value / 1000000).toFixed(1)}M ILS
  Category: ${p.category} | Type: ${p.project_type}
  Period: ${p.start_date} to ${p.end_date}
  Role: ${p.role_type} (${p.role_type === "SUBCONTRACTOR" ? "subcontractor" : "primary"})
  Location: ${p.location} | Sites: ${p.site_count}
  Technologies: ${JSON.stringify(p.technologies)}
  Quantities: ${JSON.stringify(p.quantities)}
`).join("")}

=== KEY PERSONNEL (${profile.personnel.length}) ===
${profile.personnel.map((p) => `- ${p.name} | ${p.role} | ${p.experience_years}y exp | ${p.education} | Certs: ${p.certifications.join(", ")}`).join("\n")}
  `.trim();

  return profile;
}

// ─── Analyze ALL Conditions at Once ─────────────────────────────

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

async function analyzeAllConditions(
  conditions: Record<string, unknown>[],
  profile: CompanyProfile,
  tender: Record<string, unknown> | null
): Promise<AnalysisResult[]> {
  const systemPrompt = `אתה מומחה בכיר לניתוח מכרזים ציבוריים בישראל. תפקידך לנתח האם חברה עומדת בתנאי סף של מכרז.

## עקרונות ליבה (חובה לעקוב!)

### עקרון 1: עקיבות מלאה (Traceability)
כל קביעה שלך חייבת להתבסס על נתוני פרופיל ספציפיים. ציין בדיוק:
- שם הפרויקט/הסמכה/אדם שעליו אתה מסתמך
- המספרים המדויקים (היקף, כמויות, שנות ניסיון)
- למה זה תואם או לא תואם את הדרישה

### עקרון 2: מילון טכני - פרשנות לפי יכולות
- מצלמת תנועה ≠ מצלמת אבטחה עירונית
- פרויקט בנייה ≠ פרויקט טכנולוגיה/מערכות
- פרויקט כבישים ≠ פרויקט מצלמות גם אם יש רמזורים
- פרש לפי מהות העבודה, לא לפי שם הפרויקט

### עקרון 3: לוגיקת הצטברות נכונה
- פרויקט לא נספר פעמיים לאותה דרישה
- סכומים לא מצטרפים אם מאותו פרויקט
- תאריכים נבדקים לפי הגדרת המכרז

### עקרון 4: מסלולי סגירת פערים
כשיש פער (PARTIALLY_MEETS או DOES_NOT_MEET), הצע פתרונות מעשיים:
- 🤝 קבלן משנה - אם המכרז מתיר הסתמכות
- 👥 שותפות/קונסורציום
- 📄 מסמך חלופי/משלים
- 🛠️ פיתוח/התאמה (אם המכרז מאפשר)
- 📝 שאלת הבהרה למזמין
- ⛔ חוסם - אין פתרון ריאלי

## חשוב מאוד:
- היה מדויק וקפדני. תנאי סף חייב להתקיים בדיוק כפי שנדרש
- אם חברת בנייה/תשתיות מגישה למכרז מצלמות - היא כנראה לא עומדת בתנאים הטכניים
- פרויקט כבישים/רכבת קלה הוא לא פרויקט מצלמות אבטחה!
- הסמכת PMP בבנייה ≠ ניסיון בניהול פרויקטי אבטחה

ענה ב-JSON בלבד, בפורמט הבא (מערך של אובייקטים, אחד לכל תנאי):
[
  {
    "condition_number": "1",
    "status": "MEETS" | "PARTIALLY_MEETS" | "DOES_NOT_MEET",
    "evidence": "טקסט בעברית - ראיות ספציפיות מהפרופיל. ציין שמות פרויקטים, מספרים מדויקים",
    "gap_description": "טקסט בעברית - תיאור הפער אם לא עומד, או null אם עומד",
    "closure_options": ["אפשרות סגירה 1", "אפשרות סגירה 2"],
    "ai_summary": "משפט אחד בעברית - סיכום הניתוח",
    "confidence": 0.0-1.0
  }
]

ענה אך ורק ב-JSON תקין. ללא markdown, ללא הסברים מחוץ ל-JSON.`;

  const conditionsList = conditions.map((c) =>
    `תנאי #${c.condition_number}: ${c.condition_text}
    סוג: ${c.condition_type} | חובה: ${c.is_mandatory ? "כן" : "לא (יתרון)"}
    סוג דרישה: ${c.requirement_type || "לא צוין"}
    סכום נדרש: ${c.required_amount ? `${(c.required_amount as number / 1000000).toFixed(1)}M ₪` : "N/A"}
    כמות נדרשת: ${c.required_count || "N/A"}
    שנים נדרשות: ${c.required_years || "N/A"}
    מקור: סעיף ${c.source_section || "N/A"}`
  ).join("\n\n");

  const userMessage = `## מכרז
שם: ${tender?.tender_name || "Unknown"}
גוף מזמין: ${tender?.issuing_body || "Unknown"}
קטגוריה: ${tender?.category || "General"}
היקף משוער: ${tender?.estimated_value ? `${((tender.estimated_value as number) / 1000000).toFixed(0)}M ₪` : "N/A"}

## רשימת תנאי סף לניתוח (${conditions.length} תנאים)
${conditionsList}

## פרופיל חברה
${profile.summary_text}

נתח כל תנאי סף בנפרד. היה מדויק, קפדני, והצע פתרונות מעשיים לסגירת פערים.`;

  try {
    const response = await callClaude(systemPrompt, [{ role: "user", content: userMessage }], { maxTokens: 8192 });

    const parsed = parseJsonFromAI(response);

    return conditions.map((condition) => {
      const condNum = condition.condition_number as string;
      const analysis = parsed.find((a: Record<string, unknown>) =>
        String(a.condition_number) === condNum
      );

      if (!analysis) {
        return {
          condition_id: condition.id as string,
          condition_number: condNum,
          condition_text: condition.condition_text as string,
          status: "DOES_NOT_MEET" as const,
          evidence: "לא נותח - התנאי לא נכלל בתשובת ה-AI",
          gap_description: "נדרשת בדיקה ידנית",
          closure_options: ["בדיקה ידנית"],
          ai_summary: "לא נותח",
          ai_confidence: 0,
        };
      }

      return {
        condition_id: condition.id as string,
        condition_number: condNum,
        condition_text: condition.condition_text as string,
        status: analysis.status || "DOES_NOT_MEET",
        evidence: analysis.evidence || "",
        gap_description: analysis.gap_description || null,
        closure_options: analysis.closure_options || [],
        ai_summary: analysis.ai_summary || "",
        ai_confidence: analysis.confidence || 0.5,
      };
    });
  } catch (batchErr) {
    console.error("Batch analysis failed, falling back to per-condition analysis:", batchErr);
    // Fallback: analyze each condition individually
    return await analyzeConditionsOneByOne(conditions, profile, tender);
  }
}

// ─── Robust JSON Parser ─────────────────────────────

function parseJsonFromAI(raw: string): Record<string, unknown>[] {
  // 1. Strip markdown code fences
  let cleaned = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

  // 2. Try to extract JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) cleaned = arrayMatch[0];

  // 3. Fix common AI JSON mistakes
  // Remove trailing commas before ] or }
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
  // Fix unescaped newlines inside strings (replace actual newlines between quotes)
  cleaned = cleaned.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, "\\n");
  // Remove control characters
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (ch) => ch === "\n" || ch === "\r" || ch === "\t" ? ch : "");

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    throw new Error("Parsed result is not an array");
  } catch (e1) {
    // 4. Last resort: try to extract individual JSON objects
    console.error("JSON parse attempt failed:", e1);
    const objects: Record<string, unknown>[] = [];
    const objRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    let match;
    while ((match = objRegex.exec(cleaned)) !== null) {
      try {
        const obj = JSON.parse(match[0]);
        if (obj.condition_number) objects.push(obj);
      } catch {
        // skip malformed object
      }
    }
    if (objects.length > 0) return objects;
    throw new Error(`Failed to parse AI JSON response: ${e1.message}. Raw (first 300 chars): ${raw.substring(0, 300)}`);
  }
}

// ─── Per-Condition Fallback Analyzer ─────────────────────────────

async function analyzeConditionsOneByOne(
  conditions: Record<string, unknown>[],
  profile: CompanyProfile,
  tender: Record<string, unknown> | null
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];

  for (const condition of conditions) {
    try {
      const singleResult = await analyzeSingleCondition(condition, profile, tender);
      results.push(singleResult);
    } catch (err) {
      console.error(`Failed to analyze condition ${condition.condition_number}:`, err);
      results.push({
        condition_id: condition.id as string,
        condition_number: condition.condition_number as string,
        condition_text: condition.condition_text as string,
        status: "DOES_NOT_MEET" as const,
        evidence: `שגיאה בניתוח תנאי זה: ${err.message}`,
        gap_description: "לא ניתן היה לנתח. נדרשת בדיקה ידנית.",
        closure_options: ["בדיקה ידנית של התנאי"],
        ai_summary: "שגיאה בניתוח",
        ai_confidence: 0,
      });
    }
  }

  return results;
}

async function analyzeSingleCondition(
  condition: Record<string, unknown>,
  profile: CompanyProfile,
  tender: Record<string, unknown> | null
): Promise<AnalysisResult> {
  const systemPrompt = `אתה מומחה לניתוח מכרזים. נתח האם חברה עומדת בתנאי סף אחד.

ענה אך ורק ב-JSON תקין (ללא markdown, ללא backticks). הפורמט:
{
  "status": "MEETS" | "PARTIALLY_MEETS" | "DOES_NOT_MEET",
  "evidence": "ראיות ספציפיות מנתוני החברה",
  "gap_description": "תיאור הפער (או null אם עומד)",
  "closure_options": ["אפשרות סגירה 1"],
  "ai_summary": "משפט סיכום אחד",
  "confidence": 0.85
}`;

  const userMessage = `## תנאי סף
${condition.condition_text}
סוג: ${condition.condition_type} | חובה: ${condition.is_mandatory ? "כן" : "לא"}
סכום נדרש: ${condition.required_amount ? `${(condition.required_amount as number / 1000000).toFixed(1)}M ₪` : "N/A"}
כמות נדרשת: ${condition.required_count || "N/A"}
שנים נדרשות: ${condition.required_years || "N/A"}

## מכרז
${tender?.tender_name || "Unknown"} | ${tender?.issuing_body || "Unknown"}

## פרופיל חברה
${profile.summary_text}`;

  const response = await callClaude(systemPrompt, [{ role: "user", content: userMessage }], { maxTokens: 2048 });

  // Parse single object
  let cleaned = response.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) cleaned = objMatch[0];
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  const analysis = JSON.parse(cleaned);

  return {
    condition_id: condition.id as string,
    condition_number: condition.condition_number as string,
    condition_text: condition.condition_text as string,
    status: analysis.status || "DOES_NOT_MEET",
    evidence: analysis.evidence || "",
    gap_description: analysis.gap_description || null,
    closure_options: analysis.closure_options || [],
    ai_summary: analysis.ai_summary || "",
    ai_confidence: analysis.confidence || 0.5,
  };
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
  const mandatoryFails = mandatoryResults.filter((r) => r.status === "DOES_NOT_MEET");
  const mandatoryTotal = mandatoryConditions.length;

  const blockingConditions = mandatoryFails.map((r) =>
    `תנאי ${r.condition_number}: ${r.condition_text.substring(0, 80)}...`
  );

  let eligibility: string;
  if (mandatoryFails.length === 0 && doesNot === 0) {
    eligibility = "ELIGIBLE";
  } else if (mandatoryFails.length === 0 && partial > 0) {
    eligibility = "PARTIALLY_ELIGIBLE";
  } else {
    eligibility = "NOT_ELIGIBLE";
  }

  const recommendations: string[] = [];

  // Closure-focused recommendations
  const closableGaps = results.filter(
    (r) => r.status !== "MEETS" && r.closure_options.length > 0 && !r.closure_options.includes("בדיקה ידנית")
  );

  if (eligibility === "ELIGIBLE") {
    recommendations.push("החברה עומדת בכל תנאי הסף - מומלץ להגיש הצעה");
    if (partial > 0) {
      recommendations.push(`${partial} תנאים עומדים חלקית - מומלץ לחזק את הראיות`);
    }
  } else if (eligibility === "PARTIALLY_ELIGIBLE") {
    recommendations.push("יש תנאים שנדרשת השלמה - אך אין תנאי חובה חוסם");
    if (closableGaps.length > 0) {
      recommendations.push(`${closableGaps.length} פערים ניתנים לסגירה - ראה פתרונות מוצעים`);
    }
  } else {
    recommendations.push(`${mandatoryFails.length} תנאי חובה חוסמים מתוך ${mandatoryTotal}`);

    const hasClosable = mandatoryFails.some(
      (r) => r.closure_options.length > 0 && !r.closure_options.some((o) => o.includes("חוסם"))
    );

    if (hasClosable) {
      recommendations.push("חלק מהפערים ניתנים לסגירה דרך שותפות או קבלן משנה");
    }

    const totalBlockers = mandatoryFails.filter(
      (r) => r.closure_options.some((o) => o.includes("חוסם") || o.includes("אין פתרון"))
    ).length;

    if (totalBlockers > 0) {
      recommendations.push(`${totalBlockers} תנאים חוסמים ללא פתרון - מומלץ לשקול ויתור על המכרז`);
    } else {
      recommendations.push("כל הפערים ניתנים פוטנציאלית לסגירה - מומלץ לבחון שותפות");
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
