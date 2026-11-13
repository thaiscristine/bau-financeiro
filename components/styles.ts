export const inputClass =
  "h-10 rounded-[4px] border border-line bg-surface px-3 text-[15px] text-ink outline-none transition-colors placeholder:text-muted/70 hover:border-muted focus:border-ink focus:ring-1 focus:ring-ink";

export const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-[4px] bg-ink px-4 text-[15px] whitespace-nowrap text-canvas transition-opacity hover:opacity-85 disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-[4px] border border-ink px-4 text-[15px] whitespace-nowrap text-ink transition-colors hover:bg-ink hover:text-canvas disabled:opacity-50";

export const dangerButtonClass =
  "inline-flex h-10 items-center justify-center rounded-[4px] border border-cost px-4 text-[15px] text-cost transition-colors hover:bg-cost hover:text-canvas disabled:opacity-50";

export const cardClass = "border border-line bg-surface";

// A form laid out as a white card
export const formCardClass = `flex max-w-xl flex-col gap-6 p-6 sm:p-8 ${cardClass}`;

// A group of fields nested inside a form card
export const panelClass = "flex flex-col gap-4 border border-line bg-canvas p-4";

export const labelClass =
  "font-mono text-xs tracking-[0.05em] text-muted uppercase";

export const hintClass = "text-[13px] leading-snug text-muted";

export const eyebrowClass =
  "flex items-center gap-2 font-mono text-xs tracking-[0.05em] text-ink uppercase";

export const checkboxClass = "size-4 accent-ink";

// relative: the sr-only "Ações" headers are absolutely positioned and would
// otherwise escape the scroll container and widen the whole page
export const tableWrapClass = `relative overflow-x-auto ${cardClass}`;
export const tableClass = "w-full text-left text-[15px] tabular-nums";
export const tableHeadCell =
  "px-5 py-3 font-mono text-xs font-normal tracking-[0.05em] whitespace-nowrap text-muted uppercase";
export const tableHeadRow = "border-b border-line bg-sunken/60";
export const tableRow =
  "border-b border-line-soft transition-colors last:border-b-0 hover:bg-canvas";
export const tableCell = "px-5 py-3.5";

export const linkClass =
  "text-muted underline-offset-4 transition-colors hover:text-ink hover:underline";
