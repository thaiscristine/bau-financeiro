"use client";

import { useState } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

const ONE_YEAR = 60 * 60 * 24 * 365;

const OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: "system",
    label: "Tema do sistema",
    icon: (
      <>
        <rect x="2" y="3" width="12" height="8" rx="1" />
        <path d="M5.5 13.5h5M8 11v2.5" />
      </>
    ),
  },
  {
    value: "light",
    label: "Tema claro",
    icon: (
      <>
        <circle cx="8" cy="8" r="2.75" />
        <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" />
      </>
    ),
  },
  {
    value: "dark",
    label: "Tema escuro",
    icon: <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />,
  },
];

// The server renders <html data-theme> from the same cookie, so the page
// opens in the chosen theme without a flash on the next visit.
function applyTheme(theme: Theme) {
  // Controls fade their colors on hover, so without this they would lag
  // behind the page background for a moment after switching.
  const freeze = document.createElement("style");
  freeze.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.append(freeze);

  const root = document.documentElement;
  if (theme === "system") {
    delete root.dataset.theme;
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`;
  } else {
    root.dataset.theme = theme;
    document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  }

  // Reading a style forces the new colors to apply before transitions return
  void getComputedStyle(document.body).opacity;
  setTimeout(() => freeze.remove(), 1);
}

export function ThemeSwitch({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState(initialTheme);

  return (
    <div
      role="group"
      aria-label="Tema"
      className="flex h-9 shrink-0 rounded-[4px] border border-line p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = option.value === theme;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            title={option.label}
            onClick={() => {
              applyTheme(option.value);
              setTheme(option.value);
            }}
            className={`flex w-8 items-center justify-center rounded-[2px] transition-colors focus-visible:ring-2 focus-visible:ring-blue focus-visible:outline-none ${
              active ? "bg-ink text-canvas" : "text-muted hover:text-ink"
            }`}
          >
            <span className="sr-only">{option.label}</span>
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {option.icon}
            </svg>
          </button>
        );
      })}
    </div>
  );
}
