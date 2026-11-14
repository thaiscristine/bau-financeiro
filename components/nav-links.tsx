"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Painel" },
  { href: "/entries", label: "Lançamentos" },
  { href: "/sales", label: "Vendas" },
  { href: "/inventory", label: "Estoque" },
  { href: "/kids", label: "Bandeirantes" },
  { href: "/categories", label: "Categorias" },
];

// "Novo lançamento" has its own button in the header, so it does not
// highlight any tab.
function isActive(pathname: string, href: string) {
  if (pathname === "/entries/new") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 flex w-[calc(100%+2rem)] gap-6 overflow-x-auto border-t border-line-soft px-4 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:px-8 xl:mx-0 xl:w-auto xl:border-t-0 xl:px-0">
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-11 shrink-0 items-center border-b-2 text-[15px] transition-colors xl:h-16 ${
              active
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
