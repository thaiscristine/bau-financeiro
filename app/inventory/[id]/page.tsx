import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { getItem, listStockMovements } from "@/lib/inventory";
import { listCategories } from "@/lib/categories";
import { formatBRL, formatDate } from "@/lib/format";
import { STOCK_MOVEMENT_REASON_LABELS } from "@/lib/validation";
import { Eyebrow, Page } from "@/components/page";
import { DeleteButton } from "@/components/delete-button";
import {
  linkClass,
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";
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
            <Eyebrow as="h2">Estoque</Eyebrow>
            <p className="text-[15px]">
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
            <div className={tableWrapClass}>
              <table className={tableClass}>
                <thead>
                  <tr className={tableHeadRow}>
                    <th className={tableHeadCell}>Data</th>
                    <th className={tableHeadCell}>Motivo</th>
                    <th className={tableHeadCell}>Quantidade</th>
                    <th className={tableHeadCell}>Pago</th>
                    <th className={tableHeadCell}>Nota</th>
                    <th className={tableHeadCell}>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className={tableRow}>
                      <td className={tableCell}>{formatDate(movement.movementDate)}</td>
                      <td className={tableCell}>
                        {movement.saleId ? (
                          <Link href={`/sales/${movement.saleId}`} className={linkClass}>
                            {STOCK_MOVEMENT_REASON_LABELS[movement.reason]}
                          </Link>
                        ) : (
                          STOCK_MOVEMENT_REASON_LABELS[movement.reason]
                        )}
                      </td>
                      <td
                        className={`${tableCell} ${
                          movement.quantity > 0 ? "text-income" : "text-cost"
                        }`}
                      >
                        {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                      </td>
                      <td className={tableCell}>
                        {movement.cost && (
                          <>
                            <span className="whitespace-nowrap text-cost">
                              {formatBRL(Number(movement.cost))}
                            </span>
                            {movement.supplier && (
                              <span className="block text-muted">{movement.supplier}</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className={`${tableCell} text-muted`}>{movement.note ?? ""}</td>
                      <td className={`${tableCell} text-right`}>
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
        <Eyebrow as="h2">Dados do item</Eyebrow>
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
