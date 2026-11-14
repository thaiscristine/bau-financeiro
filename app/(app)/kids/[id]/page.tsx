import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { getKid } from "@/lib/kids";
import { listSales } from "@/lib/sales";
import { listKidEntries } from "@/lib/entries";
import { listKidEvents } from "@/lib/events";
import { ensureContributions } from "@/lib/contributions";
import { todayISO } from "@/lib/format";
import { EmptyState, Page } from "@/components/page";
import { Eyebrow } from "@/components/eyebrow";
import { DeleteButton } from "@/components/delete-button";
import { SalesTable } from "@/app/(app)/sales/sales-table";
import { KidEventsTable } from "@/app/(app)/events/kid-events-table";
import { NewSaleDialog } from "@/app/(app)/sales/new-sale-dialog";
import { KidForm } from "../kid-form";
import { KidContributions } from "./contributions";
import { deleteKid, updateKid } from "../actions";

export default async function KidPage({
  params,
  searchParams,
}: PageProps<"/kids/[id]">) {
  await requireSession();

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const yearParam = Number((await searchParams).year);
  const year = Number.isInteger(yearParam) ? yearParam : null;

  const today = todayISO();
  await ensureContributions(today);
  const [kid, kidSales, kidEntries, kidEvents] = await Promise.all([
    getKid(id),
    listSales({ kidId: id }),
    listKidEntries(id),
    listKidEvents(id),
  ]);
  if (!kid) notFound();

  return (
    <Page title={kid.name} aside={<NewSaleDialog defaultKidId={id} />}>
      {/* The kid's details first, with their sales and events beside them on wide screens */}
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-8">
        <section className="flex min-w-0 flex-col gap-3">
          <Eyebrow as="h2">Dados</Eyebrow>
          <KidForm action={updateKid.bind(null, id)} kid={kid} />
        </section>

        <div className="flex min-w-0 flex-col gap-10">
          <section className="flex flex-col gap-3">
            <Eyebrow as="h2">Vendas</Eyebrow>
            {kidSales.length === 0 ? (
              <EmptyState>Nenhuma venda para este bandeirante.</EmptyState>
            ) : (
              <SalesTable rows={kidSales} showKid={false} />
            )}
          </section>

          {/* Only shown once the kid signed up for one, so the page stays short */}
          {kidEvents.length > 0 && (
            <section className="flex flex-col gap-3">
              <Eyebrow as="h2">Eventos</Eyebrow>
              <KidEventsTable rows={kidEvents} />
            </section>
          )}
        </div>
      </div>

      <KidContributions kid={kid} year={year} today={today} />

      {kidSales.length === 0 && kidEntries.length === 0 && kidEvents.length === 0 && (
        <DeleteButton
          action={deleteKid.bind(null, id)}
          label="Excluir bandeirante"
          confirmMessage={`Excluir ${kid.name}? Não dá para desfazer.`}
        />
      )}
    </Page>
  );
}
