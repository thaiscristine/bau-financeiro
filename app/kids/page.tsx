import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { listKids } from "@/lib/kids";
import { formatBRL } from "@/lib/format";
import { EmptyState, Page } from "@/components/page";
import {
  linkClass,
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";

export default async function KidsPage() {
  await requireSession();
  const rows = await listKids();

  return (
    <Page title="Bandeirantes" action={{ href: "/kids/new", label: "Novo bandeirante" }}>
      {rows.length === 0 ? (
        <EmptyState>Nenhum bandeirante cadastrado ainda.</EmptyState>
      ) : (
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Nome</th>
                <th className={`${tableHeadCell} max-sm:hidden`}>Contato</th>
                <th className={`${tableHeadCell} max-sm:hidden`}>Responsável</th>
                <th className={tableHeadCell}>A pagar</th>
                <th className={tableHeadCell}>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((kid) => (
                <tr key={kid.id} className={tableRow}>
                  <td className={tableCell}>
                    {kid.name}
                    {/* On phones the contact and responsible person go under the name */}
                    <span className="block text-[13px] text-muted sm:hidden">
                      {kid.contact}
                    </span>
                    {kid.isMinor && (
                      <span className="block text-[13px] text-muted sm:hidden">
                        Responsável: {kid.guardianName},{" "}
                        <span className="whitespace-nowrap">{kid.guardianPhone}</span>
                      </span>
                    )}
                  </td>
                  <td className={`${tableCell} text-muted max-sm:hidden`}>
                    {kid.contact ?? ""}
                  </td>
                  <td className={`${tableCell} max-sm:hidden`}>
                    {kid.isMinor && (
                      <>
                        {kid.guardianName}
                        <span className="block text-[13px] whitespace-nowrap text-muted">
                          {kid.guardianPhone}
                        </span>
                      </>
                    )}
                  </td>
                  <td
                    className={`${tableCell} whitespace-nowrap ${
                      Number(kid.owed) > 0 ? "text-pending" : "text-muted"
                    }`}
                  >
                    {formatBRL(Number(kid.owed))}
                  </td>
                  <td className={`${tableCell} text-right`}>
                    <Link href={`/kids/${kid.id}`} className={linkClass}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
