import { getSupabaseAdmin, corsHeaders } from "../_shared/supabase-client.ts";
import { callClaude } from "../_shared/ai-client.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const { tender_id, profile_type } = await req.json();
    // profile_type: "passing" | "failing" | "partial"

    if (!tender_id) {
      return new Response(
        JSON.stringify({ error: "tender_id is required" }),
        { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }

    const supabase = getSupabaseAdmin();

    // Fetch tender and conditions
    const [{ data: tender }, { data: conditions }] = await Promise.all([
      supabase.from("tenders").select("*").eq("id", tender_id).single(),
      supabase
        .from("gate_conditions")
        .select("*")
        .eq("tender_id", tender_id)
        .order("condition_number"),
    ]);

    if (!tender) {
      return new Response(
        JSON.stringify({ error: "Tender not found" }),
        { status: 404, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }

    if (!conditions?.length) {
      return new Response(
        JSON.stringify({ error: "No gate conditions found" }),
        { status: 404, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }

    const type = profile_type || "passing";

    const conditionsList = conditions
      .map(
        (c) =>
          `תנאי #${c.condition_number}: ${c.condition_text}
  סוג: ${c.condition_type} | חובה: ${c.is_mandatory ? "כן" : "לא"}
  סכום: ${c.required_amount ? `${(c.required_amount / 1000000).toFixed(1)}M ₪` : "N/A"}
  כמות: ${c.required_count || "N/A"} | שנים: ${c.required_years || "N/A"}`
      )
      .join("\n\n");

    const profileInstruction =
      type === "passing"
        ? `צור חברה שעומדת ב-100% מתנאי הסף. לכל תנאי סף - ודא שיש נתון תואם בפרופיל.
כל פרויקט, הסמכה, ואיש מפתח חייבים להיות רלוונטיים ומתאימים.
המחזורים הפיננסיים חייבים לעמוד בדרישות.`
        : type === "failing"
          ? `צור חברה מתחום אחר לגמרי (בנייה, כבישים, תשתיות) שלא עומדת ברוב תנאי הסף.
הפרויקטים צריכים להיות מתחום הבנייה/תשתיות, לא מצלמות/אבטחה.
ההסמכות צריכות להיות של תחום בנייה (ISO 9001 כן, אבל לא אבטחת מידע).
אנשי המפתח צריכים להיות מהנדסי בניין, לא אבטחה.`
          : `צור חברה שעומדת בחלק מתנאי הסף (כ-60%) אבל לא בכולם.
למשל - יש הסמכות מתאימות אבל פרויקטים קטנים מדי, או מחזור נמוך.
צריכה להיות חברה שיכולה להשתפר/להשלים.`;

    const systemPrompt = `אתה מומחה ליצירת פרופילי חברות פיקטיביים ריאליסטיים לצורך הדגמה של מערכת ניתוח מכרזים.

## משימה
צור פרופיל חברה פיקטיבית ישראלית מלא ומפורט.

${profileInstruction}

## הנחיות חשובות
- שם חברה ישראלי ריאליסטי (לא "חברת בדיקה")
- ח.פ. פיקטיבי תקין (XX-XXXXXXX-X)
- פרויקטים עם שמות ריאליסטיים, לקוחות אמיתיים (עיריות, משרדים)
- הסמכות עם מספרים ותאריכים
- אנשי מפתח עם שמות ישראליים, תפקידים, השכלה, ניסיון
- 3 שנות נתונים פיננסיים
- כל הסכומים בש"ח

ענה ב-JSON בלבד:
{
  "organization": {
    "name": "שם חברה בע\"מ",
    "company_number": "51-234567-8",
    "founding_year": 2005,
    "address": "כתובת",
    "phone": "03-1234567",
    "email": "info@company.co.il"
  },
  "financials": [
    { "fiscal_year": 2024, "annual_revenue": 50000000, "net_profit": 5000000, "employee_count": 100, "audited": true }
  ],
  "certifications": [
    { "cert_type": "ISO|LICENSE|SECURITY_CLEARANCE|INSURANCE|TAX|REGISTRATION", "cert_name": "שם", "cert_number": "מספר", "issuing_body": "גוף מנפיק", "valid_from": "2023-01-01", "valid_until": "2026-01-01" }
  ],
  "personnel": [
    { "full_name": "שם מלא", "role": "תפקיד", "department": "מחלקה", "education": "השכלה", "years_experience": 15, "professional_certifications": ["PMP", "אחר"] }
  ],
  "projects": [
    { "project_name": "שם פרויקט", "client_name": "לקוח", "client_type": "GOVERNMENT|MUNICIPAL|DEFENSE|PRIVATE", "start_date": "2022-01-01", "end_date": "2023-06-30", "total_value": 20000000, "category": "מצלמות אבטחה", "role_type": "PRIMARY|SUBCONTRACTOR", "project_type": "ESTABLISHMENT|MAINTENANCE|COMBINED" }
  ]
}`;

    const userMessage = `## מכרז
שם: ${tender.tender_name}
גוף מזמין: ${tender.issuing_body || "לא צוין"}
קטגוריה: ${tender.category || "COMBINED"}
היקף: ${tender.estimated_value ? `${(tender.estimated_value / 1000000).toFixed(0)}M ₪` : "לא צוין"}

## תנאי סף (${conditions.length})
${conditionsList}

## סוג חברה לייצור: ${type === "passing" ? "עומדת בכל התנאים" : type === "failing" ? "לא עומדת (מתחום אחר)" : "עומדת חלקית"}

צור פרופיל חברה פיקטיבי מלא שתואם את ההנחיות.`;

    const response = await callClaude(systemPrompt, [{ role: "user", content: userMessage }], {
      maxTokens: 8192,
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response");

    const profile = JSON.parse(jsonMatch[0]);

    // Save to DB
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .insert({
        name: profile.organization.name,
        company_number: profile.organization.company_number || null,
        founding_year: profile.organization.founding_year || null,
        address: profile.organization.address || null,
        phone: profile.organization.phone || null,
        email: profile.organization.email || null,
      })
      .select("id")
      .single();

    if (orgErr) throw orgErr;

    // Insert financials
    if (profile.financials?.length > 0) {
      await supabase.from("company_financials").insert(
        profile.financials.map((f: Record<string, unknown>) => ({
          org_id: org.id,
          fiscal_year: f.fiscal_year,
          annual_revenue: f.annual_revenue,
          net_profit: f.net_profit || null,
          employee_count: f.employee_count || null,
          audited: f.audited !== false,
        }))
      );
    }

    // Insert certifications
    if (profile.certifications?.length > 0) {
      await supabase.from("company_certifications").insert(
        profile.certifications.map((c: Record<string, unknown>) => ({
          org_id: org.id,
          cert_type: c.cert_type || "ISO",
          cert_name: c.cert_name,
          cert_number: c.cert_number || null,
          issuing_body: c.issuing_body || null,
          valid_from: c.valid_from || null,
          valid_until: c.valid_until || null,
        }))
      );
    }

    // Insert personnel
    if (profile.personnel?.length > 0) {
      await supabase.from("company_personnel").insert(
        profile.personnel.map((p: Record<string, unknown>) => ({
          org_id: org.id,
          full_name: p.full_name,
          role: p.role || null,
          department: p.department || null,
          education: p.education || null,
          years_experience: p.years_experience || null,
          professional_certifications: p.professional_certifications || [],
        }))
      );
    }

    // Insert projects
    if (profile.projects?.length > 0) {
      await supabase.from("company_projects").insert(
        profile.projects.map((p: Record<string, unknown>) => ({
          org_id: org.id,
          project_name: p.project_name,
          client_name: p.client_name || null,
          client_type: p.client_type || "PRIVATE",
          start_date: p.start_date || null,
          end_date: p.end_date || null,
          total_value: p.total_value || null,
          category: p.category || null,
          role_type: p.role_type || "PRIMARY",
          project_type: p.project_type || "ESTABLISHMENT",
        }))
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        org_id: org.id,
        org_name: profile.organization.name,
        profile_type: type,
        profile,
      }),
      { headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-company error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      }
    );
  }
});
