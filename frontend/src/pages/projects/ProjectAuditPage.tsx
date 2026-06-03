import { useAuth } from "@clerk/react";
import { ArrowLeft, ArrowRight, ExternalLink, FileCheck2, Link as LinkIcon, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";
import { apiClient } from "../../lib/api/client";
import { getEvidenceRoute } from "../../lib/constants/routes";
import type { AuditEvent } from "../../types/audit";
import type { AnchorBatchResult, StellarAnchorBatch } from "../../types/evidence";
import type { Project } from "../../types/project";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

const PAGE_SIZE = 8;
const ACTIVE_PROJECT_KEY = "oberyn.activeProjectId";
const ACTIVE_PROJECT_EVENT = "oberyn:active-project-change";

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function shortHash(value?: string | null) {
  if (!value) return "Pendiente";
  if (value.length <= 16) return value;
  return `${value.slice(0, 7)}...${value.slice(-7)}`;
}

function riskLabel(value: string) {
  if (value === "critical") return "Crítico";
  if (value === "high") return "Alto";
  if (value === "medium") return "Medio";
  return "Bajo";
}

function riskClass(value: string) {
  if (value === "critical") return "bg-red-50 text-red-700";
  if (value === "high") return "bg-orange-50 text-orange-700";
  if (value === "medium") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function decisionClass(value: string) {
  if (value === "blocked") return "bg-red-50 text-red-700";
  if (value === "approval_required") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function decisionLabel(value: string) {
  if (value === "blocked") return "Bloqueada";
  if (value === "approval_required") return "Aprobación";
  if (value === "approved") return "Permitida";
  return value;
}

function StatCard({ label, value, Icon }: { label: string; value: number; Icon: typeof FileCheck2 }) {
  return (
    <Card className="p-5">
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
          <Icon className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-extrabold leading-none text-slate-950">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function ProjectAuditSelect({
  projects,
  selectedProjectId,
  onChange,
}: {
  projects: Project[];
  selectedProjectId: string;
  onChange: (projectId: string) => void;
}) {
  if (!projects.length) return null;

  return (
    <div className="w-full">
      <label htmlFor="project-audit-select" className="mb-2 block text-sm font-bold text-slate-700">
        Proyecto
      </label>
      <select
        id="project-audit-select"
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

export function ProjectAuditPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { activeOrganizationId, isLoading: isLoadingOrganizations } = useOrganizations();
  const { projects, isLoading: isLoadingProjects } = useProjects(activeOrganizationId);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [batches, setBatches] = useState<StellarAnchorBatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setLoading] = useState(true);
  const [isAnchoring, setAnchoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedEvent = events.find((event) => event.id === selectedId) ?? events[0] ?? null;
  const selectedProject = projects.find((project) => project.id === projectId) ?? null;
  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const paginatedEvents = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const loadAudit = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !projectId || isLoadingOrganizations) return;
    if (!activeOrganizationId) {
      setEvents([]);
      setBatches([]);
      setSelectedId(null);
      setLoading(false);
      setMessage("Selecciona o crea una organización para consultar la auditoría.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const token = await getToken();
      const [auditResponse, anchorResponse] = await Promise.all([
        apiClient.get<ApiResponse<AuditEvent[]>>(`/projects/${projectId}/audit`, token, activeOrganizationId),
        apiClient.get<ApiResponse<StellarAnchorBatch[]>>(`/projects/${projectId}/audit/anchors`, token, activeOrganizationId),
      ]);
      setEvents(auditResponse.data);
      setBatches(anchorResponse.data);
      setSelectedId((current) => current ?? auditResponse.data[0]?.id ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la auditoría.");
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId, getToken, isLoaded, isLoadingOrganizations, isSignedIn, projectId]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  useEffect(() => {
    setPage(1);
  }, [events.length]);

  useEffect(() => {
    if (!projectId || !projects.some((project) => project.id === projectId)) return;
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
  }, [projectId, projects]);

  const stats = useMemo(() => {
    const blocked = events.filter((event) => event.decision === "blocked").length;
    const approved = events.filter((event) => event.decision !== "blocked").length;
    const anchored = events.filter((event) => event.stellarTxHash).length;
    return { total: events.length, blocked, approved, anchored };
  }, [events]);

  async function runAnchorBatch() {
    if (!activeOrganizationId) {
      setMessage("Selecciona o crea una organización para anclar la auditoría.");
      return;
    }
    setAnchoring(true);
    setMessage(null);
    try {
      const token = await getToken();
      const response = await apiClient.post<ApiResponse<AnchorBatchResult>>(`/projects/${projectId}/audit/anchors/run`, {}, token, activeOrganizationId);
      setMessage(response.data.message ?? `Anclaje completado: ${response.data.anchoredEvents} eventos.`);
      await loadAudit();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo anclar la auditoría en Stellar.");
    } finally {
      setAnchoring(false);
    }
  }

  function handleProjectChange(nextProjectId: string) {
    localStorage.setItem(ACTIVE_PROJECT_KEY, nextProjectId);
    window.dispatchEvent(new CustomEvent(ACTIVE_PROJECT_EVENT, { detail: { projectId: nextProjectId } }));
    navigate(`/projects/${nextProjectId}/audit`);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-normal text-slate-950">Auditoría</h1>
          <p className="mt-2 text-base font-medium text-slate-600">Consulta eventos, decisiones, hashes y evidencia anclada en Stellar.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[360px]">
          <ProjectAuditSelect projects={projects} selectedProjectId={selectedProject?.id ?? projectId} onChange={handleProjectChange} />
          <Button onClick={runAnchorBatch} disabled={isAnchoring || !events.length || isLoadingProjects} className="h-12 gap-2 px-5 text-base font-bold">
            <RefreshCw className={isAnchoring ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
            Anclar pendientes
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Eventos auditados" value={stats.total} Icon={FileCheck2} />
        <StatCard label="Permitidas" value={stats.approved} Icon={ShieldCheck} />
        <StatCard label="Bloqueadas" value={stats.blocked} Icon={ShieldAlert} />
        <StatCard label="Anclajes en Stellar" value={stats.anchored} Icon={LinkIcon} />
      </div>

      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</div> : null}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-extrabold text-slate-950">Registro de auditoría</h2>
            <p className="text-sm font-semibold text-slate-500">
              {events.length ? `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, events.length)} de ${events.length}` : "0 eventos"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[120px]" />
                <col />
                <col className="w-[100px]" />
                <col className="w-[120px]" />
                <col className="w-[135px]" />
                <col className="w-[135px]" />
                <col className="w-[92px]" />
              </colgroup>
              <thead className="border-b border-slate-200 text-xs font-extrabold text-slate-500">
                <tr>
                  <th className="px-4 py-4">Fecha</th>
                  <th className="px-4 py-4">Acción</th>
                  <th className="px-4 py-4">Riesgo</th>
                  <th className="px-4 py-4">Decisión</th>
                  <th className="px-4 py-4">Hash</th>
                  <th className="px-4 py-4">Stellar</th>
                  <th className="px-4 py-4">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEvents.map((event) => (
                  <tr
                    key={event.id}
                    className={selectedEvent?.id === event.id ? "cursor-pointer border-b border-emerald-100 bg-emerald-50/60" : "cursor-pointer border-b border-slate-100 hover:bg-slate-50"}
                    onClick={() => setSelectedId(event.id)}
                  >
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{formatDate(event.createdAt)}</td>
                    <td className="min-w-0 px-4 py-4">
                      <p className="truncate font-extrabold text-slate-950" title={event.actionName}>{event.actionName}</p>
                      <p className="truncate text-xs font-semibold text-slate-500" title={event.eventType}>{event.eventType}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex max-w-full items-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-extrabold ${riskClass(event.riskLevel)}`}>{riskLabel(event.riskLevel)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex max-w-full items-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-extrabold ${decisionClass(event.decision)}`}>{decisionLabel(event.decision)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-slate-600" title={event.eventHash ?? ""}>{shortHash(event.eventHash)}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-slate-600" title={event.stellarTxHash ?? ""}>{shortHash(event.stellarTxHash)}</td>
                    <td className="px-4 py-4">
                      <Link
                        className="inline-flex items-center gap-1.5 whitespace-nowrap font-extrabold text-[#008f1f]"
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                        to={getEvidenceRoute(projectId, event.id)}
                      >
                        Abrir
                        <ArrowRight className="h-4 w-4 shrink-0" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isLoading && !events.length ? <p className="px-5 py-8 text-sm font-semibold text-slate-500">Aún no hay eventos auditados para este proyecto.</p> : null}
          {isLoading ? <p className="px-5 py-8 text-sm font-semibold text-slate-500">Cargando auditoría...</p> : null}
          {events.length > PAGE_SIZE ? (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-500">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="secondary" className="h-10 gap-2" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button variant="secondary" className="h-10 gap-2" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <h2 className="text-xl font-extrabold text-slate-950">Detalle del evento</h2>
            {selectedEvent ? (
              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <p className="font-bold text-slate-500">ID</p>
                  <p className="break-all font-mono text-slate-800">{selectedEvent.id}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500">Hash del evento</p>
                  <p className="break-all font-mono text-slate-800">{selectedEvent.eventHash ?? "Pendiente de cálculo"}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500">Raíz Merkle</p>
                  <p className="break-all font-mono text-slate-800">{selectedEvent.merkleRoot ?? "Pendiente de lote"}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-500">Transacción Stellar</p>
                  <p className="break-all font-mono text-slate-800">{selectedEvent.stellarTxHash ?? "Pendiente de anclaje"}</p>
                </div>
                <Link className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[#008f1f] px-4 text-sm font-extrabold text-white" to={getEvidenceRoute(projectId, selectedEvent.id)}>
                  Ver comprobante
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm font-semibold text-slate-500">Selecciona un evento para ver su evidencia.</p>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-extrabold text-slate-950">Lotes de anclaje</h2>
            <div className="mt-4 space-y-3">
              {batches.slice(0, 5).map((batch) => (
                <div key={batch.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-bold text-slate-600" title={batch.root_hash}>{shortHash(batch.root_hash)}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{batch.event_count} eventos · {batch.network}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs font-extrabold text-emerald-700">{batch.status}</span>
                  </div>
                </div>
              ))}
              {!batches.length ? <p className="text-sm font-semibold text-slate-500">Todavía no hay lotes de anclaje.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
