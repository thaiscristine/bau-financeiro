import { AGE_GROUP_COLORS, AGE_GROUP_LABELS, type AgeGroup } from "@/lib/age-groups";

// The age group's color as a dot. Decorative: the label next to it says the name.
// The ring keeps light colors (yellow, the white stripes) visible on the canvas,
// and dark ones (navy) on a selected chip.
export function AgeGroupSwatch({
  ageGroup,
  className = "",
}: {
  ageGroup: AgeGroup;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-3 shrink-0 rounded-full ring-1 ring-ink/20 group-aria-[current=page]:ring-canvas/70 ${className}`}
      style={{ background: AGE_GROUP_COLORS[ageGroup] }}
    />
  );
}

// The age group's name with its color. Inline rather than flex so the name
// keeps the baseline of the text around it.
export function AgeGroupLabel({ ageGroup }: { ageGroup: AgeGroup }) {
  return (
    <span className="whitespace-nowrap">
      <AgeGroupSwatch ageGroup={ageGroup} className="mr-2 align-[-0.1em]" />
      {AGE_GROUP_LABELS[ageGroup]}
    </span>
  );
}
