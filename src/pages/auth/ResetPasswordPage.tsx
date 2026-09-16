import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertMessage } from "../../components/common/AlertMessage";
import { Button } from "../../components/common/Button";
import { FormField } from "../../components/common/FormField";
import { authService } from "../../services/auth.service";
import { getErrorMessage } from "../../utils/errors";

type FormValues = {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
};

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";
  const [values, setValues] = useState<FormValues>({ resetToken: tokenFromUrl, newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const resetToken = values.resetToken.trim();
    if (!resetToken) {
      setError("Ingresa el codigo de recuperacion recibido por correo.");
      return;
    }
    if (values.newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.resetPassword({ token: resetToken, new_password: values.newPassword });
      setSuccess(response.message);
      window.setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, "No fue posible restablecer la contraseña."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#F6F9FF] px-4 py-6">
      <section className="w-full max-w-[460px] rounded-2xl border border-white/85 bg-white px-6 py-8 shadow-[0_22px_58px_rgba(35,47,91,0.12)] sm:px-9">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-teal-500 text-teal-500">
            <KeyRound size={30} />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-[#172554]">Restablecer contraseña</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Ingresa el codigo recibido y define una nueva contraseña.</p>
        </div>

        {error ? <AlertMessage message={error} tone="error" onClose={() => setError("")} /> : null}
        {success ? <AlertMessage message={success} onClose={() => setSuccess("")} /> : null}

        {!success ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormField
              autoComplete="one-time-code"
              label="Codigo de recuperacion"
              onChange={(event) => setValues((current) => ({ ...current, resetToken: event.target.value }))}
              required
              type="text"
              value={values.resetToken}
            />
            <FormField
              autoComplete="new-password"
              label="Nueva contraseña"
              minLength={8}
              onChange={(event) => setValues((current) => ({ ...current, newPassword: event.target.value }))}
              required
              type="password"
              value={values.newPassword}
            />
            <FormField
              autoComplete="new-password"
              label="Confirmar nueva contraseña"
              minLength={8}
              onChange={(event) => setValues((current) => ({ ...current, confirmPassword: event.target.value }))}
              required
              type="password"
              value={values.confirmPassword}
            />
            <Button className="w-full" disabled={isSubmitting} icon={isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} type="submit">
              {isSubmitting ? "Restableciendo..." : "Restablecer contraseña"}
            </Button>
          </form>
        ) : null}

        <Link className="mt-5 block text-center text-sm font-bold text-teal-500" to="/login">
          Volver al inicio de sesion
        </Link>
      </section>
    </main>
  );
}
