"use client";

import { useFormStatus } from "react-dom";
import { dangerButtonClass } from "./styles";

const STYLES = {
  // Full-width button at the bottom of an edit page
  button: {
    form: "flex max-w-xl",
    button: `${dangerButtonClass} h-11 w-full`,
  },
  // Inline text action in a table
  link: {
    form: "inline",
    button: "text-cost underline-offset-4 hover:underline disabled:opacity-60",
  },
};

export function DeleteButton({
  action,
  label,
  confirmMessage,
  variant = "button",
}: {
  action: () => Promise<void>;
  label: string;
  confirmMessage: string;
  variant?: keyof typeof STYLES;
}) {
  const styles = STYLES[variant];

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      className={styles.form}
    >
      <SubmitButton className={styles.button} idleLabel={label} />
    </form>
  );
}

function SubmitButton({
  className,
  idleLabel,
}: {
  className: string;
  idleLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Excluindo..." : idleLabel}
    </button>
  );
}
