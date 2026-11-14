import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { ThemeSwitch } from "./theme-switch";

export async function ThemeToggle() {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return <ThemeSwitch initialTheme={theme} />;
}
