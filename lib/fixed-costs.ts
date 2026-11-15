import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, fixedCostMonths, fixedCosts } from "@/db/schema";
import type { DateRange } from "@/lib/dashboard-period";
import { isFixedCostLate } from "@/lib/fixed-cost-months";

export function currentMonth(today: string) {
  return `${today.slice(0, 7)}-01`;
}

// Every fixed cost has its months from the one it started up to the current
// one, or the one it ended. A month is created at the cost's usual amount;
// changing the cost later leaves it as it was. Cheap and idempotent, so the
// pages that read fixed costs run it first.
export async function ensureFixedCostMonths(today: string) {
  await db.execute(sql`
    insert into ${fixedCostMonths} (fixed_cost_id, month, amount)
    select ${fixedCosts.id}, months.month, ${fixedCosts.amount}
    from ${fixedCosts}
    cross join lateral generate_series(
      ${fixedCosts.startMonth},
      least(coalesce(${fixedCosts.endMonth}, ${currentMonth(today)}::date), ${currentMonth(today)}::date),
      interval '1 month'
    ) as months(month)
    on conflict do nothing
  `);
}

// The costs charged in a month, by due day, with how each was paid
export async function listMonthFixedCosts(month: string) {
  return db
    .select({
      monthId: fixedCostMonths.id,
      costId: fixedCosts.id,
      name: fixedCosts.name,
      supplier: fixedCosts.supplier,
      dueDay: fixedCosts.dueDay,
      variable: fixedCosts.variable,
      month: fixedCostMonths.month,
      amount: fixedCostMonths.amount,
      entryId: fixedCostMonths.entryId,
      paidDate: entries.entryDate,
      paymentMethod: entries.paymentMethod,
    })
    .from(fixedCostMonths)
    .innerJoin(fixedCosts, eq(fixedCosts.id, fixedCostMonths.fixedCostId))
    .leftJoin(entries, eq(entries.id, fixedCostMonths.entryId))
    .where(eq(fixedCostMonths.month, month))
    .orderBy(asc(fixedCosts.dueDay), asc(fixedCosts.name));
}

// Every month of the given ones, of every cost charged in any of them, for
// the side-by-side history
export async function listFixedCostHistory(months: string[]) {
  const rows = await db
    .select({
      costId: fixedCosts.id,
      name: fixedCosts.name,
      dueDay: fixedCosts.dueDay,
      month: fixedCostMonths.month,
      amount: fixedCostMonths.amount,
      entryId: fixedCostMonths.entryId,
    })
    .from(fixedCostMonths)
    .innerJoin(fixedCosts, eq(fixedCosts.id, fixedCostMonths.fixedCostId))
    .where(inArray(fixedCostMonths.month, months))
    .orderBy(asc(fixedCosts.dueDay), asc(fixedCosts.name));

  const costs: {
    id: number;
    name: string;
    dueDay: number;
    months: Map<string, { amount: number; paid: boolean }>;
  }[] = [];
  for (const row of rows) {
    let cost = costs.find((item) => item.id === row.costId);
    if (!cost) {
      cost = { id: row.costId, name: row.name, dueDay: row.dueDay, months: new Map() };
      costs.push(cost);
    }
    cost.months.set(row.month, { amount: Number(row.amount), paid: row.entryId !== null });
  }
  return costs;
}

// Ended costs, which no longer charge new months, most recently ended first
export async function listEndedFixedCosts() {
  return db
    .select({ id: fixedCosts.id, name: fixedCosts.name, endMonth: fixedCosts.endMonth })
    .from(fixedCosts)
    .where(sql`${fixedCosts.endMonth} is not null`)
    .orderBy(desc(fixedCosts.endMonth), asc(fixedCosts.name));
}

export async function getFixedCost(id: number) {
  const [cost] = await db.select().from(fixedCosts).where(eq(fixedCosts.id, id));
  return cost;
}

// All of a cost's months, the latest first
export async function listFixedCostMonths(costId: number) {
  return db
    .select({
      id: fixedCostMonths.id,
      month: fixedCostMonths.month,
      amount: fixedCostMonths.amount,
      entryId: fixedCostMonths.entryId,
      paidDate: entries.entryDate,
      paymentMethod: entries.paymentMethod,
    })
    .from(fixedCostMonths)
    .leftJoin(entries, eq(entries.id, fixedCostMonths.entryId))
    .where(eq(fixedCostMonths.fixedCostId, costId))
    .orderBy(desc(fixedCostMonths.month));
}

// Unpaid months that overlap the range, and how much of it is already late
export async function getFixedCostsDue(today: string, range: DateRange) {
  const rows = await db
    .select({
      month: fixedCostMonths.month,
      amount: fixedCostMonths.amount,
      dueDay: fixedCosts.dueDay,
    })
    .from(fixedCostMonths)
    .innerJoin(fixedCosts, eq(fixedCosts.id, fixedCostMonths.fixedCostId))
    .where(
      and(
        isNull(fixedCostMonths.entryId),
        gte(fixedCostMonths.month, currentMonth(range.from)),
        lte(fixedCostMonths.month, range.to)
      )
    );
  return rows.reduce(
    (totals, row) => {
      const amount = Number(row.amount);
      totals.pending += amount;
      if (isFixedCostLate(row.month, row.dueDay, today)) totals.overdue += amount;
      return totals;
    },
    { pending: 0, overdue: 0 }
  );
}
