import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
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
        className="w-full max-w-[900px] rounded-xl border border-[#dce2ea] bg-white px-5 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-10 lg:px-12"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-[5px] border-[#00951d] text-[#00951d] sm:h-24 sm:w-24">
            <Check className="h-11 w-11 sm:h-14 sm:w-14" strokeWidth={3.4} />
          </div>
          <h1 className="mt-5 text-[30px] font-extrabold leading-tight text-[#08090c] sm:text-[34px]">Cuenta creada con exito!</h1>
          <p className="mt-3 text-[16px] leading-7 text-[#5a6882] sm:text-[18px]">Gracias por unirte a OBERYN. Tu cuenta ha sido creada correctamente.</p>
        </div>

        <div className="my-5 h-px bg-[#dce2ea]" />

        <div className="mx-auto max-w-[790px]">
          <h2 className="text-[18px] font-extrabold text-[#08090c]">Que sigue?</h2>
          <ul className="mt-3 space-y-3 text-[16px] leading-6 text-[#60708d] sm:text-[17px]">
            {nextSteps.map((step) => (
              <li key={step} className="flex items-start gap-5">
                <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-[#00951d]" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="my-5 h-px bg-[#dce2ea]" />

        <div className="flex flex-col items-center gap-5">
          <Link
            id="account-success-create-organization-link"
            to={appRoutes.onboardingOrganization}
            className="inline-flex h-12 w-full max-w-[340px] items-center justify-center gap-6 rounded-lg bg-[#00951d] px-8 text-[16px] font-extrabold text-white shadow-[0_8px_16px_rgba(0,149,29,0.18)] transition hover:bg-[#007f18] sm:h-[54px] sm:text-[18px]"
          >
            Crear mi organizacion
            <ArrowRight className="h-7 w-7" strokeWidth={2.3} />
          </Link>
        </div>
      </section>
    </AuthSuccessShell>
  );
}
