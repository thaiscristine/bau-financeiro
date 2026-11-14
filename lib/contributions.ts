import "server-only";
import { and, asc, eq, gte, isNull, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, contributions, entries, kids } from "@/db/schema";
import { PAYING_AGE_GROUPS, paysMonthlyFee, type AgeGroup } from "@/lib/age-groups";
import {
  DEFAULT_CONTRIBUTION_MONTHS,
  planContributionYear,
} from "@/lib/contribution-months";
import type { DateRange } from "@/lib/dashboard-period";

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

type FeeState = { ageGroup: AgeGroup | null; monthlyFee: string | null };

function currentMonth(today: string) {
  return `${today.slice(0, 7)}-01`;
}

const isDefaultMonth = sql`extract(month from ${contributions.month}) in (${sql.raw(
  DEFAULT_CONTRIBUTION_MONTHS.join(", ")
)})`;

// Keeps a kid's months in step with a change to their age group or fee. Only
// unpaid months from the current one on change; the past stays as it was.
// Starting to pay creates this year's months from now on and all of next year.
export async function syncKidContributions(
  tx: Executor,
  kidId: number,
  before: FeeState | null,
  after: FeeState,
  today: string
) {
  const wasPaying = before !== null && paysMonthlyFee(before.ageGroup) && before.monthlyFee !== null;
  const isPaying = paysMonthlyFee(after.ageGroup) && after.monthlyFee !== null;
  const from = currentMonth(today);
  const upcomingUnpaid = and(
    eq(contributions.kidId, kidId),
    isNull(contributions.entryId),
    gte(contributions.month, from)
  );

  if (isPaying) {
    const year = Number(today.slice(0, 4));
    const rows = [
      ...planContributionYear(year, Number(today.slice(5, 7))),
      ...planContributionYear(year + 1),
    ].map((row) => ({ ...row, kidId, amount: after.monthlyFee! }));
    await tx.insert(contributions).values(rows).onConflictDoNothing();
    await tx
      .update(contributions)
      // Resuming brings back the usual months, which stopping had switched off
      .set(wasPaying ? { amount: after.monthlyFee! } : { amount: after.monthlyFee!, due: isDefaultMonth })
      .where(upcomingUnpaid);
  } else if (wasPaying) {
    await tx.update(contributions).set({ due: false }).where(upcomingUnpaid);
  }
}

// Every paying kid has this year's and next year's months, so a new year needs
// no setup. A kid already set up keeps their months as they are; one with none
// in a year gets all its usual months. Cheap and idempotent, so the pages that
// read contributions run it first.
export async function ensureContributions(today: string) {
  const year = Number(today.slice(0, 4));
  await db.execute(sql`
    insert into ${contributions} (kid_id, month, amount, due)
    select ${kids.id}, months.month, ${kids.monthlyFee},
      extract(month from months.month) in (${sql.raw(DEFAULT_CONTRIBUTION_MONTHS.join(", "))})
    from ${kids}
    cross join generate_series(${`${year}-01-01`}::date, ${`${year + 1}-12-01`}::date, interval '1 month') as months(month)
    where ${kids.monthlyFee} is not null
      and ${kids.ageGroup} in (${sql.join(PAYING_AGE_GROUPS.map((group) => sql`${group}`), sql`, `)})
    on conflict do nothing
  `);
}

export async function listKidContributions(kidId: number, year: number) {
  return db
    .select({
      id: contributions.id,
      month: contributions.month,
      amount: contributions.amount,
      due: contributions.due,
      entryId: contributions.entryId,
      linkedEntry: contributions.linkedEntry,
      paidDate: entries.entryDate,
      paidAmount: entries.amount,
    })
    .from(contributions)
    .leftJoin(entries, eq(entries.id, contributions.entryId))
    .where(
      and(
        eq(contributions.kidId, kidId),
        gte(contributions.month, `${year}-01-01`),
        lte(contributions.month, `${year}-12-01`)
      )
    )
    .orderBy(asc(contributions.month));
}

export async function listContributionYears(kidId: number) {
  const rows = await db
    .selectDistinct({ year: sql<number>`extract(year from ${contributions.month})::int` })
    .from(contributions)
    .where(eq(contributions.kidId, kidId))
    .orderBy(sql`1`);
  return rows.map((row) => row.year);
}

// The kid's contribution entries that no month points to yet, such as the ones
// recorded before months existed
export async function listUnlinkedContributionEntries(kidId: number) {
  return db
    .select({
      id: entries.id,
      amount: entries.amount,
      entryDate: entries.entryDate,
      note: entries.note,
      categoryName: categories.name,
    })
    .from(entries)
    .innerJoin(categories, eq(categories.id, entries.categoryId))
    .leftJoin(contributions, eq(contributions.entryId, entries.id))
    .where(and(eq(entries.kidId, kidId), isNull(contributions.id)))
    .orderBy(asc(entries.entryDate), asc(entries.id));
}

// Unpaid months that overlap the range, added up per age group in age order,
// with the kids who have no age group last (ageGroup null)
export async function getContributionsByAgeGroup(today: string, range: DateRange) {
  const late = lt(contributions.month, currentMonth(today));
  const rows = await db
    .select({
      ageGroup: kids.ageGroup,
      count: sql<number>`count(*)::int`,
      pending: sql<string>`sum(${contributions.amount})`,
      overdue: sql<string>`coalesce(sum(${contributions.amount}) filter (where ${late}), 0)`,
    })
    .from(contributions)
    .innerJoin(kids, eq(kids.id, contributions.kidId))
    .where(
      and(
        eq(contributions.due, true),
        isNull(contributions.entryId),
        gte(contributions.month, currentMonth(range.from)),
        lte(contributions.month, range.to)
      )
    )
    .groupBy(kids.ageGroup)
    // Enum values sort in declaration order, which is age order
    .orderBy(sql`${kids.ageGroup} asc nulls last`);

  return rows.map((row) => ({
    ageGroup: row.ageGroup,
    count: row.count,
    pending: Number(row.pending),
    overdue: Number(row.overdue),
  }));
}

// Monthly contributions are recorded in the category that requires a kid.
// Categorias allows only one, so the payment always knows where to go.
export async function contributionCategoryId(tx: Executor) {
  const rows = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.requiresKid, true))
    .limit(2);
  return rows.length === 1 ? rows[0].id : null;
}
