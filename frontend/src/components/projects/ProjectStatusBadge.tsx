import { statusLabels } from "./projectLabels";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-slate-100 text-slate-700",
  pending_setup: "bg-amber-100 text-amber-800",
  no_activity: "bg-slate-100 text-slate-700",
  paused: "bg-orange-100 text-orange-800",
  requires_configuration: "bg-rose-100 text-rose-800",
  archived: "bg-slate-200 text-slate-600",
};

export function ProjectStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${statusStyles[status] ?? statusStyles.inactive}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {statusLabels[status] ?? status}
    </span>
  );
}
