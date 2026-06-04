import { SignInWithMetamaskButton, useAuth } from "@clerk/react";
import { useSignUp } from "@clerk/react/legacy";
import { UserPlus, Wallet } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { AuthCheckbox } from "../../components/auth/AuthCheckbox";
import { AuthDivider, AuthInlineLink, AuthPrimaryButton } from "../../components/auth/AuthActions";
import { AuthField, AuthPasswordField } from "../../components/auth/AuthFields";
import { AuthFormMessage } from "../../components/auth/AuthFormMessage";
import { AuthShell } from "../../components/auth/AuthShell";
import { getClerkErrorMessage } from "../../lib/clerk/errors";
import { appRoutes } from "../../routes/routes";

export function RegisterPage() {
  const navigate = useNavigate();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      navigate(appRoutes.dashboard, { replace: true });
    }
  }, [isAuthLoaded, isSignedIn, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded) return;
    if (isAuthLoaded && isSignedIn) {
      navigate(appRoutes.dashboard, { replace: true });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const emailCode = String(formData.get("emailCode") ?? "");

    if (isVerifyingEmail) {
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const verificationAttempt = await signUp.attemptEmailAddressVerification({ code: emailCode });

        if (verificationAttempt.status === "complete") {
          await setActive({ session: verificationAttempt.createdSessionId });
          navigate(appRoutes.onboardingSuccess);
          return;
        }

        setInfoMessage("Tu cuenta necesita un paso adicional en Clerk antes de continuar.");
      } catch (error) {
        setErrorMessage(getClerkErrorMessage(error, "No pudimos verificar el código. Intenta nuevamente."));
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const name = String(formData.get("name") ?? "");
    const emailAddress = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    setErrorMessage(null);
    setInfoMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      const [firstName, ...lastNameParts] = name.trim().split(" ");
      const signUpAttempt = await signUp.create({
        emailAddress,
        password,
        firstName,
        lastName: lastNameParts.join(" ") || undefined,
      });

      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        navigate(appRoutes.onboardingSuccess);
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setIsVerifyingEmail(true);
      setInfoMessage("Te envíamos un código de verificación por correo. Ingrésalo para activar tu cuenta.");
    } catch (error) {
      setErrorMessage(getClerkErrorMessage(error, "No pudimos crear tu cuenta. Revisa los datos e intenta de nuevo."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell id="auth-register-view" title="Crea tu cuenta" description="Comienza a proteger y controlar cada acción de tu IA.">
      <AuthCard id="auth-register-card" title="Crear cuenta" description="Completa tus datos para empezar." className="max-w-[740px]">
        <form id="register-form" className="space-y-5" onSubmit={handleSubmit}>
          <AuthFormMessage id="register-form-error" tone="error">
            {errorMessage}
          </AuthFormMessage>
          <AuthFormMessage id="register-form-info" tone="info">
            {infoMessage}
          </AuthFormMessage>

          {isVerifyingEmail ? (
            <AuthField id="register-email-code" name="emailCode" label="Código de verificación" type="text" placeholder="123456" inputMode="numeric" autoComplete="one-time-code" required />
          ) : (
            <>
              <AuthField id="register-name" name="name" label="Nombre" type="text" placeholder="Tu nombre" autoComplete="name" required />
              <AuthField id="register-email" name="email" label="Correo electrónico" type="email" placeholder="ejemplo@acme.com" autoComplete="email" required />
              <AuthPasswordField id="register-password" name="password" label="Contraseña" placeholder="Mínimo 8 caracteres" autoComplete="new-password" minLength={8} required />
              <AuthPasswordField id="register-confirm-password" name="confirmPassword" label="Confirmar contraseña" placeholder="Repite tu contraseña" autoComplete="new-password" minLength={8} required />

              <AuthCheckbox id="register-accept-terms" name="acceptTerms" required>
                Acepto los{" "}
                <AuthInlineLink id="register-terms-link" to="/terms">
                  Términos de servicio
                </AuthInlineLink>{" "}
                y la{" "}
                <AuthInlineLink id="register-privacy-link" to="/privacy">
                  Política de privacidad
                </AuthInlineLink>
              </AuthCheckbox>
            </>
          )}

          <AuthPrimaryButton id="register-submit-button" type="submit" disabled={!isLoaded || !isAuthLoaded || Boolean(isSignedIn) || isSubmitting} icon={<UserPlus className="h-7 w-7" strokeWidth={2.3} />}>
            {isSubmitting ? "Procesando..." : isVerifyingEmail ? "Verificar cuenta" : "Crear cuenta"}
          </AuthPrimaryButton>

          {!isVerifyingEmail && (
            <>
              <AuthDivider />

              <SignInWithMetamaskButton>
                <button
                  id="register-wallet-button"
                  type="button"
                  disabled={!isLoaded || !isAuthLoaded || Boolean(isSignedIn)}
                  className="inline-flex h-[54px] w-full items-center justify-center gap-4 rounded-lg border border-[#d6dde7] bg-white px-6 text-[18px] font-extrabold text-[#08090c] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Wallet className="h-6 w-6" strokeWidth={2.4} />
                  Continuar con MetaMask
                </button>
              </SignInWithMetamaskButton>
            </>
          )}

          <p className="pt-2 text-center text-[18px] font-medium text-[#28354a]">
            ¿Ya tienes cuenta?{" "}
            <AuthInlineLink id="register-login-link" to={appRoutes.login}>
              Iniciar sesión
            </AuthInlineLink>
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
