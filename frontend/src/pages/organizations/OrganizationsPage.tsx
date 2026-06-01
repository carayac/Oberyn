import { useUser } from "@clerk/react";
import { ArrowRight, Building2, CheckCircle2, Clock3, FolderKanban, Info, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AuthBrandLogo } from "../../components/auth/AuthBrandLogo";
import { connectionModeLabels, environmentLabels, statusLabels } from "../../components/projects/projectLabels";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";
import { appRoutes } from "../../routes/routes";
import type { AuditEvent } from "../../types/audit";
import type { Organization } from "../../types/organization";
import type { Project } from "../../types/project";

const organizationStatusLabels: Record<string, string> = {
  active: "Activa",
  pending_setup: "Pendiente",
  suspended: "Suspendida",
  archived: "Archivada",
};

function initials(value?: string | null) {
  if (!value) return "O";
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "O";
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Sin actividad";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Sin actividad";

  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Hace 1 día";
  return `Hace ${diffDays} días`;
}

function projectMeta(project: Project) {
  const mode = connectionModeLabels[project.connectionMode] ?? project.connectionMode;
  const environment = environmentLabels[project.environment] ?? project.environment;
  const status = statusLabels[project.status] ?? project.status;

  return { mode, environment, status };
}

function recentActivityTitle(event: AuditEvent) {
  return event.actionName || event.eventType || "Evento registrado";
}

function OrganizationCard({
  organization,
  isActive,
  activeProjectCount,
  onSelect,
}: {
  organization: Organization;
  isActive: boolean;
  activeProjectCount?: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "group grid w-full grid-cols-[56px_1fr_auto] items-center gap-4 rounded-lg border p-4 text-left transition",
        isActive ? "border-[#008f1f] bg-[#f2fbf4] shadow-[0_10px_26px_rgba(0,143,31,0.08)]" : "border-[#dce2ea] bg-white hover:border-[#b9c5d3] hover:bg-[#fbfcfd]",
      ].join(" ")}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#eaf7ee] text-[22px] font-extrabold text-[#008f1f]">
        {initials(organization.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[20px] font-extrabold text-[#111827]">{organization.name}</span>
        <span className="mt-1 block truncate text-[15px] font-semibold text-[#596783]">
          {isActive ? `${activeProjectCount ?? 0} proyectos` : organization.slug}
        </span>
      </span>
      <span className="flex items-center gap-3">
        <span className="hidden rounded-full bg-[#eaf7ee] px-3 py-1 text-[13px] font-bold text-[#08751b] sm:inline-flex">
          <span className="mr-2 mt-[6px] h-2 w-2 rounded-full bg-[#008f1f]" />
          {organizationStatusLabels[organization.status] ?? organization.status}
        </span>
        <ArrowRight className="h-5 w-5 text-[#596783] transition group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

function ProjectCard({ project, isSelected, onSelect }: { project: Project; isSelected: boolean; onSelect: () => void }) {
  const meta = projectMeta(project);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "min-w-0 rounded-lg border p-4 text-left transition",
        isSelected ? "border-[#008f1f] bg-[#f2fbf4]" : "border-[#dce2ea] bg-white hover:border-[#b9c5d3] hover:bg-[#fbfcfd]",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#eaf7ee] text-[#008f1f]">
          <FolderKanban className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-[18px] font-extrabold text-[#111827]">{project.name}</h3>
            <span className="rounded-md bg-[#eaf7ee] px-2.5 py-1 text-[12px] font-bold text-[#08751b]">{meta.mode}</span>
          </div>
          <div className="mt-4 space-y-3 text-[14px] font-semibold text-[#596783]">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                Actividad reciente
              </span>
              <span>{formatRelativeTime(project.lastActivityAt ?? project.updatedAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Reglas activas
              </span>
              <span>{project.rulesCount ?? 0}</span>
            </div>
          </div>
          <div className="mt-4 border-t border-[#e5e9ef] pt-3">
            <span className="inline-flex items-center rounded-md bg-[#eaf7ee] px-3 py-1 text-[13px] font-bold text-[#08751b]">
              <span className="mr-2 h-2 w-2 rounded-full bg-[#008f1f]" />
              {meta.environment}
            </span>
            {project.status !== "active" && <span className="ml-2 inline-flex rounded-md bg-slate-100 px-3 py-1 text-[13px] font-bold text-[#596783]">{meta.status}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

export function OrganizationsPage() {
  const { user } = useUser();
  const { organizations, activeOrganizationId, activeOrganization, setActiveOrganizationId, isLoading, error } = useOrganizations();
  const { projects, isLoading: isLoadingProjects, error: projectsError } = useProjects(activeOrganizationId);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (projects.length === 0) {
      setSelectedProjectId(null);
      return;
    }

    if (!selectedProjectId || !projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null,
    [projects, selectedProjectId],
  );
  const dashboardData = useDashboardData(selectedProject?.id, activeOrganizationId);

  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Usuario";
  const email = user?.primaryEmailAddress?.emailAddress ?? "Sesión iniciada";
  const recentEvents = dashboardData.auditEvents.slice(0, 3);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-40px)] w-full max-w-[1480px] flex-col gap-5 pb-6">
      <AuthBrandLogo className="justify-center" markSize="sm" />

      <section className="rounded-xl border border-[#dce2ea] bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.04)] sm:p-6 lg:p-8">
        <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.78fr)_minmax(420px,1.05fr)]">
          <div className="rounded-lg border border-[#dce2ea] bg-white p-5">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#eaf7ee] text-[22px] font-extrabold text-[#08751b]">
                {initials(displayName)}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[18px] font-extrabold text-[#111827]">{displayName}</h2>
                <p className="mt-1 truncate text-[14px] font-semibold text-[#596783]">{email}</p>
              </div>
              <span className="hidden rounded-md bg-[#eaf7ee] px-3 py-1 text-[13px] font-bold text-[#08751b] sm:inline-flex">
                <span className="mr-2 mt-[6px] h-2 w-2 rounded-full bg-[#008f1f]" />
                Sesión activa
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-[#dce2ea] bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[18px] font-extrabold text-[#111827]">Actividad reciente</h2>
              {selectedProject && (
                <Link to={`/projects/${selectedProject.id}/audit`} className="inline-flex items-center gap-2 text-[14px] font-extrabold text-[#008f1f]">
                  Ver todo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {dashboardData.isLoading && <p className="col-span-full text-[14px] font-semibold text-[#596783]">Cargando actividad...</p>}
              {!dashboardData.isLoading &&
                recentEvents.map((event) => (
                  <div key={event.id} className="flex min-w-0 gap-3 md:border-l md:border-[#e5e9ef] md:pl-4 md:first:border-l-0 md:first:pl-0">
                    <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf7ee] text-[#008f1f]">
                      <CheckCircle2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-extrabold text-[#111827]">{recentActivityTitle(event)}</p>
                      <p className="truncate text-[13px] font-semibold text-[#596783]">{event.decision}</p>
                      <p className="mt-1 text-[13px] font-semibold text-[#596783]">{formatRelativeTime(event.createdAt)}</p>
                    </div>
                  </div>
                ))}
              {!dashboardData.isLoading && recentEvents.length === 0 && (
                <p className="col-span-full text-[14px] font-semibold text-[#596783]">No hay actividad reciente para el proyecto seleccionado.</p>
              )}
            </div>
          </div>
        </div>

        <header className="mt-8">
          <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold leading-tight text-[#050505]">Selecciona dónde quieres trabajar</h1>
          <p className="mt-3 max-w-3xl text-[16px] font-semibold leading-7 text-[#596783]">
            Elige una organización y luego un proyecto para gestionar reglas, servicios y auditoría.
          </p>
        </header>

        {(error || projectsError) && (
          <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
            {error ?? projectsError}
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(420px,1.12fr)]">
          <section className="min-w-0 rounded-lg border border-[#dce2ea] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-[#008f1f]" />
                <h2 className="text-[20px] font-extrabold text-[#111827]">Organizaciones</h2>
              </div>
              <Link
                to={appRoutes.onboardingOrganization}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#b5dec0] px-4 text-[14px] font-extrabold text-[#008f1f] transition hover:bg-[#eaf7ee]"
              >
                <Plus className="h-4 w-4" />
                Crear organización
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {isLoading && <div className="rounded-lg border border-[#dce2ea] px-5 py-8 text-center font-semibold text-[#596783]">Cargando organizaciones...</div>}
              {!isLoading &&
                organizations.map((organization) => (
                  <OrganizationCard
                    key={organization.id}
                    organization={organization}
                    isActive={organization.id === activeOrganizationId}
                    activeProjectCount={projects.length}
                    onSelect={() => setActiveOrganizationId(organization.id)}
                  />
                ))}
              {!isLoading && organizations.length === 0 && (
                <div className="rounded-lg border border-dashed border-[#b9c5d3] px-5 py-10 text-center">
                  <p className="text-[18px] font-extrabold text-[#111827]">No hay organizaciones todavía</p>
                  <p className="mt-2 text-[14px] font-semibold text-[#596783]">Crea una organización para empezar a agrupar tus proyectos.</p>
                </div>
              )}
            </div>
          </section>

          <section className="min-w-0 rounded-lg border border-[#dce2ea] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <FolderKanban className="h-6 w-6 text-[#008f1f]" />
                  <h2 className="text-[20px] font-extrabold text-[#111827]">Proyectos</h2>
                </div>
                <p className="mt-2 text-[15px] font-semibold text-[#596783]">
                  Organización seleccionada: <span className="font-extrabold text-[#008f1f]">{activeOrganization?.name ?? "Ninguna"}</span>
                </p>
              </div>
              <Link
                to={appRoutes.projectNew}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#b5dec0] px-4 text-[14px] font-extrabold text-[#008f1f] transition hover:bg-[#eaf7ee]"
              >
                <Plus className="h-4 w-4" />
                Crear proyecto
              </Link>
            </div>

            <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
              {isLoadingProjects && <div className="col-span-full rounded-lg border border-[#dce2ea] px-5 py-8 text-center font-semibold text-[#596783]">Cargando proyectos...</div>}
              {!isLoadingProjects &&
                projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isSelected={project.id === selectedProject?.id}
                    onSelect={() => setSelectedProjectId(project.id)}
                  />
                ))}
              {!isLoadingProjects && projects.length === 0 && (
                <div className="col-span-full rounded-lg border border-dashed border-[#b9c5d3] px-5 py-10 text-center">
                  <p className="text-[18px] font-extrabold text-[#111827]">No hay proyectos en esta organización</p>
                  <p className="mt-2 text-[14px] font-semibold text-[#596783]">Crea el primer proyecto para empezar a configurar reglas e integraciones.</p>
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-[#e5e9ef] pt-5">
              {selectedProject ? (
                <Link
                  to={`/projects/${selectedProject.id}`}
                  className="mx-auto flex h-12 w-full max-w-[340px] items-center justify-center gap-3 rounded-lg bg-[#008f1f] text-[16px] font-extrabold text-white shadow-[0_8px_20px_rgba(0,143,31,0.22)] transition hover:bg-[#08751b]"
                >
                  Entrar al proyecto
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <Link
                  to={appRoutes.projectNew}
                  className="mx-auto flex h-12 w-full max-w-[340px] items-center justify-center gap-3 rounded-lg bg-[#008f1f] text-[16px] font-extrabold text-white shadow-[0_8px_20px_rgba(0,143,31,0.22)] transition hover:bg-[#08751b]"
                >
                  Crear proyecto
                  <Plus className="h-5 w-5" />
                </Link>
              )}
            </div>
          </section>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-lg border border-[#dce2ea] bg-white px-5 py-4 text-[15px] font-semibold leading-6 text-[#596783]">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#008f1f]" />
          <p>Las reglas, servicios y auditoría se gestionan por proyecto. Selecciona el proyecto correcto antes de cambiar su configuración.</p>
        </div>
      </section>
    </div>
  );
}
