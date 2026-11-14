// The age group (ramo) a bandeirante belongs to, in age order. Stored as a
// Postgres enum, so adding one needs a migration.
export const AGE_GROUPS = [
  "ciranda",
  "b1",
  "b2",
  "guias",
  "gas",
  "coordenacao",
] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  ciranda: "Ciranda",
  b1: "B1",
  b2: "B2",
  guias: "Guias",
  gas: "GAs",
  coordenacao: "Coordenadores/Diretoria",
};
