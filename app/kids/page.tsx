import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { listKids } from "@/lib/kids";
import { formatBRL } from "@/lib/format";
import { Page } from "@/components/page";
import { linkClass, tableHeadCell, tableHeadRow, tableRow } from "@/components/styles";

export default async function KidsPage() {
  await requireSession();
  const rows = await listKids();

  return (
    <Page title="Bandeirantes" action={{ href: "/kids/new", label: "Novo bandeirante" }}>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum bandeirante cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Nome</th>
                <th className={tableHeadCell}>Contato</th>
                <th className={tableHeadCell}>A pagar</th>
                <th className="py-2">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((kid) => (
                <tr key={kid.id} className={tableRow}>
                  <td className="py-2 pr-4">{kid.name}</td>
                  <td className="py-2 pr-4 text-zinc-500">{kid.contact ?? ""}</td>
                  <td
                    className={`py-2 pr-4 whitespace-nowrap ${
                      Number(kid.owed) > 0 ? "text-amber-600" : "text-zinc-500"
                    }`}
                  >
                    {formatBRL(Number(kid.owed))}
                  </td>
                  <td className="py-2 text-right">
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
