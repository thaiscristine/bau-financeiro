// What each report shows: its filters, the ways it can be grouped and its
// columns. Plain data, so the filter panel in the browser can use it too.

export const REPORT_TYPES = ["entries", "installments", "sales", "stock"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export type FilterKey =
  | "period"
  | "entryType"
  | "categories"
  | "kid"
  | "createdBy"
  | "search"
  | "statuses"
  | "item"
  | "stockState";

// note is free text: wraps in the spreadsheet and is muted in the preview
export type ColumnKind = "text" | "note" | "date" | "money" | "number";

export type ReportColumn = {
  key: string;
  label: string;
  kind: ColumnKind;
  hiddenByDefault?: boolean;
};

export type ReportGroup = { key: string; label: string };

export type ReportDefinition = {
  type: ReportType;
  title: string;
  description: string;
  sheetName: string;
  fileSlug: string;
  // What the period filters on; null when the report has no period
  periodLabel: string | null;
  // The date column used for the period and the "month" grouping
  dateKey: string | null;
  filters: FilterKey[];
  groups: ReportGroup[];
  columns: ReportColumn[];
  // Summed in each group's subtotal
  totalKey: string | null;
};

const NO_GROUP: ReportGroup = { key: "none", label: "Sem agrupar" };

export const REPORTS: Record<ReportType, ReportDefinition> = {
  entries: {
    type: "entries",
    title: "Transações",
    description: "Tudo que entrou e saiu do caixa",
    sheetName: "Transações",
    fileSlug: "transacoes",
    periodLabel: "Período",
    dateKey: "date",
    filters: ["period", "entryType", "categories", "kid", "createdBy", "search"],
    groups: [
      NO_GROUP,
      { key: "category", label: "Categoria" },
      { key: "month", label: "Mês" },
      { key: "type", label: "Tipo" },
      { key: "kid", label: "Bandeirante" },
    ],
    columns: [
      { key: "date", label: "Data", kind: "date" },
      { key: "type", label: "Tipo", kind: "text" },
      { key: "category", label: "Categoria", kind: "text" },
      // Negative for saídas, so a sum in the spreadsheet is the balance
      { key: "amount", label: "Valor", kind: "money" },
      { key: "counterparty", label: "Pagador / Fornecedor", kind: "text" },
      { key: "kid", label: "Bandeirante", kind: "text" },
      { key: "note", label: "Nota", kind: "note" },
      { key: "createdBy", label: "Registrado por", kind: "text", hiddenByDefault: true },
    ],
    totalKey: "amount",
  },
  installments: {
    type: "installments",
    title: "Parcelas",
    description: "Quem pagou, quem deve e o que está atrasado",
    sheetName: "Parcelas",
    fileSlug: "parcelas",
    periodLabel: "Vencimento",
    dateKey: "dueDate",
    filters: ["period", "statuses", "kid", "item"],
    groups: [
      NO_GROUP,
      { key: "kid", label: "Bandeirante" },
      { key: "status", label: "Situação" },
      { key: "month", label: "Mês de vencimento" },
      { key: "item", label: "Item" },
    ],
    columns: [
      { key: "kid", label: "Bandeirante", kind: "text" },
      { key: "guardian", label: "Responsável", kind: "text" },
      { key: "phone", label: "Telefone", kind: "text" },
      { key: "item", label: "Item", kind: "text" },
      { key: "installment", label: "Parcela", kind: "text" },
      { key: "dueDate", label: "Vencimento", kind: "date" },
      { key: "amount", label: "Valor", kind: "money" },
      { key: "status", label: "Situação", kind: "text" },
      { key: "paidDate", label: "Pago em", kind: "date", hiddenByDefault: true },
    ],
    totalKey: "amount",
  },
  sales: {
    type: "sales",
    title: "Vendas da Lojinha",
    description: "O que foi vendido, para quem e quanto falta receber",
    sheetName: "Vendas",
    fileSlug: "vendas",
    periodLabel: "Período",
    dateKey: "date",
    filters: ["period", "kid", "item"],
    groups: [
      NO_GROUP,
      { key: "item", label: "Item" },
      { key: "kid", label: "Bandeirante" },
      { key: "month", label: "Mês" },
    ],
    columns: [
      { key: "date", label: "Data", kind: "date" },
      { key: "kid", label: "Bandeirante", kind: "text" },
      { key: "item", label: "Item", kind: "text" },
      { key: "quantity", label: "Qtd", kind: "number" },
      { key: "unitPrice", label: "Preço unit.", kind: "money" },
      { key: "total", label: "Total", kind: "money" },
      { key: "paid", label: "Recebido", kind: "money" },
      { key: "open", label: "Falta receber", kind: "money" },
      { key: "note", label: "Nota", kind: "note", hiddenByDefault: true },
    ],
    totalKey: "total",
  },
  stock: {
    type: "stock",
    title: "Estoque",
    description: "Quanto tem de cada item e quanto vale",
    sheetName: "Estoque",
    fileSlug: "estoque",
    periodLabel: null,
    dateKey: null,
    filters: ["stockState", "item"],
    groups: [NO_GROUP],
    columns: [
      { key: "item", label: "Item", kind: "text" },
      { key: "stock", label: "Em estoque", kind: "number" },
      { key: "price", label: "Preço de venda", kind: "money" },
      { key: "averageCost", label: "Custo médio", kind: "money" },
      { key: "costValue", label: "Valor (custo)", kind: "money" },
      { key: "saleValue", label: "Valor (venda)", kind: "money" },
    ],
    totalKey: "saleValue",
  },
};

export const PERIODS = [
  { value: "this-month", label: "Este mês" },
  { value: "last-month", label: "Mês passado" },
  { value: "quarter", label: "Este trimestre" },
  { value: "year", label: "Este ano" },
  { value: "all", label: "Tudo" },
  { value: "custom", label: "Escolher datas" },
] as const;
export type Period = (typeof PERIODS)[number]["value"];

export const INSTALLMENT_STATUSES = [
  { value: "paid", label: "Paga", filterLabel: "Pagas" },
  { value: "open", label: "Em aberto", filterLabel: "Em aberto" },
  { value: "overdue", label: "Atrasada", filterLabel: "Atrasadas" },
] as const;
export type InstallmentStatus = (typeof INSTALLMENT_STATUSES)[number]["value"];

export const STOCK_STATES = [
  { value: "all", label: "Todos" },
  { value: "low", label: "Acabando" },
  { value: "out", label: "Esgotado" },
] as const;
export type StockState = (typeof STOCK_STATES)[number]["value"];

// At or below this many units an item counts as running out
export const LOW_STOCK = 5;

export const ENTRY_TYPES = [
  { value: "all", label: "Ambos" },
  { value: "income", label: "Entradas" },
  { value: "cost", label: "Saídas" },
] as const;
export type EntryTypeFilter = (typeof ENTRY_TYPES)[number]["value"];
