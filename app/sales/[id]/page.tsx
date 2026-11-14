import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { getSale, listInstallments } from "@/lib/sales";
import { formatBRL, formatDate, todayISO } from "@/lib/format";
import { Eyebrow, Page } from "@/components/page";
import { DeleteButton } from "@/components/delete-button";
import { cardClass, labelClass } from "@/components/styles";
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
      <dl className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-5">
        <Detail label="Bandeirante">
          <Link href={`/kids/${sale.kidId}`} className="underline-offset-4 hover:underline">
            {sale.kidName}
          </Link>
        </Detail>
        <Detail label="Item">
          <Link href={`/inventory/${sale.itemId}`} className="underline-offset-4 hover:underline">
            {sale.itemName}
          </Link>
          {sale.quantity > 1 && ` × ${sale.quantity}`}
        </Detail>
        <Detail label="Data">{formatDate(sale.saleDate)}</Detail>
        <Detail label="Total">{formatBRL(Number(sale.total))}</Detail>
        <Detail label="Falta receber" className="max-sm:col-span-2">
          <span className={remaining > 0 ? "text-pending" : "text-income"}>
            {formatBRL(remaining)}
          </span>
        </Detail>
        {sale.note && (
          <Detail label="Nota" className="col-span-full font-serif">
            {sale.note}
          </Detail>
        )}
      </dl>

      <section className="flex flex-col gap-4">
        <Eyebrow as="h2">Parcelas</Eyebrow>
        <ul className={`divide-y divide-line-soft text-[15px] ${cardClass}`}>
          {saleInstallments.map((installment) => {
            const overdue = !installment.entryId && installment.dueDate < today;
            return (
              <li
                key={installment.id}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4"
              >
                <div className="flex flex-col gap-1 tabular-nums">
                  <p>
                    {installment.number}ª parcela
                    <span className="text-muted">
                      {" "}
                      de {saleInstallments.length} ·{" "}
                      {formatBRL(Number(installment.amount))}
                    </span>
                  </p>
                  <p className="text-sm text-muted">
                    Vence {formatDate(installment.dueDate)} ·{" "}
                    {installment.paidDate ? (
                      <span className="text-income">
                        Paga em {formatDate(installment.paidDate)}
                      </span>
                    ) : overdue ? (
                      <span className="text-cost">Atrasada</span>
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

function Detail({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 bg-surface p-5 ${className}`}>
      <dt className={labelClass}>{label}</dt>
      <dd className="text-[17px] tabular-nums">{children}</dd>
    </div>
  );
}
