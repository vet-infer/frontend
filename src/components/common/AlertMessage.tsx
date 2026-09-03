import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "../../utils/cn";

type AlertMessageProps = {
  message: string;
  tone?: "success" | "error";
  onClose?: () => void;
};

export function AlertMessage({ message, tone = "success", onClose }: AlertMessageProps) {
  const isError = tone === "error";

  return (
    <div
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold",
        isError ? "border-red-100 bg-red-50 text-red-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"
      )}
      role="alert"
    >
      {isError ? <AlertCircle className="mt-0.5 shrink-0" size={18} /> : <CheckCircle2 className="mt-0.5 shrink-0" size={18} />}
      <span className="flex-1">{message}</span>
      {onClose ? (
        <button className="rounded p-0.5 hover:bg-black/5" onClick={onClose} aria-label="Cerrar mensaje">
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}
