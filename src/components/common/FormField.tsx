import type { InputHTMLAttributes } from "react";
import { useId } from "react";
import { cn } from "../../utils/cn";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  helpText?: string;
};

export function FormField({ label, error, helpText, className, required, ...props }: FormFieldProps) {
  const errorId = useId();

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-12 w-full rounded-lg border bg-white px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10",
          error ? "border-red-300" : "border-slate-200",
          className
        )}
        required={required}
        {...props}
      />
      {error ? (
        <span className="mt-2 block text-xs font-semibold text-red-600" id={errorId}>
          {error}
        </span>
      ) : null}
      {!error && helpText ? <span className="mt-2 block text-xs font-medium text-slate-500">{helpText}</span> : null}
    </label>
  );
}
