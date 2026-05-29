import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { AuthInlineLink } from "../../components/auth/AuthActions";
import { AuthSuccessShell } from "../../components/auth/AuthSuccessShell";
import { appRoutes } from "../../routes/routes";

const nextSteps = [
  "Crea tu organizacion para agrupar tus proyectos, APIs y configuracion.",
  "Luego, crea proyectos y conecta tus APIs.",
  "Define reglas para proteger y gobernar tus integraciones.",
];

export function AccountSuccessPage() {
  return (
    <AuthSuccessShell id="account-created-success-view">
      <section
        id="account-created-success-card"
        className="w-full max-w-[900px] rounded-xl border border-[#dce2ea] bg-white px-12 py-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-[106px] w-[106px] items-center justify-center rounded-full border-[5px] border-[#00951d] text-[#00951d]">
            <Check className="h-14 w-14" strokeWidth={3.4} />
          </div>
          <h1 className="mt-7 text-[36px] font-extrabold leading-tight text-[#08090c]">Cuenta creada con exito!</h1>
          <p className="mt-4 text-[19px] leading-7 text-[#5a6882]">Gracias por unirte a OBERYN. Tu cuenta ha sido creada correctamente.</p>
        </div>

        <div className="my-7 h-px bg-[#dce2ea]" />

        <div className="mx-auto max-w-[790px]">
          <h2 className="text-[18px] font-extrabold text-[#08090c]">Que sigue?</h2>
          <ul className="mt-4 space-y-4 text-[18px] leading-7 text-[#60708d]">
            {nextSteps.map((step) => (
              <li key={step} className="flex items-start gap-5">
                <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-[#00951d]" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="my-7 h-px bg-[#dce2ea]" />

        <div className="flex flex-col items-center gap-5">
          <Link
            id="account-success-create-organization-link"
            to={appRoutes.onboardingOrganization}
            className="inline-flex h-[56px] min-w-[340px] items-center justify-center gap-8 rounded-lg bg-[#00951d] px-8 text-[18px] font-extrabold text-white shadow-[0_8px_16px_rgba(0,149,29,0.18)] transition hover:bg-[#007f18]"
          >
            Crear mi organizacion
            <ArrowRight className="h-7 w-7" strokeWidth={2.3} />
          </Link>
          <AuthInlineLink id="account-success-skip-link" to={appRoutes.dashboard} className="text-[18px]">
            Ahora no, lo hare mas tarde
          </AuthInlineLink>
        </div>
      </section>
    </AuthSuccessShell>
  );
}
