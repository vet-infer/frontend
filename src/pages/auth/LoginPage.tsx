import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, PawPrint } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ForgotPasswordForm } from "../../components/auth/ForgotPasswordForm";
import { Button } from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage as getResponseErrorMessage } from "../../utils/errors";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

type LoginErrors = {
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    return getResponseErrorMessage(error, "No fue posible iniciar sesion. Revisa tus credenciales.");
  }

  return "No fue posible iniciar sesion. Intenta nuevamente.";
}

function validateLogin(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};

  if (!emailPattern.test(email.trim())) {
    errors.email = "Ingresa un correo electronico valido.";
  }

  if (password.length < 8) {
    errors.password = "La contraseña debe tener al menos 8 caracteres.";
  }

  return errors;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin12345");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [error, setError] = useState("");

  const destination = (location.state as LocationState | null)?.from?.pathname ?? "/";

  if (isAuthenticated) {
    return <Navigate replace to="/" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const nextErrors = validateLogin(email, password);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate(destination, { replace: true });
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#F6F9FF] px-4 py-6 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_17%_18%,rgba(191,219,254,0.58),transparent_34rem),radial-gradient(ellipse_at_86%_20%,rgba(221,214,254,0.62),transparent_35rem),linear-gradient(132deg,#F8FBFF_0%,#EEF6FF_42%,#F4F0FF_100%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[38vw] min-w-[360px] overflow-hidden sm:block">
        <div className="absolute -left-24 bottom-[-3rem] h-[34rem] w-[34rem] rounded-full bg-[#DCEBFF]/55 blur-2xl" />
        <div className="absolute -left-10 bottom-0 h-[28rem] w-[30rem] rounded-[48%] bg-white/18" />
        <PawPrint className="absolute bottom-[8.5rem] left-[6.4rem] text-white/48" size={210} strokeWidth={1.05} />
        <span className="absolute bottom-[2.2rem] left-[3rem] text-[12rem] font-light leading-none text-white/36">+</span>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[36vw] min-w-[360px] overflow-hidden lg:block">
        <div className="absolute right-[-11rem] top-[-2rem] h-[42rem] w-[42rem] rounded-full bg-white/20" />
        <div className="absolute right-[-5rem] top-[9rem] h-[29rem] w-[35rem] rounded-full bg-[#EDE7FF]/45 blur-xl" />
        <span className="absolute right-[6.2rem] top-[45%] text-[7rem] font-light leading-none text-[#4635D3]/10">+</span>
        <div className="absolute bottom-[11rem] right-[6rem] grid grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, index) => (
            <span className="h-2 w-2 rounded-full bg-[#4635D3]/12" key={index} />
          ))}
        </div>
      </div>

      <section className="relative w-full max-w-[460px] rounded-2xl border border-white/85 bg-white/94 px-6 py-7 shadow-[0_22px_58px_rgba(35,47,91,0.12)] backdrop-blur-md sm:px-9 sm:py-8">
        <div className="mb-7 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-[#4635D3] text-[#4635D3] shadow-[0_10px_24px_rgba(70,53,211,0.11)]">
            <PawPrint size={34} fill="currentColor" />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-normal text-[#0F2754] sm:text-[2.15rem]">VetClinic</h1>
        </div>

        {mode === "forgot" ? (
          <ForgotPasswordForm onBack={() => setMode("login")} />
        ) : (
          <>
            <div className="mb-6 text-center">
              <h2 className="sr-only">Iniciar sesion</h2>
              <p className="text-sm font-semibold text-slate-500">
                Ingresa tus credenciales para continuar al sistema clinico.
              </p>
            </div>

            {error ? (
              <div className="mb-5 flex gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                <AlertCircle className="mt-0.5 shrink-0" size={18} />
                <span>{error}</span>
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-slate-700">Correo electronico</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                  <input
                    aria-invalid={Boolean(errors.email)}
                    className="h-[3.25rem] w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-base font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#4635D3] focus:ring-4 focus:ring-[#4635D3]/10"
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setErrors((current) => ({ ...current, email: undefined }));
                    }}
                    placeholder="Ingresa tu correo electronico"
                    type="email"
                    value={email}
                  />
                </span>
                {errors.email ? <span className="mt-2 block text-sm font-semibold text-red-600">{errors.email}</span> : null}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-slate-700">Contraseña</span>
                <span className="relative block">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                  <input
                    aria-invalid={Boolean(errors.password)}
                    className="h-[3.25rem] w-full rounded-lg border border-slate-200 bg-white pl-12 pr-14 text-base font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#4635D3] focus:ring-4 focus:ring-[#4635D3]/10"
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrors((current) => ({ ...current, password: undefined }));
                    }}
                    placeholder="Ingresa tu contraseña"
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </span>
                {errors.password ? <span className="mt-2 block text-sm font-semibold text-red-600">{errors.password}</span> : null}
              </label>

              <Button className="mt-1 h-[3.25rem] w-full rounded-lg text-base shadow-[0_12px_24px_rgba(70,53,211,0.20)]" disabled={isSubmitting} type="submit">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
                {isSubmitting ? "Validando acceso..." : "Iniciar sesion"}
              </Button>
            </form>

            <button
              className="mt-5 w-full rounded-lg px-4 py-2.5 text-center text-sm font-extrabold text-[#4635D3] transition hover:bg-violet-50"
              onClick={() => {
                setMode("forgot");
                setError("");
                setErrors({});
              }}
              type="button"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </>
        )}
      </section>
    </main>
  );
}
