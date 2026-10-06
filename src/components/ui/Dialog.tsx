"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";

/** Accessible modal built on the native dialog element (focus trap and Escape handled by the browser). */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onClose={onClose}
      className="m-auto w-[min(92vw,32rem)] rounded-2xl p-0 shadow-xl backdrop:bg-slate-900/50"
    >
      <div className="p-6">
        <h2 id="dialog-title" className="text-lg font-semibold text-slate-900">{title}</h2>
        <div className="mt-3 text-sm text-slate-700">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          {footer ?? <Button variant="secondary" onClick={onClose}>Close</Button>}
        </div>
      </div>
    </dialog>
  );
}
