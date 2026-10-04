import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ONBOARDING_PHASES,
  type ContentOrientation,
} from "@/data/onboardingCatalog";
import {
  fetchChatTranscript,
  saveChatTranscript,
  saveContentOrientation,
  sendInterviewTurn,
} from "@/data/services/interviewChatService";
import { scriptedInterviewTurn } from "@/data/services/scriptedInterview";
import { upsertOnboardingState } from "@/data/services/onboardingService";
import { synthesizeVoiceCard } from "@/data/services/voiceCardSynthesisService";
import { buildChatEntries, type ChatTurn } from "@/lib/interviewTranscript";
import { useAuth } from "@/state/AuthContext";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/primitives/Button";
import { Card } from "@/components/primitives/Card";
import { Pill } from "@/components/primitives/Pill";
import { Avatar } from "@/components/primitives/Avatar";
import { cx } from "@/lib/cx";

const PHASE_SHORT: Record<string, string> = {
  identity: "Who you are",
  goals: "Your goal",
  voice: "Your voice",
  opinions: "Opinions & POV",
  persona: "Persona",
  format: "Format",
  sources: "Sources",
};

const OPENING: ChatTurn = {
  role: "assistant",
  content:
    "Hi! I'm going to interview you for about 40 minutes so I can learn how you think and how you write. One question at a time, and no wrong answers. Let's start easy: tell me about what you do. Your role, your company, how long you've been in this world. Talk to me like you're explaining it to someone smart who doesn't know your field.",
};

/** The voice interview as a real conversation (the linkedin-voice-setup
 * skill, run live by `interview-chat`). In `demo` mode nothing is read
 * from or written to the account — it's a sandbox for trying the flow. */
export function InterviewChatPage({ demo = false }: { demo?: boolean } = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, refreshOnboardingState } = useAuth();
  const userId = profile?.userId;

  const [loaded, setLoaded] = useState(demo);
  const [turns, setTurns] = useState<ChatTurn[]>([OPENING]);
  const [quotes, setQuotes] = useState<string[]>([]);
  const [phase, setPhase] = useState("identity");
  const [orientation, setOrientation] = useState<ContentOrientation | null>(
    null,
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // Demo-only: canned questions so the UI can be previewed without an AI key.
  const [scripted, setScripted] = useState(
    demo && searchParams.has("scripted"),
  );
  const [finishing, setFinishing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (demo || !userId) return;
    let cancelled = false;
    fetchChatTranscript(userId).then((saved) => {
      if (cancelled) return;
      if (saved) setTurns(saved);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, demo]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, sending]);

  useEffect(() => {
    if (!sending && !done) inputRef.current?.focus();
  }, [sending, done, turns.length]);

  const answerCount = turns.filter((t) => t.role === "user").length;
  const lastTurn = turns[turns.length - 1];
  const awaitingReply = lastTurn?.role === "user";
  const currentPhaseIndex = Math.max(
    0,
    ONBOARDING_PHASES.findIndex((p) => p.id === phase),
  );

  async function requestReply(history: ChatTurn[], forceScripted = false) {
    setSending(true);
    setError(null);
    const result =
      demo && (scripted || forceScripted)
        ? await new Promise<ReturnType<typeof scriptedInterviewTurn>>((r) =>
            setTimeout(() => r(scriptedInterviewTurn(history)), 600),
          )
        : await sendInterviewTurn(history);
    setSending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    const next: ChatTurn[] = [
      ...history,
      { role: "assistant", content: result.reply, options: result.options },
    ];
    setTurns(next);
    if (result.phase) setPhase(result.phase);
    if (result.quote)
      setQuotes((q) => (q.includes(result.quote!) ? q : [...q, result.quote!]));
    if (result.orientation && result.orientation !== orientation) {
      setOrientation(result.orientation);
      if (!demo && userId)
        void saveContentOrientation(userId, result.orientation);
    }
    if (!demo && userId) void saveChatTranscript(userId, next);
    if (result.done) setDone(true);
  }

  function send(text: string) {
    const content = text.trim();
    if (!content || sending || done) return;
    const history: ChatTurn[] = [...turns, { role: "user", content }];
    setTurns(history);
    setInput("");
    if (!demo && userId) void saveChatTranscript(userId, history);
    void requestReply(history);
  }

  async function finish() {
    if (finishing) return;
    if (demo) return;
    if (!userId) return;
    setFinishing(true);
    const result = await synthesizeVoiceCard(buildChatEntries(turns));
    if ("error" in result) {
      setError(result.error);
      setFinishing(false);
      return;
    }
    await upsertOnboardingState(userId, {
      completedAt: new Date().toISOString(),
    });
    await refreshOnboardingState();
    navigate("/voice-card");
  }

  async function finishLater() {
    if (!demo && userId) {
      await saveChatTranscript(userId, turns);
      await upsertOnboardingState(userId, { skipped: true });
      await refreshOnboardingState();
    }
    navigate("/");
  }

  if (!loaded)
    return (
      <div className="p-8 text-[13px] text-muted">Loading your interview…</div>
    );

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-[58px] flex-none items-center gap-2.5 border-b border-border bg-surface px-5">
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[9px] bg-espresso font-mono text-[11px] font-medium text-cream">
          TL
        </div>
        <span className="text-[13px] font-semibold">TL Engine</span>
        <Pill>
          {demo
            ? scripted
              ? "Scripted preview: nothing is saved"
              : "Demo: nothing is saved"
            : "Voice interview"}
        </Pill>
        <div className="flex-1" />
        <span className="text-[12px] text-muted">
          {demo
            ? "Test run: this stays in your tab"
            : "~40 min · saves as you go"}
        </span>
        <Button variant="ghost" onClick={() => void finishLater()}>
          {demo ? "Exit demo" : "Finish later"}
        </Button>
      </header>

      <div className="flex-none border-b border-border bg-surface px-10 pt-5">
        <div className="mb-2 flex max-w-[980px] items-center gap-1.5">
          {ONBOARDING_PHASES.map((p, i) => (
            <div
              key={p.id}
              className="h-[5px] flex-1 overflow-hidden rounded-full bg-skeleton"
            >
              <div
                className="h-full bg-accent transition-all"
                style={{
                  width:
                    i < currentPhaseIndex
                      ? "100%"
                      : i === currentPhaseIndex
                        ? "50%"
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex max-w-[980px] justify-between pb-3">
          {ONBOARDING_PHASES.map((p, i) => (
            <span
              key={p.id}
              className={cx(
                "text-[12px]",
                i === currentPhaseIndex
                  ? "font-bold text-ink"
                  : i < currentPhaseIndex
                    ? "font-semibold text-accent-dark"
                    : "text-muted",
              )}
            >
              {PHASE_SHORT[p.id] ?? p.title}
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-3.5 overflow-auto px-10 py-6"
          >
            {turns.map((turn, i) => {
              const isLast = i === turns.length - 1;
              return (
                <div
                  key={i}
                  className={cx(
                    "flex max-w-[640px] flex-col gap-2",
                    turn.role === "user" && "items-end self-end",
                  )}
                >
                  <div
                    className={cx(
                      "flex items-start gap-2.5",
                      turn.role === "user" && "flex-row-reverse",
                    )}
                  >
                    <Avatar
                      initials={
                        turn.role === "assistant"
                          ? "TL"
                          : (profile?.initials ?? "ME")
                      }
                      size={26}
                    />
                    <div
                      className={cx(
                        "rounded-xl border px-3.5 py-2.5",
                        turn.role === "assistant"
                          ? "rounded-tl-[4px] border-border bg-surface"
                          : "rounded-tr-[4px] border-espresso bg-espresso",
                      )}
                    >
                      <p
                        className={cx(
                          "whitespace-pre-wrap text-[13.5px] leading-relaxed",
                          turn.role === "assistant" ? "text-ink" : "text-cream",
                        )}
                      >
                        {turn.content}
                      </p>
                    </div>
                  </div>
                  {turn.role === "assistant" &&
                    isLast &&
                    !done &&
                    turn.options &&
                    !sending && (
                      <div className="flex flex-wrap gap-2 pl-9">
                        {turn.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => send(opt)}
                            className="rounded-lg border border-border bg-surface px-3 py-2 text-left text-[12.5px] font-semibold leading-tight text-ink transition-colors hover:border-accent hover:bg-bg"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              );
            })}
            {sending && (
              <div className="flex items-center gap-2.5">
                <Avatar initials="TL" size={26} />
                <Card className="rounded-tl-[4px] px-3.5 py-2.5">
                  <p className="animate-pulse text-[13px] text-muted">…</p>
                </Card>
              </div>
            )}
            {error && (
              <div className="flex max-w-[640px] items-start gap-2.5 rounded-lg border border-warn-border bg-warn-bg p-3">
                <Icon name="alert" className="h-4 w-4 flex-none text-warn-fg" />
                <div className="flex flex-col gap-2 text-[12.5px] leading-relaxed text-warn-fg">
                  <p>{error}</p>
                  {awaitingReply && !finishing && (
                    <button
                      className="w-fit font-semibold underline"
                      onClick={() => void requestReply(turns)}
                    >
                      Try again
                    </button>
                  )}
                  {demo && awaitingReply && !scripted && (
                    <button
                      className="w-fit font-semibold underline"
                      onClick={() => {
                        setScripted(true);
                        void requestReply(turns, true);
                      }}
                    >
                      Preview with scripted questions instead (no AI)
                    </button>
                  )}
                </div>
              </div>
            )}
            {done && (
              <Card className="flex max-w-[640px] flex-col gap-3 p-5">
                {demo ? (
                  <>
                    <p className="text-[14px] font-semibold text-ink">
                      That's the whole interview.
                    </p>
                    <p className="text-[13px] text-body">
                      In a real run, this is where your Voice Card gets written
                      up from everything you said. Nothing from this demo was
                      saved.
                    </p>
                    <div className="flex gap-2.5">
                      <Button
                        variant="primary"
                        onClick={() => window.location.reload()}
                      >
                        Run it again
                      </Button>
                      <Button variant="secondary" onClick={() => navigate("/")}>
                        Exit
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] font-semibold text-ink">
                      Ready to write up your Voice Card.
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => void finish()}
                      disabled={finishing}
                    >
                      {finishing
                        ? "Writing your Voice Card…"
                        : "Write my Voice Card"}
                    </Button>
                  </>
                )}
              </Card>
            )}
          </div>

          <div className="flex-none border-t border-border bg-surface px-10 py-4">
            <div className="flex max-w-[700px] items-end gap-2.5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                disabled={sending || done}
                rows={2}
                placeholder={
                  done
                    ? "All done."
                    : "Type your answer, or tap an option above. Enter to send."
                }
                className="min-h-[52px] flex-1 resize-none rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_4px_var(--tl-accent-10)] disabled:opacity-60"
              />
              <Button
                variant="primary"
                className="h-[52px] disabled:border-border disabled:bg-sand disabled:text-muted disabled:opacity-100"
                onClick={() => send(input)}
                disabled={sending || done || !input.trim()}
              >
                Send
                <Icon name="chev" className="h-[15px] w-[15px]" />
              </Button>
            </div>
            <p className="mt-2 text-[12px] text-muted">
              {answerCount} {answerCount === 1 ? "answer" : "answers"} so far.
              We keep going until I really get how you think, not until a
              counter hits zero.
            </p>
          </div>
        </div>

        <div className="w-px bg-border-soft" />

        <div className="w-[340px] flex-none overflow-auto p-6">
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2">
              <Icon
                name="core"
                className="h-[18px] w-[18px] text-accent-dark"
              />
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-accent-dark">
                Lines I'm keeping
              </p>
            </div>
            {quotes.length === 0 ? (
              <p className="text-[12.5px] text-muted">
                When you say something that sounds like you, it lands here for
                your Voice Card.
              </p>
            ) : (
              quotes.map((q) => (
                <Card key={q} className="bg-cream px-2.5 py-2">
                  <p className="text-[13px] italic text-body">"{q}"</p>
                </Card>
              ))
            )}
            {orientation && (
              <p className="text-[12px] text-muted">
                Writing for:{" "}
                {orientation === "audience_sales"
                  ? "buyers and partners (Social Seller)"
                  : "your own audience (Thought Leader)"}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
