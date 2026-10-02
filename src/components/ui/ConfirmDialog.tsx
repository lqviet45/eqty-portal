'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { Button, type ButtonVariant } from './Button';

/** A native <dialog>: focus trap, Escape and backdrop come from the browser. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  variant?: ButtonVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      className="m-auto w-[min(92vw,440px)] rounded-xl border border-slate-200 p-0 shadow-xl backdrop:bg-slate-900/50"
    >
      <div className="flex flex-col gap-3 p-6">
        <h2 className="text-lg font-bold">{title}</h2>
        {children && <div className="text-sm text-slate-700">{children}</div>}
        <div className="mt-2 flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
