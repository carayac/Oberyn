import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AuthBrandLogo } from "../../components/auth/AuthBrandLogo";
import { ProjectStatsGrid } from "../../components/projects/ProjectStatsGrid";
import { ProjectTable } from "../../components/projects/ProjectTable";
import { ProjectToolbar } from "../../components/projects/ProjectToolbar";
import { environmentLabels, projectTypeLabels, statusLabels } from "../../components/projects/projectLabels";
import { useAllProjects } from "../../hooks/useAllProjects";
import { useOrganizations } from "../../hooks/useOrganizations";
import { appRoutes } from "../../routes/routes";

export function ProjectsPage() {
  const { organizations, activeOrganization, isLoading: isLoadingOrganizations, error: organizationError } = useOrganizations();
  const { projects, stats, isLoading, error, pauseProject, archiveProject } = useAllProjects(organizations, isLoadingOrganizations);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const organizationNamesById = useMemo(
    () => Object.fromEntries(organizations.map((organization) => [organization.id, organization.name])),
    [organizations],
  );

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          project.name,
          project.description,
          organizationNamesById[project.organizationId],
          projectTypeLabels[project.projectType],
          environmentLabels[project.environment],
          statusLabels[project.status],
          project.connectionMode,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedSearch));

      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      const matchesType = typeFilter === "all" || project.projectType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [organizationNamesById, projects, search, statusFilter, typeFilter]);

  return (
    <div className="min-w-0 space-y-6 pb-10 sm:space-y-8">
      <AuthBrandLogo className="justify-center" markSize="sm" />
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-[clamp(2rem,5vw,2.625rem)] font-extrabold leading-tight text-[#050505]">Mis proyectos</h1>
          <p className="mt-3 text-[clamp(1rem,2vw,1.1875rem)] font-medium text-[#596783]">
            Administra proyectos independientes con reglas, integraciones y auditoría separadas.
          </p>
        </div>
        <Link
          id="new-project-button"
          to={activeOrganization ? appRoutes.projectNew : appRoutes.onboardingOrganization}
          className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#00951d] px-6 text-[16px] font-extrabold text-white shadow-[0_8px_16px_rgba(0,149,29,0.18)] transition hover:bg-[#007f18] sm:w-auto sm:text-[17px]"
        >
          Nuevo proyecto
          <Plus className="h-6 w-6" strokeWidth={2.4} />
        </Link>
      </header>

      {!isLoadingOrganizations && !activeOrganization && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-7 py-6">
          <h2 className="text-[22px] font-extrabold text-[#111827]">Crea una organización antes de crear proyectos</h2>
          <p className="mt-2 max-w-3xl text-[16px] font-medium leading-7 text-[#596783]">
            La organización es el espacio principal donde se agrupan tus proyectos, usuarios, permisos y configuración general.
          </p>
          <Link to={appRoutes.onboardingOrganization} className="mt-5 inline-flex h-11 items-center rounded-lg bg-[#00951d] px-6 text-[15px] font-extrabold text-white hover:bg-[#007f18]">
            Crear organización
          </Link>
        </section>
      )}

      <ProjectStatsGrid stats={stats} />

      <ProjectToolbar
        search={search}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        onTypeFilterChange={setTypeFilter}
      />

      {(organizationError || error) && <div className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">{organizationError || error}</div>}
      {isLoading || isLoadingOrganizations ? (
        <div className="rounded-lg border border-[#dce2ea] bg-white px-8 py-12 text-center font-semibold text-[#64708a]">Cargando proyectos...</div>
      ) : (
        <ProjectTable projects={filteredProjects} organizationNamesById={organizationNamesById} onPauseProject={pauseProject} onArchiveProject={archiveProject} />
      )}
    </div>
  );
}
