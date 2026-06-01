import { Bot, Braces, Globe2, Link2, MessageSquareText, Play, Plus, RadioTower, ShieldCheck, Workflow } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { SecurityPageFrame } from "../../components/projects/SecurityPageFrame";
import { useProjectData, type ExceptionItem } from "../../hooks/useProjectData";

const tabs = [
  { key: "prompt", label: "Prompts", Icon: MessageSquareText },
  { key: "agent", label: "Agentes", Icon: Braces },
  { key: "flow", label: "Flujos", Icon: Workflow },
  { key: "action", label: "Acciones", Icon: Play },
  { key: "service", label: "Servicios / APIs", Icon: Globe2 },
  { key: "bot", label: "Bots", Icon: Bot },
  { key: "webhook", label: "Webhooks", Icon: RadioTower },
];

function defaultName(type: string) {
  return {
    prompt: "Generar resumen confiable",
    agent: "Agente de soporte",
    flow: "Consulta de inventario",
    action: "Consultar inventario",
    service: "api.interna.local",
    bot: "bot-soporte",
    webhook: "Webhook de notificaciones",
  }[type] ?? "Excepcion permitida";
}

function ExceptionRow({ item }: { item: ExceptionItem }) {
  const tab = tabs.find((entry) => entry.key === item.exceptionType) ?? tabs[0];
  const Icon = tab.Icon;
  return (
    <article className="grid gap-4 rounded-lg border border-[#edf1f5] p-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:items-center">
      <div className="flex gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#eaf7ee] text-[#00951d]"><Icon className="h-6 w-6" /></span>
        <div className="min-w-0">
          <h3 className="font-extrabold text-[#111827]">{item.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#596783]">{item.description || "Permitido con minima friccion segun las reglas del proyecto."}</p>
        </div>
      </div>
      <span className="text-sm font-bold capitalize text-[#596783]">{item.environment}</span>
      <span className="rounded-lg bg-[#eaf7ee] px-3 py-2 text-sm font-extrabold text-[#008f1f]">Revision: {item.skipReview ? "No" : "Si"}</span>
      <span className="rounded-lg bg-[#fff7ed] px-3 py-2 text-sm font-extrabold text-amber-700">Aprobacion: {item.skipApproval ? "No" : "Si"}</span>
    </article>
  );
}

export function ProjectExceptionsPage() {
  const { projectId } = useParams();
  const { exceptions, createException, error } = useProjectData(projectId);
  const [activeTab, setActiveTab] = useState("prompt");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const filtered = useMemo(() => exceptions.filter((item) => item.exceptionType === activeTab), [activeTab, exceptions]);
  const current = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

  async function handleCreate() {
    await createException({
      exceptionType: activeTab,
      name: name.trim() || defaultName(activeTab),
      description: description.trim() || `Excepcion de confianza para ${current.label.toLowerCase()}.`,
      environment: "production",
      skipReview: true,
      skipApproval: true,
      auditLevel: "minimal",
      status: "active",
    });
    setName("");
    setDescription("");
  }

  return (
    <SecurityPageFrame title="Excepciones de confianza" description="Permite elementos confiables con minima friccion, manteniendo control y trazabilidad operacional.">
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Reglas activas", value: "14", Icon: ShieldCheck },
          { label: "Solicitudes omitidas", value: "2,481", Icon: Play },
          { label: `${current.label} permitidos`, value: String(filtered.length), Icon: Link2 },
          { label: "Ultima actualizacion", value: "Ahora", Icon: RadioTower },
        ].map(({ label, value, Icon }) => (
          <article key={label} className="rounded-xl border border-[#dce2ea] bg-white p-5">
            <Icon className="h-8 w-8 text-[#00951d]" />
            <p className="mt-3 text-sm font-bold text-[#596783]">{label}</p>
            <p className="text-2xl font-extrabold text-[#050505]">{value}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 rounded-xl border border-[#dce2ea] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:p-5">
          <div className="overflow-x-auto">
            <div className="mb-5 grid min-w-[760px] grid-cols-7 overflow-hidden rounded-lg border border-[#dce2ea]">
              {tabs.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setActiveTab(key)} className={`h-11 border-r border-[#edf1f5] text-sm font-extrabold last:border-r-0 ${activeTab === key ? "bg-[#f0fbf3] text-[#00951d]" : "text-[#596783]"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#050505]">Mis {current.label.toLowerCase()} permitidos</h2>
              <p className="mt-1 text-sm font-semibold text-[#596783]">Se ejecutan sin revision ni aprobacion cuando coinciden con tus reglas.</p>
            </div>
            <button type="button" onClick={() => void handleCreate()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#00951d] px-4 text-sm font-extrabold text-[#00951d]">
              <Plus className="h-4 w-4" /> Nuevo
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {filtered.map((item) => <ExceptionRow key={item.id} item={item} />)}
            {!filtered.length && <p className="rounded-lg bg-slate-50 p-6 text-center text-sm font-bold text-[#596783]">No hay excepciones de este tipo todavia.</p>}
          </div>
        </section>

        <aside className="rounded-xl border border-[#dce2ea] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <h2 className="text-xl font-extrabold text-[#050505]">Nuevo {current.label.slice(0, -1).toLowerCase()} permitido</h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold text-[#111827]">Nombre</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder={defaultName(activeTab)} className="h-11 w-full rounded-lg border border-[#dce2ea] px-4 text-sm outline-none focus:border-[#00951d]" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-extrabold text-[#111827]">Descripcion</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explica para que sirve y que permite hacer." className="min-h-24 w-full rounded-lg border border-[#dce2ea] px-4 py-3 text-sm outline-none focus:border-[#00951d]" />
            </label>
            {["Permitir sin revision", "Permitir sin aprobacion", "Usar auditoria minima"].map((label) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-[#596783]">{label}</span>
                <span className="h-6 w-11 rounded-full bg-[#00951d] p-1"><span className="ml-auto block h-4 w-4 rounded-full bg-white" /></span>
              </div>
            ))}
            <button type="button" onClick={() => void handleCreate()} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00951d] px-4 text-sm font-extrabold text-white">
              Guardar excepcion
            </button>
          </div>
        </aside>
      </div>
    </SecurityPageFrame>
  );
}
