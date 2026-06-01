import { AlertTriangle, ArrowRight, Bot, Box, Clock3, DollarSign, Edit3, Eye, LockKeyhole, MoreVertical, Plus, Save, Shield, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";
import { RuleInput, useRules } from "../../hooks/useRules";
import type { Project } from "../../types/project";
import type { Rule } from "../../types/rule";

const ACTIVE_PROJECT_KEY = "oberyn.activeProjectId";
const ACTIVE_PROJECT_EVENT = "oberyn:active-project-change";

const categoryOptions = [
  { value: "data_security", label: "Seguridad de datos", Icon: Shield },
  { value: "approval", label: "Aprobaciones", Icon: DollarSign },
  { value: "access", label: "Accesos y permisos", Icon: LockKeyhole },
  { value: "audit", label: "Auditoría", Icon: Box },
];

const conditionOptions = [
  { value: "sensitive_data", label: "Datos sensibles o PII" },
  { value: "payment_amount", label: "Pagos mayores al umbral" },
  { value: "read_only", label: "Solo lectura" },
  { value: "export_data", label: "Exportacion de datos" },
  { value: "all_actions", label: "Todas las acciones críticas" },
];

const actionOptions = [
  { value: "block", label: "Bloquear acción" },
  { value: "require_approval", label: "Requerir aprobación" },
  { value: "allow_read_only", label: "Permitir solo lectura" },
  { value: "audit", label: "Registrar auditoría" },
];

const scopeOptions = [
  { value: "Mensajeria, Archivos, Base de datos", label: "Mensajeria, Archivos, Base de datos" },
  { value: "Pagos, Finanzas", label: "Pagos, Finanzas" },
  { value: "Inventario", label: "Inventario" },
  { value: "Contactos, CRM", label: "Contactos, CRM" },
  { value: "Todas las areas", label: "Todas las areas" },
];

const severityOptions = [
  { value: "critical", label: "Crítica" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
];

const initialForm = {
  category: "data_security",
  conditionType: "",
  actionResult: "",
  scope: "",
  severity: "medium",
  description: "",
};

type RuleForm = typeof initialForm;

function labelFor(options: Array<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getRuleIcon(rule: Rule) {
  if (rule.category === "approval") return DollarSign;
  if (rule.category === "access") return LockKeyhole;
  if (rule.category === "audit") return Box;
  if (rule.actionResult === "allow_read_only") return Eye;
  return Shield;
}

function severityLabel(severity: string) {
  return labelFor(severityOptions, severity);
}

function severityClass(severity: string) {
  if (severity === "critical") return "bg-red-50 text-red-700";
  if (severity === "high") return "bg-orange-50 text-orange-700";
  if (severity === "medium") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function buildRuleName(form: RuleForm) {
  const action = labelFor(actionOptions, form.actionResult || "audit");
  const condition = labelFor(conditionOptions, form.conditionType || "all_actions").toLowerCase();
  return `${action} para ${condition}`;
}

function ProjectSelect({ projects, projectId, onChange }: { projects: Project[]; projectId: string; onChange: (projectId: string) => void }) {
  return (
    <div className="relative w-full max-w-[360px]">
      <span className="pointer-events-none absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
        <Bot className="h-6 w-6" />
      </span>
      <select
        value={projectId}
        onChange={(event) => onChange(event.target.value)}
        className="h-[62px] w-full appearance-none rounded-lg border border-slate-200 bg-white py-0 pl-16 pr-12 text-base font-bold text-slate-950 shadow-sm outline-none focus:border-[#008f1f] focus:ring-2 focus:ring-emerald-100"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-slate-900">⌄</span>
    </div>
  );
}

function SummaryCard({ rules }: { rules: Rule[] }) {
  const active = rules.filter((rule) => rule.isActive).length;
  const blocked = rules.filter((rule) => rule.actionResult === "block").length;
  const critical = rules.filter((rule) => rule.severity === "critical" || rule.severity === "high").length;
  const latest = rules[0];

  const items = [
    { label: "Reglas activas", value: active, detail: "+1 vs. ayer", Icon: Shield, tone: "green" },
    { label: "Acciones bloqueadas hoy", value: blocked, detail: "-12% vs. ayer", Icon: LockKeyhole, tone: "red" },
    { label: "Reglas críticas", value: critical, detail: "Sin cambios", Icon: AlertTriangle, tone: "orange" },
    { label: "?ltimo cambio", value: latest ? formatDate(latest.updatedAt) : "Sin cambios", detail: "Sistema Oberyn", Icon: Clock3, tone: "green" },
  ];

  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold text-slate-950">Resumen del proyecto</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map(({ label, value, detail, Icon, tone }) => (
          <div key={label} className="rounded-lg border border-slate-200 p-4">
            <div className="flex gap-3">
              <span className={tone === "red" ? "flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600" : tone === "orange" ? "flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 text-orange-600" : "flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]"}>
                <Icon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xl font-bold text-slate-950">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-xs font-semibold text-[#008f1f]">{detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="mx-auto mt-5 flex items-center gap-2 text-sm font-bold text-[#008f1f]" type="button">
        Ver reportes de reglas
        <ArrowRight className="h-4 w-4" />
      </button>
    </Card>
  );
}

export function ProjectRulesPage() {
  const { projectId: routeProjectId = "" } = useParams();
  const navigate = useNavigate();
  const { activeOrganization } = useOrganizations();
  const { projects } = useProjects(activeOrganization?.id);
  const [selectedProjectId, setSelectedProjectId] = useState(routeProjectId || localStorage.getItem(ACTIVE_PROJECT_KEY) || "");
  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? projects.find((project) => project.id === routeProjectId) ?? projects[0] ?? null, [projects, routeProjectId, selectedProjectId]);
  const { rules, isLoading, error, createRule, updateRule, deleteRule } = useRules(selectedProject?.id, activeOrganization?.id);
  const [form, setForm] = useState<RuleForm>(initialForm);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!routeProjectId || routeProjectId === selectedProjectId) return;
    setSelectedProjectId(routeProjectId);
    localStorage.setItem(ACTIVE_PROJECT_KEY, routeProjectId);
    window.dispatchEvent(new CustomEvent(ACTIVE_PROJECT_EVENT, { detail: { projectId: routeProjectId } }));
  }, [routeProjectId, selectedProjectId]);

  function handleProjectChange(nextProjectId: string) {
    setSelectedProjectId(nextProjectId);
    localStorage.setItem(ACTIVE_PROJECT_KEY, nextProjectId);
    window.dispatchEvent(new CustomEvent(ACTIVE_PROJECT_EVENT, { detail: { projectId: nextProjectId } }));
    navigate(`/projects/${nextProjectId}/rules`);
  }

  function updateForm<K extends keyof RuleForm>(key: K, value: RuleForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingRuleId(null);
  }

  function editRule(rule: Rule) {
    setEditingRuleId(rule.id);
    setForm({
      category: rule.category,
      conditionType: rule.conditionType,
      actionResult: rule.actionResult,
      scope: rule.scope,
      severity: rule.severity,
      description: rule.description ?? "",
    });
  }

  async function submitRule(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const input: RuleInput = {
      name: buildRuleName(form),
      description: form.description,
      category: form.category,
      severity: form.severity,
      conditionType: form.conditionType || "all_actions",
      actionResult: form.actionResult || "audit",
      scope: form.scope || "Todas las areas",
      isActive: true,
    };

    try {
      if (editingRuleId) await updateRule(editingRuleId, input);
      else await createRule(input);
      setMessage(editingRuleId ? "Regla actualizada." : "Regla creada.");
      resetForm();
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : "No se pudo guardar la regla.");
    }
  }

  async function toggleRule(rule: Rule) {
    await updateRule(rule.id, { isActive: !rule.isActive });
  }

  async function removeRule(rule: Rule) {
    await deleteRule(rule.id);
    if (editingRuleId === rule.id) resetForm();
  }

  return (
    <div className="min-h-[calc(100dvh-40px)] text-slate-950">
      <section className="flex min-h-[calc(100dvh-40px)] flex-col rounded-lg border border-slate-200 bg-white/70 p-7 shadow-soft 2xl:p-8">
        <header className="pb-1">
          <h1 className="text-[34px] font-bold leading-tight tracking-normal text-slate-950">Reglas del proyecto</h1>
          <p className="mt-3 max-w-4xl text-[15px] leading-6 text-slate-600">Cada proyecto tiene políticas y reglas independientes que controlan el comportamiento de la aplicación.</p>
          {selectedProject ? <div className="mt-9"><ProjectSelect projects={projects} projectId={selectedProject.id} onChange={handleProjectChange} /></div> : null}
        </header>

        <div className="mt-6 grid flex-1 gap-7 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
          <Card className="flex min-h-[520px] flex-col overflow-hidden rounded-lg p-0">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Reglas configuradas</h2>
                <p className="mt-2 text-sm text-slate-600">Administra las reglas que protegen y controlan las operaciones de este proyecto.</p>
              </div>
              <Button onClick={resetForm} variant="secondary" className="h-10 border-[#258c2f] px-5 text-[#008f1f]">
                <Plus className="mr-2 h-4 w-4" />
                Nueva regla
              </Button>
            </div>

            <div className="grid grid-cols-[minmax(330px,1.65fr)_135px_180px_120px_190px_120px] gap-4 border-b border-slate-100 px-6 py-5 text-xs font-bold text-slate-600 max-xl:hidden">
              <span>Categoria</span>
              <span>Severidad</span>
              <span>Alcance</span>
              <span>Estado</span>
              <span>Ultima actualizacion</span>
              <span className="text-right">Acciones</span>
            </div>

            <div className="flex-1 divide-y divide-slate-100">
              {isLoading ? <p className="px-6 py-10 text-sm text-slate-500">Cargando reglas...</p> : null}
              {!isLoading && !rules.length ? <p className="px-6 py-10 text-sm text-slate-500">Este proyecto aun no tiene reglas configuradas.</p> : null}
              {rules.map((rule) => {
                const Icon = getRuleIcon(rule);
                return (
                  <div key={rule.id} className="grid min-h-[116px] gap-4 px-6 py-6 xl:grid-cols-[minmax(330px,1.65fr)_135px_180px_120px_190px_120px] xl:items-center">
                    <div className="flex gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
                        <Icon className="h-7 w-7" />
                      </span>
                      <div>
                        <h3 className="text-[15px] font-bold text-slate-950">{rule.name}</h3>
                        <p className="mt-1 max-w-md text-sm leading-6 text-slate-600">{rule.description || labelFor(conditionOptions, rule.conditionType)}</p>
                      </div>
                    </div>
                    <span className={`w-fit rounded-md px-3 py-1 text-sm font-bold ${severityClass(rule.severity)}`}>{severityLabel(rule.severity)}</span>
                    <p className="text-sm leading-7 text-slate-600">{rule.scope}</p>
                    <button type="button" onClick={() => void toggleRule(rule)} className={rule.isActive ? "flex w-fit items-center gap-2 text-sm font-semibold text-slate-700" : "flex w-fit items-center gap-2 text-sm font-semibold text-slate-500"}>
                      <span className={rule.isActive ? "flex h-6 w-11 items-center justify-end rounded-full bg-[#258c2f] px-1" : "flex h-6 w-11 items-center justify-start rounded-full bg-slate-300 px-1"}>
                        <span className="h-4 w-4 rounded-full bg-white" />
                      </span>
                      {rule.isActive ? "Activa" : "Inactiva"}
                    </button>
                    <div className="text-sm leading-6 text-slate-600">
                      <p>{formatDate(rule.updatedAt)}</p>
                      <p>Sistema Oberyn</p>
                    </div>
                    <div className="flex justify-start gap-2 xl:justify-end">
                      <button type="button" onClick={() => editRule(rule)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50" aria-label="Editar regla">
                        <Edit3 className="h-5 w-5" />
                      </button>
                      <button type="button" onClick={() => void removeRule(rule)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-red-50 hover:text-red-600" aria-label="Eliminar regla">
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <button type="button" className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50" aria-label="Más acciones">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-slate-100 px-6 py-7 text-center">
              <button type="button" className="inline-flex items-center gap-2 text-sm font-bold text-[#008f1f]">
                Ver historial de cambios
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </Card>

          <aside className="space-y-5">
            <Card className="rounded-lg p-6">
              <h2 className="text-xl font-bold text-slate-950">{editingRuleId ? "Editar regla" : "Nueva regla"}</h2>
              <p className="mt-1 text-sm text-slate-600">Define una regla para el proyecto seleccionado.</p>
              <form className="mt-5 space-y-4" onSubmit={(event) => void submitRule(event)}>
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">Tipo de regla</span>
                  <select value={form.category} onChange={(event) => updateForm("category", event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#008f1f]">
                    {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">Condicion</span>
                  <select value={form.conditionType} onChange={(event) => updateForm("conditionType", event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#008f1f]">
                    <option value="">Selecciona la condición</option>
                    {conditionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">Acción resultante</span>
                  <select value={form.actionResult} onChange={(event) => updateForm("actionResult", event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#008f1f]">
                    <option value="">Selecciona una acción</option>
                    {actionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">Alcance</span>
                  <select value={form.scope} onChange={(event) => updateForm("scope", event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#008f1f]">
                    <option value="">Selecciona el alcance</option>
                    {scopeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">Severidad</span>
                  <select value={form.severity} onChange={(event) => updateForm("severity", event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#008f1f]">
                    {severityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">Justificacion</span>
                  <textarea value={form.description} maxLength={250} onChange={(event) => updateForm("description", event.target.value)} placeholder="Explica el prop?sito de esta regla." className="mt-2 min-h-24 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#008f1f]" />
                  <span className="mt-1 block text-right text-xs text-slate-500">{form.description.length} / 250</span>
                </label>
                {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{message}</p> : null}
                {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="secondary" className="flex-1" onClick={resetForm}>Cancelar</Button>
                  <Button type="submit" className="flex-1">
                    <Save className="mr-2 h-4 w-4" />
                    Guardar regla
                  </Button>
                </div>
              </form>
            </Card>

            <SummaryCard rules={rules} />
          </aside>
        </div>
      </section>
    </div>
  );
}
