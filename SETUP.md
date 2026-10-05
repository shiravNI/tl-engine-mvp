# TL Engine: making it usable for other people

Everything here is configuration in dashboards. Never paste keys or passwords into chat, issues, commits or screenshots. Enter them only in the dashboard (or CLI) named below.

## 1. Anthropic API key (turns on every AI feature)

Without it the interview, Voice Card write-up, drafting, research, prompts and humanizer all return "ANTHROPIC_API_KEY is not configured".

1. Get an API key from the company Anthropic Console account (ask whoever owns it / IT; use a key dedicated to this tool, named e.g. `tl-engine`).
2. In the Console, set a monthly **spend limit** on that key/workspace. Every user triggers paid calls (a full interview is roughly 40 to 50 model calls).
3. If you want the "Research ideas" button to search the web, an org admin must enable **web search** for the workspace. If it isn't enabled the button still works from the Voice Card alone and says so.
4. Supabase dashboard > project `yrgynoqeiycbtxtuaker` > **Edge Functions > Secrets** > add `ANTHROPIC_API_KEY`.
5. Optional: add `ANTHROPIC_MODEL` to change the model without redeploying (default `claude-sonnet-5-5`).

## 2. Login (magic link email)

Supabase's built-in email sender is heavily rate limited and only meant for testing, so other people won't reliably get links. Use real SMTP:

1. Supabase > **Authentication > Emails > SMTP Settings**: enable custom SMTP with a provider IT approves (company mail relay, Google Workspace SMTP relay, Resend, SendGrid, etc.). Enter the credentials there, nowhere else.
2. **Authentication > URL Configuration**: Site URL `https://shiravni.github.io/tl-engine-mvp/`; add the same URL (and `http://localhost:5190` if you develop locally) to Redirect URLs.
3. Decide who can sign up. Simplest for an internal tool: keep sign-ups on, and have people use their `@naturalint.com` address. To enforce it, ask for a signup restriction (database hook) before opening the link widely.
4. The old test account has a password. Either remove it or leave password login off for everyone else; turn on **Leaked password protection** (Authentication > Providers/Policies) if passwords stay enabled.

## 3. Hosting

Currently GitHub Pages from the personal repo `shiravNI/tl-engine-mvp` (public). Fine for the prototype. Before wider rollout:
- Move the repo to the company GitHub org and deploy from there.
- Check with IT whether this needs to sit behind a sanctioned ingress path (IAP / Twingate / approved WAF load balancer). Do not use tunnels or ad hoc public exposure.
- The repo secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (GitHub > Settings > Secrets and variables > Actions) must be set. The anon key is public by design; never use the `service_role` key in the app.

## 4. Supabase project

- Check the plan: free projects pause after inactivity, which looks like "the app is down".
- Row-level security is on for every table (each person can only read and write their own rows). The security advisor currently reports only the leaked-password warning above.
- Data held per person: interview transcript, Voice Card, drafts, edits and feedback. Dashboard admins can see it. Tell users that, and decide a retention rule.
- Unused leftover functions `humanize-draft` and `generate-interview-questions` are still deployed. Delete them in Edge Functions to shrink the surface.

## 5. Acceptance test (use a brand-new account, not yours)

1. Sign in from the live URL with the magic link. Link arrives, lands on the welcome screen.
2. Run the interview for 5 or so answers; check the replies are specific to what was said (not generic). Close the tab, reopen: it resumes.
3. Finish the interview (30 answers minimum): Voice Card appears under profile menu > Core. Edit one field and save. Reload: still there.
4. Drafter: write from a tapped prompt; draft a post and an article; edit them; reload: they are still there under "Your drafts".
5. Review tab: idea check shows; Humanize returns a score and a rewrite; Undo AI edit works.
6. Research ideas and "Prompts for me" both return results.
7. Edit a draft, then draft again: the notice says it used your edits.
8. Sign in as a second account and confirm you see none of the first account's data.
