import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { listItems } from "@/lib/inventory";
import { formatBRL, formatDate, formatMonth, todayISO } from "@/lib/format";
import { LOW_STOCK, PERIODS } from "@/lib/reports/definitions";
import { periodRange } from "@/lib/reports/filters";
import { parseSalesReportPeriod, periodQuery, type SalesReportPeriod } from "@/lib/sales-report/period";
import { storeProfit } from "@/lib/sales-report/profit";
import { getSalesByMonth, getSalesTotals, listDebtors, listTopItems } from "@/lib/sales-report/queries";
import { EmptyState, Page, Section } from "@/components/page";
import { Stat, statGridClass } from "@/components/stat";
import {
  cardClass,
  chipClass,
  hintClass,
  inputClass,
  linkClass,
  secondaryButtonClass,
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";

export default async function SalesReportPage({ searchParams }: PageProps<"/sales/report">) {
  await requireSession();
  const period = parseSalesReportPeriod(await searchParams);
  const today = todayISO();
  const range = periodRange(period, today);

  const [totals, months, topItems, debtors, allItems] = await Promise.all([
    getSalesTotals(range),
    getSalesByMonth(range),
    listTopItems(range),
    listDebtors(today),
    listItems(),
  ]);
  // Every unpaid installment, whatever its due date, is owed by someone listed
  const pending = debtors.reduce((sum, kid) => sum + kid.pending, 0);
  const overdue = debtors.reduce((sum, kid) => sum + kid.overdue, 0);
  const stocked = allItems.filter((item) => item.tracksStock);
  const stockValue = stocked.reduce((value, item) => value + Math.max(item.stock, 0) * Number(item.price), 0);
  const lowStock = stocked
    .filter((item) => item.stock <= LOW_STOCK)
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
  const topTotal = topItems.reduce((total, item) => total + item.total, 0);
  const { profit, margin } = storeProfit(totals.received, totals.restockCost);

  return (
    <Page
      title="Relatório da Lojinha"
      aside={
        <a href={`/reports/export?type=sales&${periodQuery(period)}`} className={secondaryButtonClass}>
          Baixar planilha
        </a>
      }
    >
      <PeriodPicker period={period} today={today} />

      <div className="flex flex-col gap-4">
        <div className={`grid-cols-2 lg:grid-cols-4 ${statGridClass}`}>
          <Stat label="Vendido" value={formatBRL(totals.sold)} square="blue" />
          <Stat label="Recebido" value={formatBRL(totals.received)} tone="text-income" square="blue" />
          <Stat label="Reposição" value={formatBRL(totals.restockCost)} tone="text-cost" square="orange" />
          <Stat
            label="Vendas"
            value={String(totals.count)}
            hint={`${totals.units} ${totals.units === 1 ? "unidade" : "unidades"}`}
            square="ink"
          />
        </div>
        <div>
          <p className={`${hintClass} mb-2`}>Hoje, independente do período</p>
          <div className={`sm:grid-cols-3 ${statGridClass}`}>
            <Stat label="A receber em parcelas" value={formatBRL(pending)} tone="text-pending" square="ink" />
            <Stat
              label="Parcelas atrasadas"
              value={formatBRL(overdue)}
              tone={overdue > 0 ? "text-cost" : ""}
              square={overdue > 0 ? "orange" : "ink"}
            />
            <Stat label="Estoque a preço de venda" value={formatBRL(stockValue)} square="ink" />
          </div>
        </div>
      </div>

      <Section title="Lucro" tone={profit > 0 ? "green" : "ink"}>
        <div className={cardClass}>
          <dl className="divide-y divide-line-soft tabular-nums">
            <ProfitLine label="Recebido das vendas" value={formatBRL(totals.received)} tone="text-income" />
            <ProfitLine label="Pago em reposição" value={formatBRL(totals.restockCost > 0 ? -totals.restockCost : 0)} tone="text-cost" />
            <div
              role="group"
              aria-label="Lucro"
              className={`flex items-baseline justify-between gap-4 p-5 sm:p-6 ${profit > 0 ? "bg-profit-soft text-profit" : ""}`}
            >
              <dt className="text-[15px]">Lucro</dt>
              <dd className="text-right">
                <span
                  className={`text-[28px] leading-none tracking-[-0.02em] sm:text-[32px] ${profit < 0 ? "text-cost" : ""}`}
                >
                  {profit > 0 && "+"}
                  {formatBRL(profit)}
                </span>
                {margin !== null && (
                  <span className="mt-2 block text-[13px]">{Math.round(margin * 100)}% do recebido</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
        <p className={hintClass}>
          O dinheiro que entrou com as parcelas pagas no período menos o que foi pago por mercadoria.
          {pending > 0 && ` Os ${formatBRL(pending)} a receber entram quando forem pagos.`}
        </p>
      </Section>

      <Section title="Mais vendidos">
        {topItems.length === 0 ? (
          <EmptyState>Nenhuma venda no período.</EmptyState>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Item</th>
                  <th className={`${tableHeadCell} text-right max-sm:hidden`}>Vendas</th>
                  <th className={`${tableHeadCell} text-right`}>Unidades</th>
                  <th className={`${tableHeadCell} text-right`}>Total</th>
                  <th className={`${tableHeadCell} w-1/4 max-sm:hidden`}>
                    <span className="sr-only">Parte do total</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((item) => {
                  const share = topTotal > 0 ? item.total / topTotal : 0;
                  return (
                    <tr key={item.id} className={tableRow}>
                      <td className={tableCell}>
                        <Link href={`/inventory/${item.id}`} className="underline-offset-4 hover:underline">
                          {item.name}
                        </Link>
                      </td>
                      <td className={`${tableCell} text-right max-sm:hidden`}>{item.sales}</td>
                      <td className={`${tableCell} text-right`}>{item.units}</td>
                      <td className={`${tableCell} text-right whitespace-nowrap`}>{formatBRL(item.total)}</td>
                      <td className={`${tableCell} max-sm:hidden`}>
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 bg-sunken">
                            <div className="h-full bg-blue" style={{ width: `${share * 100}%` }} />
                          </div>
                          <span className="w-10 text-right text-[13px] text-muted">
                            {Math.round(share * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Por mês">
        {months.length === 0 ? (
          <EmptyState>Nada vendido, recebido ou comprado no período.</EmptyState>
        ) : (
          <>
            <ul className={`divide-y divide-line-soft sm:hidden ${cardClass}`}>
              {months.map((row) => (
                <li key={row.month} className="flex flex-col gap-3 p-4">
                  <p className="text-[15px]">{formatMonth(row.month)}</p>
                  <dl className="grid grid-cols-2 gap-x-2 gap-y-3 tabular-nums">
                    <MonthValue label="Vendido" value={row.sold} tone="" />
                    <MonthValue label="Recebido" value={row.received} tone="text-income" />
                    <MonthValue label="Reposição" value={row.restockCost} tone="text-cost" />
                    <MonthProfit received={row.received} restockCost={row.restockCost} />
                  </dl>
                </li>
              ))}
            </ul>
            <div className={`hidden sm:block ${tableWrapClass}`}>
              <table className={tableClass}>
                <thead>
                  <tr className={tableHeadRow}>
                    <th className={tableHeadCell}>Mês</th>
                    <th className={`${tableHeadCell} text-right`}>Vendido</th>
                    <th className={`${tableHeadCell} text-right`}>Recebido</th>
                    <th className={`${tableHeadCell} text-right`}>Reposição</th>
                    <th className={`${tableHeadCell} text-right`}>Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((row) => (
                    <tr key={row.month} className={tableRow}>
                      <td className={`${tableCell} whitespace-nowrap`}>{formatMonth(row.month)}</td>
                      <td className={`${tableCell} text-right whitespace-nowrap`}>{formatBRL(row.sold)}</td>
                      <td
                        className={`${tableCell} text-right whitespace-nowrap ${row.received > 0 ? "text-income" : "text-muted/60"}`}
                      >
                        {formatBRL(row.received)}
                      </td>
                      <td
                        className={`${tableCell} text-right whitespace-nowrap ${row.restockCost > 0 ? "text-cost" : "text-muted/60"}`}
                      >
                        {formatBRL(row.restockCost)}
                      </td>
                      <MonthProfitCell received={row.received} restockCost={row.restockCost} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      <Section
        title="Quem deve"
        aside={
          debtors.length > 0 && (
            <Link href="/reports?type=installments&status=open&status=overdue&group=kid" className={`${linkClass} text-sm`}>
              Planilha de cobrança
            </Link>
          )
        }
      >
        {debtors.length === 0 ? (
          <EmptyState>Nenhuma parcela em aberto.</EmptyState>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Bandeirante</th>
                  <th className={`${tableHeadCell} max-sm:hidden`}>Telefone</th>
                  <th className={`${tableHeadCell} max-sm:hidden`}>Próximo vencimento</th>
                  <th className={`${tableHeadCell} text-right`}>Atrasado</th>
                  <th className={`${tableHeadCell} text-right`}>Em aberto</th>
                  <th className={`${tableHeadCell} max-sm:hidden`}>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {debtors.map((kid) => (
                  <tr key={kid.id} className={tableRow}>
                    <td className={tableCell}>
                      <Link href={`/kids/${kid.id}`} className="underline-offset-4 hover:underline">
                        {kid.name}
                      </Link>
                      <span className="block text-[13px] text-muted sm:hidden">
                        {[kid.phone, `vence ${formatDate(kid.nextDue)}`].filter(Boolean).join(" · ")}
                      </span>
                    </td>
                    <td className={`${tableCell} whitespace-nowrap text-muted max-sm:hidden`}>{kid.phone ?? "-"}</td>
                    <td
                      className={`${tableCell} whitespace-nowrap max-sm:hidden ${kid.nextDue < today ? "text-cost" : ""}`}
                    >
                      {formatDate(kid.nextDue)}
                    </td>
                    <td
                      className={`${tableCell} text-right whitespace-nowrap ${kid.overdue > 0 ? "text-cost" : "text-muted/60"}`}
                    >
                      {formatBRL(kid.overdue)}
                    </td>
                    <td className={`${tableCell} text-right whitespace-nowrap text-pending`}>
                      {formatBRL(kid.pending)}
                    </td>
                    <td className={`${tableCell} text-right max-sm:hidden`}>
                      <Link href={`/kids/${kid.id}`} className={linkClass}>
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Estoque acabando">
        {lowStock.length === 0 ? (
          <EmptyState>Todos os itens têm mais de {LOW_STOCK} unidades.</EmptyState>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Item</th>
                  <th className={`${tableHeadCell} text-right`}>Disponível</th>
                  <th className={tableHeadCell}>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((item) => (
                  <tr key={item.id} className={tableRow}>
                    <td className={tableCell}>{item.name}</td>
                    <td className={`${tableCell} text-right whitespace-nowrap ${item.stock > 0 ? "" : "text-cost"}`}>
                      {item.stock > 0 ? `${item.stock} ${item.stock === 1 ? "unidade" : "unidades"}` : "Esgotado"}
                    </td>
                    <td className={`${tableCell} text-right`}>
                      <Link href={`/inventory/${item.id}`} className={linkClass}>
                        Repor
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </Page>
  );
}

// Plain links and a GET form, like the panel's period filter, so every view
// has its own shareable URL and works before any JavaScript loads
function PeriodPicker({ period, today }: { period: SalesReportPeriod; today: string }) {
  return (
    <nav aria-label="Período" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <ul className="flex flex-wrap gap-1.5">
          {PERIODS.map((option) => (
            <li key={option.value}>
              <Link
                href={`/sales/report?${periodQuery({ period: option.value, from: period.from, to: period.to })}`}
                scroll={false}
                replace
                aria-current={option.value === period.period ? "page" : undefined}
                className={chipClass}
              >
                {option.label}
              </Link>
            </li>
          ))}
        </ul>
        {period.period !== "custom" && (
          <p className={`${hintClass} tabular-nums`}>{periodHint(period, today)}</p>
        )}
      </div>
      {period.period === "custom" && (
        // Keyed by the dates so the inputs show the applied ones after a submit
        <form
          key={`${period.from}:${period.to}`}
          action="/sales/report"
          className="grid grid-cols-2 gap-2 sm:flex sm:items-end"
        >
          <input type="hidden" name="period" value="custom" />
          <label className="flex min-w-0 flex-col gap-1">
            <span className={hintClass}>De</span>
            <input
              type="date"
              name="from"
              defaultValue={period.from ?? ""}
              className={`${inputClass} w-full min-w-0`}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className={hintClass}>Até</span>
            <input
              type="date"
              name="to"
              defaultValue={period.to ?? ""}
              className={`${inputClass} w-full min-w-0`}
            />
          </label>
          <button type="submit" className={`${secondaryButtonClass} col-span-2`}>
            Aplicar
          </button>
        </form>
      )}
    </nav>
  );
}

function periodHint(period: SalesReportPeriod, today: string) {
  if (period.period === "all") return "Desde a primeira venda";
  const { from, to } = periodRange(period, today);
  return `${formatDate(from!)} a ${formatDate(to!)}`;
}

function MonthValue({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[11px] tracking-[0.05em] text-muted uppercase">{label}</dt>
      <dd className={`text-sm ${value > 0 ? tone : "text-muted/60"}`}>{formatBRL(value)}</dd>
    </div>
  );
}

function ProfitLine({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div role="group" aria-label={label} className="flex items-baseline justify-between gap-4 px-5 py-4 sm:px-6">
      <dt className="text-[15px] text-muted">{label}</dt>
      <dd className={`text-[15px] ${tone}`}>{value}</dd>
    </div>
  );
}

function profitTone(profit: number) {
  return profit < 0 ? "text-cost" : profit > 0 ? "text-profit" : "text-muted/60";
}

function MonthProfit({ received, restockCost }: { received: number; restockCost: number }) {
  const { profit } = storeProfit(received, restockCost);
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[11px] tracking-[0.05em] text-muted uppercase">Lucro</dt>
      <dd className={`text-sm ${profitTone(profit)}`}>{formatBRL(profit)}</dd>
    </div>
  );
}

function MonthProfitCell({ received, restockCost }: { received: number; restockCost: number }) {
  const { profit } = storeProfit(received, restockCost);
  return <td className={`${tableCell} text-right whitespace-nowrap ${profitTone(profit)}`}>{formatBRL(profit)}</td>;
}
