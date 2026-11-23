import { CheckIcon, CrossIcon } from "@/kuji";

type Props = {
  label: string;
  selected?: boolean;
  state?: "default" | "selected" | "correct" | "incorrect" | "revealed" | "dim";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
};

/** Choice card states from PassaporteItems template (chunky 4px under-edge). */
const stateClass: Record<NonNullable<Props["state"]>, string> = {
  default: "border-ink/10 bg-surface-card font-semibold hover:bg-ink/[0.09]",
  selected: "border-info bg-info/15 font-bold",
  correct: "justify-between border-success bg-success/12 font-bold",
  incorrect: "justify-between border-error bg-error/12 font-bold",
  revealed:
    "justify-between border-dashed border-success bg-transparent font-bold text-success",
  dim: "border-ink/[0.06] bg-ink/[0.03] font-medium text-ink-faint",
};

export function ChoiceOption({
  label,
  selected,
  state = "default",
  onClick,
  disabled,
  className = "",
  "data-testid": testId,
}: Props) {
  const resolved = state === "default" && selected ? "selected" : state;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
      className={`card-surface flex min-h-[56px] w-full items-center px-4 py-3.5 text-left text-[17px] leading-snug transition duration-fast ease-out ${stateClass[resolved]} ${className}`}
    >
      <span>{label}</span>
      {resolved === "correct" ? (
        <span className="ml-auto text-success" aria-hidden>
          <CheckIcon size={18} />
        </span>
      ) : null}
      {resolved === "incorrect" ? (
        <span className="ml-auto text-error" aria-hidden>
          <CrossIcon size={18} />
        </span>
      ) : null}
      {resolved === "revealed" ? (
        <span className="ml-auto rounded-pill bg-success/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-success">
          Answer
        </span>
      ) : null}
    </button>
  );
}
