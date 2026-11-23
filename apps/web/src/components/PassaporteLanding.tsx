"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useAuthProviders } from "@/hooks/use-auth-providers";
import { ChoiceOption } from "@/components/ChoiceOption";
import { HintDisclosure } from "@/components/HintDisclosure";
import { SocialAuthButton } from "@/components/SocialAuthButton";
import { Button, FeedbackCard, ProgressBar } from "@/kuji";

const DEMO_ANSWER = "não gosta";
const DEMO_OPTIONS = ["gosta", "não gosta"] as const;
const DEMO_HINT =
  "Rui doesn’t like tea — put “não” before the verb.";

const PRACTICE_TYPES = [
  "Multiple choice",
  "Fill the blank",
  "Match pairs",
  "Word order",
  "True or false",
  "Rewrite it",
  "Read the dialogue",
] as const;

function LandingTryDemo() {
  const [picked, setPicked] = useState<string | null>(null);
  const answered = picked !== null;
  const ok = picked === DEMO_ANSWER;

  function optionState(
    label: string,
  ): "default" | "correct" | "incorrect" | "revealed" | "dim" {
    if (!answered) return "default";
    const isPicked = label === picked;
    if (isPicked && ok) return "correct";
    if (isPicked && !ok) return "incorrect";
    if (!ok && label === DEMO_ANSWER) return "revealed";
    return "dim";
  }

  return (
    <div
      className="rounded-[32px] border-2 border-b-4 border-[#FCF5EF]/[0.08] bg-[#FCF5EF]/[0.04] p-5"
      data-testid="landing-try-demo"
    >
      <div className="mb-[18px] flex items-center gap-3">
        <ProgressBar
          value={answered ? 100 : 12}
          color="green"
          height={10}
          className="flex-1"
        />
        <span className="text-[13px] font-bold text-[#FCF5EF]/60">Try one</span>
      </div>

      <p className="font-book mb-4 border-l-[3px] border-[#F6A81D]/50 pl-3 text-base leading-[1.45] text-[#F3D9A8]">
        Escolha a opção correta.
      </p>

      <div className="card-surface-lg border-[#FCF5EF]/[0.05] bg-[#FCF5EF]/[0.05] p-4">
        <p className="mb-3 text-[21px] font-semibold leading-[1.35] tracking-tight text-[#FCF5EF]">
          O Rui ___ de chá.{" "}
          <span className="text-sm font-medium text-[#FCF5EF]/45">🍵✕</span>
        </p>

        <div data-testid="landing-demo-hint">
          <HintDisclosure hint={DEMO_HINT} />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {DEMO_OPTIONS.map((label) => (
            <ChoiceOption
              key={label}
              label={label}
              state={optionState(label)}
              disabled={answered}
              onClick={() => setPicked(label)}
              data-testid={`landing-demo-option-${label.replace(/\s+/g, "-")}`}
            />
          ))}
        </div>
      </div>

      {answered && ok ? (
        <FeedbackCard
          tone="correct"
          heading="Correct! +10 XP"
          style={{ marginTop: 14, background: "#0E1A14", borderColor: "#07C874" }}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPicked(null)}
              style={{
                background: "rgba(252,245,239,0.08)",
                color: "#FCF5EF",
                alignSelf: "flex-start",
              }}
            >
              Try again
            </Button>
          }
        >
          In Portuguese, “não” goes right before the verb: não gosta de chá.
        </FeedbackCard>
      ) : null}

      {answered && !ok ? (
        <FeedbackCard
          tone="wrong"
          heading="Not quite — it’s “não gosta”"
          style={{ marginTop: 14, background: "#1E1112", borderColor: "#FF6467" }}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPicked(null)}
              style={{
                background: "rgba(252,245,239,0.08)",
                color: "#FCF5EF",
                alignSelf: "flex-start",
              }}
            >
              Try again
            </Button>
          }
        >
          The negative sits before the verb: não gosta de chá. This one would
          come back in tomorrow’s review.
        </FeedbackCard>
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

  const signedIn = Boolean(session?.user);
  /** Unauthenticated Start goes to auth; signed-in users land on the map. */
  const startHref = signedIn ? "/map" : "/sign-in?next=/map";

  useEffect(() => {
    if (sessionPending) return;
    if (signedIn) {
      router.replace("/map");
    }
  }, [signedIn, sessionPending, router]);

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
            className="btn-ghost border-[#FCF5EF]/12 bg-[#FCF5EF]/[0.06] text-[#FCF5EF]"
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
              href={startHref}
              className="btn-primary gap-2.5 px-6 text-[15px]"
              data-testid="landing-start"
            >
              Start learning free
            </Link>
            <SocialAuthButton
              disabled={!googleEnabled || googlePending}
              needsKeys={!googleEnabled}
              onClick={() => void onGoogle()}
              data-testid="landing-google"
              className="w-auto"
            />
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
            href={startHref}
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
