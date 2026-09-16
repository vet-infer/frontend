import { AlertTriangle } from "lucide-react";
import type { MouseEvent } from "react";
import { useRef } from "react";
import { useDialogBehavior } from "../../hooks/useDialogBehavior";
import { useOverlayTransition } from "../../hooks/useOverlayTransition";
import { cn } from "../../utils/cn";
import { Button } from "./Button";
import { IconBadge } from "./IconBadge";

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  isOpen: boolean;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  isOpen,
  isLoading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { shouldRender, isVisible } = useOverlayTransition(isOpen);
  useDialogBehavior({ isOpen, onClose: onCancel, containerRef: sectionRef });

  if (!shouldRender) {
    return null;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 transition-opacity duration-150",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      onClick={handleBackdropClick}
    >
      <section
        aria-modal="true"
        className={cn(
          "w-full max-w-md rounded-lg border border-slate-100 bg-white p-6 shadow-2xl transition duration-150",
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
        ref={sectionRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex gap-4">
          <IconBadge className="h-12 w-12 shrink-0" icon={AlertTriangle} iconSize={24} tone="danger" />
          <div>
            <h2 className="text-xl font-extrabold text-[#172554]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button disabled={isLoading} onClick={onCancel} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={isLoading} onClick={onConfirm} type="button" variant="danger">
            {isLoading ? "Eliminando..." : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
