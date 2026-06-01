import { Bell, CheckCircle2, Link2, Save, Shield, SlidersHorizontal, UserCheck } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { SecurityPageFrame } from "../../components/projects/SecurityPageFrame";
import { useProjectData } from "../../hooks/useProjectData";

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-[#00951d]" : "bg-slate-200"}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

export function ProjectSettingsPage() {
  const { projectId } = useParams();
  const { rules, createRule } = useProjectData(projectId);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    blockSensitive: true,
    maskPii: true,
    lowRiskAuto: true,
    blockCritical: true,
    requireApproval: true,
    notifyBlocks: true,
    notifyApprovals: true,
  });

  function flip(key: keyof typeof settings) {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  }

  async function save() {
    if (!rules.some((rule) => rule.conditionType === "secret") && settings.blockSensitive) {
      await createRule({ name: "Bloquear datos sensibles", category: "data", conditionType: "secret", actionResult: "block", severity: "high", isActive: true });
    }
    if (!rules.some((rule) => rule.conditionType === "critical") && settings.blockCritical) {
      await createRule({ name: "Bloquear acciones criticas", category: "action", conditionType: "critical", actionResult: "block", severity: "critical", isActive: true });
    }
    if (!rules.some((rule) => rule.conditionType === "high") && settings.requireApproval) {
      await createRule({ name: "Aprobacion humana para alto riesgo", category: "approval", conditionType: "high", actionResult: "require_approval", severity: "high", isActive: true });
    }
    setSaved(true);
  }

  const cards = [
    { title: "Proteccion de datos", Icon: Shield, items: [["Bloquear datos sensibles", "blockSensitive"], ["Enmascarar PII automaticamente", "maskPii"]] },
    { title: "Control de acciones", Icon: SlidersHorizontal, items: [["Permitir bajo riesgo automaticamente", "lowRiskAuto"], ["Bloquear acciones criticas", "blockCritical"]] },
    { title: "Aprobacion humana", Icon: UserCheck, items: [["Requerir aprobacion para alto riesgo", "requireApproval"]] },
    { title: "Alertas", Icon: Bell, items: [["Notificar bloqueos", "notifyBlocks"], ["Notificar aprobaciones pendientes", "notifyApprovals"]] },
  ] as const;

  return (
    <SecurityPageFrame title="Parametrizacion" description="Configura como Oberyn protege datos, controla acciones y opera aprobaciones. Blockchain y auditoria avanzada quedan para despues.">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map(({ title, Icon, items }) => (
            <article key={title} className="rounded-xl border border-[#dce2ea] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
              <h2 className="flex items-center gap-3 text-lg font-extrabold text-[#050505]"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#eaf7ee] text-[#00951d]"><Icon className="h-5 w-5" /></span>{title}</h2>
              <div className="mt-5 space-y-4">
                {items.map(([label, key]) => (
                  <div key={key} className="flex items-center justify-between gap-4 border-t border-[#edf1f5] pt-4">
                    <span className="text-sm font-bold text-[#596783]">{label}</span>
                    <Toggle checked={settings[key]} onChange={() => flip(key)} />
                  </div>
                ))}
              </div>
            </article>
          ))}
          <article className="rounded-xl border border-[#dce2ea] bg-white p-5 md:col-span-2">
            <h2 className="flex items-center gap-3 text-lg font-extrabold text-[#050505]"><Link2 className="h-5 w-5 text-[#00951d]" />Integraciones y APIs</h2>
            <p className="mt-2 text-sm font-semibold text-[#596783]">Las integraciones se detectan automaticamente desde SDK y Gateway. La configuracion manual solo prepara reglas.</p>
          </article>
        </div>

        <aside className="rounded-xl border border-[#dce2ea] bg-white p-5">
          <h2 className="text-lg font-extrabold text-[#050505]">Resumen</h2>
          <div className="mt-5 space-y-4 text-sm font-semibold text-[#596783]">
            <p>Proteccion de datos: <strong className="text-[#00951d]">{settings.blockSensitive ? "Alta" : "Media"}</strong></p>
            <p>Control de acciones: <strong className="text-[#00951d]">{settings.blockCritical ? "Estricto" : "Flexible"}</strong></p>
            <p>Aprobacion humana: <strong className="text-[#00951d]">{settings.requireApproval ? "Activa" : "Manual"}</strong></p>
            <p>Reglas activas: <strong>{rules.filter((rule) => rule.isActive).length}</strong></p>
          </div>
          {saved && <p className="mt-5 flex gap-2 rounded-lg bg-[#eaf7ee] p-3 text-sm font-extrabold text-[#008f1f]"><CheckCircle2 className="h-5 w-5" />Configuracion guardada</p>}
          <button type="button" onClick={() => void save()} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00951d] px-4 text-sm font-extrabold text-white">
            <Save className="h-4 w-4" /> Guardar cambios
          </button>
        </aside>
      </section>
    </SecurityPageFrame>
  );
}
