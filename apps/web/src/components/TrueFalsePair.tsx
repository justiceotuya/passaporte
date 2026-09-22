type Props = {
  value: "true" | "false";
  selected?: boolean;
  state?: "default" | "selected" | "correct" | "incorrect";
  onClick?: () => void;
  disabled?: boolean;
};

export function TrueFalsePair({
  onSelect,
  selected,
  correctValue,
  locked,
}: {
  onSelect: (value: "true" | "false") => void;
  selected?: "true" | "false" | null;
  correctValue?: "true" | "false";
  locked?: boolean;
}) {
  function stateFor(value: "true" | "false"): Props["state"] {
    if (!locked) {
      return selected === value ? "selected" : "default";
    }
    if (correctValue === value) return "correct";
    if (selected === value && selected !== correctValue) return "incorrect";
    return "default";
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <TrueFalseButton
        value="true"
        label="Verdadeiro"
        state={stateFor("true")}
        disabled={locked}
        onClick={() => onSelect("true")}
      />
      <TrueFalseButton
        value="false"
        label="Falso"
        state={stateFor("false")}
        disabled={locked}
        onClick={() => onSelect("false")}
      />
    </div>
  );
}

function TrueFalseButton({
  label,
  state = "default",
  onClick,
  disabled,
}: {
  value: "true" | "false";
  label: string;
  state?: Props["state"];
  onClick?: () => void;
  disabled?: boolean;
}) {
  const classes = {
    default: "border-ink/10 bg-surface-card",
    selected: "border-info bg-info/10",
    correct: "border-success bg-success/10 text-success",
    incorrect: "border-error bg-error/10 text-error",
  }[state];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`card-surface min-h-tap px-4 py-4 text-center text-base font-bold ${classes}`}
    >
      {label}
    </button>
  );
}
