"use client";

import { useId } from "react";

// Opens a modal with focus on its field marked data-autofocus. React's
// autoFocus can't do it: it focuses once on mount, while the dialog is closed.
export function openModal(dialog: HTMLDialogElement | null) {
  dialog?.showModal();
  dialog?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
}

// A modal drawn as a card over a dimmed page. Open it with openModal; the
// browser then keeps focus inside, closes it on Esc and returns focus to the
// button that opened it.
export function Modal({
  ref,
  title,
  onClose,
  children,
}: {
  ref: React.Ref<HTMLDialogElement>;
  title: string;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // text-left: a modal opened from a right-aligned table cell would inherit it
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg border border-line bg-surface text-left text-ink backdrop:bg-backdrop"
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4 sm:px-8">
        <h2 id={titleId} className="text-2xl leading-tight tracking-[-0.03em]">
          {title}
        </h2>
        <form method="dialog">
          <button
            aria-label="Fechar"
            className="-mr-2 flex size-9 items-center justify-center rounded-[4px] text-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            <svg
              aria-hidden
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="m1.5 1.5 11 11m0-11-11 11" />
            </svg>
          </button>
        </form>
      </div>
      <div className="p-6 sm:p-8">{children}</div>
    </dialog>
  );
}
