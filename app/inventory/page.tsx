import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { listItems } from "@/lib/inventory";
import { formatBRL } from "@/lib/format";
import { EmptyState, Page } from "@/components/page";
import { StockLabel } from "./stock-label";
import {
  linkClass,
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";

export default async function InventoryPage() {
  await requireSession();
  const rows = await listItems();

  return (
    <Page title="Estoque" action={{ href: "/inventory/new", label: "Novo item" }}>
      {rows.length === 0 ? (
        <EmptyState>Nenhum item cadastrado ainda.</EmptyState>
      ) : (
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Item</th>
                <th className={tableHeadCell}>Categoria</th>
                <th className={tableHeadCell}>Preço</th>
                <th className={tableHeadCell}>Disponível</th>
                <th className={tableHeadCell}>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className={tableRow}>
                  <td className={tableCell}>{item.name}</td>
                  <td className={tableCell}>{item.categoryName}</td>
                  <td className={`${tableCell} whitespace-nowrap`}>
                    {formatBRL(Number(item.price))}
                  </td>
                  <td className={tableCell}>
                    <StockLabel tracksStock={item.tracksStock} stock={item.stock} />
                  </td>
                  <td className={`${tableCell} text-right`}>
                    <Link href={`/inventory/${item.id}`} className={linkClass}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
