// Supabase Edge Function: synthesize-voice-card
//
// The real version of the linkedin-voice-setup skill's Phase 3: takes the
// raw interview transcript (built client-side from onboardingCatalog.ts,
// this function never needs its own copy of the question catalog) and has
// Claude actually WRITE the rich Voice Card document — positioning
// statement, persona archetype, voice/tone profile, content pillars with
// real quotable takes, signature quotes, trusted sources — not a
// mechanical concatenation of raw answers. This is what closes the gap
// between a thin, derived card and a real one.
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

interface TranscriptEntry {
  prompt: string;
  answer: string;
}

const SYNTHESIS_SCHEMA = `{
  "positioningStatement": string (2-4 sentences, in the format "[Name] is a [role] who believes/understands [core POV]. They post for [audience]. Their unique angle is [X]. You follow/trust them because [Y]."),
  "identity": { "roleCompany": string, "location": string (empty string if they never said), "industry": string, "coreExpertise": string (1-2 sentences), "linkedinGoal": string },
  "persona": {
    "primary": { "name": string (one of: The Practitioner, The Contrarian, The Storyteller, The Educator, The Connector, The Visionary, The Builder), "description": string (1-2 sentences, specific to this person, not generic) },
    "secondary": { "name": string, "description": string }
  },
  "voiceTone": {
    "adjectives": string[] (3-5 words),
    "communicationStyle": string (2-3 sentences describing HOW they write),
    "corePrinciple": string (one sentence),
    "whatToAvoid": string[] (3-6 specific no-nos, in their own words where possible),
    "signaturePatterns": string[] (3-6 specific habits/tics)
  },
  "contentPillars": [{ "title": string, "description": string (the POV, not just the topic), "quote": string (a real quotable line, in their voice) }] (3-5 items),
  "formatPreferences": { "lengths": string, "structure": string, "formatting": string, "cta": string },
  "opinions": string[] (3-6 quotable takes, written IN THEIR VOICE using their own vocabulary, not summarized or softened),
  "signatureQuotes": string[] (5-10 short, punchy, verbatim-feeling lines pulled or extrapolated from what they actually said),
  "trustedSources": string[] (from what they said they read/follow; empty array if they gave none),
  "postExamples": string (empty string unless they shared or described real past posts; if so, 2-4 sentences on what those posts do and what they share),
  "audience": { "primary": string, "secondary": string },
  "memorySummary": string (3-5 plain-English sentences capturing voice, goals, pillars, personality)
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
    const entries: TranscriptEntry[] = Array.isArray(body.entries) ? body.entries : [];
    if (entries.length === 0) {
      return json({ error: "No interview answers to synthesize from yet." }, 422);
    }

    const [{ data: profile }, { data: voiceCard }] = await Promise.all([
      supabase.from("profiles").select("name").maybeSingle(),
      supabase.from("voice_cards").select("content_orientation, imported_from_text").maybeSingle(),
    ]);

    const orientation = voiceCard?.content_orientation === "audience_sales" ? "Social Seller" : "Thought Leader";
    const name = profile?.name ?? "This person";

    const transcript = entries.map((e) => `Q: ${e.prompt}\nA: ${e.answer}`).join("\n\n");
    const importedNote = voiceCard?.imported_from_text
      ? `\n\nThey also uploaded an existing Voice Card draft — use it as additional real material where it doesn't conflict with the interview:\n${String(voiceCard.imported_from_text).slice(0, 4000)}`
      : "";

    const system = `You synthesize a real LinkedIn Voice Card from a real interview transcript — the same job a skilled ghostwriter does after a 40-minute conversation. This is not a form to fill in with generic placeholders; every field must be specific to what THIS person actually said. Use their own vocabulary and phrasing wherever they gave you real material — don't launder it into generic corporate language. If they gave thin material on something, write an honest, still-specific best guess rather than a bland generic line — never write something that could apply to anyone. This person is a ${orientation}: ${orientation === "Social Seller" ? "everything should center on the people they sell to and what those people struggle with, not just their own opinions." : "the reader follows them as a person, so their own POV and expertise is the center of gravity."}

Respond with ONLY a JSON object matching exactly this shape (no markdown fences, no commentary):
${SYNTHESIS_SCHEMA}`;

    const user = `Name: ${name}

Interview transcript:
${transcript}${importedNote}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 4000, system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      return json({ error: `Anthropic API error (${res.status}): ${errBody.slice(0, 300)}` }, 502);
    }
    const data = await res.json();
    const raw = data.content?.find((c: { type: string }) => c.type === "text")?.text;
    if (!raw) return json({ error: "Anthropic response had no text content" }, 502);

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return json({ error: "Synthesis response wasn't valid JSON." }, 502);
    const synthesized = JSON.parse(jsonMatch[0]);

    const { error: updateError } = await supabase
      .from("voice_cards")
      .upsert({
        user_id: userData.user.id,
        pov_fingerprint: synthesized.positioningStatement ?? "",
        completeness_pct: 100,
        completeness_note: "Synthesized from your full interview.",
        role_label: synthesized.identity?.roleCompany ?? "",
        synthesized,
        synthesized_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    if (updateError) return json({ error: `Failed to save: ${updateError.message}` }, 500);

    // Replace the flat opinions list with the synthesized, real quotable
    // takes — this is what draft-post/humanize-draft already read from.
    await supabase.from("voice_card_opinions").delete().eq("user_id", userData.user.id);
    const opinions = Array.isArray(synthesized.opinions) ? synthesized.opinions : [];
    if (opinions.length > 0) {
      await supabase.from("voice_card_opinions").insert(
        opinions.map((quote: string, i: number) => ({
          user_id: userData.user.id,
          quote,
          placeholder: false,
          sort_order: i,
        })),
      );
    }

    return json({ synthesized }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
