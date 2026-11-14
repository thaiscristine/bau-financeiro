import { Eyebrow } from "./eyebrow";

// A row of Stat tiles. The gaps show the line color behind, drawing the
// dividers for any column count; add the grid columns.
export const statGridClass = "grid gap-px border border-line bg-line";

// A labelled figure, such as a total. The group's name is its label, so tests
// and screen readers find the value by what it means.
export function Stat({
  label,
  value,
  hint,
  tone = "",
  square,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
  square: "blue" | "orange" | "ink";
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-6 bg-surface p-5 sm:p-6">
      <Eyebrow as="span" tone={square}>
        {label}
      </Eyebrow>
      <p className={`text-[28px] leading-none tracking-[-0.02em] tabular-nums sm:text-[32px] ${tone}`}>
        {value}
        {hint && <span className="mt-2 block text-[13px] tracking-normal text-muted">{hint}</span>}
      </p>
    </div>
  );
}
