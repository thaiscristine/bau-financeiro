import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { listItems } from "@/lib/inventory";
import { formatBRL } from "@/lib/format";
import { Page } from "@/components/page";
import { StockLabel } from "./stock-label";
import { linkClass, tableHeadCell, tableHeadRow, tableRow } from "@/components/styles";

export default async function InventoryPage() {
  await requireSession();
  const rows = await listItems();

  return (
    <Page title="Estoque" action={{ href: "/inventory/new", label: "Novo item" }}>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum item cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Item</th>
                <th className={tableHeadCell}>Categoria</th>
                <th className={tableHeadCell}>Preço</th>
                <th className={tableHeadCell}>Disponível</th>
                <th className="py-2">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className={tableRow}>
                  <td className="py-2 pr-4">{item.name}</td>
                  <td className="py-2 pr-4">{item.categoryName}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {formatBRL(Number(item.price))}
                  </td>
                  <td className="py-2 pr-4">
                    <StockLabel tracksStock={item.tracksStock} stock={item.stock} />
                  </td>
                  <td className="py-2 text-right">
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
