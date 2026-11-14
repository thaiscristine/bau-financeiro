"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Painel" },
  { href: "/entries", label: "Transações" },
  { href: "/sales", label: "Lojinha" },
  { href: "/inventory", label: "Estoque" },
  { href: "/kids", label: "Bandeirantes" },
  { href: "/reports", label: "Relatórios" },
  { href: "/categories", label: "Categorias" },
  { href: "/users", label: "Usuários" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 flex w-[calc(100%+2rem)] gap-6 overflow-x-auto border-t border-line-soft px-4 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:px-8 xl:mx-0 xl:w-auto xl:gap-5 xl:border-t-0 xl:px-0">
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

// Sits with the account controls, apart from the screens in the menu
export function HelpLink() {
  const pathname = usePathname();
  const active = isActive(pathname, "/help");

  return (
    <Link
      href="/help"
      aria-current={active ? "page" : undefined}
      className={`text-[15px] text-ink transition-colors hover:text-muted ${
        active ? "underline underline-offset-4" : ""
      }`}
    >
      Ajuda
    </Link>
  );
}
