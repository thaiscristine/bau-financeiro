import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { getSale, listInstallments } from "@/lib/sales";
import { formatBRL, formatDate, todayISO } from "@/lib/format";
import { Page } from "@/components/page";
import { DeleteButton } from "@/components/delete-button";
import { linkClass } from "@/components/styles";
import { PaymentForm } from "../payment-form";
import { UndoPaymentButton } from "../undo-payment-button";
import { deleteSale, payInstallment, undoPayment } from "../actions";

export default async function SalePage({ params }: PageProps<"/sales/[id]">) {
  await requireSession();

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [sale, saleInstallments] = await Promise.all([getSale(id), listInstallments(id)]);
  if (!sale) notFound();

  const today = todayISO();
  const remaining = saleInstallments
    .filter((installment) => !installment.entryId)
    .reduce((sum, installment) => sum + Number(installment.amount), 0);

  return (
    <Page title={`Venda #${sale.id}`}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <Detail label="Bandeirante">
          <Link href={`/kids/${sale.kidId}`} className={`${linkClass} underline`}>
            {sale.kidName}
          </Link>
        </Detail>
        <Detail label="Item">
          <Link href={`/inventory/${sale.itemId}`} className={`${linkClass} underline`}>
            {sale.itemName}
          </Link>
          {sale.quantity > 1 && ` × ${sale.quantity}`}
        </Detail>
        <Detail label="Data">{formatDate(sale.saleDate)}</Detail>
        <Detail label="Total">{formatBRL(Number(sale.total))}</Detail>
        <Detail label="Falta receber">
          <span className={remaining > 0 ? "text-amber-600" : "text-emerald-600"}>
            {formatBRL(remaining)}
          </span>
        </Detail>
        {sale.note && <Detail label="Nota">{sale.note}</Detail>}
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Parcelas</h2>
        <ul className="border-t border-zinc-200 text-sm dark:border-zinc-800">
          {saleInstallments.map((installment) => {
            const overdue = !installment.entryId && installment.dueDate < today;
            return (
              <li
                key={installment.id}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-zinc-100 py-3 dark:border-zinc-900"
              >
                <div className="flex flex-col gap-0.5">
                  <p className="font-medium">
                    {installment.number}ª parcela
                    <span className="font-normal text-zinc-500">
                      {" "}
                      de {saleInstallments.length} ·{" "}
                      {formatBRL(Number(installment.amount))}
                    </span>
                  </p>
                  <p className="text-zinc-500">
                    Vence {formatDate(installment.dueDate)} ·{" "}
                    {installment.paidDate ? (
                      <span className="text-emerald-600">
                        Paga em {formatDate(installment.paidDate)}
                      </span>
                    ) : overdue ? (
                      <span className="font-medium text-red-600">Atrasada</span>
                    ) : (
                      <span>A vencer</span>
                    )}
                  </p>
                </div>
                {installment.entryId ? (
                  <UndoPaymentButton action={undoPayment.bind(null, installment.id)} />
                ) : (
                  <PaymentForm action={payInstallment.bind(null, installment.id)} />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <DeleteButton
        action={deleteSale.bind(null, id)}
        label="Excluir venda"
        confirmMessage="Excluir esta venda? As parcelas pagas também saem dos lançamentos e as unidades voltam ao estoque."
      />
    </Page>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
