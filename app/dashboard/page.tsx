import { requireSession } from "@/lib/dal";
import Link from "next/link";
import {
  getTotals,
  getMonthlyBreakdown,
  getTotalsByCategory,
} from "@/lib/entries";
import { getReceivables, listOverdueInstallments } from "@/lib/sales";
import { formatBRL, formatDate, formatMonth, todayISO } from "@/lib/format";
import { Nav } from "@/components/nav";
import { linkClass } from "@/components/styles";

export default async function DashboardPage() {
  await requireSession();
  const today = todayISO();
  const [totals, monthly, byCategory, receivables, overdue] = await Promise.all([
    getTotals(),
    getMonthlyBreakdown(),
    getTotalsByCategory(),
    getReceivables(today),
    listOverdueInstallments(today),
  ]);

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
        <h1 className="text-2xl font-semibold">Painel</h1>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Entrou" value={totals.income} tone="positive" />
          <StatCard label="Saiu" value={totals.cost} tone="negative" />
          <StatCard
            label="Saldo"
            value={totals.balance}
            tone={totals.balance >= 0 ? "positive" : "negative"}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="A receber em parcelas"
            value={receivables.pending}
            tone="pending"
          />
          <StatCard
            label="Parcelas atrasadas"
            value={receivables.overdue}
            tone={receivables.overdue > 0 ? "negative" : "neutral"}
          />
        </div>

        {overdue.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-medium">Parcelas atrasadas</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-2 pr-4 font-medium text-zinc-500">
                      Vencimento
                    </th>
                    <th className="py-2 pr-4 font-medium text-zinc-500">
                      Bandeirante
                    </th>
                    <th className="py-2 pr-4 font-medium text-zinc-500">
                      Item
                    </th>
                    <th className="py-2 pr-4 font-medium text-zinc-500">
                      Valor
                    </th>
                    <th className="py-2">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.map((installment) => (
                    <tr
                      key={installment.id}
                      className="border-b border-zinc-100 dark:border-zinc-900"
                    >
                      <td className="py-2 pr-4 text-red-600">
                        {formatDate(installment.dueDate)}
                      </td>
                      <td className="py-2 pr-4">{installment.kidName}</td>
                      <td className="py-2 pr-4">
                        {installment.itemName}
                        <span className="text-zinc-500">
                          {" "}
                          (parcela {installment.number})
                        </span>
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {formatBRL(Number(installment.amount))}
                      </td>
                      <td className="py-2 text-right">
                        <Link
                          href={`/sales/${installment.saleId}`}
                          className={linkClass}
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-lg font-medium">Por origem</h2>
          {byCategory.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum lançamento ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-2 pr-4 font-medium text-zinc-500">
                      Categoria
                    </th>
                    <th className="py-2 pr-4 font-medium text-zinc-500">
                      Entrou
                    </th>
                    <th className="py-2 font-medium text-zinc-500">Saiu</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map((row) => (
                    <tr
                      key={row.category}
                      className="border-b border-zinc-100 dark:border-zinc-900"
                    >
                      <td className="py-2 pr-4">{row.category}</td>
                      <td
                        className={`py-2 pr-4 ${row.income > 0 ? "text-emerald-600" : "text-zinc-400"}`}
                      >
                        {formatBRL(row.income)}
                      </td>
                      <td
                        className={`py-2 ${row.cost > 0 ? "text-red-600" : "text-zinc-400"}`}
                      >
                        {formatBRL(row.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-medium">Por mês</h2>
          {monthly.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum lançamento ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-2 pr-4 font-medium text-zinc-500">
                      Mês
                    </th>
                    <th className="py-2 pr-4 font-medium text-zinc-500">
                      Entrou
                    </th>
                    <th className="py-2 pr-4 font-medium text-zinc-500">
                      Saiu
                    </th>
                    <th className="py-2 font-medium text-zinc-500">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((row) => (
                    <tr
                      key={row.month}
                      className="border-b border-zinc-100 dark:border-zinc-900"
                    >
                      <td className="py-2 pr-4">{formatMonth(row.month)}</td>
                      <td className="py-2 pr-4 text-emerald-600">
                        {formatBRL(row.income)}
                      </td>
                      <td className="py-2 pr-4 text-red-600">
                        {formatBRL(row.cost)}
                      </td>
                      <td className="py-2">{formatBRL(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

const TONES = {
  positive: "text-emerald-600",
  negative: "text-red-600",
  pending: "text-amber-600",
  neutral: "",
};

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm text-zinc-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${TONES[tone]}`}
      >
        {formatBRL(value)}
      </p>
    </div>
  );
}
