import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AuthBrandLogo } from "../../components/auth/AuthBrandLogo";
import { AuthFooter } from "../../components/auth/AuthFooter";
import { appRoutes } from "../../routes/routes";

export function CompletedPage() {
  const navigate = useNavigate();

  function goToProject() {
    navigate(appRoutes.dashboard);
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#fbfcfd] px-4 py-8 text-[#0b0d13] sm:px-8 lg:px-14">
      <div className="shrink-0">
        <AuthBrandLogo className="justify-center" markSize="sm" />
      </div>

      <div className="flex flex-1 items-center justify-center py-10">
        <section className="w-full max-w-[720px] rounded-lg border border-[#dce2ea] bg-white px-6 py-10 text-center shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:px-12">
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-[#eaf7ee] text-[#00951d]">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-[5px] border-[#00951d]">
              <Check className="h-16 w-16" strokeWidth={2.7} />
            </div>
          </div>

          <h1 className="mt-8 text-[34px] font-extrabold leading-tight text-[#050505] sm:text-[42px]">Proyecto creado con exito!</h1>
          <p className="mx-auto mt-4 max-w-[520px] text-[18px] font-semibold leading-8 text-[#596783]">
            Tu proyecto ha sido creado correctamente. Ya puedes comenzar a configurarlo y sumar integraciones.
          </p>

          <div className="mx-auto mt-8 max-w-[520px] border-y border-[#dce2ea] py-7 text-left">
            <h2 className="text-[18px] font-extrabold text-[#111827]">Que puedes hacer ahora?</h2>
            <ul className="mt-5 space-y-4">
              {["Configurar reglas y políticas", "Crear flujos permitidos", "Gestionar agentes y permisos", "Revisar auditoría y actividad"].map((item) => (
                <li key={item} className="flex items-center gap-4 text-[18px] font-semibold text-[#596783]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eaf7ee] text-[#00951d]">
                    <Check className="h-5 w-5" strokeWidth={2.6} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={goToProject}
            className="mx-auto mt-8 inline-flex h-14 min-w-[300px] items-center justify-center gap-5 rounded-lg bg-[#00951d] px-8 text-[18px] font-extrabold text-white shadow-[0_10px_22px_rgba(0,149,29,0.22)] hover:bg-[#007f18]"
          >
            Ir a mi proyecto
            <ArrowRight className="h-7 w-7" />
          </button>

          <div className="mt-7">
            <Link to={appRoutes.projects} className="text-[17px] font-extrabold text-[#00951d] hover:text-[#007f18]">
              Ver todos mis proyectos
            </Link>
          </div>
        </section>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 text-[#596783]">
        <div className="flex items-center gap-3 text-[15px] font-semibold">
          <ShieldCheck className="h-6 w-6 text-[#00951d]" />
          Confiable por diseno.
        </div>
        <AuthFooter compact />
      </div>
    </main>
  );
}
