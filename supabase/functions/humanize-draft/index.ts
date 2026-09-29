// Supabase Edge Function: humanize-draft
//
// Real rewrite pass (unlike the old app's fake "Humanize" button, which
// just nudged a number — this genuinely calls Claude to rewrite the
// draft's own text). Takes a real draft this user owns, rewrites it to
// read more human and strip whatever the BS detector flagged, re-runs the
// same deterministic gatekeeper check, and updates the row in place.
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

const EM_EN_DASH = /[—–]/;
const AI_TELL_PATTERNS = [
  /\blet that sink in\b/i,
  /\bit'?s not (?:just )?[\w\s]+, it'?s\b/i,
  /\bcircle back\b/i,
  /\bdouble-click on\b/i,
  /\bmove the needle\b/i,
  /\bsynerg(y|ies)\b/i,
  /\bleverag(e|ing)\b/i,
  /\bgame[- ]chang(er|ing)\b/i,
  /\bat the end of the day\b/i,
  /\blow-hanging fruit\b/i,
  /\bunlock(ing)? (true )?potential\b/i,
  /\bin today'?s fast-paced\b/i,
  /\bhumbled and honored\b/i,
  /\bdelve\b/i,
  /\btapestry\b/i,
];
const ENGAGEMENT_BAIT = /\b(agree or disagree|comment below|tag someone|save this post)\b/i;

function gatekeep(paragraphs: string[]): { clean: boolean; issues: string[] } {
  const issues: string[] = [];
  const text = paragraphs.join("\n");
  if (EM_EN_DASH.test(text)) issues.push("Contains an em dash or en dash — use a period, comma, or colon instead.");
  for (const pattern of AI_TELL_PATTERNS) {
    if (pattern.test(text)) issues.push(`Contains a generic AI-tell phrase matching ${pattern}.`);
  }
  if (ENGAGEMENT_BAIT.test(text)) issues.push("Contains engagement-bait phrasing (e.g. \"comment below\").");
  return { clean: issues.length === 0, issues };
}

function parseParagraphs(raw: string, fallbackTitle: string): { title: string; paragraphs: string[] } {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.paragraphs)) {
        return { title: parsed.title ? String(parsed.title) : fallbackTitle, paragraphs: parsed.paragraphs.map(String) };
      }
    } catch {
      // fall through
    }
  }
  const paragraphs = raw.trim().split(/\n{2,}/).filter(Boolean);
  return { title: fallbackTitle, paragraphs };
}

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
    const draftId = typeof body.draftId === "string" ? body.draftId : "";
    if (!draftId) return json({ error: "Missing draftId" }, 422);

    // RLS scopes this to the caller's own row — a draftId belonging to
    // someone else simply returns no row, not another user's data.
    const { data: draft, error: draftError } = await supabase
      .from("drafts")
      .select("id, title, paragraphs")
      .eq("id", draftId)
      .single();
    if (draftError || !draft) return json({ error: "Draft not found." }, 404);

    const system = `You rewrite LinkedIn post text to sound genuinely human and specific, not AI-generated. Hard rules: never use an em dash (—) or en dash (–); never add engagement-bait closers ("agree or disagree?", "comment below", "tag someone"); keep the same meaning, angle, and roughly the same length — you are editing, not reinventing. Respond with ONLY a JSON object: {"paragraphs": string[]}.`;
    const user = `Rewrite this to sound more human, cutting any corporate-speak or AI-tell phrasing:\n\n${(draft.paragraphs as string[]).join("\n\n")}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, system, messages: [{ role: "user", content: user }] }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      return json({ error: `Anthropic API error (${res.status}): ${errBody.slice(0, 300)}` }, 502);
    }
    const data = await res.json();
    const raw = data.content?.find((c: { type: string }) => c.type === "text")?.text;
    if (!raw) return json({ error: "Anthropic response had no text content" }, 502);

    const rewritten = parseParagraphs(raw, draft.title);
    const gate = gatekeep(rewritten.paragraphs);
    const slopScore = Math.min(10, gate.issues.length * 3);
    const roastVerdict = gate.clean
      ? "Clean — no AI tells caught, but give it your own read before it ships."
      : "Still flagged after humanizing — worth a manual pass before this goes out.";

    const { data: updated, error: updateError } = await supabase
      .from("drafts")
      .update({
        paragraphs: rewritten.paragraphs,
        excerpt: rewritten.paragraphs[0]?.slice(0, 140) ?? "",
        slop_score: slopScore,
        roast_verdict: roastVerdict,
        roast_flags: gate.issues.map((issue) => ({ quote: "", comment: issue })),
      })
      .eq("id", draftId)
      .select()
      .single();

    if (updateError) return json({ error: `Failed to save: ${updateError.message}` }, 500);

    return json({ draft: updated }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
