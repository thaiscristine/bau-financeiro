import Link from "next/link";
import { Nav } from "./nav";
import { primaryButtonClass } from "./styles";

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
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{title}</h1>
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
