import Link from "next/link";
import { formatBRL, formatDate } from "@/lib/format";
import {
  linkClass,
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";
import type { listSales } from "@/lib/sales";

type SaleRow = Awaited<ReturnType<typeof listSales>>[number];

export function SalesTable({
  rows,
  showKid = true,
}: {
  rows: SaleRow[];
  showKid?: boolean;
}) {
  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <thead>
          <tr className={tableHeadRow}>
            <th className={tableHeadCell}>Data</th>
            {showKid && <th className={tableHeadCell}>Bandeirante</th>}
            <th className={tableHeadCell}>Item</th>
            <th className={tableHeadCell}>Total</th>
            <th className={tableHeadCell}>Parcelas pagas</th>
            <th className={tableHeadCell}>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((sale) => {
            const settled = sale.paidCount === sale.installmentCount;
            return (
              <tr key={sale.id} className={tableRow}>
                <td className={tableCell}>{formatDate(sale.saleDate)}</td>
                {showKid && <td className={tableCell}>{sale.kidName}</td>}
                <td className={tableCell}>
                  {sale.itemName}
                  {sale.quantity > 1 && (
                    <span className="text-muted"> × {sale.quantity}</span>
                  )}
                </td>
                <td className={`${tableCell} whitespace-nowrap`}>
                  {formatBRL(Number(sale.total))}
                </td>
                <td
                  className={`${tableCell} whitespace-nowrap ${
                    settled ? "text-income" : "text-pending"
                  }`}
                >
                  {sale.paidCount}/{sale.installmentCount}
                </td>
                <td className={`${tableCell} text-right`}>
                  <Link href={`/sales/${sale.id}`} className={linkClass}>
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
