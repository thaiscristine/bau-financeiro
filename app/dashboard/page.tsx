import { requireSession } from "@/lib/dal";
import { getTotals, getMonthlyBreakdown } from "@/lib/entries";
import { formatBRL, formatMonth } from "@/lib/format";
import { Nav } from "@/components/nav";

export default async function DashboardPage() {
  await requireSession();
  const [totals, monthly] = await Promise.all([
    getTotals(),
    getMonthlyBreakdown(),
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

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm text-zinc-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          tone === "positive" ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {formatBRL(value)}
      </p>
    </div>
  );
}
