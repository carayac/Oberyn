import { ArrowRight, ClipboardList, EyeOff, LockKeyhole, Scale, Shield, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { OnboardingFrame } from "../../components/onboarding/OnboardingFrame";
import { useLatestProject } from "../../hooks/useLatestProject";
import { useProjectData } from "../../hooks/useProjectData";
import { appRoutes } from "../../routes/routes";

const presets = [
  { key: "read_only", name: "Permitir solo acciones de lectura por defecto", description: "Las acciones de escritura quedan controladas por reglas explicitas.", Icon: ClipboardList, conditionType: "write", actionResult: "require_approval", severity: "medium" },
  { key: "critical_approval", name: "Requerir aprobacion para acciones criticas", description: "Acciones sensibles requieren aprobacion antes de ejecutarse.", Icon: Shield, conditionType: "high", actionResult: "require_approval", severity: "high" },
  { key: "block_delete", name: "Bloquear eliminacion de datos", description: "La IA no puede eliminar registros, archivos o configuraciones.", Icon: LockKeyhole, conditionType: "delete", actionResult: "block", severity: "critical" },
  { key: "mask_sensitive", name: "Ocultar datos sensibles antes de salir", description: "Secretos y PII se bloquean o enmascaran en prompts y respuestas.", Icon: EyeOff, conditionType: "secret", actionResult: "block", severity: "high" },
];

export function RulesPage() {
  const navigate = useNavigate();
  const { project } = useLatestProject();
  const { rules, createRule } = useProjectData(project?.id);
  const [mode, setMode] = useState("balanced");
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ read_only: true, critical_approval: true, block_delete: true, mask_sensitive: true });

  useEffect(() => {
    if (mode === "strict") setEnabled({ read_only: true, critical_approval: true, block_delete: true, mask_sensitive: true });
    if (mode === "balanced") setEnabled({ read_only: true, critical_approval: true, block_delete: true, mask_sensitive: true });
    if (mode === "flexible") setEnabled({ read_only: false, critical_approval: true, block_delete: true, mask_sensitive: true });
  }, [mode]);

  async function handleContinue() {
    const existingNames = new Set(rules.map((rule) => rule.name));
    for (const preset of presets) {
      if (!enabled[preset.key] || existingNames.has(preset.name)) continue;
      await createRule({ name: preset.name, description: preset.description, category: "policy", conditionType: preset.conditionType, actionResult: preset.actionResult, severity: preset.severity, isActive: true });
    }
    navigate(appRoutes.onboardingSummary);
  }

  return (
    <OnboardingFrame activeStep={4} backTo={appRoutes.onboardingConnection}>
      <section className="w-full max-w-[1120px] rounded-xl border border-[#dce2ea] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
        <h1 className="text-center text-[28px] font-extrabold leading-tight text-[#050505] sm:text-[34px]">Como debe comportarse la IA en este proyecto?</h1>
        <p className="mt-2 text-center text-[16px] font-medium text-[#596783]">Elige un enfoque y confirma las reglas iniciales. Luego podras personalizarlas.</p>

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {[
            { key: "strict", label: "Estricto", Icon: Shield, text: "Maximo control y baja tolerancia al riesgo." },
            { key: "balanced", label: "Balanceado", Icon: Scale, text: "Equilibrio entre control, eficiencia y flexibilidad." },
            { key: "flexible", label: "Flexible", Icon: Waves, text: "Mayor libertad con protecciones esenciales." },
          ].map(({ key, label, Icon, text }) => (
            <button key={key} type="button" onClick={() => setMode(key)} className={`rounded-xl border p-5 text-center transition ${mode === key ? "border-[#00951d] bg-[#f0fbf3] ring-4 ring-[#00951d]/10" : "border-[#dce2ea] bg-white"}`}>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#eaf7ee] text-[#00951d]"><Icon className="h-8 w-8" /></span>
              <h2 className="mt-4 text-xl font-extrabold text-[#050505]">{label}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#596783]">{text}</p>
            </button>
          ))}
        </div>

        <div className="mt-7 space-y-3">
          {presets.map(({ key, name, description, Icon }) => (
            <label key={key} className="flex items-center gap-4 rounded-lg border border-[#dce2ea] p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eaf7ee] text-[#00951d]"><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold text-[#111827]">{name}</span>
                <span className="block text-sm font-semibold text-[#596783]">{description}</span>
              </span>
              <input type="checkbox" checked={enabled[key]} onChange={(event) => setEnabled((current) => ({ ...current, [key]: event.target.checked }))} className="h-6 w-6 accent-[#00951d]" />
            </label>
          ))}
        </div>

        <footer className="mt-6 flex flex-col-reverse gap-3 border-t border-[#dce2ea] pt-5 sm:flex-row sm:justify-end">
          <Link to={appRoutes.onboardingConnection} className="inline-flex h-12 min-w-[150px] items-center justify-center rounded-lg border border-[#dce2ea] px-7 text-[16px] font-extrabold text-[#111827]">Volver</Link>
          <button type="button" onClick={() => void handleContinue()} className="inline-flex h-12 min-w-[190px] items-center justify-center gap-5 rounded-lg bg-[#00951d] px-8 text-[16px] font-extrabold text-white">
            Continuar <ArrowRight className="h-6 w-6" />
          </button>
        </footer>
      </section>
    </OnboardingFrame>
  );
}
