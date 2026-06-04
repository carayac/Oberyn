import { useAuth } from "@clerk/react";
import { ArrowLeft, Bot, CheckCircle2, Cloud, Code2, FileText, Pencil, Plug, Settings, ShieldCheck, Workflow } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProjectStatusBadge } from "../../components/projects/ProjectStatusBadge";
import { ProjectTypeBadge } from "../../components/projects/ProjectTypeBadge";
import { connectionModeLabels, environmentLabels } from "../../components/projects/projectLabels";
import { useAllProjects } from "../../hooks/useAllProjects";
import { useOrganizations } from "../../hooks/useOrganizations";
import { apiClient } from "../../lib/api/client";
import type { AuditEvent } from "../../types/audit";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

const moduleCards = [
  { label: "Integraciones", section: "integrations", Icon: Plug, text: "Servicios detectados, conexión SDK y configuración manual." },
  { label: "Reglas", section: "rules", Icon: ShieldCheck, text: "Controles que permiten, bloquean o solicitan aprobación." },
  { label: "Aprobaciones", section: "approvals", Icon: CheckCircle2, text: "Solicitudes pendientes y decisiones humanas." },
  { label: "Flujos", section: "flows", Icon: Workflow, text: "Acciones y secuencias protegidas por Oberyn." },
  { label: "SDK", section: "sdk", Icon: Code2, text: "Instalación, clave pública y eventos de prueba." },
  { label: "Gateway", section: "gateway", Icon: Cloud, text: "Vista previa del proxy para modelos y APIs externas." },
  { label: "Bots", section: "bots", Icon: Bot, text: "Módulo próximo para bots y agentes permitidos." },
  { label: "Auditoría", section: "audit", Icon: FileText, text: "Eventos, decisiones y trazabilidad del proyecto." },
];

function LoadingProjectDetail() {
  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-xl border border-[#dce2ea] bg-white p-8 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="h-5 w-36 animate-pulse rounded bg-slate-100" />
        <div className="mt-6 h-10 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-5 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-lg border border-[#dce2ea] bg-white" />
        ))}
      </div>
    </div>
  );
}

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { organizations, isLoading: isLoadingOrganizations } = useOrganizations();
  const { projects, isLoading: isLoadingProjects } = useAllProjects(organizations, isLoadingOrganizations);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const project = projects.find((item) => item.id === projectId);
  const organization = organizations.find((item) => item.id === project?.organizationId);
  const isLoading = isLoadingOrganizations || isLoadingProjects;
  const activityStats = useMemo(() => {
    const allowed = auditEvents.filter((event) => event.decision === "approved" || event.decision === "allowed").length;
    const blocked = auditEvents.filter((event) => ["blocked", "denied", "rejected"].includes(event.decision)).length;
    const latest = auditEvents[0]?.createdAt ?? project?.lastActivityAt ?? null;
    return {
      allowed: auditEvents.length ? allowed : project?.allowedActionsCount ?? 0,
      blocked: auditEvents.length ? blocked : project?.blockedActionsCount ?? 0,
      latest,
    };
  }, [auditEvents, project?.allowedActionsCount, project?.blockedActionsCount, project?.lastActivityAt]);

  useEffect(() => {
    async function loadAuditEvents() {
      if (!isLoaded || !isSignedIn || !project?.id) return;
      const token = await getToken();
      const response = await apiClient.get<ApiResponse<AuditEvent[]>>(`/projects/${project.id}/audit`, token, project.organizationId);
      setAuditEvents(response.data);
    }

    void loadAuditEvents().catch(() => setAuditEvents([]));
  }, [getToken, isLoaded, isSignedIn, project?.id, project?.organizationId]);

  if (isLoading) return <LoadingProjectDetail />;

  if (!project) {
    return (
      <div className="space-y-6">
        <Link to="/projects" className="inline-flex items-center gap-2 text-sm font-bold text-[#00951d]">
          <ArrowLeft className="h-4 w-4" />
          Volver a proyectos
        </Link>
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-8">
          <h1 className="text-3xl font-extrabold text-[#050505]">Proyecto no encontrado</h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-rose-700">
            No encontramos ese proyecto dentro de las organizaciones disponibles para tu usuario.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/projects" className="inline-flex items-center gap-2 text-sm font-bold text-[#00951d]">
          <ArrowLeft className="h-4 w-4" />
          Volver a proyectos
        </Link>
        <Link to={`/projects/${project.id}/settings`} className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#dce2ea] bg-white px-5 text-sm font-extrabold text-[#111827] hover:bg-[#f8fafc]">
          <Pencil className="h-4 w-4" />
          Editar proyecto
        </Link>
      </div>

      <header className="rounded-xl border border-[#dce2ea] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <ProjectTypeBadge type={project.projectType} />
              <ProjectStatusBadge status={project.status} />
              <span className="rounded-full bg-[#eaf7ee] px-3 py-1 text-sm font-extrabold text-[#008f1f]">
                {connectionModeLabels[project.connectionMode] ?? project.connectionMode}
              </span>
            </div>
            <h1 className="mt-5 text-[clamp(2rem,5vw,3rem)] font-extrabold leading-tight text-[#050505]">{project.name}</h1>
            <p className="mt-3 max-w-4xl text-[17px] font-medium leading-7 text-[#596783]">
              {project.description || "Proyecto listo para configurar reglas, integraciones y auditoría."}
            </p>
          </div>
          <div className="rounded-xl border border-[#dce2ea] bg-[#f8fafc] p-4 text-sm font-bold text-[#3f4b63]">
            <p className="text-[#64708a]">Organización</p>
            <p className="mt-1 text-lg text-[#111827]">{organization?.name ?? "Organización"}</p>
            <p className="mt-3 text-[#64708a]">Ambiente</p>
            <p className="mt-1 text-[#111827]">{environmentLabels[project.environment] ?? project.environment}</p>
          </div>
        </div>
      </header>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "APIs conectadas", value: project.integrationsCount ?? 0, Icon: Plug },
          { label: "Reglas activas", value: project.rulesCount ?? 0, Icon: ShieldCheck },
          { label: "Aprobaciones pendientes", value: project.pendingApprovalsCount ?? 0, Icon: CheckCircle2 },
          { label: "Flujos permitidos", value: project.flowsCount ?? 0, Icon: Workflow },
        ].map(({ label, value, Icon }) => (
          <article key={label} className="rounded-lg border border-[#dce2ea] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
            <Icon className="h-7 w-7 text-[#00951d]" />
            <p className="mt-4 text-[15px] font-bold text-[#596783]">{label}</p>
            <p className="mt-2 text-[30px] font-extrabold text-[#050505]">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-xl border border-[#dce2ea] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-[#00951d]" />
            <h2 className="text-xl font-extrabold text-[#050505]">Configura este proyecto</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {moduleCards.map(({ label, section, Icon, text }) => (
              <Link key={section} to={`/projects/${project.id}/${section}`} className="rounded-lg border border-[#dce2ea] bg-[#fbfcfd] p-4 transition hover:border-[#00951d]/40 hover:bg-[#f3fbf5]">
                <Icon className="h-5 w-5 text-[#00951d]" />
                <h3 className="mt-3 font-extrabold text-[#111827]">{label}</h3>
                <p className="mt-1 text-sm font-medium leading-5 text-[#64708a]">{text}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-[#dce2ea] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <h2 className="text-xl font-extrabold text-[#050505]">Actividad reciente</h2>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-[#f8fafc] p-4">
              <FileText className="h-6 w-6 text-[#00951d]" />
              <p className="mt-3 text-sm font-bold text-[#596783]">Permitidas</p>
              <p className="text-2xl font-extrabold text-[#050505]">{activityStats.allowed}</p>
            </div>
            <div className="rounded-lg bg-[#f8fafc] p-4">
              <Code2 className="h-6 w-6 text-rose-600" />
              <p className="mt-3 text-sm font-bold text-[#596783]">Bloqueadas</p>
              <p className="text-2xl font-extrabold text-[#050505]">{activityStats.blocked}</p>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-[#dce2ea] bg-[#f8fafc] p-4">
            <p className="text-sm font-bold text-[#596783]">Última actividad</p>
            <p className="mt-1 text-sm font-extrabold text-[#111827]">
              {activityStats.latest ? new Date(activityStats.latest).toLocaleString() : "Sin actividad registrada"}
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
