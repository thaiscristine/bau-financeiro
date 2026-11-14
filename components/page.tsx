import { Eyebrow } from "./eyebrow";

export function Page({
  title,
  aside,
  children,
}: {
  title: string;
  // The header's right side, such as a button opening a modal
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className={mainClass}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className={titleClass}>{title}</h1>
        {aside}
      </div>
      {children}
    </main>
  );
}

const mainClass =
  "mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-10 px-4 pt-12 pb-20 sm:px-8 sm:pt-16";

const titleClass = "text-4xl leading-none tracking-[-0.03em] sm:text-[54px]";

// Shown under the nav while the next page loads, laid out like a Page so the
// content lands where the placeholders were
export function PageSkeleton() {
  const block = "bg-sunken motion-safe:animate-pulse";
  return (
    <main className={mainClass} aria-busy="true">
      <span className="sr-only">Carregando…</span>
      <div className={`h-9 w-56 sm:h-[54px] sm:w-80 ${block}`} />
      <div className={`h-32 border border-line ${block}`} />
      <div className="flex flex-col gap-4">
        <div className={`h-4 w-40 ${block}`} />
        <div className={`h-64 border border-line ${block}`} />
      </div>
    </main>
  );
}

export function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <Eyebrow as="h2">{title}</Eyebrow>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-line bg-surface px-5 py-10 text-center font-serif text-[17px] text-muted">
      {children}
    </p>
  );
}
