import { useAuth } from "@clerk/react";
import { Activity, AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Clock3, Code2, FileSearch, FolderSearch, GitBranch, Layers3, Link2, RefreshCcw, ShieldCheck, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { IntegrationIcon } from "../../components/integrations/IntegrationIcon";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useIntegrations, type DetectionFileInput, type DetectionResult } from "../../hooks/useIntegrations";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";
import { apiClient } from "../../lib/api/client";
import type { AuditEvent } from "../../types/audit";
import type { Integration } from "../../types/integration";
import type { Project } from "../../types/project";

const ACTIVE_PROJECT_KEY = "oberyn.activeProjectId";
const ACTIVE_PROJECT_EVENT = "oberyn:active-project-change";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

type IntegrationInsight = {
  integration: Integration;
  events: AuditEvent[];
  latestEvent: AuditEvent | null;
  blocked: number;
  approvals: number;
  highRisk: number;
  protectedEvents: number;
  sdkActive: boolean;
  coverage: number;
};

const methodLabels: Record<string, string> = {
  sdk: "SDK",
  detected: "Detectada",
  manual: "Manual",
  gateway: "Gateway",
};

const serviceTypeLabels: Record<string, string> = {
  llm: "Modelo IA",
  database: "Base de datos",
  payments: "Pagos",
  email: "Email",
  api: "API externa",
  custom_api: "API externa",
  application: "Aplicacion",
  test: "Prueba",
};

const riskRank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function normalize(value?: string | null) {
  return (value ?? "").toLowerCase().trim();
}

function formatDate(value?: string | null) {
  if (!value) return "Sin actividad";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin actividad";
  return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function decisionLabel(decision: string) {
  if (decision === "blocked") return "Bloqueado";
  if (decision === "requires_approval" || decision === "pending_approval") return "Aprobacion";
  if (decision === "approved") return "Permitido";
  if (decision === "denied" || decision === "rejected") return "Rechazado";
  return decision || "Sin decision";
}

function riskLabel(risk: string) {
  if (risk === "critical") return "Critico";
  if (risk === "high") return "Alto";
  if (risk === "medium") return "Medio";
  if (risk === "low") return "Bajo";
  return "Sin riesgo";
}

function riskClass(risk: string) {
  const normalized = normalize(risk);
  if (normalized === "critical") return "bg-red-100 text-red-800";
  if (normalized === "high") return "bg-red-50 text-red-700";
  if (normalized === "medium") return "bg-amber-50 text-amber-700";
  if (normalized === "low") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

function statusClass(status: string) {
  if (status === "protected") return "bg-emerald-50 text-emerald-700";
  if (status === "detected") return "bg-sky-50 text-sky-700";
  if (status === "manual") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function methodClass(method: string) {
  if (method === "sdk") return "bg-emerald-50 text-emerald-700";
  if (method === "detected") return "bg-sky-50 text-sky-700";
  if (method === "gateway") return "bg-slate-100 text-slate-500";
  return "bg-amber-50 text-amber-700";
}

function metadataString(metadata: Record<string, unknown> | undefined, keys: string[]) {
  if (!metadata) return "";
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function providerFromEvent(event: AuditEvent) {
  return normalize(metadataString(event.metadata, ["serviceProvider", "provider"]));
}

function serviceTypeFromEvent(event: AuditEvent) {
  return normalize(metadataString(event.metadata, ["serviceType", "type"]));
}

function eventMatchesIntegration(event: AuditEvent, integration: Integration) {
  if (event.integrationId === integration.id) return true;
  const eventProvider = providerFromEvent(event);
  if (eventProvider && eventProvider === normalize(integration.provider)) return true;
  const eventServiceType = serviceTypeFromEvent(event);
  if (eventServiceType && eventServiceType === normalize(integration.serviceType) && normalize(event.eventType).includes("sdk")) return true;
  const action = normalize(event.actionName);
  return Boolean(action && action.includes(normalize(integration.provider)));
}

function buildInsight(integration: Integration, events: AuditEvent[]): IntegrationInsight {
  const matchedEvents = events.filter((event) => eventMatchesIntegration(event, integration));
  const blocked = matchedEvents.filter((event) => event.decision === "blocked" || event.decision === "denied" || event.decision === "rejected").length;
  const approvals = matchedEvents.filter((event) => event.decision === "requires_approval" || event.decision === "pending_approval").length;
  const highRisk = matchedEvents.filter((event) => riskRank[normalize(event.riskLevel)] >= riskRank.high).length;
  const protectedEvents = matchedEvents.filter((event) => event.decision === "blocked" || event.decision === "requires_approval").length;
  const sdkActive = integration.status === "protected" || matchedEvents.some((event) => normalize(event.eventType).includes("sdk"));
  const coverage = matchedEvents.length ? Math.max(integration.coverage ?? 0, Math.round((protectedEvents / matchedEvents.length) * 100)) : integration.coverage ?? 0;

  return {
    integration,
    events: matchedEvents,
    latestEvent: matchedEvents[0] ?? null,
    blocked,
    approvals,
    highRisk,
    protectedEvents,
    sdkActive,
    coverage,
  };
}

function ProjectSelect({ projects, selectedProjectId, onChange }: { projects: Project[]; selectedProjectId: string; onChange: (projectId: string) => void }) {
  return (
    <div className="relative w-full max-w-[360px]">
      <span className="pointer-events-none absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
        <Layers3 className="h-5 w-5" />
      </span>
      <select
        value={selectedProjectId}
        onChange={(event) => onChange(event.target.value)}
        className="h-[58px] w-full appearance-none rounded-lg border border-slate-200 bg-white py-0 pl-16 pr-12 text-base font-bold text-slate-950 shadow-sm outline-none focus:border-[#008f1f] focus:ring-2 focus:ring-emerald-100"
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

function MetricCard({ label, value, detail, Icon }: { label: string; value: string | number; detail: string; Icon: typeof Activity }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <p className="text-2xl font-extrabold leading-tight text-slate-950">{value}</p>
        <p className="truncate text-xs font-semibold text-slate-500">{detail}</p>
      </div>
    </Card>
  );
}

function AnalyzerPanel({
  repositoryUrl,
  files,
  analysis,
  message,
  isAnalyzing,
  onRepositoryChange,
  onFilesChange,
  onAnalyze,
}: {
  repositoryUrl: string;
  files: DetectionFileInput[];
  analysis: DetectionResult | null;
  message: string | null;
  isAnalyzing: boolean;
  onRepositoryChange: (value: string) => void;
  onFilesChange: (files: FileList | null) => void;
  onAnalyze: () => void;
}) {
  return (
    <Card className="p-0">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-3 text-xl font-extrabold text-slate-950">
              <FolderSearch className="h-6 w-6 text-[#008f1f]" />
              Analizador de APIs del proyecto
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Detecta proveedores desde repositorios o archivos clave y crea integraciones que luego el SDK actualiza con actividad real.</p>
          </div>
          <Button onClick={onAnalyze} disabled={isAnalyzing} className="h-11 gap-2 px-5 font-bold">
            {isAnalyzing ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
            {isAnalyzing ? "Analizando..." : "Analizar y vincular"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <label className="block">
          <span className="mb-2 block text-sm font-extrabold text-slate-950">Repositorio publico</span>
          <span className="relative block">
            <GitBranch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              value={repositoryUrl}
              onChange={(event) => onRepositoryChange(event.target.value)}
              placeholder="https://github.com/org/repo"
              className="h-12 w-full rounded-lg border border-slate-200 pl-12 pr-4 text-sm font-semibold outline-none focus:border-[#008f1f] focus:ring-4 focus:ring-emerald-50"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-extrabold text-slate-950">Archivos clave</span>
          <input
            type="file"
            multiple
            onChange={(event) => onFilesChange(event.currentTarget.files)}
            className="block w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-[#008f1f] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-slate-100 px-5 py-4 text-xs font-bold text-slate-500">
        <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1 text-emerald-700">
          <UploadCloud className="h-3.5 w-3.5" />
          {files.length} archivos cargados
        </span>
        <span className="rounded-md bg-slate-100 px-3 py-1">package.json</span>
        <span className="rounded-md bg-slate-100 px-3 py-1">.env.example</span>
        <span className="rounded-md bg-slate-100 px-3 py-1">services</span>
        <span className="rounded-md bg-slate-100 px-3 py-1">README</span>
      </div>

      {message ? <p className="mx-5 mb-5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">{message}</p> : null}

      {analysis ? (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-sm font-extrabold text-slate-950">Hallazgos del ultimo analisis</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {analysis.findings.slice(0, 6).map((finding) => (
              <div key={finding.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <IntegrationIcon provider={finding.provider} serviceType={finding.serviceType} />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950">{finding.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{Math.round(finding.confidence * 100)}% confianza</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!analysis.findings.length ? <p className="mt-3 text-sm font-semibold text-slate-500">No se detectaron APIs con los archivos enviados.</p> : null}
        </div>
      ) : null}
    </Card>
  );
}

function IntegrationCard({ insight, isSelected, onSelect }: { insight: IntegrationInsight; isSelected: boolean; onSelect: () => void }) {
  const integration = insight.integration;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border bg-white p-5 text-left shadow-sm transition hover:border-[#008f1f] ${isSelected ? "border-[#008f1f] ring-4 ring-emerald-50" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <IntegrationIcon provider={integration.provider} serviceType={integration.serviceType} className="h-12 w-12" />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-extrabold text-slate-950">{integration.name}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{integration.provider} / {serviceTypeLabels[integration.serviceType] ?? integration.serviceType}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${statusClass(integration.status)}`}>{integration.status}</span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-lg font-extrabold text-slate-950">{formatNumber(insight.events.length)}</p>
          <p className="text-xs font-semibold text-slate-500">Eventos SDK</p>
        </div>
        <div className="rounded-lg bg-red-50 px-3 py-2">
          <p className="text-lg font-extrabold text-red-700">{formatNumber(insight.highRisk)}</p>
          <p className="text-xs font-semibold text-red-600">Alto riesgo</p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-3 py-2">
          <p className="text-lg font-extrabold text-emerald-700">{insight.coverage}%</p>
          <p className="text-xs font-semibold text-emerald-600">Cobertura</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${methodClass(integration.connectionMethod)}`}>{methodLabels[integration.connectionMethod] ?? integration.connectionMethod}</span>
        <span className={insight.sdkActive ? "rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700" : "rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"}>
          {insight.sdkActive ? "SDK activo" : "Esperando SDK"}
        </span>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{formatDate(integration.lastActivityAt)}</span>
      </div>
    </button>
  );
}

function SelectedIntegrationPanel({ insight, projectId }: { insight: IntegrationInsight | null; projectId: string }) {
  if (!insight) {
    return (
      <Card className="p-8 text-center">
        <Link2 className="mx-auto h-12 w-12 text-[#008f1f]" />
        <h2 className="mt-4 text-xl font-extrabold text-slate-950">Selecciona una integracion</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Aqui veras como se conecta cada API detectada con eventos reales del SDK.</p>
      </Card>
    );
  }

  const integration = insight.integration;
  const recentEvents = insight.events.slice(0, 5);
  const needsSdk = !insight.sdkActive;

  return (
    <Card className="p-0">
      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <IntegrationIcon provider={integration.provider} serviceType={integration.serviceType} className="h-14 w-14" iconClassName="h-7 w-7" />
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Dashboard de integracion</p>
              <h2 className="mt-1 truncate text-2xl font-extrabold text-slate-950">{integration.name}</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">{integration.provider} / {serviceTypeLabels[integration.serviceType] ?? integration.serviceType}</p>
            </div>
          </div>
          <Link to={`/projects/${projectId}/sdk`}>
            <Button variant="secondary" className="h-11 gap-2 font-bold">
              Ver SDK
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-0 border-b border-slate-200 md:grid-cols-4">
        {[
          { label: "Eventos", value: insight.events.length, detail: "auditados" },
          { label: "Bloqueos", value: insight.blocked, detail: "por reglas" },
          { label: "Aprobaciones", value: insight.approvals, detail: "human-in-loop" },
          { label: "Cobertura", value: `${insight.coverage}%`, detail: "proteccion" },
        ].map((item, index) => (
          <div key={item.label} className={`px-5 py-4 ${index > 0 ? "md:border-l md:border-slate-200" : ""}`}>
            <p className="text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-950">{item.value}</p>
            <p className="text-xs font-semibold text-slate-500">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="p-5">
        <div className={needsSdk ? "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3" : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"}>
          <div className="flex gap-3">
            {needsSdk ? <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" /> : <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700" />}
            <div>
              <p className={needsSdk ? "font-extrabold text-amber-800" : "font-extrabold text-emerald-800"}>{needsSdk ? "Detectada, esperando primer evento del SDK" : "Vinculada con actividad real del SDK"}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {needsSdk
                  ? `Envia eventos con service.provider = "${integration.provider}" para que Oberyn relacione esta API detectada con auditoria, riesgo y decisiones reales.`
                  : "Los eventos del SDK ya actualizan esta integracion, su cobertura y su actividad reciente."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-extrabold text-slate-950">Actividad reciente de esta API</h3>
          <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {recentEvents.map((event) => (
              <div key={event.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{event.actionName}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{event.eventType}</p>
                </div>
                <span className={`w-fit rounded-md px-2.5 py-1 text-xs font-bold ${riskClass(event.riskLevel)}`}>{riskLabel(normalize(event.riskLevel))}</span>
                <span className="w-fit rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{decisionLabel(event.decision)}</span>
                <span className="text-sm font-semibold text-slate-500">{formatDate(event.createdAt)}</span>
              </div>
            ))}
            {!recentEvents.length ? <p className="px-4 py-5 text-sm font-semibold text-slate-500">Todavia no hay eventos del SDK asociados a esta integracion.</p> : null}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ProjectIntegrationsPage() {
  const { projectId: routeProjectId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { activeOrganization, isLoading: isLoadingOrganizations } = useOrganizations();
  const { projects, isLoading: isLoadingProjects } = useProjects(activeOrganization?.id);
  const [selectedProjectId, setSelectedProjectId] = useState(routeProjectId ?? localStorage.getItem(ACTIVE_PROJECT_KEY) ?? "");
  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null, [projects, selectedProjectId]);
  const { integrations, isLoading: isLoadingIntegrations, error: integrationsError, reloadIntegrations } = useIntegrations(selectedProject?.id, activeOrganization?.id);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isLoadingAudit, setLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [files, setFiles] = useState<DetectionFileInput[]>([]);
  const [analysis, setAnalysis] = useState<DetectionResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isAnalyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (routeProjectId) setSelectedProjectId(routeProjectId);
  }, [routeProjectId]);

  useEffect(() => {
    if (!selectedProjectId && projects[0]) setSelectedProjectId(projects[0].id);
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedIntegrationId || !integrations.some((integration) => integration.id === selectedIntegrationId)) {
      setSelectedIntegrationId(integrations[0]?.id ?? null);
    }
  }, [integrations, selectedIntegrationId]);

  async function loadAuditEvents() {
    if (!selectedProject?.id || !activeOrganization?.id) {
      setAuditEvents([]);
      return;
    }

    setLoadingAudit(true);
    setAuditError(null);
    try {
      const token = await getToken();
      const response = await apiClient.get<ApiResponse<AuditEvent[]>>(`/projects/${selectedProject.id}/audit`, token, activeOrganization.id);
      setAuditEvents(response.data);
    } catch (loadError) {
      setAuditEvents([]);
      setAuditError(loadError instanceof Error ? loadError.message : "No se pudo cargar la auditoria de integraciones.");
    } finally {
      setLoadingAudit(false);
    }
  }

  useEffect(() => {
    void loadAuditEvents();
  }, [selectedProject?.id, activeOrganization?.id]);

  const insights = useMemo(() => integrations.map((integration) => buildInsight(integration, auditEvents)), [auditEvents, integrations]);
  const selectedInsight = insights.find((insight) => insight.integration.id === selectedIntegrationId) ?? insights[0] ?? null;
  const sdkActiveCount = insights.filter((insight) => insight.sdkActive).length;
  const detectedWaitingCount = insights.filter((insight) => !insight.sdkActive && insight.integration.status === "detected").length;
  const highRiskEvents = insights.reduce((total, insight) => total + insight.highRisk, 0);
  const protectedEvents = insights.reduce((total, insight) => total + insight.protectedEvents, 0);
  const isLoading = isLoadingOrganizations || isLoadingProjects || isLoadingIntegrations || isLoadingAudit;

  function handleProjectChange(nextProjectId: string) {
    setSelectedProjectId(nextProjectId);
    localStorage.setItem(ACTIVE_PROJECT_KEY, nextProjectId);
    window.dispatchEvent(new CustomEvent(ACTIVE_PROJECT_EVENT, { detail: { projectId: nextProjectId } }));
    navigate(`/projects/${nextProjectId}/integrations`);
  }

  async function readFiles(fileList: FileList | null) {
    if (!fileList) return;
    const selectedFiles = Array.from(fileList).slice(0, 40);
    const nextFiles = await Promise.all(
      selectedFiles.map(async (file) => ({
        name: file.name,
        content: (await file.text()).slice(0, 160_000),
      })),
    );
    setFiles(nextFiles.filter((file) => file.content.trim().length > 0));
  }

  async function analyzeAndLink() {
    if (!selectedProject?.id || !activeOrganization?.id) {
      setMessage("Selecciona un proyecto y una organizacion antes de analizar integraciones.");
      return;
    }
    if (!repositoryUrl.trim() && files.length === 0) {
      setMessage("Agrega un repositorio publico o sube archivos clave para iniciar el analisis.");
      return;
    }

    setAnalyzing(true);
    setMessage(null);
    try {
      const token = await getToken();
      const response = await apiClient.post<ApiResponse<DetectionResult>>(
        `/projects/${selectedProject.id}/integrations/detect`,
        { repositoryUrl: repositoryUrl.trim(), files, commit: true },
        token,
        activeOrganization.id,
      );
      setAnalysis(response.data);
      await reloadIntegrations();
      await loadAuditEvents();
      setMessage(
        response.data.findings.length
          ? `${response.data.integrations.length} integraciones vinculadas desde ${response.data.findings.length} hallazgos. El SDK actualizara esas mismas integraciones cuando reciba eventos del provider correspondiente.`
          : "No se detectaron APIs conocidas. Puedes subir archivos mas especificos como package.json, .env.example o services.",
      );
    } catch (analysisError) {
      setMessage(analysisError instanceof Error ? analysisError.message : "No se pudo analizar el proyecto.");
    } finally {
      setAnalyzing(false);
    }
  }

  if (!activeOrganization && !isLoadingOrganizations) {
    return (
      <Card className="p-8 text-center">
        <Layers3 className="mx-auto h-12 w-12 text-[#008f1f]" />
        <h1 className="mt-4 text-2xl font-extrabold text-slate-950">Primero selecciona una organizacion</h1>
        <p className="mt-2 text-slate-600">Las integraciones se administran por proyecto dentro de una organizacion.</p>
      </Card>
    );
  }

  if (!selectedProject && !isLoading) {
    return (
      <Card className="p-8 text-center">
        <Code2 className="mx-auto h-12 w-12 text-[#008f1f]" />
        <h1 className="mt-4 text-2xl font-extrabold text-slate-950">No hay proyectos disponibles</h1>
        <p className="mt-2 text-slate-600">Crea un proyecto para detectar APIs y conectarlas al SDK de Oberyn.</p>
        <Link to="/projects/new" className="mt-6 inline-flex">
          <Button>Crear proyecto</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6 text-slate-950">
      <section className="rounded-lg border border-slate-200 bg-white/70 p-7 shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#008f1f]">Integraciones Oberyn</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-slate-950">APIs detectadas, SDK y actividad real</h1>
            <p className="mt-2 max-w-4xl text-base leading-7 text-slate-600">Analiza el codigo, crea integraciones por proveedor y observa como cada evento del SDK se asocia automaticamente con DeepSeek, OpenAI, Supabase u otras APIs.</p>
          </div>
          {selectedProject ? <ProjectSelect projects={projects} selectedProjectId={selectedProject.id} onChange={handleProjectChange} /> : null}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Integraciones" value={formatNumber(integrations.length)} detail="detectadas o manuales" Icon={Layers3} />
        <MetricCard label="SDK activo" value={formatNumber(sdkActiveCount)} detail="providers con eventos" Icon={ShieldCheck} />
        <MetricCard label="Esperando SDK" value={formatNumber(detectedWaitingCount)} detail="detectadas sin trafico" Icon={Clock3} />
        <MetricCard label="Riesgo alto" value={formatNumber(highRiskEvents)} detail={`${formatNumber(protectedEvents)} eventos protegidos`} Icon={BarChart3} />
      </div>

      {(integrationsError || auditError) ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{integrationsError ?? auditError}</p> : null}

      <AnalyzerPanel
        repositoryUrl={repositoryUrl}
        files={files}
        analysis={analysis}
        message={message}
        isAnalyzing={isAnalyzing}
        onRepositoryChange={setRepositoryUrl}
        onFilesChange={(fileList) => void readFiles(fileList)}
        onAnalyze={() => void analyzeAndLink()}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(440px,1.05fr)]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-extrabold text-slate-950">Servicios del proyecto</h2>
            <Button variant="secondary" onClick={() => void reloadIntegrations()} disabled={isLoadingIntegrations} className="gap-2">
              <RefreshCcw className={isLoadingIntegrations ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Actualizar
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <div className="h-36 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-36 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <IntegrationCard key={insight.integration.id} insight={insight} isSelected={selectedInsight?.integration.id === insight.integration.id} onSelect={() => setSelectedIntegrationId(insight.integration.id)} />
              ))}
              {!insights.length ? (
                <Card className="p-8 text-center">
                  <Activity className="mx-auto h-12 w-12 text-[#008f1f]" />
                  <h3 className="mt-4 text-xl font-extrabold text-slate-950">Aun no hay integraciones</h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Sube archivos o pega un repositorio para que Oberyn detecte APIs. Cuando el SDK envie eventos, esas integraciones pasaran a estado protegido.</p>
                </Card>
              ) : null}
            </div>
          )}
        </div>

        <SelectedIntegrationPanel insight={selectedInsight} projectId={selectedProject?.id ?? ""} />
      </div>

      <Card className="border-emerald-200 bg-emerald-50/40 p-5">
        <div className="flex gap-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-[#008f1f]" />
          <div>
            <h2 className="font-extrabold text-[#258c2f]">Como se relaciona con el SDK</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              El analisis crea la integracion por `provider`. Luego el SDK envia eventos con `service.provider`; Oberyn busca esa integracion del mismo provider, actualiza cobertura, registra auditoria y muestra su dashboard sin duplicar servicios.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
