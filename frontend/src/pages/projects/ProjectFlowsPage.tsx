import { useAuth } from "@clerk/react";
import { Activity, AlertTriangle, ArrowRight, Bot, CheckCircle2, Clock3, GitBranch, ListChecks, Plus, Radar, RefreshCcw, Save, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useFlows, type FlowInput } from "../../hooks/useFlows";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";
import { apiClient } from "../../lib/api/client";
import type { AuditEvent } from "../../types/audit";
import type { Flow } from "../../types/flow";
import type { Project } from "../../types/project";

const ACTIVE_PROJECT_KEY = "oberyn.activeProjectId";
const ACTIVE_PROJECT_EVENT = "oberyn:active-project-change";
const FLOWS_PAGE_SIZE = 2;

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

const flowPresets = [
  {
    key: "support.lookup_customer",
    name: "Consultar cliente para soporte",
    description: "Lee datos de cliente antes de responder un ticket o chat.",
    status: "active",
  },
  {
    key: "billing.refund_request",
    name: "Solicitar reembolso",
    description: "Valida monto, identidad y aprobacion antes de ejecutar un reembolso.",
    status: "pending",
  },
  {
    key: "crm.update_contact",
    name: "Actualizar contacto CRM",
    description: "Controla cambios de datos personales generados por un agente.",
    status: "active",
  },
  {
    key: "data.export_report",
    name: "Exportar reporte sensible",
    description: "Requiere trazabilidad cuando un agente intenta exportar informacion.",
    status: "paused",
  },
];

const environmentOptions = [
  { value: "sandbox", label: "Sandbox" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Produccion" },
];

const statusLabels: Record<string, string> = {
  active: "Activo",
  pending: "Pendiente",
  paused: "Pausado",
  draft: "Borrador",
};

const riskRank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

const initialForm = {
  preset: flowPresets[0].key,
  name: flowPresets[0].name,
  description: flowPresets[0].description,
  actionKey: flowPresets[0].key,
  environment: "sandbox",
  status: flowPresets[0].status,
};

type FlowForm = typeof initialForm;

function formatDate(value?: string | null) {
  if (!value) return "Sin actividad";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin actividad";
  return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function normalize(value?: string | null) {
  return (value ?? "").toLowerCase().trim();
}

function statusClass(status: string) {
  if (status === "active") return "bg-emerald-50 text-emerald-700";
  if (status === "pending") return "bg-amber-50 text-amber-700";
  if (status === "paused") return "bg-slate-100 text-slate-600";
  return "bg-sky-50 text-sky-700";
}

function riskClass(risk: string) {
  if (risk === "critical") return "bg-red-100 text-red-800";
  if (risk === "high") return "bg-red-50 text-red-700";
  if (risk === "medium") return "bg-amber-50 text-amber-700";
  if (risk === "low") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

function riskLabel(risk: string) {
  if (risk === "critical") return "Critico";
  if (risk === "high") return "Alto";
  if (risk === "medium") return "Medio";
  if (risk === "low") return "Bajo";
  return "Sin datos";
}

function decisionLabel(decision: string) {
  if (decision === "blocked") return "Bloqueado";
  if (decision === "requires_approval") return "Aprobacion";
  if (decision === "approved") return "Permitido";
  return decision || "Sin decision";
}

function clampPage(page: number, totalItems: number, pageSize: number) {
  return Math.max(1, Math.min(page, Math.max(1, Math.ceil(totalItems / pageSize))));
}

function PaginationControls({ page, totalItems, pageSize, onPageChange }: { page: number; totalItems: number; pageSize: number; onPageChange: (page: number) => void }) {
  if (totalItems <= pageSize) return null;

  const totalPages = Math.ceil(totalItems / pageSize);
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-slate-500">
        {firstItem}-{lastItem} de {totalItems}
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <Button type="button" variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}

function ProjectSelect({ projects, projectId, onChange }: { projects: Project[]; projectId: string; onChange: (projectId: string) => void }) {
  return (
    <div className="relative w-full max-w-[360px]">
      <span className="pointer-events-none absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
        <Bot className="h-6 w-6" />
      </span>
      <select
        value={projectId}
        onChange={(event) => onChange(event.target.value)}
        className="h-[62px] w-full appearance-none rounded-lg border border-slate-200 bg-white py-0 pl-16 pr-12 text-base font-bold text-slate-950 shadow-sm outline-none focus:border-[#008f1f] focus:ring-2 focus:ring-emerald-100"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-slate-900">v</span>
    </div>
  );
}

function eventsForFlow(flow: Flow, auditEvents: AuditEvent[]) {
  const actionKey = normalize(flow.actionKey);
  const name = normalize(flow.name);
  return auditEvents.filter((event) => {
    const eventAction = normalize(event.actionName);
    return Boolean(actionKey && eventAction === actionKey) || Boolean(name && eventAction === name);
  });
}

function buildInsight(flow: Flow, auditEvents: AuditEvent[]) {
  const events = eventsForFlow(flow, auditEvents);
  const latest = events[0] ?? null;
  const highestRisk = events.reduce((current, event) => {
    const risk = normalize(event.riskLevel);
    return riskRank[risk] > riskRank[current] ? risk : current;
  }, "none");
  const blocked = events.filter((event) => event.decision === "blocked").length;
  const approvals = events.filter((event) => event.decision === "requires_approval").length;
  const protectedCount = blocked + approvals;
  const coverage = events.length ? Math.round((protectedCount / events.length) * 100) : 0;

  return { events, latest, highestRisk, blocked, approvals, protectedCount, coverage };
}

function FlowTimeline({ flow, events }: { flow: Flow; events: AuditEvent[] }) {
  const hasEvents = events.length > 0;
  const steps = [
    { label: "SDK captura", detail: flow.actionKey ?? flow.name, done: true },
    { label: "Oberyn evalua", detail: hasEvents ? `${events.length} eventos auditados` : "Esperando trafico", done: hasEvents },
    { label: "Decision", detail: hasEvents ? decisionLabel(events[0].decision) : "Sin decision todavia", done: hasEvents },
    { label: "Auditoria", detail: events[0]?.eventHash ? "Hash generado" : "Lista para registrar evidencia", done: Boolean(events[0]?.eventHash) },
  ];

  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-4">
      {steps.map((step, index) => (
        <div key={step.label} className="relative rounded-lg border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span className={step.done ? "flex h-8 w-8 items-center justify-center rounded-full bg-[#008f1f] text-white" : "flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"}>
              {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-950">{step.label}</p>
              <p className="truncate text-xs font-medium text-slate-500">{step.detail}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FlowCard({ flow, auditEvents, isSelected, onSelect }: { flow: Flow; auditEvents: AuditEvent[]; isSelected: boolean; onSelect: () => void }) {
  const insight = buildInsight(flow, auditEvents);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border bg-white p-5 text-left shadow-sm transition hover:border-[#008f1f] ${isSelected ? "border-[#008f1f] ring-4 ring-emerald-50" : "border-slate-200"}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
              <Workflow className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-bold text-slate-950">{flow.name}</h3>
            <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${statusClass(flow.status)}`}>{statusLabels[flow.status] ?? flow.status}</span>
            <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${riskClass(insight.highestRisk)}`}>{riskLabel(insight.highestRisk)}</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{flow.description || "Flujo detectado automaticamente por eventos del SDK."}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[300px]">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-lg font-bold text-slate-950">{insight.events.length}</p>
            <p className="text-xs font-semibold text-slate-500">Eventos</p>
          </div>
          <div className="rounded-lg bg-red-50 px-3 py-2">
            <p className="text-lg font-bold text-red-700">{insight.blocked}</p>
            <p className="text-xs font-semibold text-red-600">Bloqueos</p>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-2">
            <p className="text-lg font-bold text-amber-700">{insight.approvals}</p>
            <p className="text-xs font-semibold text-amber-600">Aprob.</p>
          </div>
        </div>
      </div>
      <FlowTimeline flow={flow} events={insight.events} />
    </button>
  );
}

function SelectedFlowPanel({ flow, auditEvents }: { flow: Flow | null; auditEvents: AuditEvent[] }) {
  if (!flow) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-950">Playbook del flujo</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Selecciona un flujo para ver recomendaciones, cobertura de proteccion y ultimos eventos.</p>
      </Card>
    );
  }

  const insight = buildInsight(flow, auditEvents);
  const latestEvents = insight.events.slice(0, 4);
  const needsPolicy = insight.highestRisk === "high" || insight.highestRisk === "critical";

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
          <Radar className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-950">Playbook del flujo</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{flow.actionKey ?? flow.name}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-2xl font-bold text-slate-950">{insight.coverage}%</p>
          <p className="text-xs font-semibold text-slate-500">Cobertura de proteccion</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-2xl font-bold text-slate-950">{formatDate(insight.latest?.createdAt)}</p>
          <p className="text-xs font-semibold text-slate-500">Ultima actividad</p>
        </div>
      </div>

      <div className={needsPolicy ? "mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3" : "mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"}>
        <div className="flex gap-3">
          {needsPolicy ? <AlertTriangle className="h-5 w-5 shrink-0 text-red-700" /> : <ShieldCheck className="h-5 w-5 shrink-0 text-[#008f1f]" />}
          <p className={needsPolicy ? "text-sm font-semibold leading-6 text-red-800" : "text-sm font-semibold leading-6 text-emerald-800"}>
            {needsPolicy ? "Este flujo alcanzo riesgo alto. Revisa reglas de aprobacion humana antes de permitir ejecuciones automaticas." : "Este flujo no muestra senales criticas recientes. Mantener auditoria activa es suficiente para empezar."}
          </p>
        </div>
      </div>

      <h3 className="mt-6 text-sm font-bold text-slate-950">Eventos recientes</h3>
      <div className="mt-3 space-y-2">
        {latestEvents.length ? (
          latestEvents.map((event) => (
            <div key={event.id} className="rounded-lg border border-slate-200 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-bold text-slate-950">{decisionLabel(event.decision)}</p>
                <span className={`rounded-md px-2 py-1 text-xs font-bold ${riskClass(event.riskLevel)}`}>{riskLabel(event.riskLevel)}</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(event.createdAt)}</p>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-500">Todavia no hay eventos para este flujo.</p>
        )}
      </div>
    </Card>
  );
}

export function ProjectFlowsPage() {
  const { projectId: routeProjectId = "" } = useParams();
  const navigate = useNavigate();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { activeOrganization } = useOrganizations();
  const { projects } = useProjects(activeOrganization?.id);
  const [selectedProjectId, setSelectedProjectId] = useState(routeProjectId || localStorage.getItem(ACTIVE_PROJECT_KEY) || "");
  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? projects.find((project) => project.id === routeProjectId) ?? projects[0] ?? null, [projects, routeProjectId, selectedProjectId]);
  const { flows, isLoading, error, reloadFlows, createFlow } = useFlows(selectedProject?.id, activeOrganization?.id);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<FlowForm>(initialForm);
  const [message, setMessage] = useState<string | null>(null);
  const [flowsPage, setFlowsPage] = useState(1);

  const selectedFlow = useMemo(() => flows.find((flow) => flow.id === selectedFlowId) ?? flows[0] ?? null, [flows, selectedFlowId]);

  useEffect(() => {
    if (!routeProjectId || routeProjectId === selectedProjectId) return;
    setSelectedProjectId(routeProjectId);
    localStorage.setItem(ACTIVE_PROJECT_KEY, routeProjectId);
    window.dispatchEvent(new CustomEvent(ACTIVE_PROJECT_EVENT, { detail: { projectId: routeProjectId } }));
  }, [routeProjectId, selectedProjectId]);

  useEffect(() => {
    async function loadAuditEvents() {
      if (!isLoaded || !isSignedIn || !selectedProject?.id) return;
      const token = await getToken();
      const response = await apiClient.get<ApiResponse<AuditEvent[]>>(`/projects/${selectedProject.id}/audit`, token, activeOrganization?.id);
      setAuditEvents(response.data);
    }

    void loadAuditEvents().catch((loadError) => {
      setMessage(loadError instanceof Error ? loadError.message : "No se pudo cargar la auditoria del proyecto.");
      setAuditEvents([]);
    });
  }, [activeOrganization?.id, getToken, isLoaded, isSignedIn, selectedProject?.id]);

  function handleProjectChange(nextProjectId: string) {
    setSelectedProjectId(nextProjectId);
    setSelectedFlowId(null);
    localStorage.setItem(ACTIVE_PROJECT_KEY, nextProjectId);
    window.dispatchEvent(new CustomEvent(ACTIVE_PROJECT_EVENT, { detail: { projectId: nextProjectId } }));
    navigate(`/projects/${nextProjectId}/flows`);
  }

  function updatePreset(presetKey: string) {
    const preset = flowPresets.find((item) => item.key === presetKey) ?? flowPresets[0];
    setForm({
      preset: preset.key,
      name: preset.name,
      description: preset.description,
      actionKey: preset.key,
      environment: form.environment,
      status: preset.status,
    });
  }

  async function submitFlow(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const input: FlowInput = {
      name: form.name,
      description: form.description,
      actionKey: form.actionKey,
      environment: form.environment,
      status: form.status,
    };

    try {
      const created = await createFlow(input);
      setSelectedFlowId(created.id);
      setMessage("Flujo creado. Cuando el SDK envie eventos con ese actionName, Oberyn los asociara automaticamente.");
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : "No se pudo crear el flujo.");
    }
  }

  const filteredFlows = flows.filter((flow) => {
    const matchesQuery = [flow.name, flow.description, flow.actionKey].some((value) => normalize(value).includes(normalize(query)));
    const matchesStatus = statusFilter === "all" || flow.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
  const safeFlowsPage = clampPage(flowsPage, filteredFlows.length, FLOWS_PAGE_SIZE);
  const visibleFlows = filteredFlows.slice((safeFlowsPage - 1) * FLOWS_PAGE_SIZE, safeFlowsPage * FLOWS_PAGE_SIZE);

  const insights = flows.map((flow) => buildInsight(flow, auditEvents));
  const totalEvents = insights.reduce((total, insight) => total + insight.events.length, 0);
  const highRiskFlows = insights.filter((insight) => riskRank[insight.highestRisk] >= riskRank.high).length;
  const protectedEvents = insights.reduce((total, insight) => total + insight.protectedCount, 0);
  const coverage = totalEvents ? Math.round((protectedEvents / totalEvents) * 100) : 0;

  useEffect(() => {
    setFlowsPage(1);
  }, [query, selectedProject?.id, statusFilter]);

  useEffect(() => {
    setFlowsPage((current) => clampPage(current, filteredFlows.length, FLOWS_PAGE_SIZE));
  }, [filteredFlows.length]);

  return (
    <div className="min-h-[calc(100dvh-40px)] text-slate-950">
      <section className="min-h-[calc(100dvh-40px)] rounded-lg border border-slate-200 bg-white/70 p-7 shadow-soft 2xl:p-8">
        <header>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-[#008f1f]">
                <GitBranch className="h-4 w-4" />
                Flujos detectados por Oberyn
              </span>
              <h1 className="mt-4 text-[34px] font-bold leading-tight tracking-normal text-slate-950">Mapa de flujos del agente</h1>
              <p className="mt-3 max-w-4xl text-[15px] leading-6 text-slate-600">
                Visualiza las acciones que el SDK esta registrando, entiende su riesgo y prepara flujos esperados antes de que lleguen a produccion.
              </p>
            </div>
            {selectedProject ? <ProjectSelect projects={projects} projectId={selectedProject.id} onChange={handleProjectChange} /> : null}
          </div>
        </header>

        <div className="mt-7 grid gap-4 md:grid-cols-4">
          {[
            { label: "Flujos", value: flows.length, detail: "detectados o creados", Icon: Workflow, tone: "green" },
            { label: "Eventos asociados", value: totalEvents, detail: "desde auditoria", Icon: Activity, tone: "blue" },
            { label: "Cobertura", value: `${coverage}%`, detail: "bloqueos + aprobaciones", Icon: ShieldCheck, tone: "green" },
            { label: "Riesgo alto", value: highRiskFlows, detail: "flujos a revisar", Icon: AlertTriangle, tone: "red" },
          ].map(({ label, value, detail, Icon, tone }) => (
            <Card key={label} className="p-4">
              <div className="flex gap-3">
                <span className={tone === "red" ? "flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-700" : tone === "blue" ? "flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-sky-700" : "flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]"}>
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-2xl font-bold text-slate-950">{value}</p>
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">{detail}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
          <div className="space-y-5">
            <Card className="p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Flujos monitoreados</h2>
                  <p className="mt-1 text-sm text-slate-600">Los flujos aparecen automaticamente cuando el SDK envia eventos con `actionName`.</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => void reloadFlows()}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Actualizar
                </Button>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o actionName" className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#008f1f]" />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-[#008f1f]">
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="pending">Pendientes</option>
                  <option value="paused">Pausados</option>
                </select>
              </div>
            </Card>

            {isLoading ? <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-sm font-semibold text-slate-500">Cargando flujos...</p> : null}
            {!isLoading && !filteredFlows.length ? (
              <Card className="p-8 text-center">
                <Sparkles className="mx-auto h-10 w-10 text-[#008f1f]" />
                <h2 className="mt-4 text-xl font-bold text-slate-950">Todavia no hay flujos</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Crea un flujo esperado o ejecuta el mini proyecto del SDK para que Oberyn detecte acciones reales automaticamente.</p>
              </Card>
            ) : null}
            {visibleFlows.map((flow) => (
              <FlowCard key={flow.id} flow={flow} auditEvents={auditEvents} isSelected={selectedFlow?.id === flow.id} onSelect={() => setSelectedFlowId(flow.id)} />
            ))}
            <PaginationControls page={safeFlowsPage} totalItems={filteredFlows.length} pageSize={FLOWS_PAGE_SIZE} onPageChange={setFlowsPage} />
          </div>

          <aside className="space-y-5">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
                  <Plus className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Crear flujo esperado</h2>
                  <p className="text-sm text-slate-600">Documenta acciones antes de recibir trafico.</p>
                </div>
              </div>

              <form className="mt-5 space-y-4" onSubmit={(event) => void submitFlow(event)}>
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">Plantilla</span>
                  <select value={form.preset} onChange={(event) => updatePreset(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#008f1f]">
                    {flowPresets.map((preset) => (
                      <option key={preset.key} value={preset.key}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">Nombre</span>
                  <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#008f1f]" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">actionName esperado</span>
                  <input value={form.actionKey} onChange={(event) => setForm((current) => ({ ...current, actionKey: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm outline-none focus:border-[#008f1f]" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">Descripcion</span>
                  <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-2 min-h-24 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#008f1f]" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-700">Entorno</span>
                    <select value={form.environment} onChange={(event) => setForm((current) => ({ ...current, environment: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#008f1f]">
                      {environmentOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-700">Estado</span>
                    <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#008f1f]">
                      <option value="active">Activo</option>
                      <option value="pending">Pendiente</option>
                      <option value="paused">Pausado</option>
                    </select>
                  </label>
                </div>
                {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{message}</p> : null}
                {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
                <Button type="submit" className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  Guardar flujo
                </Button>
              </form>
            </Card>

            <SelectedFlowPanel flow={selectedFlow} auditEvents={auditEvents} />

            <Card className="p-5">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                  <ListChecks className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-950">Como probarlo</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Ejecuta el mini proyecto del SDK y usa un `actionName` igual al del flujo. Oberyn lo enlazara con sus eventos, decisiones y hashes.</p>
                  <button type="button" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#008f1f]">
                    Ver actionName
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </section>
    </div>
  );
}
