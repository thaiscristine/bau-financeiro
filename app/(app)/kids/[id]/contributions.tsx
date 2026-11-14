import Link from "next/link";
import type { Kid } from "@/db/schema";
import { paysMonthlyFee } from "@/lib/age-groups";
import { isContributionOverdue } from "@/lib/contribution-months";
import {
  listContributionYears,
  listKidContributions,
  listUnlinkedContributionEntries,
} from "@/lib/contributions";
import { formatBRL, formatDate, formatMonth } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { EmptyState, Section } from "@/components/page";
import { SubmitButton } from "@/components/form";
import { cardClass, chipClass, linkClass } from "@/components/styles";
import { PaymentForm } from "@/app/(app)/sales/payment-form";
import { UndoPaymentButton } from "@/app/(app)/sales/undo-payment-button";
import {
  linkContributionEntry,
  payContribution,
  setContributionDue,
  undoContribution,
} from "../contribution-actions";
import { LinkEntryForm } from "../link-entry-form";

function monthName(month: string) {
  return formatMonth(month.slice(0, 7)).split(" ")[0];
}

// The kid's twelve months of a year: paid, open, late or not charged, with
// what can be done to each
export async function KidContributions({
  kid,
  year,
  today,
}: {
  kid: Kid;
  year: number | null;
  today: string;
}) {
  const [years, unlinked] = await Promise.all([
    listContributionYears(kid.id),
    listUnlinkedContributionEntries(kid.id),
  ]);
  if (years.length === 0 && unlinked.length === 0 && !paysMonthlyFee(kid.ageGroup)) {
    return null;
  }

  const currentYear = Number(today.slice(0, 4));
  const shownYear =
    year && years.includes(year) ? year : years.includes(currentYear) ? currentYear : years.at(-1);
  const months = shownYear ? await listKidContributions(kid.id, shownYear) : [];
  // Linking can point at any unpaid month, of any year
  const linkable =
    unlinked.length > 0
      ? (
          await Promise.all(years.map((option) => listKidContributions(kid.id, option)))
        )
          .flat()
          .filter((month) => !month.entryId)
          .map((month) => ({
            id: month.id,
            label: `${formatMonth(month.month.slice(0, 7))}${month.due ? "" : " (não cobrado)"}`,
          }))
      : [];

  return (
    <>
      <Section
        title="Contribuição mensal"
        aside={
          years.length > 1 && (
            <nav aria-label="Ano" className="flex flex-wrap gap-1.5">
              {years.map((option) => (
                <Link
                  key={option}
                  href={`/kids/${kid.id}?year=${option}`}
                  aria-current={option === shownYear ? "page" : undefined}
                  className={chipClass}
                >
                  {option}
                </Link>
              ))}
            </nav>
          )
        }
      >
        {months.length === 0 ? (
          <EmptyState>
            {paysMonthlyFee(kid.ageGroup)
              ? "Informe o valor da contribuição mensal nos dados abaixo para começar a cobrar."
              : "Este ramo não paga contribuição mensal."}
          </EmptyState>
        ) : (
          <ul className={`divide-y divide-line-soft ${cardClass}`}>
            {months.map((month) => {
              const paid = month.entryId !== null;
              const late = !paid && month.due && isContributionOverdue(month.month, today);
              return (
                <li
                  key={month.id}
                  className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4"
                >
                  <div className="flex flex-1 flex-col gap-1 tabular-nums">
                    <p className={month.due ? "" : "text-muted"}>
                      <span>{monthName(month.month)}</span>
                      {month.due && (
                        <span className="text-muted">
                          {" "}
                          · {formatBRL(Number(paid ? month.paidAmount : month.amount))}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted">
                      {paid ? (
                        <span className="text-income">
                          Paga em {formatDate(month.paidDate!)} ·{" "}
                          {paymentMethodLabel(month.paymentMethod)}
                        </span>
                      ) : !month.due ? (
                        "Não cobrada"
                      ) : late ? (
                        <span className="text-cost">Atrasada</span>
                      ) : (
                        "Em aberto"
                      )}
                    </p>
                  </div>
                  {/* On phones the payment form takes its own line below the month */}
                  {!paid && month.due && (
                    <div className="max-sm:order-last max-sm:w-full">
                      <PaymentForm action={payContribution.bind(null, month.id)} />
                    </div>
                  )}
                  {paid ? (
                    month.linkedEntry ? (
                      <UndoPaymentButton
                        action={undoContribution.bind(null, month.id)}
                        label="Desligar"
                        confirmMessage="Desligar esta contribuição do mês? Ela continua nas transações e volta para a lista de contribuições sem mês."
                      />
                    ) : (
                      <UndoPaymentButton action={undoContribution.bind(null, month.id)} />
                    )
                  ) : (
                    <form action={setContributionDue.bind(null, month.id, !month.due)}>
                      <SubmitButton
                        label={month.due ? "Não cobrar" : "Cobrar"}
                        pendingLabel="Salvando..."
                        className={linkClass}
                      />
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {unlinked.length > 0 && (
        <Section title="Contribuições sem mês">
          <p className="max-w-2xl font-serif text-[17px] leading-relaxed text-muted">
            Registradas antes da cobrança por mês. Diga qual mês cada uma pagou para ele
            aparecer como pago.
          </p>
          <ul className={`divide-y divide-line-soft ${cardClass}`}>
            {unlinked.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4"
              >
                <div className="flex flex-col gap-1 tabular-nums">
                  <p>
                    {formatDate(entry.entryDate)}
                    <span className="text-income"> · {formatBRL(Number(entry.amount))}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {entry.categoryName}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </p>
                </div>
                {linkable.length > 0 && (
                  <LinkEntryForm
                    action={linkContributionEntry.bind(null, entry.id)}
                    months={linkable}
                  />
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
