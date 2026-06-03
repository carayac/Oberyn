import { AlertTriangle, ArrowRight, Bot, CheckCircle2, Clock3, Copy, FileText, MessageCircle, Package, Shield, SlidersHorizontal, UserCheck, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useApprovals } from "../../hooks/useApprovals";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";
import type { ApprovalRequest } from "../../types/approval";
import type { Integration } from "../../types/integration";

const ACTIVE_PROJECT_KEY = "oberyn.activeProjectId";
const ACTIVE_PROJECT_EVENT = "oberyn:active-project-change";

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

function riskLabel(risk: string) {
  if (risk === "critical") return "Crítico";
  if (risk === "high") return "Alto";
  if (risk === "medium") return "Medio";
  return "Bajo";
}

function riskClass(risk: string) {
  if (risk === "critical") return "bg-red-50 text-red-700";
  if (risk === "high") return "bg-orange-50 text-orange-700";
  if (risk === "medium") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function statusLabel(status: string) {
  if (status === "approved") return "Aprobada";
  if (status === "rejected") return "Rechazada";
  if (status === "context_requested") return "Contexto";
  return "Pendiente";
}

function statusClass(status: string) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "bg-red-50 text-red-700";
  if (status === "context_requested") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

function serviceFor(approval: ApprovalRequest, integrations: Integration[]) {
  return integrations.find((integration) => integration.id === approval.integrationId) ?? null;
}

function StatCard({ label, value, detail, Icon, tone = "green" }: { label: string; value: string | number; detail: string; Icon: typeof Clock3; tone?: "green" | "red" }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-5">
        <span className={tone === "red" ? "flex h-16 w-16 items-center justify-center rounded-lg bg-red-50 text-red-600" : "flex h-16 w-16 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]"}>
          <Icon className="h-8 w-8" />
        </span>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-950">{value}</p>
          <p className="text-sm font-semibold text-slate-500">{detail}</p>
        </div>
      </div>
    </Card>
  );
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ApprovalRow({
  approval,
  integration,
  selected,
  onSelect,
}: {
  approval: ApprovalRequest;
  integration: Integration | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const source = integration?.name ?? String(approval.payloadPreview?.serviceName ?? "Servicio");
  const category = integration?.serviceType ?? String(approval.payloadPreview?.category ?? "Operacion");
  const metadata = String(approval.payloadPreview?.amount ?? approval.payloadPreview?.rows ?? "");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "grid w-full min-w-0 gap-4 rounded-lg border bg-white px-4 py-4 text-left transition md:grid-cols-[minmax(220px,1fr)_minmax(130px,0.7fr)_96px_108px_96px] md:items-center",
        selected ? "border-[#008f1f] shadow-[0_0_0_1px_rgba(0,143,31,0.16)]" : "border-slate-200 hover:border-emerald-200",
      ].join(" ")}
    >
      <div className="flex min-w-0 gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xl font-bold text-indigo-700">{initials(source)}</span>
        <div className="min-w-0">
          <p className="truncate font-bold leading-6 text-slate-950" title={approval.actionName}>{approval.actionName}</p>
          <p className="mt-1 text-sm text-slate-500">ID: {approval.id.slice(0, 18)}</p>
        </div>
      </div>
      <div className="hidden">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Agente / Bot</p>
        <p className="font-semibold text-slate-900">Agente</p>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500"><span className="h-2 w-2 rounded-full bg-[#008f1f]" />Bot</p>
      </div>
      <div className="min-w-0 border-t border-slate-100 pt-3 md:border-t-0 md:pt-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Servicio</p>
        <p className="truncate font-semibold text-slate-900" title={source}>{source}</p>
        <p className="mt-1 truncate text-sm text-slate-500" title={category}>{category}</p>
      </div>
      <div className="hidden">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 2xl:hidden">Acción</p>
        <p className="break-words font-semibold leading-6 text-slate-900">{approval.actionName}</p>
        {metadata ? <p className="mt-1 break-words text-sm text-slate-500">{metadata}</p> : null}
      </div>
      <div className="min-w-0 border-t border-slate-100 pt-3 md:border-t-0 md:pt-0">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Riesgo</p>
        <span className={`inline-flex w-fit whitespace-nowrap rounded-md px-3 py-1 text-sm font-bold leading-none ${riskClass(approval.riskLevel)}`}>{riskLabel(approval.riskLevel)}</span>
      </div>
      <div className="min-w-0 border-t border-slate-100 pt-3 text-sm text-slate-600 md:border-t-0 md:pt-0">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Fecha</p>
        <p>{formatRelativeTime(approval.requestedAt)}</p>
      </div>
      <div className="min-w-0 border-t border-slate-100 pt-3 md:border-t-0 md:pt-0">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Estado</p>
        <span className={`inline-flex w-fit whitespace-nowrap rounded-md px-3 py-1 text-sm font-bold leading-none ${statusClass(approval.status)}`}>{statusLabel(approval.status)}</span>
      </div>
      <ArrowRight className="hidden h-5 w-5 text-slate-700" />
    </button>
  );
}

function DetailPanel({
  approval,
  integration,
  onApprove,
  onReject,
  onRequestContext,
  onCreateRule,
}: {
  approval: ApprovalRequest | null;
  integration: Integration | null;
  onApprove: () => void;
  onReject: () => void;
  onRequestContext: () => void;
  onCreateRule: () => void;
}) {
  if (!approval) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-950">Detalle de la solicitud</h2>
        <p className="mt-3 text-sm text-slate-600">Selecciona una solicitud para revisar el contexto y tomar una decisión.</p>
      </Card>
    );
  }

  const tags = Object.keys(approval.payloadPreview ?? {}).slice(0, 4);
  const hash = String(approval.payloadPreview?.eventHash ?? approval.id.replace(/-/g, ""));

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-950">Detalle de la solicitud</h2>
          <span className={`rounded-md px-3 py-1 text-sm font-bold ${riskClass(approval.riskLevel)}`}>{riskLabel(approval.riskLevel)}</span>
        </div>

        <div className="mt-6 space-y-5">
          {[
            { Icon: Bot, label: "Agente / Bot", value: "Agente operativo (Bot)" },
            { Icon: Package, label: "Servicio", value: integration?.name ?? "Servicio detectado" },
            { Icon: FileText, label: "Acción", value: approval.actionName },
            { Icon: Clock3, label: "Motivo del bloqueo o revisión", value: approval.reason ?? "Acción considerada de alto impacto financiero." },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-bold text-slate-950">{value}</p>
              </div>
            </div>
          ))}

          <div>
            <p className="text-xs font-bold text-slate-500">Datos sensibles detectados</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(tags.length ? tags : ["payload", "metadata"]).map((tag) => (
                <span key={tag} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">{tag}</span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500">Hash preliminar</p>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="min-w-0 flex-1 truncate">{hash}</span>
              <Copy className="h-4 w-4 shrink-0" />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500">Reglas aplicadas</p>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              <p className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-[#008f1f]" />Regla: Riesgo alto requiere aprobación</p>
              <p className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-[#008f1f]" />Regla: Acciones sensibles requieren revisión humana</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={onApprove} disabled={approval.status !== "pending_approval"}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Aprobar una vez
            </Button>
            <Button onClick={onReject} variant="secondary" className="text-red-600" disabled={approval.status !== "pending_approval"}>
              <XCircle className="mr-2 h-4 w-4" />
              Rechazar
            </Button>
            <Button onClick={onRequestContext} variant="secondary">
              <MessageCircle className="mr-2 h-4 w-4" />
              Solicitar contexto
            </Button>
            <Button onClick={onCreateRule} variant="secondary">
              <Shield className="mr-2 h-4 w-4" />
              Crear regla permanente
            </Button>
          </div>
        </div>
      </Card>

      <Card className="border-emerald-200 bg-emerald-50/30 p-6">
        <div className="flex gap-4">
          <Package className="h-7 w-7 shrink-0 text-[#008f1f]" />
          <div>
            <h2 className="text-lg font-bold text-slate-950">Auditoría en Stellar</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Todas las decisiones de aprobación serán registradas y ancladas para garantizar integridad y trazabilidad.</p>
            <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#008f1f]"><CheckCircle2 className="h-4 w-4" />Tiempo estimado de anclaje: ~1 min</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function ProjectApprovalsPage() {
  const { projectId = "" } = useParams();
  const { activeOrganization } = useOrganizations();
  const { projects } = useProjects(activeOrganization?.id);
  const selectedProject = projects.find((project) => project.id === projectId) ?? projects[0] ?? null;
  const { approvals, isLoading, error, approve, reject, requestContext, createPermanentRule } = useApprovals(selectedProject?.id, activeOrganization?.id);
  const dashboardData = useDashboardData(selectedProject?.id, activeOrganization?.id);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
    window.dispatchEvent(new CustomEvent(ACTIVE_PROJECT_EVENT, { detail: { projectId } }));
  }, [projectId]);

  useEffect(() => {
    if (selectedApprovalId && approvals.some((approval) => approval.id === selectedApprovalId)) return;
    setSelectedApprovalId(approvals[0]?.id ?? null);
  }, [approvals, selectedApprovalId]);

  const selectedApproval = approvals.find((approval) => approval.id === selectedApprovalId) ?? approvals[0] ?? null;
  const selectedIntegration = selectedApproval ? serviceFor(selectedApproval, dashboardData.integrations) : null;
  const pending = approvals.filter((approval) => approval.status === "pending_approval").length;
  const critical = approvals.filter((approval) => approval.riskLevel === "critical").length;
  const approvedToday = approvals.filter((approval) => approval.status === "approved").length;

  async function runAction(action: () => Promise<unknown>, success: string) {
    setMessage(null);
    try {
      await action();
      setMessage(success);
    } catch (actionError) {
      setMessage(actionError instanceof Error ? actionError.message : "No se pudo completar la acción.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white/70 p-7 shadow-soft 2xl:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-normal text-slate-950">Aprobación humana</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Revisa y aprueba acciones de alto riesgo antes de su ejecución.</p>
        </header>

        <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
          <StatCard label="Pendientes" value={pending} detail="Solicitudes por revisar" Icon={Clock3} />
          <StatCard label="Críticas" value={critical} detail="Riesgo crítico detectado" Icon={AlertTriangle} tone="red" />
          <StatCard label="Aprobadas" value={approvedToday} detail="Solicitudes aprobadas" Icon={UserCheck} />
          <StatCard label="Tiempo promedio" value="-" detail="Sin datos suficientes" Icon={Clock3} />
        </div>

        {message ? <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
        {error ? <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_540px]">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-200 px-5 py-5">
              <h2 className="text-lg font-bold text-slate-950">Solicitudes pendientes</h2>
            </div>
            <div className="hidden">
              <span>Solicitud</span>
              <span>Agente / Bot</span>
              <span>Servicio</span>
              <span>Acción</span>
              <span>Riesgo</span>
              <span>Fecha</span>
              <span>Estado</span>
              <span />
            </div>
            <div className="space-y-4 px-2 pb-5">
              {isLoading ? <p className="px-4 py-10 text-sm text-slate-500">Cargando solicitudes...</p> : null}
              {!isLoading && !approvals.length ? <p className="px-4 py-10 text-sm text-slate-500">No hay solicitudes de aprobación pendientes.</p> : null}
              {approvals.map((approval) => (
                <ApprovalRow
                  key={approval.id}
                  approval={approval}
                  integration={serviceFor(approval, dashboardData.integrations)}
                  selected={approval.id === selectedApproval?.id}
                  onSelect={() => setSelectedApprovalId(approval.id)}
                />
              ))}
            </div>
            <div className="border-t border-slate-100 px-5 py-5 text-center">
              <button type="button" className="inline-flex items-center gap-2 text-sm font-bold text-[#008f1f]">
                Ver todas las solicitudes
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
              <span>Mostrando 1-{approvals.length} de {approvals.length} solicitudes</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((page) => (
                  <button key={page} className={page === 1 ? "h-9 w-9 rounded-lg border border-[#008f1f] text-[#008f1f]" : "h-9 w-9 rounded-lg border border-slate-200 text-slate-600"} type="button">{page}</button>
                ))}
              </div>
            </div>
          </Card>

          <DetailPanel
            approval={selectedApproval}
            integration={selectedIntegration}
            onApprove={() => selectedApproval && void runAction(() => approve(selectedApproval.id), "Solicitud aprobada.")}
            onReject={() => selectedApproval && void runAction(() => reject(selectedApproval.id), "Solicitud rechazada.")}
            onRequestContext={() => selectedApproval && void runAction(() => requestContext(selectedApproval.id, "Se solicitó contexto adicional para tomar una decisión."), "Contexto solicitado.")}
            onCreateRule={() => selectedApproval && void runAction(() => createPermanentRule(selectedApproval.id), "Regla permanente creada.")}
          />
        </div>
      </section>
    </div>
  );
}
