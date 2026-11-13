import { z } from "zod";

export const CATEGORIES = ["vendas", "fornecedores", "aluguel", "outros"] as const;

export const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  vendas: "Vendas",
  fornecedores: "Fornecedores",
  aluguel: "Aluguel",
  outros: "Outros",
};

export const entryFormSchema = z.object({
  type: z.enum(["income", "cost"], { error: "Selecione o tipo." }),
  amount: z.coerce
    .number({ error: "Informe um valor numérico." })
    .positive({ error: "Informe um valor maior que zero." }),
  category: z.enum(CATEGORIES, { error: "Selecione a categoria." }),
  entryDate: z.string().min(1, { error: "Informe a data." }),
  note: z.string().trim().optional(),
});

export type EntryFormValues = z.infer<typeof entryFormSchema>;
