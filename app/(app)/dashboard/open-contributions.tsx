"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AGE_GROUP_LABELS, type AgeGroup } from "@/lib/age-groups";
import { formatBRL } from "@/lib/format";
import { Modal, openModal } from "@/components/modal";
import {
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";

type Totals = { count: number; pending: number; overdue: number };

type Group = Totals & {
  ageGroup: AgeGroup | null;
  kids: (Totals & { id: number; name: string })[];
};

function groupLabel(ageGroup: AgeGroup | null) {
  return ageGroup ? AGE_GROUP_LABELS[ageGroup] : "Sem ramo";
}

// The open contributions per age group. A row opens who owes in that group,
// and each of their rows opens that bandeirante's page.
export function OpenContributions({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Group | null>(null);
  const total = groups.reduce((sum, group) => sum + group.pending, 0);

  // Opens once the chosen group is rendered inside
  useEffect(() => {
    if (selected) openModal(dialogRef.current);
  }, [selected]);

  return (
    <>
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr className={tableHeadRow}>
              <th className={tableHeadCell}>Ramo</th>
              <th className={`${tableHeadCell} text-right max-sm:hidden`}>
                Meses
              </th>
              <th className={`${tableHeadCell} text-right`}>
                Em aberto
                <span className="ml-2 text-pending">{formatBRL(total)}</span>
              </th>
              <th className={`${tableHeadCell} text-right`}>Atrasado</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr
                key={group.ageGroup ?? "none"}
                onClick={() => setSelected(group)}
                className={`${tableRow} cursor-pointer`}
              >
                <td className={`${tableCell} whitespace-nowrap`}>
                  {/* The row takes the click; the button lets the keyboard reach it */}
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    className={`underline-offset-4 hover:underline ${group.ageGroup ? "" : "text-muted"}`}
                  >
                    {groupLabel(group.ageGroup)}
                  </button>
                </td>
                <td className={`${tableCell} text-right max-sm:hidden`}>
                  {group.count}
                </td>
                <td
                  className={`${tableCell} text-right whitespace-nowrap text-pending`}
                >
                  {formatBRL(group.pending)}
                </td>
                <td
                  className={`${tableCell} text-right whitespace-nowrap ${group.overdue > 0 ? "text-cost" : "text-muted/60"}`}
                >
                  {formatBRL(group.overdue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        ref={dialogRef}
        title={selected ? `Em aberto - ${groupLabel(selected.ageGroup)}` : ""}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Bandeirante</th>
                  <th className={`${tableHeadCell} text-right max-sm:hidden`}>
                    Meses
                  </th>
                  <th className={`${tableHeadCell} text-right`}>Em aberto</th>
                  <th className={`${tableHeadCell} text-right`}>Atrasado</th>
                </tr>
              </thead>
              <tbody>
                {selected.kids.map((kid) => (
                  <tr
                    key={kid.id}
                    onClick={() => router.push(`/kids/${kid.id}`)}
                    className={`${tableRow} cursor-pointer`}
                  >
                    <td className={tableCell}>
                      {/* The row takes the click; the link keeps the keyboard and
                          opening in a new tab working */}
                      <Link
                        href={`/kids/${kid.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="underline-offset-4 hover:underline"
                      >
                        {kid.name}
                      </Link>
                    </td>
                    <td className={`${tableCell} text-right max-sm:hidden`}>
                      {kid.count}
                    </td>
                    <td
                      className={`${tableCell} text-right whitespace-nowrap text-pending`}
                    >
                      {formatBRL(kid.pending)}
                    </td>
                    <td
                      className={`${tableCell} text-right whitespace-nowrap ${kid.overdue > 0 ? "text-cost" : "text-muted/60"}`}
                    >
                      {formatBRL(kid.overdue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-sunken/60">
                  <td className={tableCell}>Total</td>
                  <td className={`${tableCell} text-right max-sm:hidden`}>
                    {selected.count}
                  </td>
                  <td
                    className={`${tableCell} text-right whitespace-nowrap text-pending`}
                  >
                    {formatBRL(selected.pending)}
                  </td>
                  <td
                    className={`${tableCell} text-right whitespace-nowrap ${selected.overdue > 0 ? "text-cost" : "text-muted/60"}`}
                  >
                    {formatBRL(selected.overdue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Modal>
    </>
  );
}
