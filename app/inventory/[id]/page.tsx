import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { getItem, listStockMovements } from "@/lib/inventory";
import { listCategories } from "@/lib/categories";
import { formatBRL, formatDate } from "@/lib/format";
import { STOCK_MOVEMENT_REASON_LABELS } from "@/lib/validation";
import { Page } from "@/components/page";
import { DeleteButton } from "@/components/delete-button";
import { linkClass, tableHeadCell, tableHeadRow, tableRow } from "@/components/styles";
import { ItemForm } from "../item-form";
import { StockMovementForm } from "../stock-movement-form";
import { StockLabel } from "../stock-label";
import {
  addStockMovement,
  deleteItem,
  deleteStockMovement,
  updateItem,
} from "../actions";

export default async function ItemPage({ params }: PageProps<"/inventory/[id]">) {
  await requireSession();

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [item, movements, categories] = await Promise.all([
    getItem(id),
    listStockMovements(id),
    listCategories(),
  ]);
  if (!item) notFound();

  return (
    <Page title={item.name} action={{ href: `/sales/new?itemId=${id}`, label: "Nova venda" }}>
      {item.tracksStock && (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-medium">Estoque</h2>
            <p className="text-sm">
              Disponível: <StockLabel tracksStock stock={item.stock} />
            </p>
          </div>

          <StockMovementForm
            action={addStockMovement.bind(null, id)}
            categories={categories.filter(
              (category) => category.allowsManualEntry && !category.requiresKid
            )}
          />

          {movements.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={tableHeadRow}>
                    <th className={tableHeadCell}>Data</th>
                    <th className={tableHeadCell}>Motivo</th>
                    <th className={tableHeadCell}>Quantidade</th>
                    <th className={tableHeadCell}>Pago</th>
                    <th className={tableHeadCell}>Nota</th>
                    <th className="py-2">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className={tableRow}>
                      <td className="py-2 pr-4">{formatDate(movement.movementDate)}</td>
                      <td className="py-2 pr-4">
                        {movement.saleId ? (
                          <Link href={`/sales/${movement.saleId}`} className={linkClass}>
                            {STOCK_MOVEMENT_REASON_LABELS[movement.reason]}
                          </Link>
                        ) : (
                          STOCK_MOVEMENT_REASON_LABELS[movement.reason]
                        )}
                      </td>
                      <td
                        className={`py-2 pr-4 ${
                          movement.quantity > 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                      </td>
                      <td className="py-2 pr-4">
                        {movement.cost && (
                          <>
                            <span className="whitespace-nowrap text-red-600">
                              {formatBRL(Number(movement.cost))}
                            </span>
                            {movement.supplier && (
                              <span className="block text-zinc-500">{movement.supplier}</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-zinc-500">{movement.note ?? ""}</td>
                      <td className="py-2 text-right">
                        {!movement.saleId && (
                          <DeleteButton
                            action={deleteStockMovement.bind(null, movement.id)}
                            label="Excluir"
                            confirmMessage={
                              movement.cost
                                ? "Excluir esta movimentação? A saída registrada nos lançamentos também será excluída."
                                : "Excluir esta movimentação?"
                            }
                            variant="link"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Dados do item</h2>
        <ItemForm action={updateItem.bind(null, id)} categories={categories} item={item} />
      </section>

      {!item.hasSales && (
        <DeleteButton
          action={deleteItem.bind(null, id)}
          label="Excluir item"
          confirmMessage={`Excluir "${item.name}" e seu histórico de estoque? Não dá para desfazer.`}
        />
      )}
    </Page>
  );
}
