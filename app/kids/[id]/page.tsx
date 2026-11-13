import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { getKid } from "@/lib/kids";
import { listSales } from "@/lib/sales";
import { listKidEntries } from "@/lib/entries";
import { formatBRL, formatDate } from "@/lib/format";
import {
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";
import { EmptyState, Eyebrow, Page } from "@/components/page";
import { DeleteButton } from "@/components/delete-button";
import { SalesTable } from "@/app/sales/sales-table";
import { KidForm } from "../kid-form";
import { deleteKid, updateKid } from "../actions";

export default async function KidPage({ params }: PageProps<"/kids/[id]">) {
  await requireSession();

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [kid, kidSales, kidEntries] = await Promise.all([
    getKid(id),
    listSales({ kidId: id }),
    listKidEntries(id),
  ]);
  if (!kid) notFound();

  return (
    <Page
      title={kid.name}
      action={{ href: `/sales/new?kidId=${id}`, label: "Nova venda" }}
    >
      <section className="flex flex-col gap-3">
        <Eyebrow as="h2">Vendas</Eyebrow>
        {kidSales.length === 0 ? (
          <EmptyState>Nenhuma venda para este bandeirante.</EmptyState>
        ) : (
          <SalesTable rows={kidSales} showKid={false} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <Eyebrow as="h2">Contribuições</Eyebrow>
        {kidEntries.length === 0 ? (
          <EmptyState>Nenhuma contribuição registrada.</EmptyState>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Data</th>
                  <th className={tableHeadCell}>Categoria</th>
                  <th className={tableHeadCell}>Valor</th>
                  <th className={tableHeadCell}>Nota</th>
                </tr>
              </thead>
              <tbody>
                {kidEntries.map((entry) => (
                  <tr key={entry.id} className={tableRow}>
                    <td className={tableCell}>{formatDate(entry.entryDate)}</td>
                    <td className={tableCell}>{entry.categoryName}</td>
                    <td className={`${tableCell} whitespace-nowrap text-income`}>
                      {formatBRL(Number(entry.amount))}
                    </td>
                    <td className={`${tableCell} text-muted`}>{entry.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <Eyebrow as="h2">Dados</Eyebrow>
        <KidForm action={updateKid.bind(null, id)} kid={kid} />
      </section>

      {kidSales.length === 0 && kidEntries.length === 0 && (
        <DeleteButton
          action={deleteKid.bind(null, id)}
          label="Excluir bandeirante"
          confirmMessage={`Excluir ${kid.name}? Não dá para desfazer.`}
        />
      )}
    </Page>
  );
}
