"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteTemplate, renameTemplate, type TemplateFormState } from "./actions";
import { DeleteButton } from "@/components/delete-button";
import { FormError, SubmitButton, useFormAction } from "@/components/form";
import { inputClass, labelClass, linkClass, primaryButtonClass } from "@/components/styles";

export type TemplateCard = {
  id: number;
  name: string;
  description: string;
  href: string;
};

// The saved reports above the filters. Opening one applies its filters;
// saving lives in the filter panel, next to the download button.
export function Templates({
  templates,
  activeId,
}: {
  templates: TemplateCard[];
  activeId: number | null;
}) {
  if (templates.length === 0) {
    return (
      <p className="border border-dashed border-line bg-surface px-5 py-6 text-center font-serif text-[17px] text-muted">
        Nenhum modelo salvo. Monte um relatório abaixo e use &quot;Salvar como novo modelo&quot; para abrir com um clique.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {templates.map((template) => (
        <TemplateItem key={template.id} template={template} active={template.id === activeId} />
      ))}
    </ul>
  );
}

function TemplateItem({ template, active }: { template: TemplateCard; active: boolean }) {
  const [renaming, setRenaming] = useState(false);

  return (
    <li
      className={`flex flex-col justify-between gap-3 border bg-surface p-4 transition-colors ${
        active ? "border-ink shadow-[inset_0_0_0_1px_var(--ink)]" : "border-line hover:border-muted"
      }`}
    >
      {renaming ? (
        <RenameForm template={template} onDone={() => setRenaming(false)} />
      ) : (
        <Link
          href={template.href}
          aria-current={active ? "true" : undefined}
          className="flex flex-col gap-1.5 outline-offset-4"
        >
          <span className="text-base leading-snug tracking-[-0.01em]">{template.name}</span>
          <span className="text-[13px] leading-snug text-muted">{template.description}</span>
        </Link>
      )}
      {!renaming && (
        <div className="flex gap-4 text-sm">
          <button type="button" onClick={() => setRenaming(true)} className={linkClass}>
            Renomear
          </button>
          <DeleteButton
            action={deleteTemplate.bind(null, template.id)}
            label="Excluir"
            confirmMessage={`Excluir o modelo "${template.name}"? Os dados não são apagados, só o modelo.`}
            variant="link"
          />
        </div>
      )}
    </li>
  );
}

function RenameForm({ template, onDone }: { template: TemplateCard; onDone: () => void }) {
  const [state, formProps, pending] = useFormAction(
    async (prevState: TemplateFormState, formData: FormData) => {
      const result = await renameTemplate(template.id, prevState, formData);
      if (result?.saved) onDone();
      return result;
    }
  );

  return (
    <form {...formProps} className="flex flex-col gap-2">
      <label htmlFor={`template-name-${template.id}`} className={labelClass}>
        Nome do modelo
      </label>
      <input
        id={`template-name-${template.id}`}
        name="name"
        required
        autoFocus
        maxLength={80}
        defaultValue={template.name}
        className={`${inputClass} h-9`}
      />
      <FormError error={state?.error} />
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} className={`${primaryButtonClass} h-9 px-3 text-sm`} />
        <button type="button" onClick={onDone} className={`${linkClass} text-sm`}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
