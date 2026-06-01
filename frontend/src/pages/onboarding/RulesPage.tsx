import { ArrowRight, BookOpen, Check, ClipboardList, EyeOff, Info, LockKeyhole, Plus, Scale, Shield, Trash2, Waves } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingFrame } from "../../components/onboarding/OnboardingFrame";
import { cn } from "../../lib/utils/cn";
import { appRoutes } from "../../routes/routes";

type PolicyMode = "strict" | "balanced" | "flexible";
type RulesSubStep = "behavior" | "rules";
type RulesTab = "recommended" | "custom";
type CustomRule = {
  id: string;
  name: string;
  condition: string;
  action: string;
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
};

const ONBOARDING_POLICY_MODE_KEY = "oberyn.onboardingPolicyMode";
const ONBOARDING_RULES_KEY = "oberyn.onboardingInitialRules";
const ONBOARDING_CUSTOM_RULES_KEY = "oberyn.onboardingCustomRules";

const policyOptions = [
  {
    value: "strict",
    title: "Estricto",
    description: "Prioriza precision, control y cumplimiento estricto.",
    Icon: Shield,
    bullets: ["Respuestas más conservadoras", "Se adhiere a las reglas al 100%", "Menor tolerancia a ambiguedades"],
  },
  {
    value: "balanced",
    title: "Balanceado",
    description: "Equilibrio entre precision, flexibilidad y eficiencia.",
    Icon: Scale,
    bullets: ["Respuestas precisas y utiles", "Adapta el contexto cuando aplica", "Buen equilibrio entre control y fluidez"],
  },
  {
    value: "flexible",
    title: "Flexible",
    description: "Prioriza creatividad, adaptacion y fluidez en las respuestas.",
    Icon: Waves,
    bullets: ["Mayor flexibilidad en las respuestas", "Se adapta al contexto con libertad", "Puede asumir más riesgos"],
  },
] satisfies Array<{
  value: PolicyMode;
  title: string;
  description: string;
  Icon: typeof Shield;
  bullets: string[];
}>;

const recommendedRules = [
  {
    id: "read_only_default",
    title: "Permitir solo acciones de lectura por defecto",
    description: "La IA solo podrá leer información. Cualquier acción de escritura estará deshabilitada.",
    Icon: BookOpen,
  },
  {
    id: "critical_approval",
    title: "Requerir aprobación para acciones críticas",
    description: "Acciones sensibles como cambios de configuración o permisos requerirán aprobación.",
    Icon: Shield,
  },
  {
    id: "block_delete",
    title: "Bloquear eliminación de datos",
    description: "La IA no podrá eliminar registros, archivos o configuraciones en ningún contexto.",
    Icon: LockKeyhole,
  },
  {
    id: "mask_sensitive_data",
    title: "Ocultar datos sensibles antes de salir",
    description: "Se removeran o enmáscararan datos sensibles en respuestas y exportaciones.",
    Icon: EyeOff,
  },
  {
    id: "minimum_audit",
    title: "Auditoría mínima obligatoria",
    description: "Todas las interacciones y acciones relevantes serán registradas para auditoría.",
    Icon: ClipboardList,
  },
];

function PolicyCard({
  option,
  selected,
  onSelect,
}: {
  option: (typeof policyOptions)[number];
  selected: boolean;
  onSelect: (value: PolicyMode) => void;
}) {
  const Icon = option.Icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      className={cn(
        "relative flex min-h-[360px] flex-col items-center rounded-lg border bg-white px-7 py-8 text-center shadow-[0_14px_40px_rgba(15,23,42,0.04)] transition",
        selected ? "border-[#00951d] bg-[#f6fff8] ring-4 ring-[#00951d]/10" : "border-[#dce2ea] hover:border-[#b9c5d6] hover:bg-[#fbfcfd]",
      )}
    >
      {selected && (
        <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#00951d] text-white shadow-[0_10px_22px_rgba(0,149,29,0.22)]">
          <Check className="h-6 w-6" strokeWidth={2.6} />
        </span>
      )}

      <span className={cn("flex h-24 w-24 items-center justify-center rounded-full", selected ? "bg-[#eaf7ee] text-[#00951d]" : "bg-[#f0f2f5] text-[#42516a]")}>
        <Icon className="h-14 w-14" strokeWidth={2.1} />
      </span>

      <h2 className={cn("mt-6 text-[27px] font-extrabold leading-tight", selected ? "text-[#00951d]" : "text-[#111827]")}>{option.title}</h2>
      <p className="mt-3 max-w-[250px] text-[17px] font-semibold leading-7 text-[#596783]">{option.description}</p>

      <ul className="mt-8 w-full space-y-4 text-left">
        {option.bullets.map((bullet) => (
          <li key={bullet} className="flex items-center gap-3 text-[16px] font-semibold leading-6 text-[#596783]">
            <Check className="h-5 w-5 shrink-0 text-[#00951d]" strokeWidth={2.5} />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

function RuleToggle({
  rule,
  enabled,
  onToggle,
}: {
  rule: (typeof recommendedRules)[number];
  enabled: boolean;
  onToggle: (id: string) => void;
}) {
  const Icon = rule.Icon;

  return (
    <button
      type="button"
      onClick={() => onToggle(rule.id)}
      className="flex w-full items-center gap-5 rounded-lg border border-[#dce2ea] bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.03)] transition hover:border-[#b9c5d6] hover:bg-[#fbfcfd] sm:p-5"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#eaf7ee] text-[#111827]">
        <Icon className="h-7 w-7" strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[18px] font-extrabold leading-6 text-[#111827]">{rule.title}</span>
        <span className="mt-1 block text-[15px] font-semibold leading-6 text-[#596783]">{rule.description}</span>
      </span>
      <span
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full transition",
          enabled ? "bg-[#00951d] shadow-[0_8px_18px_rgba(0,149,29,0.18)]" : "bg-[#dce2ea]",
        )}
        aria-hidden="true"
      >
        <span className={cn("absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition", enabled ? "left-7" : "left-1")} />
      </span>
    </button>
  );
}

function CustomRuleCard({
  rule,
  onToggle,
  onRemove,
}: {
  rule: CustomRule;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const severityLabels: Record<CustomRule["severity"], string> = {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    critical: "Crítica",
  };

  return (
    <div className="rounded-lg border border-[#dce2ea] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[18px] font-extrabold leading-6 text-[#111827]">{rule.name}</h3>
            <span className="rounded-full bg-[#edf1f7] px-3 py-1 text-[12px] font-extrabold text-[#52617b]">{severityLabels[rule.severity]}</span>
          </div>
          <p className="mt-2 text-[14px] font-semibold leading-6 text-[#596783]">
            <span className="font-extrabold text-[#111827]">Si:</span> {rule.condition}
          </p>
          <p className="mt-1 text-[14px] font-semibold leading-6 text-[#596783]">
            <span className="font-extrabold text-[#111827]">Entonces:</span> {rule.action}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onToggle(rule.id)}
            className={cn("relative h-8 w-14 rounded-full transition", rule.enabled ? "bg-[#00951d]" : "bg-[#dce2ea]")}
            aria-label={rule.enabled ? "Desactivar regla" : "Activar regla"}
          >
            <span className={cn("absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition", rule.enabled ? "left-7" : "left-1")} />
          </button>
          <button type="button" onClick={() => onRemove(rule.id)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dce2ea] text-[#7c2635] hover:bg-[#fff1f2]" aria-label="Eliminar regla">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function RulesPage() {
  const navigate = useNavigate();
  const [subStep, setSubStep] = useState<RulesSubStep>("behavior");
  const [policyMode, setPolicyMode] = useState<PolicyMode>(() => {
    const stored = localStorage.getItem(ONBOARDING_POLICY_MODE_KEY);
    return stored === "strict" || stored === "balanced" || stored === "flexible" ? stored : "balanced";
  });
  const [enabledRuleIds, setEnabledRuleIds] = useState<string[]>(() => {
    const stored = localStorage.getItem(ONBOARDING_RULES_KEY);
    if (!stored) return recommendedRules.map((rule) => rule.id);

    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.map(String) : recommendedRules.map((rule) => rule.id);
    } catch {
      return recommendedRules.map((rule) => rule.id);
    }
  });
  const [rulesTab, setRulesTab] = useState<RulesTab>("recommended");
  const [customRules, setCustomRules] = useState<CustomRule[]>(() => {
    const stored = localStorage.getItem(ONBOARDING_CUSTOM_RULES_KEY);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  function handleAddCustomRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const condition = String(formData.get("condition") ?? "").trim();
    const action = String(formData.get("action") ?? "").trim();
    const severity = String(formData.get("severity") ?? "medium") as CustomRule["severity"];

    if (!name || !condition || !action) return;

    setCustomRules((current) => [
      {
        id: `custom_rule_${Date.now()}`,
        name,
        condition,
        action,
        severity,
        enabled: true,
      },
      ...current,
    ]);
    event.currentTarget.reset();
  }

  function toggleCustomRule(ruleId: string) {
    setCustomRules((current) => current.map((rule) => (rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule)));
  }

  function removeCustomRule(ruleId: string) {
    setCustomRules((current) => current.filter((rule) => rule.id !== ruleId));
  }

  function toggleRule(ruleId: string) {
    setEnabledRuleIds((current) => (current.includes(ruleId) ? current.filter((id) => id !== ruleId) : [...current, ruleId]));
  }

  function handleContinue() {
    localStorage.setItem(ONBOARDING_POLICY_MODE_KEY, policyMode);
    if (subStep === "behavior") {
      setSubStep("rules");
      return;
    }

    localStorage.setItem(ONBOARDING_RULES_KEY, JSON.stringify(enabledRuleIds));
    localStorage.setItem(ONBOARDING_CUSTOM_RULES_KEY, JSON.stringify(customRules));
    navigate(appRoutes.onboardingSummary);
  }

  function handleBack() {
    if (subStep === "rules") {
      setSubStep("behavior");
      return;
    }

    navigate(appRoutes.onboardingConnection);
  }

  if (subStep === "rules") {
    return (
      <OnboardingFrame activeStep={4} backTo={appRoutes.onboardingConnection}>
        <section className="w-full max-w-[1060px] rounded-lg border border-[#dce2ea] bg-white px-5 py-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:px-8 lg:px-12 lg:py-12">
          <header>
            <h1 className="text-[32px] font-extrabold leading-tight text-[#050505] sm:text-[40px]">Define las reglas iniciales del proyecto</h1>
            <p className="mt-3 text-[17px] font-semibold leading-7 text-[#596783]">Estas reglas determinan que puede o no puede hacer la IA dentro de tu proyecto.</p>
          </header>

          <div className="mt-8 border-b border-[#dce2ea]">
            <div className="flex gap-8">
              <button
                type="button"
                onClick={() => setRulesTab("recommended")}
                className={cn("border-b-2 px-5 pb-4 text-[17px] font-extrabold", rulesTab === "recommended" ? "border-[#00951d] text-[#00951d]" : "border-transparent text-[#596783]")}
              >
                Reglas recomendadas
              </button>
              <button
                type="button"
                onClick={() => setRulesTab("custom")}
                className={cn("border-b-2 px-5 pb-4 text-[17px] font-extrabold", rulesTab === "custom" ? "border-[#00951d] text-[#00951d]" : "border-transparent text-[#596783]")}
              >
                Reglas personalizadas
                {customRules.length > 0 && <span className="ml-2 rounded-full bg-[#eaf7ee] px-2 py-0.5 text-[12px] text-[#008f1f]">{customRules.length}</span>}
              </button>
            </div>
          </div>

          {rulesTab === "recommended" ? (
            <div className="mt-6 space-y-3">
              {recommendedRules.map((rule) => (
                <RuleToggle key={rule.id} rule={rule} enabled={enabledRuleIds.includes(rule.id)} onToggle={toggleRule} />
              ))}
            </div>
          ) : (
            <div className="mt-6 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
              <form onSubmit={handleAddCustomRule} className="rounded-lg border border-[#dce2ea] bg-[#fbfcfd] p-5">
                <h2 className="text-[20px] font-extrabold text-[#111827]">Nueva regla</h2>
                <p className="mt-1 text-[14px] font-semibold leading-6 text-[#596783]">Define una condición y la acción que Oberyn debe aplicar.</p>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-[14px] font-extrabold text-[#111827]">Nombre</span>
                    <input name="name" placeholder="Ej. Bloquear cambios de permisos" className="h-11 w-full rounded-lg border border-[#dce2ea] px-3 text-[14px] font-semibold outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[14px] font-extrabold text-[#111827]">Condicion</span>
                    <textarea name="condition" placeholder="Cuando la IA intente modificar roles, permisos o configuración crítica." className="min-h-[92px] w-full rounded-lg border border-[#dce2ea] px-3 py-3 text-[14px] font-semibold outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[14px] font-extrabold text-[#111827]">Acción</span>
                    <select name="action" className="h-11 w-full rounded-lg border border-[#dce2ea] px-3 text-[14px] font-semibold outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" defaultValue="require_approval">
                      <option value="require_approval">Requerir aprobación</option>
                      <option value="block">Bloquear acción</option>
                      <option value="mask_data">Ocultar datos sensibles</option>
                      <option value="audit_only">Solo auditar</option>
                      <option value="alert">Enviar alerta</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[14px] font-extrabold text-[#111827]">Severidad</span>
                    <select name="severity" className="h-11 w-full rounded-lg border border-[#dce2ea] px-3 text-[14px] font-semibold outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" defaultValue="high">
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                  </label>
                </div>

                <button type="submit" className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#00951d] px-5 text-[15px] font-extrabold text-white hover:bg-[#007f18]">
                  <Plus className="h-5 w-5" />
                  Agregar regla
                </button>
              </form>

              <div className="min-h-[360px] space-y-3">
                {customRules.length === 0 ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-[#b9c5d6] bg-[#fbfcfd] p-6 text-center">
                    <ClipboardList className="h-12 w-12 text-[#8a97aa]" />
                    <h2 className="mt-4 text-[20px] font-extrabold text-[#111827]">Aún no hay reglas personalizadas</h2>
                    <p className="mt-2 max-w-[420px] text-[14px] font-semibold leading-6 text-[#596783]">Crea reglas para flujos, servicios o riesgos particulares de tu proyecto.</p>
                  </div>
                ) : (
                  customRules.map((rule) => <CustomRuleCard key={rule.id} rule={rule} onToggle={toggleCustomRule} onRemove={removeCustomRule} />)
                )}
              </div>
            </div>
          )}

          <footer className="mt-8 flex flex-col-reverse gap-3 border-t border-[#dce2ea] pt-6 sm:flex-row sm:justify-end sm:gap-5">
            <button type="button" onClick={handleBack} className="inline-flex h-14 min-w-[150px] items-center justify-center rounded-lg border border-[#dce2ea] bg-white px-7 text-[18px] font-extrabold text-[#111827] hover:bg-[#f8fafc]">
              Volver
            </button>
            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex h-14 min-w-[220px] items-center justify-center gap-5 rounded-lg bg-[#00951d] px-8 text-[18px] font-extrabold text-white shadow-[0_10px_22px_rgba(0,149,29,0.22)] hover:bg-[#007f18]"
            >
              Continuar
              <ArrowRight className="h-7 w-7" />
            </button>
          </footer>
        </section>
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame activeStep={4} backTo={appRoutes.onboardingConnection}>
      <section className="w-full max-w-[1180px] rounded-lg border border-[#dce2ea] bg-white px-5 py-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:px-8 lg:px-12 lg:py-12">
        <header className="mx-auto max-w-[850px] text-center">
          <h1 className="text-[32px] font-extrabold leading-tight text-[#050505] sm:text-[42px]">¿Cómo debe comportarse la IA en este proyecto?</h1>
          <p className="mt-4 text-[18px] font-semibold leading-7 text-[#596783]">Elige el enfoque que mejor se alinee con los objetivos y necesidades de tu proyecto.</p>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {policyOptions.map((option) => (
            <PolicyCard key={option.value} option={option} selected={policyMode === option.value} onSelect={setPolicyMode} />
          ))}
        </div>

        <div className="mx-auto mt-8 flex max-w-[640px] items-center justify-center gap-3 text-center text-[16px] font-semibold text-[#596783]">
          <Info className="h-5 w-5 shrink-0 text-[#63738c]" />
          <span>Podrás personalizar reglas especificas más adelante.</span>
        </div>

        <footer className="mt-8 flex flex-col-reverse gap-3 border-t border-[#dce2ea] pt-6 sm:flex-row sm:justify-end sm:gap-5">
          <button type="button" onClick={handleBack} className="inline-flex h-14 min-w-[150px] items-center justify-center rounded-lg border border-[#dce2ea] bg-white px-7 text-[18px] font-extrabold text-[#111827] hover:bg-[#f8fafc]">
            Volver
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex h-14 min-w-[220px] items-center justify-center gap-5 rounded-lg bg-[#00951d] px-8 text-[18px] font-extrabold text-white shadow-[0_10px_22px_rgba(0,149,29,0.22)] hover:bg-[#007f18]"
          >
            Continuar
            <ArrowRight className="h-7 w-7" />
          </button>
        </footer>
      </section>
    </OnboardingFrame>
  );
}
