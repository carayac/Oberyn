import { ArrowLeft, Bot, Cloud, Code2, FileText, Plug, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ProjectStatusBadge } from "../../components/projects/ProjectStatusBadge";
import { ProjectTypeBadge } from "../../components/projects/ProjectTypeBadge";
import { connectionModeLabels, environmentLabels } from "../../components/projects/projectLabels";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const { activeOrganization } = useOrganizations();
  const { projects } = useProjects(activeOrganization?.id);
  const project = projects.find((item) => item.id === projectId);

  if (!project) {
    return (
      <div className="space-y-6">
        <Link to="/projects" className="inline-flex items-center gap-2 text-sm font-bold text-[#00951d]">
          <ArrowLeft className="h-4 w-4" />
          Volver a proyectos
        </Link>
        <h1 className="text-3xl font-extrabold text-[#050505]">Proyecto no encontrado</h1>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <Link to="/projects" className="inline-flex items-center gap-2 text-sm font-bold text-[#00951d]">
        <ArrowLeft className="h-4 w-4" />
        Volver a proyectos
      </Link>

      <header className="flex flex-col gap-5 rounded-xl border border-[#dce2ea] bg-white p-8 shadow-[0_10px_28px_rgba(15,23,42,0.04)] lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <ProjectTypeBadge type={project.projectType} />
            <ProjectStatusBadge status={project.status} />
          </div>
          <h1 className="mt-5 text-[38px] font-extrabold leading-tight text-[#050505]">{project.name}</h1>
          {project.description && <p className="mt-3 max-w-3xl text-[18px] font-medium text-[#596783]">{project.description}</p>}
        </div>
        <div className="rounded-lg bg-[#eaf7ee] px-4 py-3 text-sm font-extrabold text-[#008f1f]">
          {connectionModeLabels[project.connectionMode] ?? project.connectionMode}
        </div>
      </header>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "APIs", value: project.integrationsCount ?? 0, Icon: Plug },
          { label: "Reglas", value: project.rulesCount ?? 0, Icon: ShieldCheck },
          { label: "Bots", value: project.botsCount ?? 0, Icon: Bot },
          { label: "Flujos", value: project.flowsCount ?? 0, Icon: Cloud },
        ].map(({ label, value, Icon }) => (
          <article key={label} className="rounded-lg border border-[#dce2ea] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
            <Icon className="h-7 w-7 text-[#00951d]" />
            <p className="mt-4 text-[15px] font-bold text-[#596783]">{label}</p>
            <p className="mt-2 text-[30px] font-extrabold text-[#050505]">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-lg border border-[#dce2ea] bg-white p-7 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <h2 className="text-xl font-extrabold text-[#050505]">Configuración</h2>
          <dl className="mt-5 space-y-4 text-[16px]">
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-[#596783]">Ambiente</dt>
              <dd className="font-bold text-[#111827]">{environmentLabels[project.environment] ?? project.environment}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-[#596783]">Conexión</dt>
              <dd className="font-bold text-[#111827]">{connectionModeLabels[project.connectionMode] ?? project.connectionMode}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-[#596783]">Riesgo</dt>
              <dd className="font-bold capitalize text-[#111827]">{project.riskProfile ?? "medium"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-[#596783]">Política</dt>
              <dd className="font-bold capitalize text-[#111827]">{project.defaultPolicyMode ?? "balanced"}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-lg border border-[#dce2ea] bg-white p-7 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <h2 className="text-xl font-extrabold text-[#050505]">Actividad</h2>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-[#f8fafc] p-4">
              <FileText className="h-6 w-6 text-[#00951d]" />
              <p className="mt-3 text-sm font-bold text-[#596783]">Permitidas</p>
              <p className="text-2xl font-extrabold text-[#050505]">{project.allowedActionsCount ?? 0}</p>
            </div>
            <div className="rounded-lg bg-[#f8fafc] p-4">
              <Code2 className="h-6 w-6 text-rose-600" />
              <p className="mt-3 text-sm font-bold text-[#596783]">Bloqueadas</p>
              <p className="text-2xl font-extrabold text-[#050505]">{project.blockedActionsCount ?? 0}</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
