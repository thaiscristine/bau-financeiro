import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { listEntries } from "@/lib/entries";
import { formatBRL, formatDate } from "@/lib/format";
import { EmptyState, Eyebrow, Page } from "@/components/page";
import {
  cardClass,
  linkClass,
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";
import { deleteEntry } from "./actions";
import { DeleteButton } from "@/components/delete-button";

type EntryRow = Awaited<ReturnType<typeof listEntries>>[number];

export default async function EntriesPage() {
  await requireSession();
  const rows = await listEntries();

  return (
    <Page
      title="Lançamentos"
      action={{ href: "/entries/new", label: "Novo lançamento" }}
    >
      {rows.length === 0 ? (
        <EmptyState>Nenhum lançamento ainda.</EmptyState>
      ) : (
        <>
          <ul className={`divide-y divide-line-soft sm:hidden ${cardClass}`}>
            {rows.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-4 p-4">
                <div className="flex min-w-0 flex-col gap-2">
                  <TypeLabel type={entry.type} />
                  <p className="text-[15px]">
                    {entry.categoryName}
                    <span className="text-muted tabular-nums">
                      {" · "}
                      {formatDate(entry.entryDate)}
                    </span>
                  </p>
                  {entry.counterparty && (
                    <p className="truncate text-[15px]">{entry.counterparty}</p>
                  )}
                  {entry.note && (
                    <p className="truncate font-serif text-[15px] text-muted">
                      {entry.note}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                  <p
                    className={`text-[17px] tracking-[-0.01em] tabular-nums ${
                      entry.type === "income" ? "text-income" : "text-cost"
                    }`}
                  >
                    {formatBRL(Number(entry.amount))}
                  </p>
                  <div className="flex gap-4 text-sm">
                    <EntryActions entry={entry} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className={`hidden sm:block ${tableWrapClass}`}>
            <table className={tableClass}>
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Data</th>
                  <th className={tableHeadCell}>Tipo</th>
                  <th className={tableHeadCell}>Categoria</th>
                  <th className={tableHeadCell}>Pagador / Fornecedor</th>
                  <th className={`${tableHeadCell} text-right`}>Valor</th>
                  <th className={tableHeadCell}>Nota</th>
                  <th className={tableHeadCell}>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.id} className={tableRow}>
                    <td className={`${tableCell} whitespace-nowrap`}>
                      {formatDate(entry.entryDate)}
                    </td>
                    <td className={`${tableCell} whitespace-nowrap`}>
                      <TypeLabel type={entry.type} />
                    </td>
                    <td className={tableCell}>{entry.categoryName}</td>
                    <td className={tableCell}>{entry.counterparty ?? ""}</td>
                    <td
                      className={`${tableCell} text-right whitespace-nowrap ${
                        entry.type === "income" ? "text-income" : "text-cost"
                      }`}
                    >
                      {formatBRL(Number(entry.amount))}
                    </td>
                    <td className={`${tableCell} font-serif text-muted`}>
                      {entry.note ?? ""}
                    </td>
                    <td className={`${tableCell} text-right whitespace-nowrap`}>
                      <div className="flex justify-end gap-4">
                        <EntryActions entry={entry} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Page>
  );
}

function TypeLabel({ type }: { type: EntryRow["type"] }) {
  return type === "income" ? (
    <Eyebrow as="span">Entrada</Eyebrow>
  ) : (
    <Eyebrow as="span" tone="orange">
      Saída
    </Eyebrow>
  );
}

// Installment payments and restock purchases are changed from where they came from
function EntryActions({ entry }: { entry: EntryRow }) {
  if (entry.saleId || entry.itemId) {
    return (
      <Link
        href={entry.saleId ? `/sales/${entry.saleId}` : `/inventory/${entry.itemId}`}
        className={linkClass}
      >
        {entry.saleId ? "Ver venda" : "Ver estoque"}
      </Link>
    );
  }
  return (
    <>
      <Link href={`/entries/${entry.id}/edit`} className={linkClass}>
        Editar
      </Link>
      <DeleteButton
        action={deleteEntry.bind(null, entry.id)}
        label="Excluir"
        confirmMessage="Excluir este lançamento? Não dá para desfazer."
        variant="link"
      />
    </>
  );
}
