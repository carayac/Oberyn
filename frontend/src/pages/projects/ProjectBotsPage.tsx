import { Bot, Clock3, LockKeyhole, ShieldCheck, Workflow } from "lucide-react";
import { Card } from "../../components/ui/Card";

export function ProjectBotsPage() {
  return (
    <div className="space-y-6 text-slate-950">
      <section className="rounded-lg border border-slate-200 bg-white/70 p-7 shadow-soft 2xl:p-8">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
            <Clock3 className="h-4 w-4" />
            Próximamente
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-normal text-slate-950">Bots de Oberyn</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            El módulo de bots estará disponible en futuras versiones. Esta sección queda como vista previa para gestionar bots, agentes e integraciones automatizadas con reglas propias por proyecto.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {[
            {
              Icon: Bot,
              title: "Identidad del bot",
              text: "Permitirá registrar bots y agentes con nombre, propósito, origen y permisos asociados.",
            },
            {
              Icon: Workflow,
              title: "Acciones permitidas",
              text: "Conectará cada bot con flujos, servicios y acciones autorizadas desde las reglas del proyecto.",
            },
            {
              Icon: ShieldCheck,
              title: "Control por riesgo",
              text: "Cada acción del bot podrá aprobarse, bloquearse o auditarse según su nivel de riesgo.",
            },
          ].map(({ Icon, title, text }) => (
            <Card key={title} className="p-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
                <Icon className="h-6 w-6" />
              </span>
              <h2 className="mt-4 font-bold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-amber-200 bg-amber-50/60 p-5">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <h2 className="font-bold text-amber-900">Disponible próximamente</h2>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                Por ahora, usa el SDK y las reglas del proyecto para proteger acciones de bots desde tu código. Cuando este módulo esté listo, podrás administrar bots directamente desde Oberyn.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
