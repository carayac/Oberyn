import {
  Activity,
  ArrowRight,
  Ban,
  Box,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Cloud,
  Code2,
  ExternalLink,
  FileCheck2,
  FileText,
  GitBranch,
  LockKeyhole,
  MessageCircle,
  Plus,
  Shield,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { IntegrationIcon } from "../../components/integrations/IntegrationIcon";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";
import { getProjectApprovalsRoute, getProjectAuditRoute, getProjectPayGuardRoute, getProjectRulesRoute } from "../../lib/constants/routes";
import type { ApprovalRequest } from "../../types/approval";
import type { AuditEvent } from "../../types/audit";
import type { Flow } from "../../types/flow";
import type { Integration } from "../../types/integration";
import type { Project } from "../../types/project";
import type { Rule } from "../../types/rule";

type DashboardSnapshot = {
  approvals: ApprovalRequest[];
  auditEvents: AuditEvent[];
  flows: Flow[];
  integrations: Integration[];
  rules: Rule[];
};

const ACTIVE_PROJECT_KEY = "oberyn.activeProjectId";
const ACTIVE_PROJECT_EVENT = "oberyn:active-project-change";

type ActivityRow = {
  source: string;
  provider?: string | null;
  serviceType?: string | null;
  action: string;
  risk: "Bajo" | "Medio" | "Alto" | "Crítico";
  status: "Permitida" | "Aprobación" | "Bloqueada";
  audit: string;
  time: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.round(hours / 24)} d`;
}

function getDecisionStatus(decision: string): ActivityRow["status"] {
  if (decision === "blocked" || decision === "denied" || decision === "rejected") return "Bloqueada";
  if (decision === "requires_approval" || decision === "pending_approval") return "Aprobación";
  return "Permitida";
}

function getRiskLabel(risk: string): ActivityRow["risk"] {
  if (risk === "critical") return "Crítico";
  if (risk === "high") return "Alto";
  if (risk === "medium") return "Medio";
  return "Bajo";
}

function getAuditProof(event: AuditEvent) {
  if (event.stellarTxHash) return `Stellar TX ${event.stellarTxHash.slice(0, 4)}...${event.stellarTxHash.slice(-4)}`;
  if (event.eventHash) return `Hash ${event.eventHash.slice(0, 6)}...${event.eventHash.slice(-4)}`;
  return "Pendiente";
}

function hasDashboardData(data: DashboardSnapshot) {
  return data.approvals.length + data.auditEvents.length + data.flows.length + data.integrations.length + data.rules.length > 0;
}

function getDashboardMetrics(project: Project, data: DashboardSnapshot) {
  const protectedActions = project.allowedActionsCount ?? data.auditEvents.filter((event) => getDecisionStatus(event.decision) === "Permitida").length;
  const blockedActions = project.blockedActionsCount ?? data.auditEvents.filter((event) => getDecisionStatus(event.decision) === "Bloqueada").length;
  const pendingApprovals = data.approvals.filter((approval) => approval.status === "pending_approval").length || (project.pendingApprovalsCount ?? 0);
  const auditedEvents = data.auditEvents.length;

  return [
    { label: "Acciones protegidas", value: protectedActions, detail: "Total permitido", Icon: Shield },
    { label: "Bloqueadas", value: blockedActions, detail: "Reglas aplicadas", Icon: Ban },
    { label: "Pendientes de aprobación", value: pendingApprovals, detail: "Requieren revisión", Icon: Clock3 },
    { label: "Eventos auditados", value: auditedEvents, detail: "Evidencia generada", Icon: FileCheck2 },
  ];
}

function buildActivities(data: DashboardSnapshot): ActivityRow[] {
  return data.auditEvents.slice(0, 8).map((event) => {
    const integration = event.integrationId ? data.integrations.find((item) => item.id === event.integrationId) : null;
    const metadata = event.metadata ?? {};
    const provider = integration?.provider ?? (typeof metadata.serviceProvider === "string" ? metadata.serviceProvider : typeof metadata.provider === "string" ? metadata.provider : null);
    const serviceType = integration?.serviceType ?? (typeof metadata.serviceType === "string" ? metadata.serviceType : null);
    return {
      source: integration?.name ?? event.eventType,
      provider,
      serviceType,
      action: event.actionName,
      risk: getRiskLabel(event.riskLevel),
      status: getDecisionStatus(event.decision),
      audit: getAuditProof(event),
      time: formatRelativeTime(event.createdAt),
    };
  });
}

function statusClass(status: string) {
  if (status === "Bloqueada") return "bg-slate-200 text-slate-800";
  if (status === "Aprobación") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function riskDot(risk: string) {
  if (risk === "Crítico") return "bg-red-700";
  if (risk === "Alto") return "bg-red-500";
  if (risk === "Medio") return "bg-amber-500";
  return "bg-emerald-600";
}

function MetricStrip({ project, data }: { project: Project; data: DashboardSnapshot }) {
  const metrics = getDashboardMetrics(project, data);

  return (
    <div className="grid gap-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:grid-cols-4">
      {metrics.map(({ label, value, detail, Icon }, index) => (
        <div key={label} className={`flex items-center gap-4 px-6 py-5 ${index > 0 ? "md:border-l md:border-slate-200" : ""}`}>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
            <Icon className="h-8 w-8" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="text-2xl font-bold leading-tight text-slate-950">{formatNumber(value)}</p>
            <p className="text-sm font-semibold text-slate-500">{detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${statusClass(status)}`}>{status}</span>;
}

function ActivityTable({ rows }: { rows: ActivityRow[] }) {
  return (
    <Card className="p-0">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-bold text-slate-950">Actividad reciente</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500">
            <tr>
              <th className="px-5 py-3">Fuente</th>
              <th className="px-5 py-3">Acción</th>
              <th className="px-5 py-3">Riesgo</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3">Prueba de auditoría</th>
              <th className="px-5 py-3 text-right">Tiempo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={`${row.source}-${row.action}-${row.time}`} className="text-slate-700">
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="inline-flex items-center gap-3 font-semibold">
                    <IntegrationIcon provider={row.provider} serviceType={row.serviceType} className="h-9 w-9" iconClassName="h-4 w-4" />
                    {row.source}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4">{row.action}</td>
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${riskDot(row.risk)}`} />
                    {row.risk}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <StatusPill status={row.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="inline-flex items-center gap-1">
                    {row.audit}
                    {row.audit !== "Pendiente" ? <ExternalLink className="h-3.5 w-3.5 text-[#008f1f]" /> : null}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right">{row.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? <p className="px-5 py-6 text-sm text-slate-500">Aún no hay eventos auditados para este proyecto.</p> : null}
    </Card>
  );
}

function PoliciesPanel({ projectId, rules }: { projectId: string; rules: Rule[] }) {
  const activeRules = rules.filter((rule) => rule.isActive).slice(0, 4);

  return (
    <Card className="p-0">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-bold text-slate-950">Reglas activas</h2>
      </div>
      <div className="divide-y divide-slate-100 px-4">
        {activeRules.map((rule) => (
          <div key={rule.id} className="flex gap-4 py-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
              {rule.actionResult === "require_approval" ? <UsersRound className="h-6 w-6" /> : rule.actionResult === "block" ? <LockKeyhole className="h-6 w-6" /> : <FileCheck2 className="h-6 w-6" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold text-slate-950">{rule.name}</p>
                <span className="inline-flex min-w-[64px] shrink-0 justify-center whitespace-nowrap rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold leading-none text-[#008f1f]">Activa</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{rule.description ?? `${rule.category} / ${rule.actionResult}`}</p>
            </div>
          </div>
        ))}
      </div>
      {!activeRules.length ? <p className="px-5 py-6 text-sm text-slate-500">No hay reglas activas configuradas.</p> : null}
      <div className="border-t border-slate-100 px-5 py-3 text-center">
        <Link className="inline-flex items-center gap-2 text-sm font-bold text-[#008f1f]" to={getProjectRulesRoute(projectId)}>
          Ver todas las reglas
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}

function RiskPanel({ events }: { events: AuditEvent[] }) {
  const normalizedEvents = events.map((event) => ({ ...event, riskLevel: event.riskLevel.toLowerCase() }));
  const totalEvents = normalizedEvents.length;
  const latestEvent = normalizedEvents[0] ?? null;
  const risks = [
    { key: "low", label: "Bajo", color: "bg-emerald-500", text: "text-emerald-700", soft: "bg-emerald-50" },
    { key: "medium", label: "Medio", color: "bg-amber-500", text: "text-amber-700", soft: "bg-amber-50" },
    { key: "high", label: "Alto", color: "bg-red-500", text: "text-red-700", soft: "bg-red-50" },
    { key: "critical", label: "Critico", color: "bg-red-800", text: "text-red-800", soft: "bg-red-100" },
  ];
  const bars = risks.map((risk) => {
    const value = normalizedEvents.filter((event) => event.riskLevel === risk.key).length;
    return {
      ...risk,
      value,
      percentage: totalEvents ? Math.round((value / totalEvents) * 100) : 0,
    };
  });
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const currentRisk = bars.find((bar) => bar.key === latestEvent?.riskLevel) ?? null;
  const highestVolumeRisk = bars.reduce((current, next) => (next.value > current.value ? next : current), bars[0]);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-slate-950">Riesgo en tiempo real</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">Basado en los ultimos {formatNumber(totalEvents)} eventos auditados</p>
        </div>
        {latestEvent ? <span className="whitespace-nowrap rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{formatRelativeTime(latestEvent.createdAt)}</span> : null}
      </div>

      <div className="mt-6 flex h-52 items-end gap-4 border-b border-l border-slate-200 px-4 pb-2 pt-8">
        {bars.map((bar) => (
          <div key={bar.key} className="flex min-w-0 flex-1 flex-col items-center gap-3">
            <span className={`min-h-5 text-xs font-bold leading-5 ${bar.value ? bar.text : "text-slate-400"}`}>{formatNumber(bar.value)}</span>
            <div className="flex h-28 w-full items-end justify-center">
              <div
                className={`w-full max-w-14 rounded-t-md transition-all ${bar.value ? bar.color : "bg-slate-100"}`}
                style={{ height: bar.value ? `${Math.max(12, (bar.value / max) * 100)}%` : "4px" }}
                title={`${bar.label}: ${formatNumber(bar.value)} eventos (${bar.percentage}%)`}
              />
            </div>
            <span className="whitespace-nowrap text-sm font-semibold leading-none text-slate-700">{bar.label}</span>
            <span className="text-xs font-semibold leading-none text-slate-400">{bar.percentage}%</span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid overflow-hidden rounded-lg border border-slate-200 text-sm sm:grid-cols-3">
        <div className="border-b border-slate-200 p-4 sm:border-b-0 sm:border-r">
          <p className="text-slate-500">Nivel de riesgo actual</p>
          <p className="mt-2 flex items-center gap-2 font-bold text-slate-950">
            <span className={`h-2 w-2 rounded-full ${currentRisk?.color ?? "bg-slate-300"}`} />
            {currentRisk?.label ?? "Sin actividad"}
          </p>
        </div>
        <div className="border-b border-slate-200 p-4 sm:border-b-0 sm:border-r">
          <p className="text-slate-500">Eventos analizados</p>
          <p className="mt-2 font-bold text-[#008f1f]">{formatNumber(totalEvents)}</p>
        </div>
        <div className="p-4">
          <p className="text-slate-500">Mayor volumen</p>
          <p className="mt-2 flex items-center gap-2 font-bold text-slate-950">
            <span className={`h-2 w-2 rounded-full ${totalEvents ? highestVolumeRisk.color : "bg-slate-300"}`} />
            {totalEvents ? highestVolumeRisk.label : "Sin datos"}
          </p>
        </div>
      </div>

      {latestEvent ? (
        <div className={`mt-4 rounded-lg px-4 py-3 ${currentRisk?.soft ?? "bg-slate-50"}`}>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ultimo evento</p>
          <p className="mt-1 truncate text-sm font-bold text-slate-900">{latestEvent.actionName}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{latestEvent.eventType}</p>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">Cuando el SDK registre eventos, esta grafica se actualizara automaticamente.</p>
      )}
    </Card>
  );
}
function RequestsPanel({ approvals }: { approvals: ApprovalRequest[] }) {
  const rows = approvals.slice(0, 6);

  return (
    <Card className="p-0">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-bold text-slate-950">Solicitudes recientes</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500">
            <tr>
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Acción</th>
              <th className="px-5 py-3">Riesgo</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3">Motivo</th>
              <th className="px-5 py-3 text-right">Tiempo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((approval) => (
              <tr key={approval.id} className="text-slate-700">
                <td className="whitespace-nowrap px-5 py-4 font-semibold">{approval.id.slice(0, 8)}</td>
                <td className="whitespace-nowrap px-5 py-4">{approval.actionName}</td>
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${riskDot(getRiskLabel(approval.riskLevel))}`} />
                    {getRiskLabel(approval.riskLevel)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4">
                  <StatusPill status={approval.status === "pending_approval" ? "Aprobación" : approval.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-4">{approval.reason ?? "Revisión requerida"}</td>
                <td className="whitespace-nowrap px-5 py-4 text-right">{formatRelativeTime(approval.requestedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? <p className="px-5 py-6 text-sm text-slate-500">No hay solicitudes recientes.</p> : null}
    </Card>
  );
}

function FlowsPanel({ project, flows }: { project: Project; flows: Flow[] }) {
  const rows = flows.slice(0, 5);

  return (
    <Card className="p-0">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-bold text-slate-950">Flujos monitoreados</h2>
      </div>
      <div className="divide-y divide-slate-100 px-5">
        {rows.map((flow) => (
          <div key={flow.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <GitBranch className="h-5 w-5 shrink-0 text-[#008f1f]" />
              <p className="truncate font-semibold text-slate-950">{flow.name}</p>
            </div>
            <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-bold text-[#008f1f]">{flow.status}</span>
            <span className="whitespace-nowrap text-sm text-slate-500">{flow.environment}</span>
          </div>
        ))}
      </div>
      {!rows.length ? <p className="px-5 py-6 text-sm text-slate-500">No hay flujos monitoreados.</p> : null}
      <div className="border-t border-slate-100 px-5 py-3 text-center">
        <Link className="inline-flex items-center gap-2 text-sm font-bold text-[#008f1f]" to={`/projects/${project.id}/flows`}>
          Ver todos los flujos
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}

function EmptyFeature({ Icon, title, text }: { Icon: typeof Shield; title: string; text: string }) {
  return (
    <div className="flex gap-4 border-b border-slate-100 py-6 last:border-b-0">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#258c2f]">
        <Icon className="h-8 w-8" />
      </span>
      <div>
        <h3 className="font-bold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
      </div>
    </div>
  );
}

function SetupAction({ Icon, title, text, label, to }: { Icon: typeof Shield; title: string; text: string; label: string; to: string }) {
  return (
    <Card className="flex min-h-[260px] flex-col items-center p-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-50 text-[#258c2f]">
        <Icon className="h-8 w-8" />
      </span>
      <h3 className="mt-5 font-bold text-slate-950">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{text}</p>
      <Link to={to} className="mt-5 w-full">
        <Button variant="secondary" className="w-full border-emerald-200 text-[#008f1f]">
          {label}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </Card>
  );
}

function ProjectDashboardSelect({
  projects,
  selectedProjectId,
  onChange,
}: {
  projects: Project[];
  selectedProjectId: string;
  onChange: (projectId: string) => void;
}) {
  return (
    <div className="w-full max-w-sm">
      <label htmlFor="project-dashboard-select" className="mb-2 block text-sm font-bold text-slate-700">
        Proyecto
      </label>
      <select
        id="project-dashboard-select"
        value={selectedProjectId}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 shadow-sm outline-none transition focus:border-[#008f1f] focus:ring-2 focus:ring-emerald-100"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function EmptyDashboard({
  project,
  projects,
  onProjectChange,
}: {
  project: Project;
  projects: Project[];
  onProjectChange: (projectId: string) => void;
}) {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-end">
        <ProjectDashboardSelect projects={projects} selectedProjectId={project.id} onChange={onProjectChange} />
      </div>
      <section className="rounded-lg border border-slate-200 bg-white/70 p-8 shadow-soft 2xl:p-9">
        <div className="grid gap-7 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="p-8 text-center sm:p-12 2xl:p-14">
            <div className="mx-auto flex max-w-xl items-center justify-center py-6">
              <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-dashed border-emerald-200 bg-emerald-50/50">
                <ShieldCheck className="h-28 w-28 text-[#258c2f]" strokeWidth={1.8} />
                <span className="absolute -left-14 top-24 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white text-[#258c2f] shadow-sm">
                  <Cloud className="h-7 w-7" />
                </span>
                <span className="absolute -right-16 top-20 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm">
                  <Code2 className="h-7 w-7" />
                </span>
                <span className="absolute -top-8 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm">
                  <Activity className="h-7 w-7" />
                </span>
                <span className="absolute -bottom-4 left-10 flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm">
                  <Box className="h-6 w-6" />
                </span>
              </div>
            </div>

            <h1 className="mt-7 text-4xl font-bold tracking-normal text-slate-950">Aún no hay actividad en este proyecto</h1>
            <p className="mx-auto mt-4 max-w-4xl text-lg leading-8 text-slate-600">
              Bienvenido a Oberyn. Para comenzar a proteger tu aplicación y auditar operaciones, conecta tu entorno instalando el SDK.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
              <SetupAction Icon={Code2} title="Instalar SDK" text="Integra el SDK en tu aplicación para capturar eventos, proteger datos y validar acciones." label="Ver guía" to={`/projects/${project.id}/sdk`} />
              <SetupAction Icon={Cloud} title="Gateway en desarrollo" text="El Gateway estara disponible en futuras versiones. Por ahora usa el SDK para proteger acciones y prompts." label="Ver estado" to={`/projects/${project.id}/gateway`} />
              <SetupAction Icon={ShieldCheck} title="Crear reglas iniciales" text="Define reglas básicas de protección y control para empezar a bloquear acciones de riesgo." label="Crear reglas" to={`/projects/${project.id}/rules`} />
              <SetupAction Icon={Plus} title="Agregar un servicio manualmente" text="Registra un servicio externo que utilizas para empezar a monitorear sus interacciones." label="Agregar servicio" to={`/projects/${project.id}/integrations`} />
            </div>

            <Link to={`/projects/${project.id}/integrations`} className="mt-7 inline-flex">
              <Button className="min-w-72">
                <Plus className="mr-2 h-4 w-4" />
                Empezar configuración
              </Button>
            </Link>
            <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500">
              Tu configuración se guarda automáticamente y podrás completarla en cualquier momento.
            </p>
          </Card>

          <div className="space-y-6">
            <Card className="p-8">
              <h2 className="text-xl font-bold text-slate-950">Qué verás aquí</h2>
              <p className="mt-4 text-base leading-7 text-slate-600">Una vez conectado tu entorno, este panel mostrara el estado y la actividad de tu proyecto en tiempo real.</p>
              <div className="mt-5 divide-y divide-slate-100">
                <EmptyFeature Icon={Activity} title="Acciones interceptadas" text="Acciones de riesgo bloqueadas por las reglas de protección." />
                <EmptyFeature Icon={FileText} title="Eventos auditados" text="Eventos registrados y validados en tu entorno." />
                <EmptyFeature Icon={Clock3} title="Solicitudes pendientes" text="Aprobaciones y revisiones que requieren atención." />
                <EmptyFeature Icon={Box} title="Servicios detectados" text="Servicios e integraciones conectados a tu proyecto." />
              </div>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50/40 p-5">
              <div className="flex gap-4">
                <LockKeyhole className="h-6 w-6 shrink-0 text-[#008f1f]" />
                <div>
                  <h3 className="font-bold text-[#258c2f]">Seguridad desde el primer evento</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Oberyn protege tus datos, controla acciones y genera evidencia desde el primer momento.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#258c2f]">
            <CircleHelp className="h-7 w-7" />
          </span>
          <div>
            <h2 className="font-bold text-slate-950">¿Necesitas ayuda para comenzar?</h2>
            <p className="mt-1 text-sm text-slate-600">Consulta la documentación o contacta soporte para revisar tu configuración real.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary">Ver documentación</Button>
          <Button variant="secondary">
            Contactar soporte
            <MessageCircle className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function DashboardPage() {
  const { activeOrganization, isLoading: isLoadingOrganizations } = useOrganizations();
  const { projects, isLoading: isLoadingProjects } = useProjects(activeOrganization?.id);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => localStorage.getItem(ACTIVE_PROJECT_KEY) ?? "");

  useEffect(() => {
    function handleActiveProjectChange(event: Event) {
      const projectId = (event as CustomEvent<{ projectId?: string }>).detail?.projectId;
      if (!projectId) return;
      setSelectedProjectId(projectId);
    }

    window.addEventListener(ACTIVE_PROJECT_EVENT, handleActiveProjectChange);
    return () => window.removeEventListener(ACTIVE_PROJECT_EVENT, handleActiveProjectChange);
  }, []);

  const selectedProject = useMemo(() => {
    if (!projects.length) return null;
    return projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  }, [projects, selectedProjectId]);

  const dashboardData = useDashboardData(selectedProject?.id, activeOrganization?.id);
  const isLoading = isLoadingOrganizations || isLoadingProjects || dashboardData.isLoading;
  const activities = buildActivities(dashboardData);

  function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId);
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
    window.dispatchEvent(new CustomEvent(ACTIVE_PROJECT_EVENT, { detail: { projectId } }));
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="h-80 animate-pulse rounded-lg bg-slate-100 xl:col-span-2" />
          <div className="h-80 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </div>
    );
  }

  if (!selectedProject) {
    return (
      <Card className="p-8 text-center">
        <Shield className="mx-auto h-12 w-12 text-[#008f1f]" />
        <h1 className="mt-4 text-2xl font-bold text-slate-950">No hay proyectos para monitorear</h1>
        <p className="mt-2 text-slate-600">Crea un proyecto para activar controles, reglas y auditoría verificable.</p>
        <Link to="/onboarding/organization" className="mt-6 inline-flex">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Crear proyecto
          </Button>
        </Link>
      </Card>
    );
  }

  if (!hasDashboardData(dashboardData)) {
    return <EmptyDashboard project={selectedProject} projects={projects} onProjectChange={handleProjectChange} />;
  }

  return (
    <div className="space-y-6 text-slate-950">
      <section className="rounded-lg border border-slate-200 bg-white/70 p-7 shadow-soft sm:p-8 2xl:p-9">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-slate-950">Panel principal</h1>
            <p className="mt-2 text-base text-slate-600">Control total sobre las acciones de IA, protección de datos y auditoría verificable.</p>
          </div>
          <ProjectDashboardSelect projects={projects} selectedProjectId={selectedProject.id} onChange={handleProjectChange} />
        </div>

        <MetricStrip project={selectedProject} data={dashboardData} />
        {dashboardData.error ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{dashboardData.error}</p> : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)_minmax(320px,0.75fr)]">
        <ActivityTable rows={activities} />
        <PoliciesPanel projectId={selectedProject.id} rules={dashboardData.rules} />
        <RiskPanel events={dashboardData.auditEvents} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(460px,0.8fr)]">
        <RequestsPanel approvals={dashboardData.approvals} />
        <FlowsPanel project={selectedProject} flows={dashboardData.flows} />
      </div>

      <footer className="flex flex-col gap-3 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#008f1f]" />
          Confiable por diseno.
        </span>
        <div className="flex flex-wrap gap-3">
          <Link className="font-semibold text-[#008f1f]" to={getProjectApprovalsRoute(selectedProject.id)}>
            Revisar aprobaciones
          </Link>
          <Link className="font-semibold text-[#008f1f]" to={getProjectPayGuardRoute(selectedProject.id)}>
            Abrir PayGuard
          </Link>
          <Link className="font-semibold text-[#008f1f]" to={getProjectAuditRoute(selectedProject.id)}>
            Abrir auditoría
          </Link>
        </div>
      </footer>
    </div>
  );
}



