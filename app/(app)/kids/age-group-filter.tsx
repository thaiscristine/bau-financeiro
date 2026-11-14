import Link from "next/link";
import {
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  NO_AGE_GROUP,
  type AgeGroupFilter,
} from "@/lib/age-groups";
import { chipClass } from "@/components/styles";

// Plain links, so a filtered list is just a URL that can be bookmarked or
// shared. Every group stays listed, even when empty, so the chips don't jump
// around; "Sem ramo" only shows up while someone has no group.
export function AgeGroupFilterChips({
  current,
  counts,
}: {
  current: AgeGroupFilter | null;
  counts: Record<AgeGroupFilter, number>;
}) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const options: {
    value: AgeGroupFilter | null;
    label: string;
    count: number;
  }[] = [
    { value: null, label: "Todos", count: total },
    ...AGE_GROUPS.map((group) => ({
      value: group,
      label: AGE_GROUP_LABELS[group],
      count: counts[group],
    })),
  ];
  if (counts[NO_AGE_GROUP] > 0 || current === NO_AGE_GROUP) {
    options.push({
      value: NO_AGE_GROUP,
      label: "Sem ramo",
      count: counts[NO_AGE_GROUP],
    });
  }

  return (
    <nav aria-label="Ramo">
      <ul className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <li key={option.value ?? "all"}>
            <Link
              href={option.value ? `/kids?ramo=${option.value}` : "/kids"}
              aria-current={option.value === current ? "page" : undefined}
              className={`${chipClass} gap-1.5`}
            >
              {option.label}
              <span className="text-xs tabular-nums opacity-60">
                {option.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
