import Link from "next/link";
import { formatBRL } from "@/lib/format";
import {
  linkClass,
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";
import type { listKidEvents } from "@/lib/events";

type KidEventRow = Awaited<ReturnType<typeof listKidEvents>>[number];

// The events one bandeirante signed up for, on their page
export function KidEventsTable({ rows }: { rows: KidEventRow[] }) {
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <thead>
          <tr className={tableHeadRow}>
            <th className={tableHeadCell}>Evento</th>
            <th className={tableHeadCell}>Valor</th>
            <th className={tableHeadCell}>Pagas</th>
            <th className={tableHeadCell}>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const settled = row.paidCount === row.installmentCount;
            return (
              <tr key={row.participantId} className={tableRow}>
                <td className={tableCell}>{row.eventName}</td>
                <td className={`${tableCell} whitespace-nowrap`}>
                  {formatBRL(Number(row.total))}
                </td>
                <td
                  className={`${tableCell} whitespace-nowrap ${settled ? "text-income" : "text-pending"}`}
                >
                  {/* Nothing to pay when Fundo Lisah covers the whole fee */}
                  {row.installmentCount === 0 ? "Coberto" : `${row.paidCount}/${row.installmentCount}`}
                </td>
                <td className={`${tableCell} text-right`}>
                  <Link
                    href={`/events/${row.eventId}/participants/${row.participantId}`}
                    className={linkClass}
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
