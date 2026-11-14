"use client";

import { SubmitButton } from "@/components/form";
import { linkClass } from "@/components/styles";

export function UndoPaymentButton({
  action,
  label = "Desfazer",
  confirmMessage = "Desfazer este pagamento? A transação de entrada correspondente será excluída.",
}: {
  action: () => Promise<void>;
  label?: string;
  confirmMessage?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton label={label} pendingLabel="Desfazendo..." className={linkClass} />
    </form>
  );
}
