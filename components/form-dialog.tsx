"use client";

import { createContext, Fragment, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Modal, openModal } from "./modal";
import { primaryButtonClass } from "./styles";

const CloseContext = createContext<(() => void) | null>(null);

// A header button that opens a form in a modal, for creating something
// without leaving the list
export function FormDialog({
  label,
  title = label,
  children,
}: {
  label: string;
  title?: string;
  children: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // A new key on every close gives the next opening an empty form, without
  // what was typed or an old error
  const [formKey, setFormKey] = useState(0);
  const close = useCallback(() => dialogRef.current?.close(), []);

  return (
    <>
      <button
        type="button"
        onClick={() => openModal(dialogRef.current)}
        className={primaryButtonClass}
      >
        {label}
      </button>
      <Modal ref={dialogRef} title={title} onClose={() => setFormKey((key) => key + 1)}>
        <CloseContext value={close}>
          <Fragment key={formKey}>{children}</Fragment>
        </CloseContext>
      </Modal>
    </>
  );
}

// For forms that are also used on their own page. Closes the surrounding
// FormDialog once `saved` is set, and tells whether there is one, so the form
// can drop its card look inside the modal.
export function useFormDialog(saved?: number) {
  const close = useContext(CloseContext);

  useEffect(() => {
    if (saved !== undefined) close?.();
  }, [saved, close]);

  return close !== null;
}
