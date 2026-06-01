import { Bot, MoreHorizontal, ShoppingCart, UserRound, WalletCards } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Project } from "../../types/project";
import { environmentLabels } from "./projectLabels";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import { ProjectTypeBadge } from "./ProjectTypeBadge";

type ProjectTableProps = {
  projects: Project[];
  onPauseProject: (projectId: string) => void;
  onArchiveProject: (projectId: string) => void;
};

const projectIcons = {
  support: { Icon: Bot, className: "bg-emerald-50 text-emerald-700" },
  ecommerce: { Icon: ShoppingCart, className: "bg-amber-50 text-amber-700" },
  operations: { Icon: UserRound, className: "bg-sky-50 text-sky-700" },
  finance: { Icon: WalletCards, className: "bg-violet-50 text-violet-700" },
};

function formatLastActivity(value?: string) {
  if (!value) return "Sin actividad";
  const diffMs = Date.now() - new Date(value).getTime();
  const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  if (days === 1) return "Actualizado hace 1 dia";
  if (days < 7) return `Actualizado hace ${days} dias`;
  const weeks = Math.round(days / 7);
  return weeks === 1 ? "Actualizado hace 1 semana" : `Actualizado hace ${weeks} semanas`;
}

export function ProjectTable({ projects, onPauseProject, onArchiveProject }: ProjectTableProps) {
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-[#dce2ea] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[#dce2ea] text-[16px] font-extrabold text-[#050505]">
            <th className="px-8 py-5">Proyecto</th>
            <th className="px-6 py-5">Tipo</th>
            <th className="px-6 py-5">Ambiente</th>
            <th className="px-6 py-5">Conexión</th>
            <th className="px-6 py-5">APIs</th>
            <th className="px-6 py-5">Reglas</th>
            <th className="px-6 py-5">Estado</th>
            <th className="px-6 py-5 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const iconConfig = projectIcons[project.projectType as keyof typeof projectIcons] ?? projectIcons.support;
            const Icon = iconConfig.Icon;

            return (
              <tr key={project.id} className="border-b border-[#edf0f4] last:border-b-0">
                <td className="px-8 py-5">
                  <Link to={`/projects/${project.id}`} className="flex min-w-0 items-center gap-5">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconConfig.className}`}>
                      <Icon className="h-7 w-7" strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[17px] font-extrabold text-[#111827]">{project.name}</span>
                      <span className="mt-1 block text-[15px] font-medium text-[#64708a]">{formatLastActivity(project.lastActivityAt ?? project.updatedAt)}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-6 py-5">
                  <ProjectTypeBadge type={project.projectType} />
                </td>
                <td className="px-6 py-5 text-[16px] font-medium text-[#3f4b63]">{environmentLabels[project.environment] ?? project.environment}</td>
                <td className="px-6 py-5 text-[16px] font-medium uppercase text-[#3f4b63]">{project.connectionMode}</td>
                <td className="px-6 py-5 text-[16px] font-medium text-[#3f4b63]">{project.integrationsCount ?? 0}</td>
                <td className="px-6 py-5 text-[16px] font-medium text-[#3f4b63]">{project.rulesCount ?? 0}</td>
                <td className="px-6 py-5">
                  <ProjectStatusBadge status={project.status} />
                </td>
                <td className="relative px-6 py-5 text-right">
                  <button
                    id={`project-actions-${project.id}`}
                    type="button"
                    onClick={() => setOpenMenuProjectId((current) => (current === project.id ? null : project.id))}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#111827] transition hover:bg-slate-100"
                    aria-label={`Acciones de ${project.name}`}
                  >
                    <MoreHorizontal className="h-6 w-6" />
                  </button>
                  {openMenuProjectId === project.id && (
                    <div className="absolute right-6 top-14 z-20 w-48 overflow-hidden rounded-lg border border-[#dce2ea] bg-white py-2 text-left shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
                      <Link className="block px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#f8fafc]" to={`/projects/${project.id}`}>
                        Entrar al proyecto
                      </Link>
                      <button className="block w-full px-4 py-2 text-left text-sm font-semibold text-[#111827] hover:bg-[#f8fafc]" type="button" onClick={() => onPauseProject(project.id)}>
                        {project.status === "paused" ? "Reactivar" : "Pausar"}
                      </button>
                      <button className="block w-full px-4 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50" type="button" onClick={() => onArchiveProject(project.id)}>
                        Archivar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {projects.length === 0 && <div className="px-8 py-12 text-center text-[16px] font-semibold text-[#64708a]">No hay proyectos con esos filtros.</div>}
    </section>
  );
}
