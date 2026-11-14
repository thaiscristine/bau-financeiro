import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { listItemsPage } from "@/lib/inventory";
import { formatBRL } from "@/lib/format";
import { PAGE_SIZE, pageCount, parsePage } from "@/lib/pagination";
import { EmptyState, Page } from "@/components/page";
import { Pagination } from "@/components/pagination";
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

export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  await requireSession();
  const page = parsePage((await searchParams).page);
  const { rows, total } = await listItemsPage(page, PAGE_SIZE);

  // A stale link (e.g. after items were removed) can point past the end
  const pages = pageCount(total);
  if (page > pages) {
    redirect(pages === 1 ? "/inventory" : `/inventory?page=${pages}`);
  }

  return (
    <Page title="Estoque" action={{ href: "/inventory/new", label: "Novo item" }}>
      {rows.length === 0 ? (
        <EmptyState>Nenhum item cadastrado ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Item</th>
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
                    <td className={`${tableCell} whitespace-nowrap`}>
                      {formatBRL(Number(item.price))}
                    </td>
                    <td className={`${tableCell} whitespace-nowrap`}>
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
          <Pagination
            basePath="/inventory"
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
          />
        </div>
      )}
    </Page>
  );
}
