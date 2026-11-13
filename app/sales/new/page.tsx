import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { listKids } from "@/lib/kids";
import { listItems } from "@/lib/inventory";
import { EmptyState, Page } from "@/components/page";
import { SaleForm } from "../sale-form";
import { createSale } from "../actions";

export default async function NewSalePage({ searchParams }: PageProps<"/sales/new">) {
  await requireSession();

  const { kidId, itemId } = await searchParams;
  const [kids, items] = await Promise.all([listKids(), listItems()]);

  return (
    <Page title="Nova venda">
      {items.length === 0 ? (
        <EmptyState>
          Antes de registrar uma venda, é preciso{" "}
          <Link href="/inventory/new" className="text-ink underline underline-offset-2">
            cadastrar um item
          </Link>
          .
        </EmptyState>
      ) : (
        <SaleForm
          action={createSale}
          kids={kids}
          items={items}
          defaultKidId={Number(kidId) || undefined}
          defaultItemId={Number(itemId) || undefined}
        />
      )}
    </Page>
  );
}
