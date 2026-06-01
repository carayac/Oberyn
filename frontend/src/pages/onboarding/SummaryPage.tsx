import { ArrowRight, Building2, Folder, Link as LinkIcon, Shield, Shapes } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { OnboardingFrame } from "../../components/onboarding/OnboardingFrame";
import { useIntegrations } from "../../hooks/useIntegrations";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";
import { appRoutes } from "../../routes/routes";

const ACTIVE_PROJECT_KEY = "oberyn.onboardingProjectId";
const POLICY_MODE_KEY = "oberyn.onboardingPolicyMode";
const INITIAL_RULES_KEY = "oberyn.onboardingInitialRules";
const CUSTOM_RULES_KEY = "oberyn.onboardingCustomRules";
const ONBOARDING_COMPLETED_KEY = "oberyn.onboardingCompleted";

const policyLabels: Record<string, string> = {
  strict: "Estricto",
  balanced: "Balanceado",
  flexible: "Flexible",
};

const recommendedRuleLabels: Record<string, string> = {
  read_only_default: "Solo lectura por defecto",
  critical_approval: "Aprobación requerida para acciones críticas",
  block_delete: "Bloqueo de eliminación de datos",
  mask_sensitive_data: "Ocultar datos sensibles",
  minimum_audit: "Auditoría mínima obligatoria",
};

function parseList(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function parseCustomRules() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_RULES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((rule) => rule && typeof rule === "object") : [];
  } catch {
    return [];
  }
}

function SummaryItem({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail?: string }) {
  return (
    <div className="flex gap-5 border-b border-[#dce2ea] py-5 last:border-b-0">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#eaf7ee] text-[#00951d]">{icon}</span>
      <div className="min-w-0">
        <p className="text-[16px] font-extrabold text-[#111827]">{label}</p>
        <p className="mt-1 truncate text-[20px] font-semibold text-[#596783]">{value}</p>
        {detail && <p className="mt-1 truncate text-[14px] font-semibold text-[#596783]">{detail}</p>}
      </div>
    </div>
  );
}

export function SummaryPage() {
  const navigate = useNavigate();
  const projectId = localStorage.getItem(ACTIVE_PROJECT_KEY);
  const { activeOrganization } = useOrganizations();
  const { projects } = useProjects(activeOrganization?.id);
  const activeProject = projects.find((project) => project.id === projectId) ?? projects[0] ?? null;
  const { integrations } = useIntegrations(activeProject?.id, activeOrganization?.id);
  const policyMode = localStorage.getItem(POLICY_MODE_KEY) ?? "balanced";
  const enabledRules = parseList(INITIAL_RULES_KEY);
  const customRules = parseCustomRules().filter((rule) => rule.enabled !== false);
  const visibleRules = [
    ...enabledRules.map((ruleId) => recommendedRuleLabels[ruleId]).filter(Boolean),
    ...customRules.map((rule) => String((rule as { name?: string }).name ?? "")),
  ].filter(Boolean);

  function handleCreateProject() {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, new Date().toISOString());
    navigate(appRoutes.onboardingCompleted);
  }

  return (
    <OnboardingFrame activeStep={5} backTo={appRoutes.onboardingRules}>
      <section className="w-full max-w-[1180px] rounded-lg border border-[#dce2ea] bg-white px-5 py-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)] sm:px-8 lg:px-12 lg:py-12">
        <header>
          <h1 className="text-[32px] font-extrabold leading-tight text-[#050505] sm:text-[40px]">Revisa el resumen de tu proyecto</h1>
          <p className="mt-3 text-[18px] font-semibold leading-7 text-[#596783]">Confirma los detalles antes de crear tu proyecto.</p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <SummaryItem icon={<Building2 className="h-8 w-8" />} label="Organización" value={activeOrganization?.name ?? "Organización"} />
            <SummaryItem icon={<Folder className="h-8 w-8" />} label="Proyecto" value={activeProject?.name ?? "Proyecto"} />
            <SummaryItem icon={<Shapes className="h-8 w-8" />} label="Tipo de proyecto" value={activeProject?.projectType ?? "Personalizado"} />
            <SummaryItem icon={<Shield className="h-8 w-8" />} label="Modo de comportamiento" value={policyLabels[policyMode] ?? "Balanceado"} />
            <SummaryItem
              icon={<LinkIcon className="h-8 w-8" />}
              label="APIs conectadas"
              value={`${integrations.length} API${integrations.length === 1 ? "" : "s"}`}
              detail={integrations.slice(0, 3).map((integration) => integration.name).join(", ") || "Sin integraciones confirmadas"}
            />
          </div>

          <div className="border-t border-[#dce2ea] pt-6 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <h2 className="text-[18px] font-extrabold text-[#111827]">Reglas iniciales</h2>
            {visibleRules.length === 0 ? (
              <p className="mt-6 text-[16px] font-semibold text-[#596783]">No hay reglas iniciales activas.</p>
            ) : (
              <ul className="mt-6 space-y-5">
                {visibleRules.map((rule) => (
                  <li key={rule} className="flex gap-4 text-[17px] font-semibold leading-7 text-[#596783]">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#00951d]" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="mt-10 flex flex-col-reverse gap-3 border-t border-[#dce2ea] pt-6 sm:flex-row sm:justify-end sm:gap-5">
          <Link to={appRoutes.onboardingRules} className="inline-flex h-14 min-w-[150px] items-center justify-center rounded-lg border border-[#dce2ea] bg-white px-7 text-[18px] font-extrabold text-[#111827] hover:bg-[#f8fafc]">
            Volver
          </Link>
          <button
            type="button"
            onClick={handleCreateProject}
            className="inline-flex h-14 min-w-[240px] items-center justify-center gap-5 rounded-lg bg-[#00951d] px-8 text-[18px] font-extrabold text-white shadow-[0_10px_22px_rgba(0,149,29,0.22)] hover:bg-[#007f18]"
          >
            Crear proyecto
            <ArrowRight className="h-7 w-7" />
          </button>
        </footer>
      </section>
    </OnboardingFrame>
  );
}
