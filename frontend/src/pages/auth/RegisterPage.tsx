import { useSignUp } from "@clerk/react/legacy";
import { UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { AuthCheckbox } from "../../components/auth/AuthCheckbox";
import { AuthInlineLink, AuthPrimaryButton } from "../../components/auth/AuthActions";
import { AuthField, AuthPasswordField } from "../../components/auth/AuthFields";
import { AuthFormMessage } from "../../components/auth/AuthFormMessage";
import { AuthShell } from "../../components/auth/AuthShell";
import { getClerkErrorMessage } from "../../lib/clerk/errors";
import { appRoutes } from "../../routes/routes";

const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export function RegisterPage() {
  if (!hasClerkKey) {
    return <LocalPreviewRegisterPage />;
  }

  return <ClerkRegisterPage />;
}

function LocalPreviewRegisterPage() {
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(appRoutes.onboardingSuccess);
  }

  return (
    <AuthShell id="auth-register-view" title="Crea tu cuenta" description="Comienza a proteger y controlar cada accion de tu IA.">
      <AuthCard id="auth-register-card" title="Crear cuenta" description="Preview local sin Clerk." className="max-w-[740px]">
        <form id="register-form" className="space-y-5" onSubmit={handleSubmit}>
          <AuthFormMessage id="register-form-info" tone="info">
            Falta VITE_CLERK_PUBLISHABLE_KEY. El registro real se activara cuando configures Clerk.
          </AuthFormMessage>

          <AuthField id="register-name" name="name" label="Nombre" type="text" placeholder="Tu nombre" autoComplete="name" required />
          <AuthField id="register-email" name="email" label="Correo electronico" type="email" placeholder="ejemplo@acme.com" required />
          <AuthPasswordField id="register-password" name="password" label="Contrasena" placeholder="Minimo 8 caracteres" minLength={8} required />

          <AuthPrimaryButton id="register-submit-button" type="submit" icon={<UserPlus className="h-7 w-7" strokeWidth={2.3} />}>
            Crear cuenta preview
          </AuthPrimaryButton>

          <p className="pt-2 text-center text-[18px] font-medium text-[#28354a]">
            Ya tienes cuenta?{" "}
            <AuthInlineLink id="register-login-link" to={appRoutes.login}>
              Iniciar sesion
            </AuthInlineLink>
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}

function ClerkRegisterPage() {
  const navigate = useNavigate();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded) return;

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
        setErrorMessage(getClerkErrorMessage(error, "No pudimos verificar el codigo. Intenta nuevamente."));
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
      setErrorMessage("Las contrasenas no coinciden.");
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
      setInfoMessage("Te enviamos un codigo de verificacion por correo. Ingresalo para activar tu cuenta.");
    } catch (error) {
      setErrorMessage(getClerkErrorMessage(error, "No pudimos crear tu cuenta. Revisa los datos e intenta de nuevo."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell id="auth-register-view" title="Crea tu cuenta" description="Comienza a proteger y controlar cada accion de tu IA.">
      <AuthCard id="auth-register-card" title="Crear cuenta" description="Completa tus datos para empezar." className="max-w-[740px]">
        <form id="register-form" className="space-y-5" onSubmit={handleSubmit}>
          <AuthFormMessage id="register-form-error" tone="error">
            {errorMessage}
          </AuthFormMessage>
          <AuthFormMessage id="register-form-info" tone="info">
            {infoMessage}
          </AuthFormMessage>

          {isVerifyingEmail ? (
            <AuthField id="register-email-code" name="emailCode" label="Codigo de verificacion" type="text" placeholder="123456" inputMode="numeric" autoComplete="one-time-code" required />
          ) : (
            <>
              <AuthField id="register-name" name="name" label="Nombre" type="text" placeholder="Tu nombre" autoComplete="name" required />
              <AuthField id="register-email" name="email" label="Correo electronico" type="email" placeholder="ejemplo@acme.com" autoComplete="email" required />
              <AuthPasswordField id="register-password" name="password" label="Contrasena" placeholder="Minimo 8 caracteres" autoComplete="new-password" minLength={8} required />
              <AuthPasswordField id="register-confirm-password" name="confirmPassword" label="Confirmar contrasena" placeholder="Repite tu contrasena" autoComplete="new-password" minLength={8} required />

              <AuthCheckbox id="register-accept-terms" name="acceptTerms" required>
                Acepto los{" "}
                <AuthInlineLink id="register-terms-link" to="/terms">
                  Terminos de servicio
                </AuthInlineLink>{" "}
                y la{" "}
                <AuthInlineLink id="register-privacy-link" to="/privacy">
                  Politica de privacidad
                </AuthInlineLink>
              </AuthCheckbox>
            </>
          )}

          <AuthPrimaryButton id="register-submit-button" type="submit" disabled={!isLoaded || isSubmitting} icon={<UserPlus className="h-7 w-7" strokeWidth={2.3} />}>
            {isSubmitting ? "Procesando..." : isVerifyingEmail ? "Verificar cuenta" : "Crear cuenta"}
          </AuthPrimaryButton>

          <p className="pt-2 text-center text-[18px] font-medium text-[#28354a]">
            Ya tienes cuenta?{" "}
            <AuthInlineLink id="register-login-link" to={appRoutes.login}>
              Iniciar sesion
            </AuthInlineLink>
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
