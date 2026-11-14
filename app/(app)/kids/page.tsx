import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { listKids } from "@/lib/kids";
import { formatBRL } from "@/lib/format";
import {
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  NO_AGE_GROUP,
  parseAgeGroupFilter,
  type AgeGroupFilter,
} from "@/lib/age-groups";
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
import { AgeGroupFilterChips } from "./age-group-filter";
import { KidForm } from "./kid-form";
import { createKid } from "./actions";

export default async function KidsPage({ searchParams }: PageProps<"/kids">) {
  await requireSession();
  const ageGroup = parseAgeGroupFilter((await searchParams).ramo);
  const allRows = await listKids();

  // Filtered here rather than in SQL: the chips need every group's count anyway
  const counts = Object.fromEntries(
    [...AGE_GROUPS, NO_AGE_GROUP].map((group) => [group, 0])
  ) as Record<AgeGroupFilter, number>;
  for (const kid of allRows) {
    counts[kid.ageGroup ?? NO_AGE_GROUP] += 1;
  }
  const rows = ageGroup
    ? allRows.filter((kid) => (kid.ageGroup ?? NO_AGE_GROUP) === ageGroup)
    : allRows;
  // Filtered to one group, every row would repeat the same ramo
  const showAgeGroup = ageGroup === null;

  return (
    <Page
      title="Bandeirantes"
      aside={
        <FormDialog label="Novo bandeirante">
          <KidForm action={createKid} />
        </FormDialog>
      }
    >
      {allRows.length === 0 ? (
        <EmptyState>Nenhum bandeirante cadastrado ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <AgeGroupFilterChips current={ageGroup} counts={counts} />
          {rows.length === 0 ? (
            <EmptyState>
              {ageGroup === NO_AGE_GROUP
                ? "Todos os bandeirantes têm um ramo."
                : `Nenhum bandeirante em ${AGE_GROUP_LABELS[ageGroup!]}.`}
            </EmptyState>
          ) : (
            <div className={tableWrapClass}>
              <table className={tableClass}>
                <thead>
                  <tr className={tableHeadRow}>
                    <th className={tableHeadCell}>Nome</th>
                    {showAgeGroup && (
                      <th className={`${tableHeadCell} max-sm:hidden`}>Ramo</th>
                    )}
                    <th className={`${tableHeadCell} max-sm:hidden`}>
                      Contato
                    </th>
                    <th className={`${tableHeadCell} max-sm:hidden`}>
                      Responsável
                    </th>
                    <th className={tableHeadCell}>A pagar</th>
                    <th className={tableHeadCell}>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((kid) => (
                    // relative + the link's after: overlay make the whole row
                    // open the bandeirante, while it stays a real link
                    <tr key={kid.id} className={`${tableRow} relative`}>
                      <td className={tableCell}>
                        {kid.name}
                        {/* On phones the age group, contact and responsible person go under the name */}
                        {showAgeGroup && kid.ageGroup && (
                          <span className="block text-[13px] text-muted sm:hidden">
                            {AGE_GROUP_LABELS[kid.ageGroup]}
                          </span>
                        )}
                        <span className="block text-[13px] text-muted sm:hidden">
                          {kid.contact}
                        </span>
                        {kid.isMinor && (
                          <span className="block text-[13px] text-muted sm:hidden">
                            Responsável: {kid.guardianName},{" "}
                            <span className="whitespace-nowrap">
                              {kid.guardianPhone}
                            </span>
                          </span>
                        )}
                      </td>
                      {showAgeGroup && (
                        <td
                          className={`${tableCell} whitespace-nowrap max-sm:hidden`}
                        >
                          {kid.ageGroup ? AGE_GROUP_LABELS[kid.ageGroup] : ""}
                        </td>
                      )}
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
                        <Link
                          href={`/kids/${kid.id}`}
                          className={`${linkClass} after:absolute after:inset-0`}
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Page>
  );
}
