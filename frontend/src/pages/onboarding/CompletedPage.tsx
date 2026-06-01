import { ArrowRight, Check, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AuthBrandLogo } from "../../components/auth/AuthBrandLogo";
import { AuthFooter } from "../../components/auth/AuthFooter";
import { useLatestProject } from "../../hooks/useLatestProject";

export function CompletedPage() {
  const { project } = useLatestProject();
  const projectUrl = project?.id ? `/projects/${project.id}` : "/projects";

  return (
    <main className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#fbfcfd] px-4 py-5">
      <AuthBrandLogo className="justify-center" markSize="sm" />
      <section className="mx-auto my-auto w-full max-w-[700px] rounded-xl border border-[#dce2ea] bg-white p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-10">
        <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-[#eaf7ee] text-[#00951d]">
          <Check className="h-16 w-16" strokeWidth={3} />
        </div>
        <h1 className="mt-6 text-[30px] font-extrabold text-[#050505] sm:text-[40px]">Proyecto creado con exito</h1>
        <p className="mt-3 text-lg font-medium leading-7 text-[#596783]">Tu proyecto ya tiene SDK, Gateway y reglas iniciales listas para probar.</p>
        <div className="mx-auto mt-8 max-w-md border-y border-[#dce2ea] py-5 text-left">
          {["Configurar reglas y politicas", "Gestionar integraciones detectadas", "Crear excepciones de confianza", "Probar SDK y Gateway"].map((item) => (
            <p key={item} className="flex items-center gap-3 py-2 text-base font-semibold text-[#596783]">
              <CheckCircle2 className="h-5 w-5 text-[#00951d]" />
              {item}
            </p>
          ))}
        </div>
        <Link to={projectUrl} className="mx-auto mt-8 inline-flex h-12 min-w-[260px] items-center justify-center gap-4 rounded-lg bg-[#00951d] px-8 text-[16px] font-extrabold text-white">
          Ir a mi proyecto <ArrowRight className="h-5 w-5" />
        </Link>
        <Link to="/projects" className="mt-5 block text-base font-extrabold text-[#00951d]">Ver todos mis proyectos</Link>
      </section>
      <AuthFooter compact />
    </main>
  );
}
