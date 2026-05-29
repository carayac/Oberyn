import { useSignIn } from "@clerk/react/legacy";
import { KeyRound, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { AuthCheckbox } from "../../components/auth/AuthCheckbox";
import { AuthDivider, AuthInlineLink, AuthPrimaryButton } from "../../components/auth/AuthActions";
import { AuthField, AuthPasswordField } from "../../components/auth/AuthFields";
import { AuthFormMessage } from "../../components/auth/AuthFormMessage";
import { AuthShell } from "../../components/auth/AuthShell";
import { getClerkErrorMessage } from "../../lib/clerk/errors";
import { appRoutes } from "../../routes/routes";

export function LoginPage() {
  const navigate = useNavigate();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded) return;

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const signInAttempt = await signIn.create({ identifier, password });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        navigate(appRoutes.dashboard);
        return;
      }

      setErrorMessage("Tu inicio de sesion necesita un paso adicional. Revisa tu correo o el panel de Clerk.");
    } catch (error) {
      setErrorMessage(getClerkErrorMessage(error, "No pudimos iniciar sesion con esas credenciales."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      id="auth-login-view"
      title="Bienvenido a Oberyn"
      description="La plataforma que asegura y controla cada accion de tu IA."
    >
      <AuthCard id="auth-login-card" title="Iniciar sesion" description="Ingresa tus credenciales para continuar.">
        <form id="login-form" className="space-y-6" onSubmit={handleSubmit}>
          <AuthFormMessage id="login-form-error" tone="error">
            {errorMessage}
          </AuthFormMessage>

          <AuthField id="login-email" name="email" label="Correo electronico" type="email" placeholder="ejemplo@acme.com" autoComplete="email" required />
          <AuthPasswordField id="login-password" name="password" label="Contrasena" autoComplete="current-password" required />

          <div className="flex items-center justify-between gap-4">
            <AuthCheckbox id="login-remember-me">Recordarme</AuthCheckbox>
            <AuthInlineLink id="login-forgot-password-link" to={appRoutes.forgotPassword}>
              Olvidaste tu contrasena?
            </AuthInlineLink>
          </div>

          <AuthPrimaryButton id="login-submit-button" type="submit" disabled={!isLoaded || isSubmitting} icon={<LockKeyhole className="h-7 w-7" strokeWidth={2.2} />}>
            {isSubmitting ? "Iniciando..." : "Iniciar sesion"}
          </AuthPrimaryButton>

          <AuthDivider />

          <button
            id="login-sso-button"
            type="button"
            className="inline-flex h-[54px] w-full items-center justify-center gap-4 rounded-lg border border-[#d6dde7] bg-white px-6 text-[18px] font-extrabold text-[#08090c] transition hover:bg-slate-50"
          >
            <KeyRound className="h-6 w-6" strokeWidth={2.4} />
            Continuar con SSO
          </button>

          <p className="pt-5 text-center text-[18px] font-medium text-[#28354a]">
            No tienes cuenta?{" "}
            <AuthInlineLink id="login-create-account-link" to={appRoutes.register}>
              Crear cuenta
            </AuthInlineLink>
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
