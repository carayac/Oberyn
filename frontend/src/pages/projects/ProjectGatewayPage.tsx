import { Clock3, Cloud, LockKeyhole, ShieldCheck } from "lucide-react";
import { Card } from "../../components/ui/Card";

export function ProjectGatewayPage() {
  return (
    <div className="space-y-6 text-slate-950">
      <section className="rounded-lg border border-slate-200 bg-white/70 p-7 shadow-soft 2xl:p-8">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">
            <Clock3 className="h-4 w-4" />
            En desarrollo
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-normal text-slate-950">Gateway de Oberyn</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            El Gateway sera una implementacion disponible en futuras versiones. Esta seccion queda como vista previa del modulo, pero las opciones de configuracion, tokens, endpoints y pruebas de trafico estan ocultas hasta que el runtime este listo para produccion.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {[
            {
              Icon: Cloud,
              title: "Proxy seguro para proveedores",
              text: "Permitirá enrutar solicitudes a modelos y APIs externas pasando primero por las reglas de Oberyn.",
            },
            {
              Icon: ShieldCheck,
              title: "Inspeccion antes de enviar",
              text: "Evaluara prompts, payloads y reglas del proyecto antes de contactar al proveedor externo.",
            },
            {
              Icon: LockKeyhole,
              title: "Credenciales bajo tu control",
              text: "Las claves de proveedores seguiran viviendo en tu infraestructura y no seran almacenadas por Oberyn.",
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
          <h2 className="font-bold text-amber-900">Disponible proximamente</h2>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            Por ahora, usa el SDK de Oberyn para proteger acciones, inspeccionar prompts y registrar auditoria. Cuando el Gateway este listo, esta pagina habilitara configuracion, estado operativo y guias de conexion.
          </p>
        </Card>
      </section>
    </div>
  );
}
