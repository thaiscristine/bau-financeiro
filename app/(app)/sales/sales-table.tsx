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
            {/* On phones the kid, the date and the paid count move into the item
                and total cells, so the row fits without scrolling */}
            <th className={`${tableHeadCell} max-sm:hidden`}>Data</th>
            {showKid && (
              <th className={`${tableHeadCell} max-sm:hidden`}>Bandeirante</th>
            )}
            <th className={tableHeadCell}>Item</th>
            <th className={tableHeadCell}>Total</th>
            <th className={`${tableHeadCell} max-sm:hidden`}>Pagas</th>
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
                <td className={`${tableCell} max-sm:hidden`}>
                  {formatDate(sale.saleDate)}
                </td>
                {showKid && (
                  <td className={`${tableCell} max-sm:hidden`}>
                    <KidLink sale={sale} />
                  </td>
                )}
                <td className={tableCell}>
                  {showKid && (
                    <span className="block sm:hidden">
                      <KidLink sale={sale} />
                    </span>
                  )}
                  {sale.itemName}
                  {sale.quantity > 1 && (
                    <span className="text-muted"> × {sale.quantity}</span>
                  )}
                  <span className="block text-sm text-muted sm:hidden">
                    {formatDate(sale.saleDate)}
                  </span>
                </td>
                <td className={`${tableCell} whitespace-nowrap`}>
                  {formatBRL(Number(sale.total))}
                  <span
                    className={`block text-sm sm:hidden ${
                      settled ? "text-income" : "text-pending"
                    }`}
                  >
                    {sale.paidCount}/{sale.installmentCount} pagas
                  </span>
                </td>
                <td
                  className={`${tableCell} whitespace-nowrap max-sm:hidden ${
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

function KidLink({ sale }: { sale: SaleRow }) {
  return (
    <Link href={`/kids/${sale.kidId}`} className="underline-offset-4 hover:underline">
      {sale.kidName}
    </Link>
  );
}
