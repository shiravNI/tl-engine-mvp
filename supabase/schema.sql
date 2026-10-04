-- ============================================================================
-- TL Engine MVP — Supabase schema (documentation only)
--
-- This is a SHARED Supabase project (ref yrgynoqeiycbtxtuaker). The same
-- project also backs an archived, much larger exploration app at
-- github.com/shiravNI/tl-engine (the "old app" this MVP was rebuilt from
-- scratch out of) — that app's tables (streaks, ideas, tasks, badge_catalog,
-- user_badges, video_items, carousel_decks/slides, contacts, resources,
-- posts, conversations, chat_messages, agent_feedback, brain_materials, ...)
-- all still exist in this same database and are NOT reproduced here.
--
-- This file documents ONLY the tables/columns this MVP app
-- (Onboard/Login -> Voice Card interview or upload -> LinkedIn drafter with
-- a BS Detector + Humanizer review pass) actually reads or writes. It is
-- NOT meant to be run — the tables, RLS policies, indexes, and the
-- `handle_new_user()` signup trigger (which provisions `profiles` +
-- `onboarding_state` on signup and restricts signup to @naturalint.com
-- addresses) already exist for real. Do not create new tables or run
-- migrations against this project from this app; this file exists purely
-- so anyone reading this repo can see the real shape of the data it
-- depends on without cross-referencing the other repo.
--
-- Every statement below was re-derived from live introspection of the real
-- project (`list_tables`, `pg_indexes`, `pg_policies`), not guessed or
-- copied from the old repo's schema.sql.
--
-- Every user-owned table below carries the same flat RLS pattern:
--   for all to authenticated
--   using ((select auth.uid()) = user_id)
--   with check ((select auth.uid()) = user_id)
-- i.e. a signed-in user can only ever see/write their own rows, full stop.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles — signup-provisioned singleton, one row per user.
-- ----------------------------------------------------------------------------
create table public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text not null,
  initials   text not null,
  role       text not null default 'cast' check (role in ('director', 'cast')),
  title      text not null default '',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_owner" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- onboarding_state — signup-provisioned singleton tracking interview
-- progress. This MVP only ever reads/writes `completed_at` and `skipped`
-- (`current_phase_index` is left at its default; this build doesn't resume
-- mid-phase by index, it re-derives "where you left off" from
-- interview_answers instead). `generated_opinion_questions` holds the real,
-- domain-personalized SAT-round questions from
-- `generate-interview-questions` once generated, so resuming the interview
-- shows the SAME set rather than a freshly (and differently) regenerated
-- one — null until generation has run and succeeded at least once.
-- ----------------------------------------------------------------------------
create table public.onboarding_state (
  user_id                    uuid primary key references auth.users(id) on delete cascade,
  current_phase_index        int not null default 1,
  completed_at               timestamptz,
  skipped                    boolean not null default false,
  generated_opinion_questions jsonb,
  chat_transcript jsonb,          -- the live interview-chat conversation: [{role, content, options?}]
  updated_at                 timestamptz not null default now()
);
alter table public.onboarding_state enable row level security;
create policy "onboarding_state_owner" on public.onboarding_state
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- interview_answers — one row per (user, question) answered in the Voice
-- Card interview. The question *catalog* (titles, prompts, options) is not
-- a table — it's the shared TS constant `src/data/onboardingCatalog.ts`.
-- ----------------------------------------------------------------------------
create table public.interview_answers (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  question_id        text not null,
  selected_option_id text,
  free_text_answer   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, question_id)
);
alter table public.interview_answers enable row level security;
create policy "interview_answers_owner" on public.interview_answers
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- `unique (user_id, question_id)` above already gives user_id a leading
-- index (interview_answers_user_id_question_id_key); no separate index.

-- ----------------------------------------------------------------------------
-- voice_cards — one row per user. `pov_fingerprint`/`completeness_pct`/
-- `completeness_note`/`role_label` are the thin, deterministic fallback
-- (src/lib/voiceCard.ts's `deriveVoiceCard`, upserted on every interview
-- "Continue" so there's always something usable). `synthesized` is the
-- REAL Voice Card — the `synthesize-voice-card` edge function's structured
-- output (positioning statement, persona, voice/tone profile, content
-- pillars, opinions, signature quotes, trusted sources — see
-- `SynthesizedVoiceCard` in src/data/types.ts), written once at the end of
-- the interview. `synthesized_at` is null until that's actually run.
-- `imported_from_text` was added for this MVP's "upload an existing Voice
-- Card" flow (src/lib/voiceCardImport.ts): the raw pasted/uploaded text,
-- kept verbatim as extra synthesis material even after the heuristic
-- pre-fill is superseded by real interview answers.
-- ----------------------------------------------------------------------------
create table public.voice_cards (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  role_label          text not null default '',
  pov_fingerprint     text not null default '',
  completeness_pct    int not null default 0,
  completeness_note   text not null default '',
  -- 'personal_brand' (Thought Leader — visibility/speaking-invite focused)
  -- vs 'audience_sales' (Social Seller — audience/prospect-pain-point
  -- focused) — the fork answered by q_orientation in the interview catalog.
  content_orientation text check (content_orientation in ('personal_brand', 'audience_sales')),
  imported_from_text  text,
  synthesized         jsonb,
  synthesized_at      timestamptz,
  updated_at          timestamptz not null default now()
);
alter table public.voice_cards enable row level security;
create policy "voice_cards_owner" on public.voice_cards
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- voice_card_opinions — the Voice Card's quotable-opinions list. Fully
-- replaced (delete-all, re-insert) on every Voice Card save, client-side —
-- see `upsertVoiceCard` in src/data/services/onboardingService.ts.
-- ----------------------------------------------------------------------------
create table public.voice_card_opinions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  quote       text not null,
  placeholder boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.voice_card_opinions enable row level security;
create policy "voice_card_opinions_owner" on public.voice_card_opinions
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index voice_card_opinions_user_idx on public.voice_card_opinions (user_id, sort_order);

-- ----------------------------------------------------------------------------
-- drafts — shared with the old app; this table carries MANY more columns
-- than this MVP touches (pillar, source_idea_id, source_type, image_url,
-- image_file_name, scheduled_for, published_at, archived_at, format,
-- origin). The full, real column list is reproduced below for accuracy
-- (this is a live-introspected shape, not a guess), but this app only ever
-- reads/writes the columns marked "<- MVP" — every other column keeps
-- whatever default the `draft-post` edge function's insert leaves it at,
-- and this app never touches it.
--
-- `draft-post` and `humanize-draft` (Supabase Edge Functions, already
-- deployed) do the actual insert/update against this table server-side,
-- using the caller's own JWT/RLS — this app's client code only ever reads
-- from `drafts`, it never inserts/updates directly.
-- ----------------------------------------------------------------------------
create table public.drafts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  title            text not null default '',                                    -- <- MVP
  paragraphs       jsonb not null default '[]'::jsonb,                          -- <- MVP
  excerpt          text not null default '',                                    -- <- MVP
  pillar           text,
  stage            text not null default 'draft',                               -- <- MVP (read-only; always 'draft' in this build)
  format           text not null default 'post' check (format in ('post', 'article')),
  slop_score       int not null default 0,                                      -- <- MVP
  roast_verdict    text not null default '',                                    -- <- MVP
  roast_flags      jsonb not null default '[]'::jsonb,                          -- <- MVP
  voice_match      int not null default 0,                                      -- <- MVP
  ai_original      jsonb,                                                       -- <- MVP: what the AI first wrote; edits vs this are learned from
  idea_check       jsonb,                                                       -- <- MVP: BS-detector verdict on the idea {verdict, insight, missing}
  origin           text not null default 'user' check (origin in ('user', 'agent')),
  source_idea_id   uuid references public.ideas(id) on delete set null,
  source_type      text,
  source_label     text,                                                        -- <- MVP
  image_url        text,
  image_file_name  text,
  checklist        jsonb not null default '{"hookEarnsSeeMore":false,"noLinksInBody":false,"visualAttached":false,"hashtagsAdded":false}'::jsonb,
  scheduled_for    timestamptz,
  published_at     timestamptz,
  archived_at      timestamptz,
  created_at       timestamptz not null default now(),                          -- <- MVP
  updated_at       timestamptz not null default now()                           -- <- MVP
);
alter table public.drafts enable row level security;
create policy "drafts_owner" on public.drafts
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index drafts_user_stage_idx on public.drafts (user_id, stage);
create index drafts_source_idea_idx on public.drafts (source_idea_id);

-- ----------------------------------------------------------------------------
-- draft_feedback — what the drafter learns from beyond edits: thumbs up/down
-- with an optional note, and every free-form "make it X" instruction.
-- Read back into every generation by draft-post / suggest-topics / revise-text.
-- ----------------------------------------------------------------------------
create table public.draft_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  draft_id   uuid references public.drafts(id) on delete set null,
  kind       text not null check (kind in ('liked', 'disliked', 'note')),
  note       text not null default '',
  created_at timestamptz not null default now()
);
alter table public.draft_feedback enable row level security;
create policy "draft_feedback_owner" on public.draft_feedback
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index draft_feedback_user_created_idx on public.draft_feedback (user_id, created_at desc);
create index draft_feedback_draft_idx on public.draft_feedback (draft_id);
