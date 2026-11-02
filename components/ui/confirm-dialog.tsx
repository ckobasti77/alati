"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` za brisanje i druge nepovratne akcije. */
  tone?: "danger" | "default";
  /** Ako vrati Promise, dugmad su zaključana dok traje. Greška ostavlja dijalog otvoren. */
  onConfirm: () => void | Promise<void>;
};

const buttonClass =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 md:h-10";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Potvrdi",
  cancelLabel = "Otkaži",
  tone = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);

  const confirm = async (event: React.MouseEvent) => {
    event.preventDefault();
    try {
      setPending(true);
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Pozivalac prikazuje grešku (toast); dijalog ostaje otvoren za ponovni pokušaj.
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialog.Portal>
        <div className="pointer-events-none fixed inset-0 z-(--z-modal) flex items-center justify-center p-4">
          <AlertDialog.Overlay className="pointer-events-auto absolute inset-0 bg-overlay backdrop-blur-[2px]" />
          <AlertDialog.Content className="pointer-events-auto relative w-full max-w-sm rounded-(--radius-sheet) bg-surface p-5 text-text shadow-(--shadow-sheet) ring-1 ring-border outline-none">
            <AlertDialog.Title className="text-base font-semibold leading-6">{title}</AlertDialog.Title>
            {description ? (
              <AlertDialog.Description className="mt-1.5 text-sm leading-5 text-text-muted">{description}</AlertDialog.Description>
            ) : (
              <AlertDialog.Description className="sr-only">{title}</AlertDialog.Description>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <AlertDialog.Cancel disabled={pending} className={cn(buttonClass, "bg-surface-2 text-text hover:bg-surface-3")}>
                {cancelLabel}
              </AlertDialog.Cancel>
              <AlertDialog.Action
                disabled={pending}
                onClick={confirm}
                className={cn(
                  buttonClass,
                  tone === "danger" ? "bg-danger-solid text-white hover:bg-danger-solid/90" : "bg-accent text-accent-fg hover:bg-accent-hover",
                )}
              >
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {confirmLabel}
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
