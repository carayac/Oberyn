import { ArrowRight, Box, CheckCircle2, Code2, Cog, Globe2, Lock, Search, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { OnboardingFrame } from "../../components/onboarding/OnboardingFrame";
import { useLatestProject } from "../../hooks/useLatestProject";
import { useProjectSecurity } from "../../hooks/useProjectSecurity";
import { appRoutes } from "../../routes/routes";

export function ConnectionPage() {
  const navigate = useNavigate();
  const { project } = useLatestProject();
  const { createKey, runSdkTest, runGatewayTest } = useProjectSecurity(project?.id);

  async function handleContinue() {
    if (project?.id) {
      await createKey("Onboarding SDK + Gateway");
      await runSdkTest();
      await runGatewayTest();
    }
    navigate(appRoutes.onboardingRules);
  }

  return (
    <OnboardingFrame activeStep={3} backTo={appRoutes.onboardingProject}>
      <div className="grid w-full max-w-[1320px] gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4">
          <div>
            <h1 className="text-[28px] font-extrabold leading-tight text-[#050505] sm:text-[34px]">Conecta tu proyecto con Oberyn</h1>
            <p className="mt-2 max-w-3xl text-[15px] font-medium leading-6 text-[#596783]">
              Oberyn protege agentes, APIs y servicios sin que tengas que ingresar claves privadas. El SDK y Gateway quedan como rutas principales.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: "SDK", tag: "Maximo control", Icon: Code2, points: ["No compartes tus API keys", "Control granular por accion y agente", "Auditoria de decisiones en tiempo real"] },
              { title: "Gateway", tag: "Rapido de implementar", Icon: Globe2, points: ["Protege prompts antes de salir", "Compatible con OpenAI y Anthropic", "Solo cambias la URL base"] },
            ].map(({ title, tag, Icon, points }) => (
              <article key={title} className="rounded-xl border border-[#dce2ea] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-[#eaf7ee] text-[#00951d]"><Icon className="h-7 w-7" /></span>
                  <div>
                    <h2 className="text-xl font-extrabold text-[#050505]">{title}</h2>
                    <span className="rounded-full bg-[#eaf7ee] px-3 py-1 text-xs font-extrabold text-[#008f1f]">{tag}</span>
                  </div>
                </div>
                <ul className="mt-5 space-y-3 text-sm font-semibold text-[#596783]">
                  {points.map((point) => (
                    <li key={point} className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-[#00951d]" />{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <article className="rounded-xl border border-violet-300 bg-white p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700"><Search className="h-7 w-7" /></span>
                <div>
                  <h2 className="text-xl font-extrabold text-[#050505]">Detectar integraciones automaticamente</h2>
                  <p className="mt-1 text-sm font-semibold text-[#596783]">La deteccion se confirma cuando hay trafico real por SDK o Gateway.</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#596783]">
                    {["APIs", "Servicios", "Variables locales", "Acciones criticas"].map((item) => <span key={item} className="rounded-md bg-slate-100 px-2 py-1">{item}</span>)}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => void handleContinue()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-extrabold text-white">
                Iniciar deteccion
              </button>
            </div>
          </article>

          <article className="flex flex-col gap-4 rounded-xl border border-[#dce2ea] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-700"><Cog className="h-6 w-6" /></span>
              <div>
                <h2 className="text-lg font-extrabold text-[#050505]">Configuracion manual</h2>
                <p className="text-sm font-semibold text-[#596783]">Agrega servicios para preparar reglas, aunque aun no tengan actividad.</p>
              </div>
            </div>
          </article>
        </section>

        <aside className="rounded-xl border border-[#dce2ea] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <h2 className="text-xl font-extrabold text-[#050505]">Como funciona</h2>
          {[
            { Icon: Box, title: "Conectas tu proyecto", text: "Usa SDK, Gateway o deteccion asistida." },
            { Icon: Search, title: "Detectamos servicios", text: "Identificamos agentes, APIs y acciones criticas." },
            { Icon: ShieldCheck, title: "Aplicamos protecciones", text: "Las reglas del proyecto se evaluan antes de ejecutar." },
            { Icon: Lock, title: "Seguridad ante todo", text: "Oberyn no almacena tus API keys privadas." },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="mt-5 flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf7ee] text-[#00951d]"><Icon className="h-5 w-5" /></span>
              <div>
                <p className="font-extrabold text-[#111827]">{title}</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-[#596783]">{text}</p>
              </div>
            </div>
          ))}
        </aside>

        <footer className="flex flex-col-reverse gap-3 border-t border-[#dce2ea] pt-4 lg:col-span-2 sm:flex-row sm:justify-end">
          <Link to={appRoutes.onboardingProject} className="inline-flex h-12 min-w-[150px] items-center justify-center rounded-lg border border-[#dce2ea] px-7 text-[16px] font-extrabold text-[#111827]">Volver</Link>
          <button type="button" onClick={() => void handleContinue()} className="inline-flex h-12 min-w-[190px] items-center justify-center gap-5 rounded-lg bg-[#00951d] px-8 text-[16px] font-extrabold text-white">
            Continuar <ArrowRight className="h-6 w-6" />
          </button>
        </footer>
      </div>
    </OnboardingFrame>
  );
}
