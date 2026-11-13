import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { listEntries } from "@/lib/entries";
import { formatBRL, formatDate } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/validation";
import { Nav } from "@/components/nav";
import { deleteEntry } from "./actions";
import { DeleteEntryButton } from "./delete-entry-button";

export default async function EntriesPage() {
  await requireSession();
  const rows = await listEntries();

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Lançamentos</h1>
          <Link
            href="/entries/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Novo lançamento
          </Link>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum lançamento ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-4 font-medium text-zinc-500">
                    Data
                  </th>
                  <th className="py-2 pr-4 font-medium text-zinc-500">
                    Tipo
                  </th>
                  <th className="py-2 pr-4 font-medium text-zinc-500">
                    Categoria
                  </th>
                  <th className="py-2 pr-4 font-medium text-zinc-500">
                    Valor
                  </th>
                  <th className="py-2 pr-4 font-medium text-zinc-500">
                    Nota
                  </th>
                  <th className="py-2">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2 pr-4">
                      {formatDate(entry.entryDate)}
                    </td>
                    <td className="py-2 pr-4">
                      {entry.type === "income" ? "Entrada" : "Saída"}
                    </td>
                    <td className="py-2 pr-4">
                      {CATEGORY_LABELS[entry.category]}
                    </td>
                    <td
                      className={`py-2 pr-4 ${
                        entry.type === "income"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatBRL(Number(entry.amount))}
                    </td>
                    <td className="py-2 pr-4 text-zinc-500">
                      {entry.note ?? ""}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/entries/${entry.id}/edit`}
                          className="text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
                        >
                          Editar
                        </Link>
                        <DeleteEntryButton
                          action={deleteEntry.bind(null, entry.id)}
                          variant="link"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
