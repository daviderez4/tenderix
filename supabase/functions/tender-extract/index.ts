import { getSupabaseAdmin, corsHeaders } from "../_shared/supabase-client.ts";
import { callClaude } from "../_shared/ai-client.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const { text, org_id } = await req.json();
    if (!text || !text.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "נא להדביק טקסט של מכרז" }),
        { status: 400, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
      );
    }

    // Truncate to prevent rate limits
    const trimmedText = text.trim().slice(0, 50000);

    // Call Claude to extract tender details and gate conditions
    const systemPrompt = `אתה מומחה בכיר לניתוח מכרזים ציבוריים בישראל.
תפקידך לחלץ מטקסט של מכרז את כל הפרטים המהותיים ואת תנאי הסף.

## הוראות חילוץ

### פרטי מכרז
חלץ את הפרטים הבאים מהטקסט:
- שם המכרז
- מספר מכרז
- גורם מזמין (עירייה, משרד ממשלתי וכו')
- מועד הגשה (YYYY-MM-DD)
- אומדן/שווי משוער (מספר בש"ח)
- קטגוריה (VIDEO/COMMUNICATION/SOFTWARE/ACCESS_CONTROL/COMBINED)
- משך חוזה בחודשים
- ערבות בנקאית (מספר בש"ח)

### תנאי סף
חלץ את כל תנאי הסף, כולל:
- מספור (לפי סדר הופעה)
- טקסט מלא של התנאי
- סוג: GATE (תנאי סף חובה) או ADVANTAGE (יתרון)
- האם חובה (true/false)
- סוג דרישה: CAPABILITY (יכולת כללית) או EXECUTION (ניסיון ביצוע)
- סעיף מקור במסמך

## חשוב
- חלץ את הטקסט המלא של כל תנאי, לא לקצר
- זהה נכון יתרונות (עדיפות/יתרון) מול תנאי סף (חובה)
- אם יש מספרים (סכומים, כמויות, שנים) - ציין אותם

ענה ב-JSON בלבד בפורמט:
{
  "tender": {
    "tender_name": "string",
    "tender_number": "string or null",
    "issuing_body": "string or null",
    "submission_deadline": "YYYY-MM-DD or null",
    "estimated_value": number_or_null,
    "category": "VIDEO|COMMUNICATION|SOFTWARE|ACCESS_CONTROL|COMBINED",
    "contract_duration_months": number_or_null,
    "guarantee_amount": number_or_null
  },
  "conditions": [
    {
      "condition_number": "1",
      "condition_text": "הטקסט המלא של התנאי",
      "condition_type": "GATE|ADVANTAGE",
      "is_mandatory": true,
      "requirement_type": "CAPABILITY|EXECUTION",
      "source_section": "2.1"
    }
  ]
}

ענה אך ורק ב-JSON תקין. ללא markdown, ללא הסברים מחוץ ל-JSON.`;

    const response = await callClaude(
      systemPrompt,
      [{ role: "user", content: `חלץ פרטי מכרז ותנאי סף מהטקסט הבא:\n\n${trimmedText}` }],
      { maxTokens: 8192 }
    );

    // Parse JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response as JSON");

    const extracted = JSON.parse(jsonMatch[0]);

    // Optionally save directly to DB
    if (org_id) {
      const supabase = getSupabaseAdmin();

      // Create tender
      const { data: tender, error: tenderErr } = await supabase
        .from("tenders")
        .insert({
          tender_name: extracted.tender.tender_name || "מכרז חדש",
          tender_number: extracted.tender.tender_number || null,
          issuing_body: extracted.tender.issuing_body || null,
          submission_deadline: extracted.tender.submission_deadline || null,
          estimated_value: extracted.tender.estimated_value || null,
          category: extracted.tender.category || "COMBINED",
          contract_duration_months: extracted.tender.contract_duration_months || null,
          guarantee_amount: extracted.tender.guarantee_amount || null,
          org_id,
          status: "ACTIVE",
          current_step: "GATES",
          go_nogo_decision: "PENDING",
        })
        .select("id")
        .single();

      if (tenderErr) throw tenderErr;

      // Create gate conditions
      const conditionsToInsert = (extracted.conditions || []).map(
        (c: Record<string, unknown>, i: number) => ({
          tender_id: tender.id,
          condition_number: c.condition_number || String(i + 1),
          condition_text: c.condition_text,
          condition_type: c.condition_type || "GATE",
          is_mandatory: c.is_mandatory !== false,
          requirement_type: c.requirement_type || "CAPABILITY",
          source_section: c.source_section || null,
          status: "UNKNOWN",
        })
      );

      if (conditionsToInsert.length > 0) {
        const { error: condErr } = await supabase
          .from("gate_conditions")
          .insert(conditionsToInsert);
        if (condErr) throw condErr;
      }

      // Create summary
      await supabase.from("gate_conditions_summary").insert({
        tender_id: tender.id,
        total_conditions: conditionsToInsert.length,
        mandatory_count: conditionsToInsert.filter(
          (c: Record<string, unknown>) => c.is_mandatory
        ).length,
        meets_count: 0,
        partially_meets_count: 0,
        does_not_meet_count: 0,
        unknown_count: conditionsToInsert.length,
        overall_eligibility: "UNKNOWN",
      });

      return new Response(
        JSON.stringify({
          success: true,
          saved: true,
          tender_id: tender.id,
          extracted,
        }),
        {
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        }
      );
    }

    // Return extracted data without saving
    return new Response(
      JSON.stringify({
        success: true,
        saved: false,
        extracted,
      }),
      { headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("tender-extract error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      }
    );
  }
});
