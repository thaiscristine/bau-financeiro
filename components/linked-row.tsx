"use client";

import type { ComponentProps, MouseEvent } from "react";

// A table row that opens its link wherever it is tapped, while the link stays
// the real, focusable one. A link overlay stretched over a relative <tr> can't
// do this: Safari before 2026 doesn't position anything against a table row,
// so every row's overlay covered the whole table and every tap opened the last
// row.
export function LinkedRow({ className = "", ...props }: ComponentProps<"tr">) {
  return <tr {...props} className={`${className} cursor-pointer`} onClick={openRowLink} />;
}

function openRowLink(event: MouseEvent<HTMLTableRowElement>) {
  // The link itself, and anything else in the row that reacts to a click
  if ((event.target as Element).closest("a, button, input, select, textarea, label")) return;
  // Someone selecting a name to copy it isn't asking to leave the page
  if (window.getSelection()?.toString()) return;
  const link = event.currentTarget.querySelector("a[href]");
  // Same modifier keys, so ctrl or cmd still opens it in a new tab
  link?.dispatchEvent(
    new globalThis.MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
    })
  );
}
