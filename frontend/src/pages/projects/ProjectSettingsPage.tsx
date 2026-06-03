import { ArrowLeft, Save } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { connectionModeLabels, environmentLabels, projectTypeLabels, statusLabels } from "../../components/projects/projectLabels";
import { useAllProjects } from "../../hooks/useAllProjects";
import { useOrganizations } from "../../hooks/useOrganizations";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ProjectSettingsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { organizations, isLoading: isLoadingOrganizations } = useOrganizations();
  const { projects, isLoading: isLoadingProjects, updateProject } = useAllProjects(organizations, isLoadingOrganizations);
  const project = projects.find((item) => item.id === projectId);
  const organization = organizations.find((item) => item.id === project?.organizationId);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setSaving] = useState(false);
  const isLoading = isLoadingOrganizations || isLoadingProjects;

  const defaultSlug = useMemo(() => (project ? project.slug || slugify(project.name) : ""), [project]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || slugify(name);

    if (!name) {
      setError("El nombre del proyecto es obligatorio.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateProject(project.id, {
        name,
        slug,
        description: String(formData.get("description") ?? "").trim(),
        projectType: String(formData.get("projectType") ?? project.projectType),
        environment: String(formData.get("environment") ?? project.environment),
        connectionMode: String(formData.get("connectionMode") ?? project.connectionMode),
        status: formData.get("status") as typeof project.status,
      });
      navigate(`/projects/${updated.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el proyecto.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="h-96 animate-pulse rounded-xl border border-[#dce2ea] bg-white" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Link to="/projects" className="inline-flex items-center gap-2 text-sm font-bold text-[#00951d]">
          <ArrowLeft className="h-4 w-4" />
          Volver a proyectos
        </Link>
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-8">
          <h1 className="text-3xl font-extrabold text-[#050505]">Proyecto no encontrado</h1>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-10">
      <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-[#00951d]">
        <ArrowLeft className="h-4 w-4" />
        Volver al proyecto
      </Link>

      <section className="rounded-xl border border-[#dce2ea] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:p-8">
        <header>
          <p className="text-sm font-extrabold text-[#00951d]">{organization?.name ?? "Organización"}</p>
          <h1 className="mt-2 text-[clamp(2rem,5vw,2.75rem)] font-extrabold leading-tight text-[#050505]">Editar proyecto</h1>
          <p className="mt-3 max-w-3xl text-[16px] font-medium leading-7 text-[#596783]">
            Ajusta la información general del proyecto. Las reglas, integraciones y auditoría se administran desde sus secciones dedicadas.
          </p>
        </header>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">{error}</div>}

          <div className="grid gap-5 lg:grid-cols-2">
            <label className="block" htmlFor="settings-project-name">
              <span className="mb-2 block text-sm font-extrabold text-[#111827]">Nombre del proyecto</span>
              <input id="settings-project-name" name="name" defaultValue={project.name} className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" />
            </label>

            <label className="block" htmlFor="settings-project-slug">
              <span className="mb-2 block text-sm font-extrabold text-[#111827]">Slug</span>
              <input id="settings-project-slug" name="slug" defaultValue={defaultSlug} className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" />
            </label>
          </div>

          <label className="block" htmlFor="settings-project-description">
            <span className="mb-2 block text-sm font-extrabold text-[#111827]">Descripción</span>
            <textarea id="settings-project-description" name="description" defaultValue={project.description ?? ""} className="min-h-28 w-full rounded-lg border border-[#dce2ea] px-4 py-3 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" />
          </label>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <label className="block" htmlFor="settings-project-type">
              <span className="mb-2 block text-sm font-extrabold text-[#111827]">Tipo</span>
              <select id="settings-project-type" name="projectType" defaultValue={project.projectType} className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10">
                {Object.entries(projectTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label className="block" htmlFor="settings-project-environment">
              <span className="mb-2 block text-sm font-extrabold text-[#111827]">Ambiente</span>
              <select id="settings-project-environment" name="environment" defaultValue={project.environment} className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10">
                {Object.entries(environmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label className="block" htmlFor="settings-project-connection">
              <span className="mb-2 block text-sm font-extrabold text-[#111827]">Conexión</span>
              <select id="settings-project-connection" name="connectionMode" defaultValue={project.connectionMode} className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10">
                {Object.entries(connectionModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label className="block" htmlFor="settings-project-status">
              <span className="mb-2 block text-sm font-extrabold text-[#111827]">Estado</span>
              <select id="settings-project-status" name="status" defaultValue={project.status} className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10">
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-col justify-end gap-3 border-t border-[#dce2ea] pt-6 sm:flex-row">
            <Link to={`/projects/${project.id}`} className="inline-flex h-11 items-center justify-center rounded-lg border border-[#dce2ea] px-6 text-sm font-extrabold text-[#111827] hover:bg-[#f8fafc]">
              Cancelar
            </Link>
            <button type="submit" disabled={isSaving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#00951d] px-6 text-sm font-extrabold text-white hover:bg-[#007f18] disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="h-4 w-4" />
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
