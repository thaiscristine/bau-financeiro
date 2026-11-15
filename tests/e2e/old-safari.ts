import type { Page } from "@playwright/test";

// Safari before 2026 positions nothing against a table row
// (https://bugs.webkit.org/show_bug.cgi?id=240961), so a row-wide link overlay
// there covered the whole table and every tap opened the last row. Taking
// position away from rows here lets a test catch layouts that count on it.
export async function likeOldSafari(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "tr { position: static !important; }";
      document.head.append(style);
    });
  });
}
