export type Theme = "system" | "light" | "dark";

export const THEME_COOKIE = "theme";

// No cookie (or an unknown value) means following the device setting
export function parseTheme(value: string | undefined): Theme {
  return value === "light" || value === "dark" ? value : "system";
}
