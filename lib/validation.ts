import { z } from "zod";

const id = (message: string) =>
  z.coerce.number({ error: message }).int({ error: message }).positive({ error: message });

const money = z.coerce
  .number({ error: "Informe um valor numérico." })
  .positive({ error: "Informe um valor maior que zero." });

// An empty input means "not informed" instead of zero
const optionalMoney = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  money.optional()
);

const requiredDate = z.string().min(1, { error: "Informe a data." });

const optionalText = z.string().trim().optional();

export const entryFormSchema = z.object({
  type: z.enum(["income", "cost"], { error: "Selecione o tipo." }),
  amount: money,
  categoryId: id("Selecione a categoria."),
  counterparty: optionalText,
  kidId: id("Selecione o bandeirante.").optional(),
  entryDate: requiredDate,
  note: optionalText,
});

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Informe o nome da categoria." }),
});

export const kidFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Informe o nome." }),
  contact: optionalText,
});

export const itemFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Informe o nome do item." }),
  categoryId: id("Selecione a categoria."),
  price: money,
  tracksStock: z.boolean(),
});

export const STOCK_MOVEMENT_REASONS = ["restock", "adjustment"] as const;

export const STOCK_MOVEMENT_REASON_LABELS: Record<
  "restock" | "sale" | "adjustment",
  string
> = {
  restock: "Reposição",
  sale: "Venda",
  adjustment: "Ajuste",
};

export const stockMovementFormSchema = z
  .object({
    reason: z.enum(STOCK_MOVEMENT_REASONS, { error: "Selecione o motivo." }),
    quantity: z.coerce
      .number({ error: "Informe a quantidade." })
      .int({ error: "A quantidade deve ser um número inteiro." })
      .refine((value) => value !== 0, {
        error: "A quantidade não pode ser zero.",
      }),
    movementDate: requiredDate,
    note: optionalText,
    // What was paid for a restock; when set, a cost entry is recorded
    cost: optionalMoney,
    supplier: optionalText,
    costCategoryId: id("Selecione a categoria da saída.").optional(),
  })
  .refine((value) => value.reason !== "restock" || value.quantity > 0, {
    error: "Uma reposição precisa de quantidade positiva.",
  })
  .refine((value) => value.cost === undefined || value.reason === "restock", {
    error: "Só uma reposição pode ter valor pago.",
  })
  .refine((value) => value.cost === undefined || Boolean(value.supplier), {
    error: "Informe o fornecedor de quem a compra foi feita.",
  })
  .refine((value) => value.cost === undefined || value.costCategoryId !== undefined, {
    error: "Selecione a categoria da saída.",
  });

// Value of the buyer select that registers a new bandeirante with the sale
export const NEW_KID = "new";

export const saleBuyerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("existing"), kidId: id("Selecione o bandeirante.") }),
  z.object({
    kind: z.literal("new"),
    name: z.string().trim().min(1, { error: "Informe o nome do novo bandeirante." }),
    contact: optionalText,
  }),
]);

export const saleFormSchema = z.object({
  itemId: id("Selecione o item."),
  quantity: z.coerce
    .number({ error: "Informe a quantidade." })
    .int({ error: "A quantidade deve ser um número inteiro." })
    .positive({ error: "A quantidade deve ser maior que zero." }),
  unitPrice: money,
  installmentCount: z.coerce
    .number({ error: "Informe o número de parcelas." })
    .int({ error: "O número de parcelas deve ser inteiro." })
    .min(1, { error: "Informe pelo menos 1 parcela." })
    .max(24, { error: "Use no máximo 24 parcelas." }),
  saleDate: requiredDate,
  firstDueDate: requiredDate,
  note: optionalText,
});

export const paymentFormSchema = z.object({
  paidDate: requiredDate,
});

// Returns the first validation message, or the parsed data
export function parseForm<T extends z.ZodType>(
  schema: T,
  input: unknown
):
  | { ok: true; data: z.infer<T> }
  | { ok: false; error: string } {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }
  return { ok: true, data: parsed.data };
}
