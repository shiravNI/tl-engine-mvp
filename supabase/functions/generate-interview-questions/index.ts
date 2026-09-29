// Supabase Edge Function: generate-interview-questions
//
// The linkedin-voice-setup skill is explicit: "CRITICAL: Generate all
// questions dynamically based on their specific industry, role, and
// seniority. Never use generic questions that don't fit their world."
// This is that instruction, for real: takes what the person actually said
// about their role/industry and goal, and has Claude write real SAT-round
// multiple-choice questions for THEIR field — not "AI in performance
// marketing" for someone in veterinary supply chains.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-sonnet-5";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

const QUESTION_SCHEMA = `{
  "questions": [
    {
      "id": string (short slug, e.g. "ai_impact", unique within the array),
      "topicArea": string (one of: "ai_and_tech", "industry_problems", "what_makes_great", "career_ambition", "audience_pain_points"),
      "prompt": string (the multiple-choice question stem, ends with an em-dash or colon the way a SAT-style stem does, specific to their real field — not a generic template),
      "options": [{ "id": "a"|"b"|"c"|"d", "label": string (short, tappable, specific to their field) }] (3-4 options),
      "followUpPrompt": string (a natural "say more / why?" follow-up specific to this question)
    }
  ]
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

  try {
    if (!ANTHROPIC_API_KEY) {
      return json({ error: "ANTHROPIC_API_KEY is not configured on this project yet." }, 503);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: "Invalid session" }, 401);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const identityAnswer = typeof body.identityAnswer === "string" ? body.identityAnswer.trim() : "";
    const goalAnswer = typeof body.goalAnswer === "string" ? body.goalAnswer.trim() : "";
    const orientation = body.orientation === "audience_sales" ? "audience_sales" : "personal_brand";

    if (!identityAnswer) {
      return json({ error: "Need your identity answer first to personalize these." }, 422);
    }

    const isSocialSeller = orientation === "audience_sales";
    const topicAreas = isSocialSeller
      ? "ai_and_tech, industry_problems, what_makes_great, career_ambition, and audience_pain_points (this last one matters more than the other four combined for a Social Seller — it's about who they sell to, what confuses those buyers, what they complain about, and how this person's expertise resolves it)"
      : "ai_and_tech, industry_problems, what_makes_great, and career_ambition";

    const system = `You write real, specific SAT-style multiple-choice questions for a LinkedIn Voice Card interview, based on what a real person told you about their role and industry. Every question and every option must be concretely specific to THEIR field — if a question or its options could be dropped unchanged into an interview for someone in a totally different industry, rewrite it. No generic placeholders like "your field" left in the text; name their actual domain. Cover these topic areas: ${topicAreas}. Generate 2-3 questions per topic area. Respond with ONLY a JSON object matching exactly this shape (no markdown fences, no commentary):
${QUESTION_SCHEMA}`;

    const user = `What they said about who they are and what they do:
"${identityAnswer}"

What they said about why they're doing this / their goal:
"${goalAnswer || "(not given)"}"

They are a ${isSocialSeller ? "Social Seller (their content needs to be useful to buyers/partners, not just interesting about themselves)" : "Thought Leader (the reader follows them as a person)"}.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 3000, system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      return json({ error: `Anthropic API error (${res.status}): ${errBody.slice(0, 300)}` }, 502);
    }
    const data = await res.json();
    const raw = data.content?.find((c: { type: string }) => c.type === "text")?.text;
    if (!raw) return json({ error: "Anthropic response had no text content" }, 502);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return json({ error: "Question generation response wasn't valid JSON." }, 502);
    const parsed = JSON.parse(jsonMatch[0]);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    if (questions.length === 0) return json({ error: "Generated no questions." }, 502);

    return json({ questions }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
