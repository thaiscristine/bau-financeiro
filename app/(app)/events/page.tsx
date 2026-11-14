import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { listEvents } from "@/lib/events";
import { formatBRL } from "@/lib/format";
import { EmptyState, Page } from "@/components/page";
import { FormDialog } from "@/components/form-dialog";
import {
  linkClass,
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";
import { EventForm } from "./event-form";
import { EventDates } from "./event-dates";
import { createEvent } from "./actions";

export default async function EventsPage() {
  await requireSession();
  const rows = await listEvents();

  return (
    <Page
      title="Eventos"
      aside={
        <FormDialog label="Novo evento">
          <EventForm action={createEvent} />
        </FormDialog>
      }
    >
      {rows.length === 0 ? (
        <EmptyState>Nenhum evento ainda. Crie um para acampamentos, passeios e encontros.</EmptyState>
      ) : (
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Evento</th>
                <th className={`${tableHeadCell} text-right max-sm:hidden`}>Inscritos</th>
                <th className={`${tableHeadCell} text-right`}>Recebido</th>
                <th className={`${tableHeadCell} text-right max-sm:hidden`}>Despesas</th>
                <th className={`${tableHeadCell} text-right`}>Saldo</th>
                <th className={tableHeadCell}>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((event) => {
                const balance = event.received - event.expenses;
                return (
                  <tr key={event.id} className={tableRow}>
                    <td className={tableCell}>
                      {event.name}
                      <span className="block text-[13px] text-muted">
                        <EventDates startDate={event.startDate} endDate={event.endDate} />
                        <span className="sm:hidden">
                          {" · "}
                          {event.participantCount}{" "}
                          {event.participantCount === 1 ? "inscrito" : "inscritos"}
                        </span>
                      </span>
                    </td>
                    <td className={`${tableCell} text-right max-sm:hidden`}>
                      {event.participantCount}
                    </td>
                    <td className={`${tableCell} text-right whitespace-nowrap`}>
                      <span className="text-income">{formatBRL(event.received)}</span>
                      {event.expected > event.received && (
                        <span className="block text-[13px] text-muted">
                          de {formatBRL(event.expected)}
                        </span>
                      )}
                    </td>
                    <td
                      className={`${tableCell} text-right whitespace-nowrap max-sm:hidden ${event.expenses > 0 ? "text-cost" : "text-muted/60"}`}
                    >
                      {formatBRL(event.expenses)}
                    </td>
                    <td
                      className={`${tableCell} text-right whitespace-nowrap ${balance < 0 ? "text-cost" : ""}`}
                    >
                      {formatBRL(balance)}
                    </td>
                    <td className={`${tableCell} text-right`}>
                      <Link href={`/events/${event.id}`} className={linkClass}>
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
