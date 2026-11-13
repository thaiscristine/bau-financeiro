import { requireSession } from "@/lib/dal";
import { listSales } from "@/lib/sales";
import { Page } from "@/components/page";
import { SalesTable } from "./sales-table";

export default async function SalesPage() {
  await requireSession();
  const rows = await listSales();

  return (
    <Page title="Vendas" action={{ href: "/sales/new", label: "Nova venda" }}>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma venda ainda.</p>
      ) : (
        <SalesTable rows={rows} />
      )}
    </Page>
  );
}
