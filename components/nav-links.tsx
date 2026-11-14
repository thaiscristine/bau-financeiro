"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };
type NavSection = NavLink & { children?: NavLink[] };

const LINKS: NavSection[] = [
  { href: "/dashboard", label: "Painel" },
  { href: "/entries", label: "Transações" },
  {
    href: "/sales",
    label: "Lojinha",
    children: [
      { href: "/sales", label: "Vendas" },
      { href: "/inventory", label: "Estoque" },
      { href: "/sales/report", label: "Relatório" },
    ],
  },
  { href: "/kids", label: "Bandeirantes" },
  { href: "/reports", label: "Relatórios" },
  { href: "/categories", label: "Categorias" },
  { href: "/users", label: "Usuários" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// The sub-menu item for the current page. The most specific match wins, so
// /sales/report is the report and not the sales list it sits under.
function activeChild(pathname: string, children: NavLink[]) {
  return children
    .filter((child) => isActive(pathname, child.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

function activeSection(pathname: string) {
  return LINKS.find((link) =>
    link.children
      ? activeChild(pathname, link.children) !== undefined
      : isActive(pathname, link.href)
  );
}

export function NavLinks() {
  const pathname = usePathname();
  const section = activeSection(pathname);

  return (
    <nav className="-mx-4 flex w-[calc(100%+2rem)] gap-6 overflow-x-auto border-t border-line-soft px-4 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:px-8 xl:mx-0 xl:w-auto xl:gap-5 xl:border-t-0 xl:px-0">
      {LINKS.map((link) => {
        const active = link === section;
        return (
          <Link
            key={link.href}
            href={link.href}
            // The section's own page is marked by its sub-menu instead
            aria-current={active && !link.children ? "page" : undefined}
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

// The pages of the current section, in a row under the main menu
export function SubNavLinks() {
  const pathname = usePathname();
  const section = activeSection(pathname);
  if (!section?.children) return null;
  const current = activeChild(pathname, section.children);

  return (
    <nav
      aria-label={section.label}
      className="border-t border-line-soft bg-canvas/60"
    >
      <div className="mx-auto flex w-full max-w-6xl gap-6 overflow-x-auto px-4 sm:px-8">
        {section.children.map((child) => {
          const active = child === current;
          return (
            <Link
              key={child.href}
              href={child.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-10 shrink-0 items-center border-b-2 text-[14px] transition-colors ${
                active
                  ? "border-ink text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {child.label}
            </Link>
          );
        })}
      </div>
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
