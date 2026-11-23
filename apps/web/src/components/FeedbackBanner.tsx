import { FeedbackCard } from "@/kuji";

type Props = {
  correct: boolean;
  message: string;
};

/** Post-answer banner using Kuji FeedbackCard. */
export function FeedbackBanner({ correct, message }: Props) {
  return (
    <FeedbackCard
      role="status"
      tone={correct ? "correct" : "wrong"}
      heading={correct ? "Correct" : "Not quite"}
      style={{ marginTop: 16 }}
    >
      {message}
    </FeedbackCard>
  );
}
