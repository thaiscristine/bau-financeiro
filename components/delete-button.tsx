"use client";

import { useFormStatus } from "react-dom";

const STYLES = {
  // Full-width button at the bottom of an edit page
  button: {
    form: "max-w-xl border-t border-zinc-200 pt-6 dark:border-zinc-800",
    button:
      "w-full rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:hover:bg-red-950",
  },
  // Inline text action in a table
  link: {
    form: "inline",
    button:
      "text-red-600 underline-offset-4 hover:underline disabled:opacity-60",
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
