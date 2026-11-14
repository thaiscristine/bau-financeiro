// Fundo Lisah helps kids with an event's fee. It works as a discount: a granted
// amount comes off what the participant owes, and no money moves. Stored as a
// Postgres enum, so adding a status needs a migration.
export const FUND_NAME = "Fundo Lisah";

export const FUND_STATUSES = ["requested", "granted", "denied"] as const;

export type FundStatus = (typeof FUND_STATUSES)[number];

export const FUND_STATUS_LABELS: Record<FundStatus, string> = {
  requested: "Pediu, aguardando",
  granted: "Concedido",
  denied: "Negado",
};

// The form's value for a participant who didn't ask for the fund (null in the database)
export const NO_FUND_REQUEST = "none";
