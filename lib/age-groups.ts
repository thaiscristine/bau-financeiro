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

// The CSS background of each age group's swatch. GAs are striped burgundy and
// white: they are moving on from Guias to the adult coordination.
export const AGE_GROUP_COLORS: Record<AgeGroup, string> = {
  ciranda: "var(--ramo-ciranda)",
  b1: "var(--ramo-b1)",
  b2: "var(--ramo-b2)",
  guias: "var(--ramo-guias)",
  gas: "repeating-linear-gradient(135deg, var(--ramo-guias) 0 2px, var(--ramo-white) 2px 4px)",
  coordenacao: "var(--ramo-coordenacao)",
};

// Everyone but the coordination pays the contribuição mensal
export const PAYING_AGE_GROUPS: readonly AgeGroup[] = AGE_GROUPS.filter(
  (group) => group !== "coordenacao"
);

export function paysMonthlyFee(ageGroup: AgeGroup | null | undefined) {
  return ageGroup != null && PAYING_AGE_GROUPS.includes(ageGroup);
}

// The ?ramo= filter on the bandeirantes list: an age group, or "sem" for the
// ones without a group
export const NO_AGE_GROUP = "sem";

export type AgeGroupFilter = AgeGroup | typeof NO_AGE_GROUP;

// Anything that is not a known filter means "everyone"
export function parseAgeGroupFilter(
  value: string | string[] | undefined
): AgeGroupFilter | null {
  const filter = Array.isArray(value) ? value[0] : value;
  return filter === NO_AGE_GROUP || AGE_GROUPS.includes(filter as AgeGroup)
    ? (filter as AgeGroupFilter)
    : null;
}
