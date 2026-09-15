import { X } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useRef } from "react";
import { useDialogBehavior } from "../../hooks/useDialogBehavior";
import { useOverlayTransition } from "../../hooks/useOverlayTransition";
import { cn } from "../../utils/cn";

type ModalProps = {
  children: ReactNode;
  isOpen: boolean;
  title: string;
  onClose: () => void;
};

export function Modal({ children, isOpen, title, onClose }: ModalProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { shouldRender, isVisible } = useOverlayTransition(isOpen);
  useDialogBehavior({ isOpen, onClose, containerRef: sectionRef });

  if (!shouldRender) {
    return null;
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 px-4 py-6 transition-opacity duration-150",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      onClick={handleBackdropClick}
    >
      <section
        aria-modal="true"
        className={cn(
          "w-full max-w-3xl rounded-lg border border-slate-100 bg-white shadow-2xl transition duration-150",
          isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
        ref={sectionRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-extrabold text-[#172554]">{title}</h2>
          <button
            aria-label="Cerrar ventana"
            className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-6">{children}</div>
      </section>
    </div>
  );
}
