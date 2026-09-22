type Props = {
  label: string;
  selected?: boolean;
  state?: "default" | "selected" | "correct" | "incorrect" | "revealed";
  onClick?: () => void;
  disabled?: boolean;
};

const stateClass: Record<NonNullable<Props["state"]>, string> = {
  default: "border-ink/10 bg-surface-card",
  selected: "border-info bg-info/10",
  correct: "border-success bg-success/10 text-success",
  incorrect: "border-error bg-error/10 text-error",
  revealed: "border-dashed border-success text-success",
};

export function ChoiceOption({
  label,
  selected,
  state = "default",
  onClick,
  disabled,
}: Props) {
  const resolved = state === "default" && selected ? "selected" : state;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`card-surface flex min-h-tap w-full items-center px-4 py-3 text-left text-base font-medium transition duration-fast ${stateClass[resolved]}`}
    >
      {label}
      {state === "revealed" ? (
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wide">
          Resposta
        </span>
      ) : null}
    </button>
  );
}
