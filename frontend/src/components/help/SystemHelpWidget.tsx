import {
  Activity,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Code2,
  CreditCard,
  FileCheck2,
  FolderKanban,
  GitBranch,
  Landmark,
  Plug,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type HelpTopic = {
  id: string;
  title: string;
  eyebrow: string;
  summary: string;
  bullets: string[];
  howToUse: string[];
  route?: string;
  routeLabel?: string;
  docsRoute?: string;
  Icon: typeof CircleHelp;
  color: "green" | "blue" | "amber" | "violet" | "slate";
};

const helpTopics: HelpTopic[] = [
  {
    id: "overview",
    title: "Cómo funciona Oberyn",
    eyebrow: "Vista general",
    summary: "Oberyn es una capa de control para agentes de IA. Evalúa acciones antes de ejecutarlas, registra lo que pasó y muestra evidencia para que el equipo entienda cada decisión. Si un agente propone un pago, PayGuard valida reglas, monto, destinatario y aprobación humana antes de avanzar.",
    bullets: ["El agente intenta hacer algo.", "Oberyn revisa reglas, riesgo y permisos.", "La acción se permite, se bloquea o espera aprobación.", "Si hay dinero, el agente solo propone: una persona aprueba y Oberyn registra el flujo.", "Todo queda registrado en auditoría."],
    howToUse: ["Crea una organización.", "Crea un proyecto.", "Conecta el SDK.", "Define reglas y revisa auditoría.", "Usa PayGuard si tus agentes pueden solicitar pagos."],
    route: "/dashboard",
    routeLabel: "Ir al dashboard",
    Icon: Sparkles,
    color: "green",
  },
  {
    id: "organizations",
    title: "Organizaciones y proyectos",
    eyebrow: "Estructura de trabajo",
    summary: "La organización agrupa usuarios y proyectos. Cada proyecto tiene sus propias reglas, integraciones, auditoría, SDK y PayGuard.",
    bullets: ["Una organización puede tener varios proyectos.", "Cada proyecto se configura por separado.", "No se mezclan reglas ni auditoría entre proyectos."],
    howToUse: ["Entra a Proyectos.", "Selecciona una organización.", "Crea o entra a un proyecto.", "Gestiona todo desde ese proyecto."],
    route: "/projects",
    routeLabel: "Ver proyectos",
    Icon: Building2,
    color: "blue",
  },
  {
    id: "sdk",
    title: "SDK",
    eyebrow: "Conexión principal",
    summary: "El SDK se instala en tu aplicación para proteger acciones reales: prompts, llamadas a APIs, tool calls, procesos internos o solicitudes de pago.",
    bullets: ["No guarda tus claves privadas.", "Detecta servicios y acciones.", "Puede esperar aprobación humana.", "Envía eventos auditables a Oberyn."],
    howToUse: ["Copia la clave del proyecto.", "Instala `npm install oberyn`.", "Inicializa el SDK.", "Protege acciones críticas con `guard` o `protect`."],
    docsRoute: "/docs/sdk",
    routeLabel: "Ver documentación SDK",
    Icon: Code2,
    color: "green",
  },
  {
    id: "integrations",
    title: "Integraciones",
    eyebrow: "Servicios usados",
    summary: "Muestra APIs y servicios detectados o registrados para el proyecto. Sirve para entender qué proveedores toca la IA y si ya hay actividad real del SDK.",
    bullets: ["Detecta servicios desde archivos o eventos.", "Relaciona actividad real con proveedores.", "Ayuda a preparar reglas por servicio."],
    howToUse: ["Sube archivos o conecta el SDK.", "Revisa los servicios detectados.", "Confirma cuáles deben quedar protegidos."],
    Icon: Plug,
    color: "violet",
  },
  {
    id: "rules",
    title: "Reglas",
    eyebrow: "Límites del agente",
    summary: "Las reglas dicen qué puede hacer la IA, qué se bloquea y qué requiere aprobación. Son el centro de gobierno del proyecto.",
    bullets: ["Bloquear acciones críticas.", "Exigir aprobación humana.", "Limitar servicios o riesgos.", "Aplicar protección de datos."],
    howToUse: ["Crea reglas por riesgo, acción o servicio.", "Actívalas.", "Prueba con el SDK.", "Revisa el resultado en auditoría."],
    Icon: ShieldCheck,
    color: "green",
  },
  {
    id: "approvals",
    title: "Aprobaciones",
    eyebrow: "Revisión humana",
    summary: "Cuando una acción necesita revisión, aparece aquí. Una persona decide si se aprueba, se rechaza o se bloquea.",
    bullets: ["Evita que la IA ejecute acciones sensibles sola.", "Muestra riesgo, servicio y acción.", "Deja registro auditable de la decisión."],
    howToUse: ["Revisa la solicitud.", "Lee el motivo y el riesgo.", "Aprueba o rechaza.", "El SDK continúa solo si fue aprobado."],
    Icon: ClipboardCheck,
    color: "amber",
  },
  {
    id: "audit",
    title: "Auditoría y evidencia",
    eyebrow: "Trazabilidad",
    summary: "Auditoría muestra cada evento importante: qué intentó hacer la IA, qué decisión tomó Oberyn, qué servicio se usó y qué evidencia se generó.",
    bullets: ["Eventos permitidos y bloqueados.", "Riesgo detectado.", "Hash del evento.", "Evidencia verificable con Stellar cuando aplica."],
    howToUse: ["Filtra por proyecto.", "Selecciona un evento.", "Revisa detalle y decisión.", "Abre la evidencia si necesitas comprobar integridad."],
    Icon: FileCheck2,
    color: "blue",
  },
  {
    id: "payguard",
    title: "PayGuard",
    eyebrow: "Pagos con control",
    summary: "PayGuard permite que un agente proponga un pago, pero no mueve fondos solo. Oberyn valida reglas, destinatario, monto y aprobación humana antes de ejecutarlo.",
    bullets: ["El agente propone.", "La persona aprueba.", "Oberyn ejecuta con Trustless Work.", "El pago queda auditado."],
    howToUse: ["Crea un agente de pagos.", "Registra una wallet verificada.", "Recibe solicitudes del SDK.", "Aprueba y envía el pago desde Oberyn."],
    Icon: CreditCard,
    color: "green",
  },
  {
    id: "flows",
    title: "Flujos",
    eyebrow: "Procesos protegidos",
    summary: "Los flujos agrupan acciones esperadas del agente. Ayudan a entender qué procesos ejecuta la IA y cómo se comportan en el tiempo.",
    bullets: ["Relaciona eventos por `actionName`.", "Muestra actividad reciente.", "Permite preparar procesos antes de producción."],
    howToUse: ["Crea un flujo esperado.", "Usa el mismo `actionName` en el SDK.", "Observa eventos y riesgos asociados."],
    Icon: GitBranch,
    color: "violet",
  },
  {
    id: "bots",
    title: "Bots",
    eyebrow: "Agentes automatizados",
    summary: "Aquí se organizarán los bots o agentes que ejecutan acciones dentro de tus proyectos. Por ahora es un módulo próximo.",
    bullets: ["Identificar agentes.", "Asignar permisos.", "Ver actividad por bot.", "Relacionarlo con reglas y aprobaciones."],
    howToUse: ["Cuando esté disponible, registra cada bot real.", "Asocia servicios permitidos.", "Revisa su actividad en auditoría."],
    Icon: Bot,
    color: "slate",
  },
  {
    id: "settings",
    title: "Configuración",
    eyebrow: "Preferencias",
    summary: "Configura preferencias generales como zona horaria, formato de fecha y formato de hora para visualizar mejor la información del sistema.",
    bullets: ["Zona horaria.", "Formato de fecha.", "Formato de hora.", "Preferencias simples de perfil."],
    howToUse: ["Abre Configuración.", "Ajusta tus preferencias.", "Guarda cambios."],
    route: "/settings",
    routeLabel: "Ir a configuración",
    Icon: Settings,
    color: "slate",
  },
];

const colorClasses = {
  green: "bg-emerald-50 text-[#008f1f] ring-emerald-100",
  blue: "bg-sky-50 text-sky-700 ring-sky-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function SystemHelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState(helpTopics[0].id);
  const activeTopic = useMemo(() => helpTopics.find((topic) => topic.id === activeTopicId) ?? helpTopics[0], [activeTopicId]);
  const ActiveIcon = activeTopic.Icon;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-[#008f1f] text-white shadow-[0_18px_40px_rgba(0,143,31,0.28)] transition hover:bg-[#007f18] focus:outline-none focus:ring-4 focus:ring-emerald-100"
        aria-label="Abrir ayuda del sistema"
      >
        <CircleHelp className="h-7 w-7" />
      </button>

      {isOpen ? (
        <div className="oberyn-help-backdrop fixed inset-0 z-50 flex items-end justify-end bg-slate-950/30 px-3 py-3 sm:px-5 sm:py-5">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar ayuda" onClick={() => setIsOpen(false)} />
          <section className="oberyn-help-panel relative flex max-h-[calc(100dvh-24px)] w-full max-w-[1040px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:max-h-[calc(100dvh-40px)]">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-extrabold text-[#008f1f]">
                  <Search className="h-4 w-4" />
                  Guía rápida
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-normal text-slate-950">Entiende Oberyn sin adivinar</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Selecciona una parte del sistema y mira qué hace, cuándo usarla y qué pasos seguir.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50" aria-label="Cerrar ayuda">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[310px_minmax(0,1fr)]">
              <nav className="min-h-0 overflow-y-auto border-b border-slate-200 bg-slate-50/70 p-3 lg:border-b-0 lg:border-r">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {helpTopics.map((topic) => {
                    const Icon = topic.Icon;
                    const isActive = topic.id === activeTopic.id;
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => setActiveTopicId(topic.id)}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${
                          isActive ? "border-emerald-300 bg-white shadow-sm ring-2 ring-emerald-50" : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white"
                        }`}
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${colorClasses[topic.color]}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-extrabold text-slate-950">{topic.title}</span>
                          <span className="block truncate text-xs font-semibold text-slate-500">{topic.eyebrow}</span>
                        </span>
                        <ChevronRight className={isActive ? "h-4 w-4 text-[#008f1f]" : "h-4 w-4 text-slate-400"} />
                      </button>
                    );
                  })}
                </div>
              </nav>

              <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
                <div className="min-w-0">
                  <div className="min-w-0">
                    <span className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ring-1 ${colorClasses[activeTopic.color]}`}>
                      <ActiveIcon className="h-6 w-6" />
                    </span>
                    <p className="mt-4 text-sm font-extrabold uppercase tracking-wide text-[#008f1f]">{activeTopic.eyebrow}</p>
                    <h3 className="mt-1 text-3xl font-extrabold tracking-normal text-slate-950">{activeTopic.title}</h3>
                    <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{activeTopic.summary}</p>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <h4 className="flex items-center gap-2 font-extrabold text-slate-950">
                          <Activity className="h-5 w-5 text-[#008f1f]" />
                          Qué hace
                        </h4>
                        <ul className="mt-3 space-y-3">
                          {activeTopic.bullets.map((bullet) => (
                            <li key={bullet} className="flex gap-3 text-sm leading-6 text-slate-600">
                              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#008f1f]" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <h4 className="flex items-center gap-2 font-extrabold text-slate-950">
                          <Landmark className="h-5 w-5 text-[#008f1f]" />
                          Cómo usarlo
                        </h4>
                        <ol className="mt-3 space-y-3">
                          {activeTopic.howToUse.map((step, index) => (
                            <li key={step} className="flex gap-3 text-sm leading-6 text-slate-600">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-extrabold text-[#008f1f]">{index + 1}</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {activeTopic.route ? (
                        <Link to={activeTopic.route} onClick={() => setIsOpen(false)} className="inline-flex h-11 items-center justify-center rounded-lg bg-[#008f1f] px-5 text-sm font-extrabold text-white shadow-sm hover:bg-[#007f18]">
                          {activeTopic.routeLabel ?? "Abrir sección"}
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      ) : null}
                      {activeTopic.docsRoute ? (
                        <Link to={activeTopic.docsRoute} onClick={() => setIsOpen(false)} className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-950 hover:bg-slate-50">
                          {activeTopic.routeLabel ?? "Ver documentación"}
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
                      <h4 className="flex items-center gap-2 font-extrabold text-emerald-900">
                        <ShieldCheck className="h-5 w-5" />
                        Regla simple
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-emerald-800">Si la IA puede ejecutar algo importante, Oberyn debe poder revisarlo, limitarlo y registrarlo.</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <h4 className="font-extrabold text-slate-950">Orden recomendado</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600">Organización → Proyecto → SDK → Reglas → Auditoría → PayGuard si hay pagos.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
