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

type LoginStep = "credentials" | "firstFactor" | "secondFactor";

export function LoginPage() {
  const navigate = useNavigate();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loginStep, setLoginStep] = useState<LoginStep>("credentials");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function activateSession(result: { createdSessionId?: string | null }) {
    const sessionId = result.createdSessionId;
    if (!sessionId) {
      setErrorMessage("Clerk valido tus datos, pero no devolvio una sesion activa.");
      return;
    }

    if (!setActive) {
      setErrorMessage("Clerk no esta listo para activar la sesion. Intenta nuevamente.");
      return;
    }

    await setActive({ session: sessionId });
    navigate(appRoutes.dashboard);
  }

  async function prepareEmailCodeFactor(targetStep: LoginStep) {
    const signInFlow = signIn as unknown as {
      prepareFirstFactor?: (params: { strategy: "email_code" }) => Promise<unknown>;
      prepareSecondFactor?: (params: { strategy: "email_code" }) => Promise<unknown>;
    };

    if (targetStep === "firstFactor" && signInFlow.prepareFirstFactor) {
      await signInFlow.prepareFirstFactor({ strategy: "email_code" });
    }

    if (targetStep === "secondFactor" && signInFlow.prepareSecondFactor) {
      await signInFlow.prepareSecondFactor({ strategy: "email_code" });
    }

    setLoginStep(targetStep);
    setInfoMessage("Te enviamos un codigo por correo. Ingresalo para continuar.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded) return;

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      if (loginStep !== "credentials") {
        const code = String(formData.get("emailCode") ?? "").trim();
        const signInFlow = signIn as unknown as {
          attemptFirstFactor?: (params: { strategy: "email_code"; code: string }) => Promise<{ status: string; createdSessionId?: string | null }>;
          attemptSecondFactor?: (params: { strategy: "email_code"; code: string }) => Promise<{ status: string; createdSessionId?: string | null }>;
        };
        const result =
          loginStep === "firstFactor"
            ? await signInFlow.attemptFirstFactor?.({ strategy: "email_code", code })
            : await signInFlow.attemptSecondFactor?.({ strategy: "email_code", code });

        if (result?.status === "complete") {
          await activateSession(result);
          return;
        }

        setErrorMessage("El codigo no completo el inicio de sesion. Intenta de nuevo.");
        return;
      }

      const signInAttempt = await signIn.create({ identifier, password });

      if (signInAttempt.status === "complete") {
        await activateSession(signInAttempt);
        return;
      }

      if (signInAttempt.status === "needs_first_factor") {
        await prepareEmailCodeFactor("firstFactor");
        return;
      }

      if (signInAttempt.status === "needs_second_factor") {
        await prepareEmailCodeFactor("secondFactor");
        return;
      }

      setErrorMessage(`Clerk devolvio el estado "${signInAttempt.status}".`);
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
          <AuthFormMessage id="login-form-info" tone="info">
            {infoMessage}
          </AuthFormMessage>

          {loginStep === "credentials" ? (
            <>
              <AuthField id="login-email" name="email" label="Correo electronico" type="email" placeholder="ejemplo@acme.com" autoComplete="email" required />
              <AuthPasswordField id="login-password" name="password" label="Contrasena" autoComplete="current-password" required />
            </>
          ) : (
            <AuthField id="login-email-code" name="emailCode" label="Codigo de verificacion" type="text" placeholder="123456" inputMode="numeric" autoComplete="one-time-code" required />
          )}

          {loginStep === "credentials" && (
            <div className="flex items-center justify-between gap-4">
              <AuthCheckbox id="login-remember-me">Recordarme</AuthCheckbox>
              <AuthInlineLink id="login-forgot-password-link" to={appRoutes.forgotPassword}>
                Olvidaste tu contrasena?
              </AuthInlineLink>
            </div>
          )}

          <AuthPrimaryButton id="login-submit-button" type="submit" disabled={!isLoaded || isSubmitting} icon={<LockKeyhole className="h-7 w-7" strokeWidth={2.2} />}>
            {isSubmitting ? "Procesando..." : loginStep === "credentials" ? "Iniciar sesion" : "Verificar codigo"}
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
