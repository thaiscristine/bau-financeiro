import Link from "next/link";
import { Nav } from "./nav";
import { eyebrowClass, primaryButtonClass } from "./styles";

const SQUARE_TONES = {
  blue: "bg-blue",
  orange: "bg-orange",
  ink: "bg-ink",
};

export function Eyebrow({
  tone = "blue",
  as: Tag = "p",
  children,
}: {
  tone?: keyof typeof SQUARE_TONES;
  as?: "p" | "h2" | "span";
  children: React.ReactNode;
}) {
  return (
    <Tag className={eyebrowClass}>
      <span aria-hidden className={`size-2 shrink-0 ${SQUARE_TONES[tone]}`} />
      {children}
    </Tag>
  );
}

export function Page({
  title,
  action,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-10 px-4 pt-12 pb-20 sm:px-8 sm:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl leading-none tracking-[-0.03em] sm:text-[54px]">
            {title}
          </h1>
          {action && (
            <Link href={action.href} className={primaryButtonClass}>
              {action.label}
            </Link>
          )}
        </div>
        {children}
      </main>
    </>
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
