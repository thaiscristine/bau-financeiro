"use client";

import Link from "next/link";
import { useState } from "react";
import { createTemplate, updateTemplateFilters } from "./actions";
import { FormError, SubmitButton, useFormAction } from "@/components/form";
import {
  hintClass,
  inputClass,
  labelClass,
  linkClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/styles";

export type OpenTemplate = {
  id: number;
  name: string;
  href: string;
  // The filters on screen differ from the saved ones
  modified: boolean;
};

// Saving next to the download button, where the filters are being tuned:
// into the open template when it was changed, or as a new template
export function TemplateSave({ template, query }: { template: OpenTemplate | null; query: string }) {
  const [naming, setNaming] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {template?.modified && !naming && (
        <div className="flex flex-col gap-3 border border-pending/40 bg-pending/5 p-3">
          <p className="text-[14px] leading-snug">
            Filtros diferentes do modelo <span className="font-medium">{template.name}</span>.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <form action={updateTemplateFilters.bind(null, template.id, query)}>
              <SubmitButton
                label="Salvar no modelo"
                pendingLabel="Salvando..."
                className={`${primaryButtonClass} h-9 px-3 text-sm`}
              />
            </form>
            <Link href={template.href} className={`${linkClass} text-sm`}>
              Desfazer
            </Link>
          </div>
        </div>
      )}
      {naming ? (
        <NewTemplateForm query={query} onCancel={() => setNaming(false)} />
      ) : (
        <button type="button" onClick={() => setNaming(true)} className={`${secondaryButtonClass} h-10`}>
          Salvar como novo modelo
        </button>
      )}
    </div>
  );
}

function NewTemplateForm({ query, onCancel }: { query: string; onCancel: () => void }) {
  const [state, formProps, pending] = useFormAction(createTemplate);

  return (
    <form {...formProps} className="flex flex-col gap-2">
      <label htmlFor="new-template-name" className={labelClass}>
        Nome do novo modelo
      </label>
      <input type="hidden" name="query" value={query} />
      <input
        id="new-template-name"
        name="name"
        required
        autoFocus
        maxLength={80}
        placeholder="Ex.: Doações do semestre"
        className={inputClass}
      />
      <p className={hintClass}>Salva os filtros e as opções da planilha que estão na tela.</p>
      <FormError error={state?.error} />
      <div className="flex items-center gap-3">
        <SubmitButton
          pending={pending}
          label="Salvar modelo"
          className={`${primaryButtonClass} h-9 px-3 text-sm`}
        />
        <button type="button" onClick={onCancel} className={`${linkClass} text-sm`}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
