import { Info, Loader2, Mail, Send } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { AlertMessage } from "../common/AlertMessage";
import { Button } from "../common/Button";
import { IconBadge } from "../common/IconBadge";
import { authService } from "../../services/auth.service";
import { emailJsService } from "../../services/emailjs.service";
import { getErrorMessage as getApiErrorMessage } from "../../utils/errors";

type ForgotPasswordFormProps = {
  onBack: () => void;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    return getApiErrorMessage(error, "No fue posible enviar el codigo de recuperacion.");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No fue posible enviar el codigo de recuperacion.";
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      setError("Ingresa un correo electronico valido.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authService.forgotPassword({ email: normalizedEmail });

      if (response.reset_email) {
        await emailJsService.sendPasswordReset(response.reset_email);
      }

      setSuccess(response.message);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-extrabold text-[#172554] sm:text-[1.7rem]">Recuperar contraseña</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Ingresa tu correo y enviaremos un código temporal si existe una cuenta asociada.
        </p>
      </div>

      {error ? <AlertMessage message={error} tone="error" onClose={() => setError("")} /> : null}
      {success ? <AlertMessage message={success} onClose={() => setSuccess("")} /> : null}

      <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-700">Correo electronico</span>
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
            <input
              className="h-[3.25rem] w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-base font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Ingresa tu correo electronico"
              type="email"
              value={email}
            />
          </span>
        </label>

        <Button className="h-[3.25rem] w-full rounded-lg text-base shadow-[0_12px_24px_rgba(70,53,211,0.20)]" disabled={isSubmitting} icon={isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} type="submit">
          {isSubmitting ? "Enviando..." : "Enviar código de recuperación"}
        </Button>
      </form>

      <button
        className="mt-5 w-full rounded-lg px-4 py-2.5 text-center text-sm font-bold text-teal-500 transition hover:bg-teal-50"
        onClick={onBack}
        type="button"
      >
        Volver al inicio de sesión
      </button>

      <div className="mt-5 flex items-start gap-3 border-t border-slate-100 pt-5 text-sm font-semibold leading-6 text-slate-500">
        <IconBadge className="h-9 w-9 shrink-0" icon={Info} iconSize={18} />
        <span>El código temporal no expone la contraseña actual y vence en 15 minutos.</span>
      </div>
    </div>
  );
}
