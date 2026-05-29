import { AuthCard } from "../../components/auth/AuthCard";
import { AuthInlineLink, AuthPrimaryButton } from "../../components/auth/AuthActions";
import { AuthField } from "../../components/auth/AuthFields";
import { AuthShell } from "../../components/auth/AuthShell";
import { appRoutes } from "../../routes/routes";

export function ForgotPasswordPage() {
  return (
    <AuthShell id="auth-forgot-password-view" title="Recupera tu acceso" description="Restablece tu contraseña y vuelve a controlar tus integraciones.">
      <AuthCard id="auth-forgot-password-card" title="Recuperar contraseña" description="Ingresa tu correo para recibir instrucciones.">
        <form
          id="forgot-password-form"
          className="space-y-8"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <AuthField id="forgot-password-email" label="Correo electrónico" type="email" placeholder="ejemplo@acme.com" autoComplete="email" />
          <AuthPrimaryButton id="forgot-password-submit-button" type="submit">
            Enviar instrucciones
          </AuthPrimaryButton>
          <p className="text-center text-[18px] font-medium text-[#28354a]">
            ¿Recordaste tu contraseña?{" "}
            <AuthInlineLink id="forgot-password-login-link" to={appRoutes.login}>
              Iniciar sesión
            </AuthInlineLink>
          </p>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
