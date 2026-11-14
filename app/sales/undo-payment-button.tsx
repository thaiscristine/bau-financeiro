"use client";

import { SubmitButton } from "@/components/form";
import { linkClass } from "@/components/styles";

export function UndoPaymentButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Desfazer este pagamento? A transação de entrada correspondente será excluída."
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton label="Desfazer" pendingLabel="Desfazendo..." className={linkClass} />
    </form>
  );
}
