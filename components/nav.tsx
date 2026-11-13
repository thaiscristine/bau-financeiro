import Link from "next/link";
import { Logo } from "./logo";
import { LogoutButton } from "./logout-button";
import { NavLinks } from "./nav-links";
import { primaryButtonClass } from "./styles";

export function Nav() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-8 px-4 sm:px-8 xl:h-16 xl:flex-nowrap">
        <Link
          href="/dashboard"
          className="flex h-14 items-center gap-3 text-xl tracking-[-0.04em] whitespace-nowrap xl:h-auto"
        >
          <Logo className="h-10 p-0.5" />
          <span className="max-sm:sr-only">Baú Financeiro</span>
        </Link>
        <div className="ml-auto flex items-center gap-4 xl:order-last">
          <LogoutButton />
          <Link
            href="/entries/new"
            className={`${primaryButtonClass} h-9 px-3 text-sm`}
          >
            Novo lançamento
          </Link>
        </div>
        <NavLinks />
      </div>
    </header>
  );
}
