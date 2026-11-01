"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useAuthProviders } from "@/hooks/use-auth-providers";

const DEMO_ANSWER = "não gosta";
const DEMO_OPTIONS = ["gosta", "não gosta"] as const;

const PRACTICE_TYPES = [
  "Multiple choice",
  "Fill the blank",
  "Match pairs",
  "Word order",
  "True or false",
  "Rewrite it",
  "Read the dialogue",
] as const;

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.2 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.6c0-1.6-.1-3.2-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 7l7.2 5.6c4.2-3.9 6.6-9.7 6.6-16.6z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C1 16.4 0 20.1 0 24s1 7.6 2.6 10.8l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.6 2.2-8.7 2.2-6.3 0-11.6-3.7-13.5-9.1l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

function LandingTryDemo() {
  const [picked, setPicked] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const answered = picked !== null;
  const ok = picked === DEMO_ANSWER;

  return (
    <div
      className="rounded-[32px] border-2 border-b-4 border-[#FCF5EF]/[0.08] bg-[#FCF5EF]/[0.04] p-5"
      data-testid="landing-try-demo"
    >
      <div className="mb-[18px] flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-pill bg-[#FCF5EF]/10">
          <div
            className="h-full rounded-pill bg-success transition-all duration-base ease-out"
            style={{ width: answered ? "100%" : "12%" }}
          />
        </div>
        <span className="text-[13px] font-bold text-[#FCF5EF]/60">Try one</span>
      </div>

      <p className="font-book mb-4 border-l-[3px] border-[#F6A81D]/50 pl-3 text-base leading-[1.45] text-[#F3D9A8]">
        Escolha a opção correta.
      </p>

      <div className="rounded-3xl border-2 border-b-4 border-[#FCF5EF]/[0.05] bg-[#FCF5EF]/[0.05] p-4">
        <p className="mb-3 text-[21px] font-semibold leading-[1.35] tracking-tight text-[#FCF5EF]">
          O Rui ___ de chá.{" "}
          <span className="text-sm font-medium text-[#FCF5EF]/45">🍵✕</span>
        </p>

        <button
          type="button"
          className="inline-flex h-11 items-center gap-2 rounded-pill bg-warning/10 px-3.5 text-sm font-bold text-warning"
          onClick={() => setHintOpen((open) => !open)}
          data-testid="landing-demo-hint"
        >
          ? Hint
        </button>
        {hintOpen ? (
          <div className="mt-2 rounded-r-xl border-l-[3px] border-warning bg-warning/[0.08] px-3.5 py-3 text-sm font-medium leading-normal text-[#FCF5EF]/90">
            Rui doesn’t like tea — put “não” before the verb.
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3">
          {DEMO_OPTIONS.map((label) => {
            const isPicked = label === picked;
            const right = answered && isPicked && ok;
            const wrong = answered && isPicked && !ok;
            const reveal = answered && !ok && label === DEMO_ANSWER;
            const dim =
              answered && !isPicked && !(label === DEMO_ANSWER && !ok);

            let className =
              "flex min-h-14 w-full items-center rounded-2xl border-2 border-b-4 px-4 py-3.5 text-left text-[17px] font-semibold leading-snug";
            if (!answered) {
              className +=
                " border-[#FCF5EF]/10 bg-[#FCF5EF]/[0.05] text-[#FCF5EF] hover:bg-[#FCF5EF]/[0.09]";
            } else if (right) {
              className +=
                " justify-between border-success bg-success/12 font-bold text-[#FCF5EF]";
            } else if (wrong) {
              className +=
                " justify-between border-error bg-error/12 font-bold text-[#FCF5EF]";
            } else if (reveal) {
              className +=
                " justify-between border-dashed border-success font-bold text-success";
            } else if (dim) {
              className +=
                " border-[#FCF5EF]/[0.06] bg-[#FCF5EF]/[0.03] font-medium text-[#FCF5EF]/40";
            }

            return (
              <button
                key={label}
                type="button"
                disabled={answered}
                className={className}
                onClick={() => setPicked(label)}
                data-testid={`landing-demo-option-${label.replace(/\s+/g, "-")}`}
              >
                <span>{label}</span>
                {right ? <span className="text-lg text-success">✓</span> : null}
                {wrong ? <span className="text-lg text-error">✕</span> : null}
                {reveal ? (
                  <span className="rounded-pill bg-success/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-success">
                    Answer
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {answered && ok ? (
        <div className="mt-3.5 rounded-[20px] border-2 border-success bg-[#0E1A14] p-4">
          <p className="mb-1 text-lg font-bold leading-tight text-success">
            Correct! +10 XP
          </p>
          <p className="mb-3 text-sm font-medium leading-normal text-[#FCF5EF]/80">
            In Portuguese, “não” goes right before the verb: não gosta de café.
          </p>
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-pill bg-[#FCF5EF]/[0.08] px-[18px] text-xs font-bold uppercase tracking-wide text-[#FCF5EF]"
            onClick={() => {
              setPicked(null);
              setHintOpen(false);
            }}
          >
            Try again
          </button>
        </div>
      ) : null}

      {answered && !ok ? (
        <div className="mt-3.5 rounded-[20px] border-2 border-error bg-[#1E1112] p-4">
          <p className="mb-1 text-lg font-bold leading-tight text-error">
            Not quite — it’s “não gosta”
          </p>
          <p className="mb-3 text-sm font-medium leading-normal text-[#FCF5EF]/80">
            The negative sits before the verb: não gosta de café. This one would
            come back in tomorrow’s review.
          </p>
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-pill bg-[#FCF5EF]/[0.08] px-[18px] text-xs font-bold uppercase tracking-wide text-[#FCF5EF]"
            onClick={() => {
              setPicked(null);
              setHintOpen(false);
            }}
          >
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Marketing landing from templates/passaporte/PassaporteLanding.dc.html */
export function PassaporteLanding() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data: providers } = useAuthProviders();
  const googleEnabled = providers?.google ?? false;
  const [googlePending, setGooglePending] = useState(false);

  useEffect(() => {
    if (!sessionPending && session?.user) {
      router.replace("/map");
    }
  }, [session, sessionPending, router]);

  async function onGoogle() {
    if (!googleEnabled || googlePending) return;
    setGooglePending(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/map",
      });
    } catch {
      setGooglePending(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#211B14] to-[#0F0D0B] font-sans text-[#FCF5EF]"
      data-testid="passaporte-landing"
    >
      <header className="mx-auto flex max-w-[1160px] items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-b-[3px] border-primary-edge bg-primary font-display text-xl font-semibold text-[#18140F]">
            P
          </div>
          <span className="font-display text-[22px] font-semibold">Passaporte</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="#how"
            className="hidden h-11 items-center px-3.5 text-[15px] font-semibold text-[#FCF5EF]/70 no-underline hover:text-primary sm:flex"
          >
            How it works
          </a>
          <Link
            href="/sign-in"
            className="flex h-11 items-center rounded-pill border-2 border-[#FCF5EF]/12 bg-[#FCF5EF]/[0.06] px-[18px] text-[13px] font-bold uppercase tracking-wide text-[#FCF5EF]"
            data-testid="landing-sign-in"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-14 px-6 pb-20 pt-14">
        <div className="min-w-0 flex-[1_1_420px]">
          <div className="mb-6 inline-flex h-8 items-center gap-2 rounded-pill bg-success/12 px-3.5 text-xs font-bold uppercase tracking-wide text-success">
            Beginner · A1 Portuguese
          </div>
          <h1 className="font-display mb-5 text-balance text-[clamp(40px,6vw,64px)] font-semibold leading-[1.05] tracking-tight">
            Learn Portuguese ten minutes at a time.
          </h1>
          <p className="mb-8 max-w-[500px] text-pretty text-[19px] font-medium leading-[1.55] text-[#FCF5EF]/70">
            Short, playful sessions that check every answer instantly, explain
            what went wrong in plain English, and bring back what you missed
            until it sticks.
          </p>
          <div className="mb-5 flex flex-wrap gap-3">
            <Link
              href="/map"
              className="btn-primary gap-2.5 px-6 text-[15px]"
              data-testid="landing-start"
            >
              Start learning free
            </Link>
            <button
              type="button"
              disabled={!googleEnabled || googlePending}
              onClick={() => void onGoogle()}
              className="inline-flex h-14 items-center gap-2.5 rounded-pill border-b-4 border-[#18140F]/25 bg-[#FCF5EF] px-[22px] text-[15px] font-bold text-[#18140F] transition duration-fast ease-out active:translate-y-0.5 disabled:opacity-50"
              data-testid="landing-google"
              title={
                googleEnabled
                  ? "Continue with Google"
                  : "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable"
              }
            >
              <GoogleMark />
              Continue with Google
            </button>
          </div>
          <p className="text-sm font-medium leading-snug text-[#FCF5EF]/50">
            No timers. No pressure. Hearts only if you want them.
          </p>
        </div>

        <div className="mx-auto min-w-0 max-w-[460px] flex-[1_1_380px]">
          <LandingTryDemo />
        </div>
      </section>

      <section
        id="how"
        className="mx-auto max-w-[1160px] px-6 pb-20 pt-10"
        data-testid="landing-how"
      >
        <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-primary">
          How it works
        </p>
        <h2 className="font-display mb-10 max-w-[640px] text-balance text-[clamp(30px,4vw,40px)] font-semibold leading-[1.15]">
          A short loop you can keep every day.
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {(
            [
              {
                n: "1",
                color: "bg-primary/14 text-primary",
                title: "Play a unit",
                body: "Pick up the next unit on your map. Each session is around thirteen exercises — roughly ten minutes.",
              },
              {
                n: "2",
                color: "bg-success/14 text-success",
                title: "Get instant feedback",
                body: "Every answer is checked on the spot, with a one-line explanation in English right under the question.",
              },
              {
                n: "3",
                color: "bg-info/14 text-info",
                title: "Review what you missed",
                body: "Mistakes come back tomorrow, then less and less often as you get them right.",
              },
            ] as const
          ).map((step) => (
            <div
              key={step.n}
              className="rounded-3xl border-2 border-b-4 border-[#FCF5EF]/[0.05] bg-[#FCF5EF]/[0.05] p-6"
            >
              <div
                className={`mb-5 flex h-11 w-11 items-center justify-center rounded-full text-lg font-extrabold ${step.color}`}
              >
                {step.n}
              </div>
              <h3 className="mb-2 text-xl font-bold leading-tight">{step.title}</h3>
              <p className="text-[15px] font-medium leading-[1.55] text-[#FCF5EF]/65">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto flex max-w-[1160px] flex-wrap items-center gap-12 px-6 pb-20 pt-10">
        <div className="min-w-0 flex-[1_1_360px]">
          <p className="mb-3 text-[13px] font-bold uppercase tracking-wide text-primary">
            Seven ways to practise
          </p>
          <h2 className="font-display mb-4 text-balance text-[clamp(30px,4vw,40px)] font-semibold leading-[1.15]">
            Real exercises, not just flashcards.
          </h2>
          <p className="max-w-[460px] text-pretty text-[17px] font-medium leading-relaxed text-[#FCF5EF]/70">
            Choose, fill in the blank, match pairs, put words in order, spot true
            or false, rewrite a sentence, and read along with dialogues. Type your
            answers with a one-tap ç á ã õ row when you’re ready.
          </p>
        </div>
        <div className="flex min-w-0 flex-[1_1_360px] flex-wrap gap-2.5">
          {PRACTICE_TYPES.map((label) => (
            <div
              key={label}
              className="flex h-12 items-center rounded-pill border-2 border-b-4 border-[#FCF5EF]/10 bg-[#FCF5EF]/[0.05] px-[18px] text-[15px] font-bold"
            >
              {label}
            </div>
          ))}
          <div className="flex h-12 items-center gap-1.5 rounded-pill border-2 border-b-4 border-info/40 bg-info/12 px-[18px] text-[15px] font-bold text-info">
            ç á ã õ
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-6 pb-20 pt-10">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          {(
            [
              {
                title: "Calm by design",
                body: "No countdowns and no lives by default. Turn on hearts in Settings if you like a challenge.",
              },
              {
                title: "Hints when you need them",
                body: "One sentence of English under every question — opens inline, never covers the answers.",
              },
              {
                title: "Progress you can see",
                body: "A unit map, a daily streak, and mastery by topic so you know exactly what to practise next.",
              },
              {
                title: "Phone or laptop",
                body: "Your progress follows you. Dark and light themes, or match your system.",
              },
            ] as const
          ).map((feature) => (
            <div key={feature.title} className="border-t-2 border-[#FCF5EF]/12 pt-5">
              <h3 className="mb-2 text-lg font-bold leading-snug">{feature.title}</h3>
              <p className="text-[15px] font-medium leading-[1.55] text-[#FCF5EF]/65">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-6 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[32px] border-2 border-b-4 border-primary/35 bg-primary/10 px-[clamp(24px,5vw,56px)] py-[clamp(32px,6vw,64px)]">
          <div className="min-w-0 flex-[1_1_380px]">
            <h2 className="font-display mb-2.5 text-balance text-[clamp(30px,4vw,44px)] font-semibold leading-[1.1]">
              Your first session takes ten minutes.
            </h2>
            <p className="text-[17px] font-medium leading-normal text-[#FCF5EF]/70">
              Free to start. Sign in with Google or email.
            </p>
          </div>
          <Link
            href="/map"
            className="btn-primary px-7 text-[15px]"
            data-testid="landing-cta-footer"
          >
            Start learning free
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#FCF5EF]/[0.08]">
        <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-4 px-6 py-7 text-sm font-medium leading-snug text-[#FCF5EF]/50">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-lg font-semibold text-[#FCF5EF]">
              Passaporte
            </span>
            <span>· Learn A1 Portuguese</span>
          </div>
          <div className="flex gap-5">
            <span className="text-[#FCF5EF]/60">Privacy</span>
            <span className="text-[#FCF5EF]/60">Terms</span>
            <span className="text-[#FCF5EF]/60">Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
