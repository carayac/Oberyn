import { projectTypeLabels } from "./projectLabels";

const typeStyles: Record<string, string> = {
  support: "bg-emerald-50 text-emerald-700",
  ecommerce: "bg-violet-50 text-violet-700",
  finance: "bg-amber-50 text-amber-700",
  operations: "bg-sky-50 text-sky-700",
  crm: "bg-indigo-50 text-indigo-700",
  internal_automation: "bg-purple-50 text-purple-700",
  custom: "bg-slate-100 text-slate-700",
};

export function ProjectTypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${typeStyles[type] ?? typeStyles.custom}`}>
      {projectTypeLabels[type] ?? type}
    </span>
  );
}
