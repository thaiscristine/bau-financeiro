import Link from "next/link";
import { getKidDebts } from "@/lib/debts";
import { formatBRL, formatDate } from "@/lib/format";
import { EmptyState, Section } from "@/components/page";
import { LinkedRow } from "@/components/linked-row";
import { Stat, statGridClass } from "@/components/stat";
import {
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";

type Debt = Awaited<ReturnType<typeof getKidDebts>>[number];

// Where each charge is paid
function debtHref(kidId: number, debt: Debt) {
  if (debt.kind === "sale") return `/sales/${debt.saleId}`;
  if (debt.kind === "event") return `/events/${debt.eventId}/participants/${debt.participantId}`;
  return `/kids/${kidId}#contribuicao-mensal`;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

// "setembro, outubro e novembro de 2026", one group per year
function monthList(months: string[]) {
  const byYear = new Map<string, string[]>();
  for (const month of months) {
    const [year, number] = month.split("-");
    const name = new Date(Number(year), Number(number) - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
    });
    byYear.set(year, [...(byYear.get(year) ?? []), name]);
  }
  return [...byYear]
    .map(([year, names]) => {
      const list =
        names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
      return `${list} de ${year}`;
    })
    .join("; ");
}

function debtDetail(debt: Debt) {
  if (debt.kind === "contribution") {
    const months = monthList(debt.months);
    return months.charAt(0).toUpperCase() + months.slice(1);
  }
  const parts = [debt.kind === "sale" ? "Lojinha" : "Evento"];
  if (debt.lateCount > 0) {
    parts.push(
      `${plural(debt.lateCount, "parcela atrasada", "parcelas atrasadas")} desde ${formatDate(debt.oldestDue)}`
    );
  }
  if (debt.nextDue) {
    parts.push(
      `${plural(debt.count - debt.lateCount, "parcela", "parcelas")} a vencer, próxima em ${formatDate(debt.nextDue)}`
    );
  }
  return parts.join(" · ");
}

// What the kid owes right now, per origin: the contribution months, each event
// and each Lojinha sale. A row opens where that charge is paid.
export async function KidDebts({ kidId, today }: { kidId: number; today: string }) {
  const debts = await getKidDebts(kidId, today);
  const overdue = debts.reduce((sum, debt) => sum + debt.overdue, 0);
  const upcoming = debts.reduce((sum, debt) => sum + debt.upcoming, 0);

  return (
    <Section title="Situação financeira">
      {debts.length === 0 ? (
        <EmptyState>Nenhum valor em aberto.</EmptyState>
      ) : (
        <>
          <div className={`grid-cols-1 sm:grid-cols-3 ${statGridClass}`}>
            <Stat
              label="A pagar"
              value={formatBRL(overdue + upcoming)}
              tone={overdue > 0 ? "text-cost" : "text-pending"}
              square="ink"
            />
            <Stat
              label="Atrasado"
              value={formatBRL(overdue)}
              tone={overdue > 0 ? "text-cost" : "text-muted/60"}
              square="orange"
            />
            <Stat
              label="A vencer"
              value={formatBRL(upcoming)}
              tone={upcoming > 0 ? "text-pending" : "text-muted/60"}
              square="blue"
            />
          </div>
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Origem</th>
                  {/* On phones the amounts go under the origin, so its text has room */}
                  <th className={`${tableHeadCell} text-right max-sm:hidden`}>Atrasado</th>
                  <th className={`${tableHeadCell} text-right max-sm:hidden`}>A vencer</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((debt) => (
                  // The whole row opens where the charge is paid
                  <LinkedRow
                    key={`${debt.kind}-${debt.saleId ?? debt.participantId ?? 0}-${debt.chargeId ?? 0}`}
                    className={tableRow}
                  >
                    <td className={tableCell}>
                      <Link
                        href={debtHref(kidId, debt)}
                        className="underline-offset-4 hover:underline"
                      >
                        {debt.label}
                      </Link>
                      <span className="block text-[13px] text-muted">{debtDetail(debt)}</span>
                      <span className="mt-1 block text-sm whitespace-nowrap sm:hidden">
                        {debt.overdue > 0 && (
                          <span className="text-cost">{formatBRL(debt.overdue)} atrasado</span>
                        )}
                        {debt.overdue > 0 && debt.upcoming > 0 && <span className="text-muted"> · </span>}
                        {debt.upcoming > 0 && (
                          <span className="text-pending">{formatBRL(debt.upcoming)} a vencer</span>
                        )}
                      </span>
                    </td>
                    <td
                      className={`${tableCell} text-right whitespace-nowrap max-sm:hidden ${debt.overdue > 0 ? "text-cost" : "text-muted/60"}`}
                    >
                      {formatBRL(debt.overdue)}
                    </td>
                    <td
                      className={`${tableCell} text-right whitespace-nowrap max-sm:hidden ${debt.upcoming > 0 ? "text-pending" : "text-muted/60"}`}
                    >
                      {formatBRL(debt.upcoming)}
                    </td>
                  </LinkedRow>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}
