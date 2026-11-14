import Link from "next/link";
import { listKids } from "@/lib/kids";
import { listItems } from "@/lib/inventory";
import { FormDialog } from "@/components/form-dialog";
import { SaleForm } from "./sale-form";
import { createSale } from "./actions";

export async function NewSaleDialog({ defaultKidId }: { defaultKidId?: number }) {
  const [kids, items] = await Promise.all([listKids(), listItems()]);

  return (
    <FormDialog label="Nova venda">
      {items.length === 0 ? (
        <p className="font-serif text-[17px] leading-relaxed text-muted">
          Antes de registrar uma venda, é preciso cadastrar um item no{" "}
          <Link href="/inventory" className="text-ink underline underline-offset-2">
            Estoque
          </Link>
          .
        </p>
      ) : (
        <SaleForm action={createSale} kids={kids} items={items} defaultKidId={defaultKidId} />
      )}
    </FormDialog>
  );
}
