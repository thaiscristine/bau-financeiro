"use client";

import type { ContributionFormState } from "./contribution-actions";
import { FormError, SubmitButton, useFormAction } from "@/components/form";
import { inputClass, secondaryButtonClass } from "@/components/styles";

export function LinkEntryForm({
  action,
  months,
}: {
  action: (state: ContributionFormState, formData: FormData) => Promise<ContributionFormState>;
  months: { id: number; label: string }[];
}) {
  const [state, formProps, pending] = useFormAction(action);

  return (
    <form {...formProps} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="contributionId"
          required
          defaultValue=""
          aria-label="Mês que esta contribuição pagou"
          className={`${inputClass} min-w-0`}
        >
          <option value="" disabled>
            Qual mês pagou?
          </option>
          {months.map((month) => (
            <option key={month.id} value={month.id}>
              {month.label}
            </option>
          ))}
        </select>
        <SubmitButton
          pending={pending}
          label="Ligar ao mês"
          pendingLabel="Salvando..."
          className={secondaryButtonClass}
        />
      </div>
      <FormError error={state?.error} />
    </form>
  );
}
