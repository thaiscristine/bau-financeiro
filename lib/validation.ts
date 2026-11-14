import { z } from "zod";
import { AGE_GROUPS } from "./age-groups";
import { PAYMENT_METHODS } from "./payment-methods";
import { FUND_STATUSES, NO_FUND_REQUEST } from "./fund";

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

// The select's empty option means "not informed"
const optionalAgeGroup = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.enum(AGE_GROUPS, { error: "Selecione um ramo da lista." }).optional()
);

const paymentMethod = z.enum(PAYMENT_METHODS, {
  error: "Selecione a forma de pagamento.",
});

const installmentCount = z.coerce
  .number({ error: "Informe o número de parcelas." })
  .int({ error: "O número de parcelas deve ser inteiro." })
  .min(1, { error: "Informe pelo menos 1 parcela." })
  .max(24, { error: "Use no máximo 24 parcelas." });

export const entryFormSchema = z.object({
  type: z.enum(["income", "cost"], { error: "Selecione o tipo." }),
  amount: money,
  categoryId: id("Selecione a categoria."),
  counterparty: optionalText,
  kidId: id("Selecione o bandeirante.").optional(),
  paymentMethod,
  entryDate: requiredDate,
  note: optionalText,
});

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Informe o nome da categoria." }),
});

export const reportTemplateFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "Informe o nome do modelo." })
    .max(80, { error: "Use no máximo 80 caracteres no nome." }),
});

// bcrypt ignores everything after the first 72 bytes, so longer passwords
// would quietly match any other password that starts the same way. Accented
// letters take two bytes, which the message mentions.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, {
    error: `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  })
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, {
    error: `A senha pode ter no máximo ${PASSWORD_MAX_BYTES} caracteres (letras com acento contam como dois).`,
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Informe um e-mail válido." }));

export const userFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Informe o nome." }),
  email: emailSchema,
  password: newPasswordSchema,
});

export const passwordChangeFormSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Informe a senha atual." }),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    error: "A confirmação não é igual à nova senha.",
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    error: "A nova senha precisa ser diferente da atual.",
  });

export const passwordResetFormSchema = z.object({
  userId: id("Selecione a pessoa."),
  newPassword: newPasswordSchema,
  ownPassword: z.string().min(1, { error: "Informe a sua senha." }),
});

export const kidFormSchema = z
  .object({
    name: z.string().trim().min(1, { error: "Informe o nome." }),
    contact: optionalText,
    ageGroup: optionalAgeGroup,
    monthlyFee: optionalMoney,
    isMinor: z.boolean(),
    guardianName: optionalText,
    guardianPhone: optionalText,
  })
  .refine((value) => !value.isMinor || Boolean(value.guardianName), {
    error: "Informe o nome do responsável.",
  })
  .refine((value) => !value.isMinor || Boolean(value.guardianPhone), {
    error: "Informe o telefone do responsável.",
  });

export const itemFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Informe o nome do item." }),
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
    // The select's empty option means "not informed"
    paymentMethod: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      paymentMethod.optional()
    ),
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
  })
  .refine((value) => value.cost === undefined || value.paymentMethod !== undefined, {
    error: "Selecione a forma de pagamento da compra.",
  });

// Value of the buyer select that registers a new bandeirante with the sale
export const NEW_KID = "new";

export const saleBuyerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("existing"), kidId: id("Selecione o bandeirante.") }),
  z.object({
    kind: z.literal("new"),
    name: z.string().trim().min(1, { error: "Informe o nome do novo bandeirante." }),
    contact: optionalText,
    ageGroup: optionalAgeGroup,
  }),
]);

export const saleFormSchema = z.object({
  itemId: id("Selecione o item."),
  quantity: z.coerce
    .number({ error: "Informe a quantidade." })
    .int({ error: "A quantidade deve ser um número inteiro." })
    .positive({ error: "A quantidade deve ser maior que zero." }),
  unitPrice: money,
  installmentCount,
  saleDate: requiredDate,
  firstDueDate: requiredDate,
  note: optionalText,
});

export const eventFormSchema = z
  .object({
    name: z.string().trim().min(1, { error: "Informe o nome do evento." }),
    startDate: requiredDate,
    // Empty for a one-day event
    endDate: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.string().optional()
    ),
    price: money,
    note: optionalText,
  })
  .refine((value) => !value.endDate || value.endDate >= value.startDate, {
    error: "A data de término não pode ser antes do início.",
  });

// Value of the participant select that signs up a guest by name
export const GUEST = "guest";

export const participantSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("kid"), kidId: id("Selecione o bandeirante.") }),
  z.object({
    kind: z.literal("guest"),
    guestName: z.string().trim().min(1, { error: "Informe o nome do convidado." }),
  }),
]);

// Fundo Lisah: not asked for (undefined), asked for, granted with an amount, or denied
const fundFields = {
  fundStatus: z.preprocess(
    (value) => (value === NO_FUND_REQUEST || value === "" || value === null ? undefined : value),
    z.enum(FUND_STATUSES, { error: "Selecione a situação do Fundo Lisah." }).optional()
  ),
  fundAmount: optionalMoney,
};

const fundAmountWhenGranted = {
  check: (value: { fundStatus?: string; fundAmount?: number }) =>
    value.fundStatus !== "granted" || value.fundAmount !== undefined,
  message: { error: "Informe quanto o Fundo Lisah concedeu." },
};

export const participantFormSchema = z
  .object({
    total: money,
    installmentCount,
    firstDueDate: requiredDate,
    note: optionalText,
    ...fundFields,
  })
  .refine(fundAmountWhenGranted.check, fundAmountWhenGranted.message);

export const participantFundFormSchema = z
  .object(fundFields)
  .refine(fundAmountWhenGranted.check, fundAmountWhenGranted.message);

export const eventChargeFormSchema = z.object({
  name: z.string().trim().min(1, { error: "Informe o nome da cobrança." }),
  price: money,
});

export const chargeSignUpFormSchema = z.object({
  participantId: id("Selecione o participante."),
  total: money,
  installmentCount,
  firstDueDate: requiredDate,
});

export const EXPENSE_STATUSES = ["paid", "pending"] as const;

export const eventExpenseFormSchema = z
  .object({
    description: z.string().trim().min(1, { error: "Informe a despesa." }),
    kind: optionalText,
    amount: money,
    expenseDate: requiredDate,
    supplier: optionalText,
    note: optionalText,
    status: z.enum(EXPENSE_STATUSES, { error: "Informe se a despesa já foi paga." }),
    // The select's empty option means "not informed"
    paymentMethod: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      paymentMethod.optional()
    ),
  })
  .refine((value) => value.status !== "paid" || value.paymentMethod !== undefined, {
    error: "Selecione a forma de pagamento.",
  });

export const paymentFormSchema = z.object({
  paidDate: requiredDate,
  paymentMethod,
});

export const contributionLinkFormSchema = z.object({
  contributionId: id("Selecione o mês."),
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
