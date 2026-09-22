type Props = {
  correct: boolean;
  message: string;
};

export function FeedbackBanner({ correct, message }: Props) {
  return (
    <div
      role="status"
      className={`mt-4 rounded-lg border px-4 py-3 text-sm font-medium ${
        correct
          ? "border-success/40 bg-success/10 text-success"
          : "border-error/40 bg-error/10 text-error"
      }`}
    >
      <p className="font-bold uppercase tracking-wide">
        {correct ? "Correct" : "Not quite"}
      </p>
      <p className="mt-1 text-ink">{message}</p>
    </div>
  );
}
