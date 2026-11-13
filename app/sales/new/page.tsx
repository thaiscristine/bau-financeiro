import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { listKids } from "@/lib/kids";
import { listItems } from "@/lib/inventory";
import { Page } from "@/components/page";
import { linkClass } from "@/components/styles";
import { SaleForm } from "../sale-form";
import { createSale } from "../actions";

export default async function NewSalePage({ searchParams }: PageProps<"/sales/new">) {
  await requireSession();

  const { kidId, itemId } = await searchParams;
  const [kids, items] = await Promise.all([listKids(), listItems()]);

  return (
    <Page title="Nova venda">
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Antes de registrar uma venda, é preciso{" "}
          <Link href="/inventory/new" className={`${linkClass} underline`}>
            cadastrar um item
          </Link>
          .
        </p>
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
