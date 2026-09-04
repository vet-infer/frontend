import type { SelectHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "../../utils/cn";

type FormSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  helpText?: string;
};

export function FormSelect({ label, error, helpText, className, required, children, ...props }: FormSelectProps) {
  const errorId = useId();

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <select
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-12 w-full rounded-lg border bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 disabled:bg-slate-50 disabled:text-slate-400",
          error ? "border-red-300" : "border-slate-200",
          className
        )}
        required={required}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <span className="mt-2 block text-xs font-semibold text-red-600" id={errorId}>
          {error}
        </span>
      ) : null}
      {!error && helpText ? <span className="mt-2 block text-xs font-medium text-slate-500">{helpText}</span> : null}
    </label>
  );
}
