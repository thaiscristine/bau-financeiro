import { requireSession } from "@/lib/dal";
import { listSales } from "@/lib/sales";
import { EmptyState, Page } from "@/components/page";
import { SalesTable } from "./sales-table";

export default async function SalesPage() {
  await requireSession();
  const rows = await listSales();

  return (
    <Page title="Vendas" action={{ href: "/sales/new", label: "Nova venda" }}>
      {rows.length === 0 ? (
        <EmptyState>Nenhuma venda ainda.</EmptyState>
      ) : (
        <SalesTable rows={rows} />
      )}
    </Page>
  );
}
