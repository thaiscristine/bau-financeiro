import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { getKid } from "@/lib/kids";
import { listSales } from "@/lib/sales";
import { listKidEntries } from "@/lib/entries";
import { formatBRL, formatDate } from "@/lib/format";
import { tableHeadCell, tableHeadRow, tableRow } from "@/components/styles";
import { Page } from "@/components/page";
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
        <h2 className="text-lg font-medium">Vendas</h2>
        {kidSales.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma venda para este bandeirante.</p>
        ) : (
          <SalesTable rows={kidSales} showKid={false} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Contribuições</h2>
        {kidEntries.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma contribuição registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
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
                    <td className="py-2 pr-4">{formatDate(entry.entryDate)}</td>
                    <td className="py-2 pr-4">{entry.categoryName}</td>
                    <td className="py-2 pr-4 whitespace-nowrap text-emerald-600">
                      {formatBRL(Number(entry.amount))}
                    </td>
                    <td className="py-2 pr-4 text-zinc-500">{entry.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Dados</h2>
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
