import Link from "next/link";
import { formatBRL, formatDate } from "@/lib/format";
import { linkClass, tableHeadCell, tableHeadRow, tableRow } from "@/components/styles";
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
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className={tableHeadRow}>
            <th className={tableHeadCell}>Data</th>
            {showKid && <th className={tableHeadCell}>Bandeirante</th>}
            <th className={tableHeadCell}>Item</th>
            <th className={tableHeadCell}>Total</th>
            <th className={tableHeadCell}>Parcelas pagas</th>
            <th className="py-2">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((sale) => {
            const settled = sale.paidCount === sale.installmentCount;
            return (
              <tr key={sale.id} className={tableRow}>
                <td className="py-2 pr-4">{formatDate(sale.saleDate)}</td>
                {showKid && <td className="py-2 pr-4">{sale.kidName}</td>}
                <td className="py-2 pr-4">
                  {sale.itemName}
                  {sale.quantity > 1 && (
                    <span className="text-zinc-500"> × {sale.quantity}</span>
                  )}
                </td>
                <td className="py-2 pr-4 whitespace-nowrap">
                  {formatBRL(Number(sale.total))}
                </td>
                <td
                  className={`py-2 pr-4 whitespace-nowrap ${
                    settled ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {sale.paidCount}/{sale.installmentCount}
                </td>
                <td className="py-2 text-right">
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
