export const PAGE_SIZE = 20;

// Reads the 1-based page number from a search param. Anything that is not a
// positive integer falls back to the first page.
export function parsePage(value: string | string[] | undefined) {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

// An empty list still has one (empty) page
export function pageCount(total: number, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}
