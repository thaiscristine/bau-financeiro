export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";

// Drizzle wraps the driver error, which carries the Postgres code in `cause`
export function pgErrorCode(error: unknown) {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return cause?.code ?? (error as { code?: string })?.code;
}
