import { EyeOff, LockKeyhole, Plus, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useParams } from "react-router-dom";
import { SecurityPageFrame } from "../../components/projects/SecurityPageFrame";
import { useProjectData } from "../../hooks/useProjectData";

const quickRules = [
  { name: "Requerir aprobacion para alto riesgo", conditionType: "high", actionResult: "require_approval", severity: "high", Icon: ShieldCheck },
  { name: "Bloquear acciones criticas", conditionType: "critical", actionResult: "block", severity: "critical", Icon: LockKeyhole },
  { name: "Bloquear datos sensibles", conditionType: "secret", actionResult: "block", severity: "high", Icon: EyeOff },
];

export function ProjectRulesPage() {
  const { projectId } = useParams();
  const { rules, error, createRule, updateRule } = useProjectData(projectId);

  return (
    <SecurityPageFrame title="Reglas" description="Define que puede hacer la IA, cuando necesita aprobacion y que debe bloquearse antes de ejecutar.">
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

      <section className="grid gap-4 lg:grid-cols-3">
        {quickRules.map(({ name, conditionType, actionResult, severity, Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => void createRule({ name, description: "Regla creada desde configuracion rapida.", category: "policy", conditionType, actionResult, severity, isActive: true })}
            className="flex min-h-28 gap-4 rounded-xl border border-[#dce2ea] bg-white p-5 text-left shadow-[0_10px_28px_rgba(15,23,42,0.04)] hover:border-[#00951d]"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#eaf7ee] text-[#00951d]"><Icon className="h-6 w-6" /></span>
            <span>
              <span className="block font-extrabold text-[#111827]">{name}</span>
              <span className="mt-1 block text-sm font-semibold text-[#596783]">Condicion: {conditionType} · Resultado: {actionResult}</span>
            </span>
          </button>
        ))}
      </section>

      <section className="rounded-xl border border-[#dce2ea] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-extrabold text-[#050505]">Reglas activas</h2>
          <button type="button" onClick={() => void createRule({ name: "Nueva regla personalizada", category: "custom", conditionType: "medium", actionResult: "require_approval", severity: "medium", isActive: true })} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#00951d] px-4 text-sm font-extrabold text-[#00951d]">
            <Plus className="h-4 w-4" /> Nueva regla
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {rules.map((rule) => (
            <article key={rule.id} className="flex flex-col gap-4 rounded-lg border border-[#edf1f5] p-4 sm:flex-row sm:items-center">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#eaf7ee] text-[#00951d]"><SlidersHorizontal className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-[#111827]">{rule.name}</h3>
                <p className="mt-1 text-sm font-semibold text-[#596783]">{rule.description || `${rule.conditionType} -> ${rule.actionResult}`}</p>
              </div>
              <button
                type="button"
                onClick={() => void updateRule(rule.id, { isActive: !rule.isActive })}
                className={`h-9 rounded-full px-4 text-sm font-extrabold ${rule.isActive ? "bg-[#eaf7ee] text-[#008f1f]" : "bg-slate-100 text-slate-500"}`}
              >
                {rule.isActive ? "Activa" : "Pausada"}
              </button>
            </article>
          ))}
          {!rules.length && <p className="rounded-lg bg-slate-50 p-5 text-center text-sm font-bold text-[#596783]">Aun no hay reglas. Crea una regla rapida para empezar.</p>}
        </div>
      </section>
    </SecurityPageFrame>
  );
}
