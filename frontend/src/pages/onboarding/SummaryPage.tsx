import { ArrowRight, Building2, CheckCircle2, Folder, Link2, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { OnboardingFrame } from "../../components/onboarding/OnboardingFrame";
import { useLatestProject } from "../../hooks/useLatestProject";
import { useProjectData } from "../../hooks/useProjectData";
import { appRoutes } from "../../routes/routes";

export function SummaryPage() {
  const navigate = useNavigate();
  const { activeOrganization, project } = useLatestProject();
  const { rules } = useProjectData(project?.id);

  return (
    <OnboardingFrame activeStep={5} backTo={appRoutes.onboardingRules}>
      <section className="w-full max-w-[1100px] rounded-xl border border-[#dce2ea] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
        <h1 className="text-[28px] font-extrabold text-[#050505] sm:text-[36px]">Revisa el resumen de tu proyecto</h1>
        <p className="mt-2 text-[16px] font-medium text-[#596783]">Confirma los detalles antes de terminar la configuracion inicial.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {[
              { Icon: Building2, label: "Organizacion", value: activeOrganization?.name ?? "Organizacion" },
              { Icon: Folder, label: "Proyecto", value: project?.name ?? "Proyecto" },
              { Icon: Link2, label: "Integracion", value: "SDK + Gateway" },
              { Icon: ShieldCheck, label: "Reglas iniciales", value: `${rules.length || 4} reglas activas` },
            ].map(({ Icon, label, value }) => (
              <div key={label} className="flex gap-4 border-b border-[#edf1f5] pb-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#eaf7ee] text-[#00951d]"><Icon className="h-6 w-6" /></span>
                <div>
                  <p className="font-extrabold text-[#111827]">{label}</p>
                  <p className="text-lg font-semibold text-[#596783]">{value}</p>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h2 className="font-extrabold text-[#111827]">Reglas iniciales</h2>
            <ul className="mt-4 space-y-4">
              {(rules.length ? rules : [
                { name: "Solo lectura por defecto" },
                { name: "Aprobacion para acciones criticas" },
                { name: "Bloqueo de eliminacion de datos" },
                { name: "Ocultar datos sensibles" },
              ]).map((rule) => (
                <li key={rule.name} className="flex gap-3 text-[#596783]"><CheckCircle2 className="h-5 w-5 shrink-0 text-[#00951d]" /><span className="font-semibold">{rule.name}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <footer className="mt-8 flex flex-col-reverse gap-3 border-t border-[#dce2ea] pt-5 sm:flex-row sm:justify-end">
          <Link to={appRoutes.onboardingRules} className="inline-flex h-12 min-w-[150px] items-center justify-center rounded-lg border border-[#dce2ea] px-7 text-[16px] font-extrabold text-[#111827]">Volver</Link>
          <button type="button" onClick={() => navigate(appRoutes.onboardingCompleted)} className="inline-flex h-12 min-w-[190px] items-center justify-center gap-5 rounded-lg bg-[#00951d] px-8 text-[16px] font-extrabold text-white">
            Crear proyecto <ArrowRight className="h-6 w-6" />
          </button>
        </footer>
      </section>
    </OnboardingFrame>
  );
}
