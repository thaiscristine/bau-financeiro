"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

// Browsers without the Popover API get it from the polyfill, loaded only there
if (typeof window !== "undefined" && !Object.hasOwn(HTMLElement.prototype, "popover")) {
  import("@oddbird/popover-polyfill");
}

type NavLink = { href: string; label: string };
// A section with children opens its first page and lists the others in a row
// under the main menu. One with a menu has no page of its own and lists its
// pages in a drop-down.
type NavSection =
  | (NavLink & { children?: NavLink[]; menu?: never })
  | { label: string; menu: NavLink[]; href?: never; children?: never };

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
  { href: "/events", label: "Eventos" },
  { href: "/kids", label: "Bandeirantes" },
  { href: "/reports", label: "Relatórios" },
  {
    label: "Configurações",
    menu: [
      { href: "/users", label: "Usuários" },
      { href: "/categories", label: "Categorias" },
    ],
  },
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
  return LINKS.find((link) => {
    if (link.menu) return activeChild(pathname, link.menu) !== undefined;
    return link.children
      ? activeChild(pathname, link.children) !== undefined
      : isActive(pathname, link.href);
  });
}

function sectionClass(active: boolean) {
  return `flex h-11 shrink-0 items-center border-b-2 text-[15px] transition-colors xl:h-16 ${
    active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
  }`;
}

export function NavLinks() {
  const pathname = usePathname();
  const section = activeSection(pathname);

  return (
    <nav className="-mx-4 flex w-[calc(100%+2rem)] gap-6 overflow-x-auto border-t border-line-soft px-4 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:px-8 xl:mx-0 xl:w-auto xl:gap-5 xl:border-t-0 xl:px-0">
      {LINKS.map((link) => {
        const active = link === section;
        if (link.menu) {
          return (
            <NavMenu
              key={link.label}
              label={link.label}
              pages={link.menu}
              active={active}
              current={active ? activeChild(pathname, link.menu) : undefined}
            />
          );
        }
        return (
          <Link
            key={link.href}
            href={link.href}
            // The section's own page is marked by its sub-menu instead
            aria-current={active && !link.children ? "page" : undefined}
            className={sectionClass(active)}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

// A button in the main menu that opens the section's pages in a popover. The
// popover sits in the top layer, so the menu's sideways scroll on small
// screens doesn't clip it.
function NavMenu({
  label,
  pages,
  active,
  current,
}: {
  label: string;
  pages: NavLink[];
  active: boolean;
  current: NavLink | undefined;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const trigger = triggerRef.current;
    const list = listRef.current;
    if (!trigger || !list) return;
    // Where CSS can't anchor the popover to its button, place it from script:
    // under the button, kept inside the window
    const anchored = CSS.supports("position-area", "block-end");
    const place = () => {
      const button = trigger.getBoundingClientRect();
      const size = list.getBoundingClientRect();
      const left = Math.min(button.left, window.innerWidth - size.width);
      list.style.top = `${button.bottom}px`;
      list.style.left = `${Math.max(0, left)}px`;
    };
    const onBeforeToggle = (event: Event) => {
      if (!anchored && (event as ToggleEvent).newState === "open") place();
    };
    const onToggle = (event: Event) => {
      const isOpen = (event as ToggleEvent).newState === "open";
      setOpen(isOpen);
      // Now that it has a size, keep it from running off the window
      if (!anchored && isOpen) place();
    };
    list.addEventListener("beforetoggle", onBeforeToggle);
    list.addEventListener("toggle", onToggle);
    return () => {
      list.removeEventListener("beforetoggle", onBeforeToggle);
      list.removeEventListener("toggle", onToggle);
    };
  }, []);

  return (
    <div
      className="flex shrink-0"
      // Tabbing away from the button and its pages closes the menu
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (next && !event.currentTarget.contains(next)) {
          listRef.current?.hidePopover();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={id}
        aria-controls={id}
        aria-expanded={open}
        className={`${sectionClass(active)} gap-1.5`}
      >
        {label}
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m2.5 4.5 3.5 3.5 3.5-3.5" />
        </svg>
      </button>
      <ul
        ref={listRef}
        id={id}
        popover="auto"
        aria-label={label}
        className="nav-menu rounded-[4px] border border-line bg-surface p-1 text-ink shadow-lg"
      >
        {pages.map((page) => {
          const isCurrent = page === current;
          return (
            <li key={page.href}>
              <Link
                href={page.href}
                aria-current={isCurrent ? "page" : undefined}
                // Changing pages keeps the menu mounted, so close it
                onClick={() => listRef.current?.hidePopover()}
                // The current page gets a bar like the main menu's underline,
                // so it stays apart from the one under the pointer
                className={`block rounded-[2px] border-s-2 px-3 py-2 text-[15px] transition-colors hover:bg-sunken ${
                  isCurrent
                    ? "border-ink text-ink"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {page.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
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
