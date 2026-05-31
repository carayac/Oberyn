import { Folder, Plug, Repeat2, ShieldCheck } from "lucide-react";

type ProjectStatsGridProps = {
  stats: {
    activeProjects: number;
    connectedApis: number;
    activeRules: number;
    allowedFlows: number;
  };
};

const statCards = [
  { id: "active-projects", label: "Proyectos activos", key: "activeProjects", delta: "+33%", Icon: Folder, className: "bg-emerald-50 text-emerald-700" },
  { id: "connected-apis", label: "APIs conectadas", key: "connectedApis", delta: "+20%", Icon: Plug, className: "bg-sky-50 text-sky-700" },
  { id: "active-rules", label: "Reglas activas", key: "activeRules", delta: "+12%", Icon: ShieldCheck, className: "bg-violet-50 text-violet-700" },
  { id: "allowed-flows", label: "Flujos permitidos", key: "allowedFlows", delta: "+18%", Icon: Repeat2, className: "bg-amber-50 text-amber-700" },
] as const;

export function ProjectStatsGrid({ stats }: ProjectStatsGridProps) {
  return (
    <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
      {statCards.map(({ id, label, key, delta, Icon, className }) => (
        <article key={id} id={`project-stat-${id}`} className="flex min-h-[112px] min-w-0 items-center gap-4 rounded-lg border border-[#dce2ea] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${className}`}>
            <Icon className="h-7 w-7" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-[#596783]">{label}</p>
            <p className="mt-2 text-[28px] font-extrabold leading-none text-[#050505]">{stats[key]}</p>
            <p className="mt-2 text-sm font-semibold text-[#596783]">
              <span className="text-[#00951d]">{delta}</span> vs. mes anterior
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}
