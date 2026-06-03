import {
  ArrowRight,
  Check,
  ChevronRight,
  Code2,
  Cog,
  Globe2,
  LockKeyhole,
  Network,
  PlugZap,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthFormMessage } from "../../components/auth/AuthFormMessage";
import { OnboardingFrame } from "../../components/onboarding/OnboardingFrame";
import { useIntegrations, type CreateIntegrationInput, type DetectionFileInput, type IntegrationFinding } from "../../hooks/useIntegrations";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";
import { cn } from "../../lib/utils/cn";
import { appRoutes } from "../../routes/routes";
import type { ConnectionMethod } from "../../types/integration";

const ACTIVE_PROJECT_KEY = "oberyn.onboardingProjectId";

type Method = "sdk" | "gateway" | "detected" | "manual";

const serviceTypeOptions = [
  { value: "llm", label: "Modelo LLM" },
  { value: "database", label: "Base de datos" },
  { value: "payments", label: "Pagos" },
  { value: "crm", label: "CRM" },
  { value: "custom_api", label: "API custom" },
];

const providerOptions = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "supabase", label: "Supabase" },
  { value: "stripe", label: "Stripe" },
  { value: "custom", label: "Custom" },
];

function MethodCard({
  method,
  selectedMethod,
  title,
  badge,
  description,
  bullets,
  buttonLabel,
  Icon,
  onSelect,
}: {
  method: Method;
  selectedMethod: Method;
  title: string;
  badge: string;
  description: string;
  bullets: string[];
  buttonLabel: string;
  Icon: typeof Code2;
  onSelect: (method: Method) => void;
}) {
  const isSelected = selectedMethod === method;
  const isDisabled = method === "gateway";

  return (
    <section
      className={cn(
        "flex min-h-[236px] flex-col rounded-lg border bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition sm:p-6",
        isSelected ? "border-[#00951d] ring-4 ring-[#00951d]/10" : "border-[#dce2ea] hover:border-[#cbd5e1]",
      )}
    >
      <div className="flex items-start gap-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eaf7ee] text-[#00951d]">
          <Icon className="h-7 w-7" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[20px] font-extrabold leading-7 text-[#08090c]">{title}</h2>
            <span className={cn("rounded-full px-3 py-1 text-[12px] font-extrabold", isDisabled ? "bg-amber-100 text-amber-800" : "bg-[#eaf7ee] text-[#128329]")}>{isDisabled ? "En desarrollo" : badge}</span>
          </div>
          <p className="mt-2 text-[15px] font-semibold leading-6 text-[#52617b]">{description}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-center gap-3 text-[14px] font-bold text-[#52617b]">
            <Check className="h-4 w-4 shrink-0 text-[#00951d]" strokeWidth={2.5} />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          if (!isDisabled) onSelect(method);
        }}
        disabled={isDisabled}
        className={cn(
          "mt-auto inline-flex h-11 w-full items-center justify-between rounded-lg border px-5 text-[14px] font-extrabold transition",
          isDisabled
            ? "cursor-not-allowed border-amber-200 bg-amber-50 text-amber-800"
            : isSelected
              ? "border-[#00951d] bg-[#f0fbf3] text-[#006e17]"
              : "border-[#dce2ea] bg-white text-[#1d2738] hover:bg-[#f8fafc]",
        )}
      >
        <span className="inline-flex items-center gap-3">
          {method === "sdk" ? <Code2 className="h-5 w-5" /> : <Globe2 className="h-5 w-5" />}
          {isDisabled ? "Disponible proximamente" : buttonLabel}
        </span>
        <ChevronRight className="h-5 w-5" />
      </button>
    </section>
  );
}

function ManualIntegrationModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateIntegrationInput) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      setError("Agrega un nombre para la integración.");
      return;
    }

    await onSubmit({
      name,
      provider: String(formData.get("provider") ?? "custom"),
      serviceType: String(formData.get("serviceType") ?? "custom_api"),
      connectionMethod: "manual",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-[560px] rounded-lg border border-[#dce2ea] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[24px] font-extrabold text-[#08090c]">Configurar integración</h2>
            <p className="mt-1 text-[15px] font-semibold text-[#52617b]">Agrega un servicio para protegerlo con Oberyn.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#dce2ea] text-[#1d2738] hover:bg-[#f8fafc]" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-5">
            <AuthFormMessage id="manual-integration-error" tone="error">
              {error}
            </AuthFormMessage>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-[15px] font-extrabold text-[#111827]">Nombre</span>
            <input name="name" placeholder="Ej. OpenAI producción" className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[15px] font-extrabold text-[#111827]">Proveedor</span>
              <select name="provider" className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" defaultValue="custom">
                {providerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[15px] font-extrabold text-[#111827]">Tipo</span>
              <select name="serviceType" className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" defaultValue="custom_api">
                {serviceTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <footer className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="inline-flex h-12 min-w-[120px] items-center justify-center rounded-lg border border-[#dce2ea] px-6 text-[16px] font-extrabold text-[#111827] hover:bg-[#f8fafc]">
            Cancelar
          </button>
          <button disabled={isSubmitting} type="submit" className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-lg bg-[#00951d] px-6 text-[16px] font-extrabold text-white shadow-[0_8px_16px_rgba(0,149,29,0.18)] hover:bg-[#007f18] disabled:opacity-60">
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function DetectionAssistantModal({
  open,
  onClose,
  onAnalyze,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onAnalyze: (files: DetectionFileInput[], repositoryUrl: string) => Promise<IntegrationFinding[]>;
  onConfirm: (selectedFindingIds: string[], files: DetectionFileInput[], repositoryUrl: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [files, setFiles] = useState<DetectionFileInput[]>([]);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [findings, setFindings] = useState<IntegrationFinding[]>([]);
  const [selectedFindingIds, setSelectedFindingIds] = useState<string[]>([]);
  const [sourceSummary, setSourceSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function readFiles(fileList: FileList | null) {
    if (!fileList) return;
    setError(null);

    const readableFiles = [...fileList].filter((file) => file.size <= 250_000).slice(0, 40);
    const nextFiles = await Promise.all(
      readableFiles.map(
        (file) =>
          new Promise<DetectionFileInput>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name, content: String(reader.result ?? "") });
            reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
            reader.readAsText(file);
          }),
      ),
    );

    setFiles(nextFiles);
    setFindings([]);
    setSelectedFindingIds([]);
    setSourceSummary(null);
  }

  async function handleAnalyze() {
    setError(null);
    try {
      const detectedFindings = await onAnalyze(files, repositoryUrl);
      setFindings(detectedFindings);
      setSelectedFindingIds(detectedFindings.map((finding) => finding.id));
      const sources = [];
      if (files.length > 0) sources.push(`${files.length} archivo${files.length === 1 ? "" : "s"}`);
      if (repositoryUrl.trim()) sources.push("repositorio GitHub");
      setSourceSummary(sources.length > 0 ? `Análisis ejecutado sobre ${sources.join(" y ")}.` : "No se analizaron fuentes reales.");
      if (detectedFindings.length === 0) {
        setError("No encontramos integraciones claras. Puedes agregar una manualmente o subir archivos como package.json y .env.example.");
      }
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : "No se pudo analizar la configuración.");
    }
  }

  async function handleConfirm() {
    setError(null);
    if (selectedFindingIds.length === 0) {
      setError("Selecciona al menos una integración para proteger.");
      return;
    }

    try {
      await onConfirm(selectedFindingIds, files, repositoryUrl);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "No se pudieron crear las integraciones.");
    }
  }

  function toggleFinding(findingId: string) {
    setSelectedFindingIds((current) => (current.includes(findingId) ? current.filter((id) => id !== findingId) : [...current, findingId]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/35 p-4">
      <section className="my-8 w-full max-w-[920px] rounded-lg border border-[#dce2ea] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[26px] font-extrabold leading-tight text-[#08090c]">Detección asistida</h2>
            <p className="mt-2 max-w-[680px] text-[15px] font-semibold leading-6 text-[#52617b]">
              Sube varios archivos, una carpeta del proyecto o conecta un repositorio público de GitHub. Oberyn detecta proveedores, evidencia y riesgos sin pedir ni guardar claves reales.
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#dce2ea] text-[#1d2738] hover:bg-[#f8fafc]" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-5">
            <AuthFormMessage id="detection-assistant-error" tone="error">
              {error}
            </AuthFormMessage>
          </div>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-lg border border-dashed border-[#b9c5d6] bg-[#fbfcfd] p-5">
            <UploadCloud className="h-9 w-9 text-[#6657f2]" strokeWidth={2.2} />
            <h3 className="mt-4 text-[17px] font-extrabold text-[#111827]">Fuentes de análisis</h3>
            <p className="mt-2 text-[13px] font-semibold leading-5 text-[#596783]">Usa `package.json`, `.env.example`, configs, snippets o un repo público de GitHub.</p>

            <label className="mt-5 block">
              <span className="mb-2 block text-[13px] font-extrabold text-[#111827]">Repositorio GitHub</span>
              <input
                value={repositoryUrl}
                onChange={(event) => {
                  setRepositoryUrl(event.target.value);
                  setFindings([]);
                  setSelectedFindingIds([]);
                  setSourceSummary(null);
                }}
                placeholder="https://github.com/owner/repo"
                className="h-11 w-full rounded-lg border border-[#dce2ea] px-3 text-[14px] font-semibold outline-none focus:border-[#6657f2] focus:ring-4 focus:ring-[#6657f2]/10"
              />
            </label>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-lg bg-[#6657f2] px-4 text-[13px] font-extrabold text-white hover:bg-[#5445d5]">
                Subir archivos
                <input type="file" multiple className="sr-only" onChange={(event) => void readFiles(event.target.files)} />
              </label>
              <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-lg border border-[#dce2ea] bg-white px-4 text-[13px] font-extrabold text-[#1d2738] hover:bg-[#f8fafc]">
                Subir carpeta
                <input
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={(event) => void readFiles(event.target.files)}
                  {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
                />
              </label>
            </div>
            <p className="mt-3 text-[12px] font-bold text-[#69758a]">Máximo 40 archivos locales. Repos GitHub públicos: se escanean archivos relevantes, no binarios.</p>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isLoading}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#dce2ea] bg-white px-5 text-[14px] font-extrabold text-[#1d2738] hover:bg-[#f8fafc] disabled:opacity-60"
            >
              <Search className="h-4 w-4" />
              {isLoading ? "Analizando..." : files.length > 0 || repositoryUrl.trim() ? "Analizar fuentes" : "Analizar fuentes"}
            </button>

            {sourceSummary && <p className="mt-3 rounded-md bg-[#efedff] px-3 py-2 text-[12px] font-bold leading-5 text-[#5b4cf0]">{sourceSummary}</p>}

            {files.length > 0 && (
              <div className="mt-5 max-h-[220px] space-y-2 overflow-y-auto pr-1">
                {files.map((file) => (
                  <div key={file.name} className="rounded-md border border-[#dce2ea] bg-white px-3 py-2">
                    <p className="truncate text-[13px] font-extrabold text-[#111827]">{file.name}</p>
                    <p className="text-[12px] font-bold text-[#69758a]">{file.content.length.toLocaleString()} caracteres</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-[360px] rounded-lg border border-[#dce2ea] bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-[18px] font-extrabold text-[#111827]">Hallazgos</h3>
              {findings.length > 0 && <span className="rounded-full bg-[#eaf7ee] px-3 py-1 text-[12px] font-extrabold text-[#008f1f]">{selectedFindingIds.length} seleccionados</span>}
            </div>

            {findings.length === 0 ? (
              <div className="mt-16 text-center">
                <Search className="mx-auto h-10 w-10 text-[#8a97aa]" />
                <p className="mt-4 text-[15px] font-extrabold text-[#111827]">Aún no hay hallazgos</p>
                <p className="mx-auto mt-2 max-w-[360px] text-[13px] font-semibold leading-5 text-[#596783]">Sube archivos o agrega fuentes reales para ver proveedores, evidencia y método sugerido.</p>
              </div>
            ) : (
              <div className="mt-4 max-h-[460px] space-y-3 overflow-y-auto pr-1">
                {findings.map((finding) => {
                  const selected = selectedFindingIds.includes(finding.id);
                  return (
                    <button
                      key={finding.id}
                      type="button"
                      onClick={() => toggleFinding(finding.id)}
                      className={cn(
                        "w-full rounded-lg border p-4 text-left transition",
                        selected ? "border-[#00951d] bg-[#f0fbf3] ring-2 ring-[#00951d]/10" : "border-[#dce2ea] bg-white hover:bg-[#f8fafc]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[17px] font-extrabold text-[#111827]">{finding.name}</p>
                          <p className="mt-1 text-[12px] font-extrabold uppercase text-[#52617b]">
                            {finding.provider} / {finding.serviceType} / {finding.suggestedMethod}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[12px] font-extrabold text-[#6657f2]">{Math.round(finding.confidence * 100)}%</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {finding.riskSignals.map((signal) => (
                          <span key={signal} className="rounded-md bg-[#edf1f7] px-2.5 py-1 text-[11px] font-bold text-[#52617b]">
                            {signal}
                          </span>
                        ))}
                      </div>
                      <ul className="mt-3 space-y-1">
                        {finding.evidence.slice(0, 3).map((item) => (
                          <li key={item} className="text-[12px] font-semibold leading-5 text-[#596783]">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <footer className="mt-6 flex flex-col-reverse gap-3 border-t border-[#dce2ea] pt-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="inline-flex h-12 min-w-[120px] items-center justify-center rounded-lg border border-[#dce2ea] bg-white px-6 text-[16px] font-extrabold text-[#111827] hover:bg-[#f8fafc]">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || findings.length === 0}
            className="inline-flex h-12 min-w-[210px] items-center justify-center rounded-lg bg-[#00951d] px-6 text-[16px] font-extrabold text-white shadow-[0_8px_16px_rgba(0,149,29,0.18)] hover:bg-[#007f18] disabled:opacity-60"
          >
            {isLoading ? "Creando..." : "Crear integraciones"}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function ConnectionPage() {
  const navigate = useNavigate();
  const { activeOrganization } = useOrganizations();
  const { projects, isLoading: isLoadingProjects } = useProjects(activeOrganization?.id);
  const [selectedMethod, setSelectedMethod] = useState<Method>("detected");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => localStorage.getItem(ACTIVE_PROJECT_KEY));
  const [isManualOpen, setManualOpen] = useState(false);
  const [isDetectionOpen, setDetectionOpen] = useState(false);
  const [isSubmittingManual, setSubmittingManual] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    integrations,
    isLoading,
    error: integrationsError,
    createIntegration,
    analyzeIntegrations,
    confirmDetectedIntegrations,
  } = useIntegrations(activeProjectId, activeOrganization?.id);

  const activeProject = useMemo(() => projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null, [activeProjectId, projects]);

  useEffect(() => {
    if (!activeProjectId && projects[0]?.id) {
      setActiveProjectId(projects[0].id);
      localStorage.setItem(ACTIVE_PROJECT_KEY, projects[0].id);
    }
  }, [activeProjectId, projects]);

  const sdkSnippet = `npm install oberyn\n\nimport { createOberyn } from "oberyn";\n\nconst oberyn = createOberyn({\n  apiKey: "ob_pk_...",\n  endpoint: "https://api.oberyn.dev/api/sdk/events",\n  service: { name: "${activeProject?.name ?? "mi-proyecto"}", provider: "custom", type: "agent" }\n});`;
  function selectMethod(method: Method) {
    setSelectedMethod(method);
    setMessage(null);
    setError(null);
  }

  async function handleAnalyze(files: DetectionFileInput[], repositoryUrl: string) {
    setSelectedMethod("detected");
    setMessage(null);
    setError(null);
    const result = await analyzeIntegrations(files, repositoryUrl);
    return result.findings;
  }

  async function handleConfirmDetected(selectedFindingIds: string[], files: DetectionFileInput[], repositoryUrl: string) {
    const result = await confirmDetectedIntegrations(selectedFindingIds, files, repositoryUrl);
    setSelectedMethod("detected");
    setMessage(`${result.integrations.length} integraciones creadas y listas para revisar.`);
    setDetectionOpen(false);
  }

  async function handleManualSubmit(input: CreateIntegrationInput) {
    setSubmittingManual(true);
    setError(null);
    try {
      await createIntegration(input);
      setSelectedMethod("manual");
      setMessage("Integración manual agregada.");
      setManualOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo guardar la integración.");
    } finally {
      setSubmittingManual(false);
    }
  }

  function handleContinue() {
    localStorage.setItem("oberyn.onboardingConnectionMethod", selectedMethod);
    navigate(appRoutes.onboardingRules);
  }

  return (
    <OnboardingFrame activeStep={3} backTo={appRoutes.onboardingProject}>
      <div className="w-full max-w-[1280px]">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0">
            <header className="max-w-[860px]">
              <h1 className="text-[30px] font-extrabold leading-tight text-[#050505] sm:text-[36px]">Conecta tu proyecto con Oberyn</h1>
              <p className="mt-3 max-w-[760px] text-[15px] font-semibold leading-6 text-[#596783]">
                Oberyn puede proteger tus agentes, APIs y servicios sin que tengas que ingresar tus claves. Elige como quieres integrar tu proyecto.
              </p>
              {activeProject && (
                <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-[#bfe9c8] bg-[#f0fbf3] px-3 py-1.5 text-[13px] font-extrabold text-[#008f1f]">
                  <span className="h-2 w-2 rounded-full bg-[#00951d]" />
                  <span className="truncate">Proyecto activo: {activeProject.name}</span>
                </div>
              )}
            </header>

            {(error || integrationsError) && (
              <div className="mt-5">
                <AuthFormMessage id="connection-error" tone="error">
                  {error ?? integrationsError}
                </AuthFormMessage>
              </div>
            )}
            {message && (
              <div className="mt-5">
                <AuthFormMessage id="connection-message" tone="info">
                  {message}
                </AuthFormMessage>
              </div>
            )}

            <section className="mt-8">
              <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-[#00951d]">Métodos recomendados</h2>
              <div className="mt-3 grid gap-5 xl:grid-cols-2">
                <MethodCard
                  method="sdk"
                  selectedMethod={selectedMethod}
                  title="SDK"
                  badge="Máximo control"
                  description="Instala el SDK de Oberyn en tu código para proteger acciones críticas desde tu aplicación."
                  bullets={["No requiere compartir tus API keys", "Control granular por acción y agente", "Auditoría completa en tiempo real"]}
                  buttonLabel="Ver instrucciones del SDK"
                  Icon={Network}
                  onSelect={selectMethod}
                />
                <MethodCard
                  method="gateway"
                  selectedMethod={selectedMethod}
                  title="Gateway"
                  badge="En desarrollo"
                  description="El Gateway sera una implementacion disponible en futuras versiones de Oberyn."
                  bullets={["Proxy seguro para modelos y APIs", "Inspeccion de trafico antes del proveedor", "Auditoria centralizada de requests"]}
                  buttonLabel="Disponible proximamente"
                  Icon={Globe2}
                  onSelect={selectMethod}
                />
              </div>
            </section>

            <section className="mt-6">
              <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-[#6957ff]">Detección automática asistida</h2>
              <div
                className={cn(
                  "mt-3 rounded-lg border bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition sm:p-6",
                  selectedMethod === "detected" ? "border-[#8274ff] ring-4 ring-[#8274ff]/10" : "border-[#dce2ea]",
                )}
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#efedff] text-[#6957ff]">
                      <Search className="h-7 w-7" strokeWidth={2.3} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[20px] font-extrabold leading-7 text-[#08090c]">Detectar integraciones automáticamente</h2>
                        <span className="rounded-full bg-[#efedff] px-3 py-1 text-[12px] font-extrabold text-[#6957ff]">Recomendado para empezar</span>
                      </div>
                      <p className="mt-2 max-w-[720px] text-[15px] font-semibold leading-6 text-[#596783]">
                        Analizamos tu configuración para detectar servicios, APIs y acciones importantes. Tú solo confirmas lo que quieres proteger.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {["APIs y SDKs", "Servicios en la nube", "Librerías y dependencias", "Variables de entorno"].map((item) => (
                          <span key={item} className="rounded-md bg-[#edf1f7] px-3 py-1 text-[12px] font-bold text-[#69758a]">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <button
                      type="button"
                      onClick={() => setDetectionOpen(true)}
                      disabled={isLoading || isLoadingProjects || !activeProject}
                      className="inline-flex h-12 min-w-[190px] items-center justify-center gap-3 rounded-lg bg-[#6657f2] px-6 text-[15px] font-extrabold text-white shadow-[0_12px_22px_rgba(102,87,242,0.22)] hover:bg-[#5445d5] disabled:opacity-60"
                    >
                      <Sparkles className="h-5 w-5" />
                      Iniciar detección
                    </button>
                    <span className="text-[14px] font-bold text-[#596783]">Tarda 1-2 minutos</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6">
              <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-[#52617b]">Configuración manual</h2>
              <div className={cn("mt-3 rounded-lg border bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition sm:p-6", selectedMethod === "manual" ? "border-[#00951d] ring-4 ring-[#00951d]/10" : "border-[#dce2ea]")}>
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-5">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#edf1f7] text-[#3c4a60]">
                      <Cog className="h-7 w-7" strokeWidth={2.2} />
                    </span>
                    <div>
                      <h2 className="text-[18px] font-extrabold text-[#08090c]">Configurar manualmente</h2>
                      <p className="mt-1 text-[15px] font-semibold text-[#596783]">Agrega tus integraciones, APIs y servicios uno por uno.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMethod("manual");
                      setManualOpen(true);
                    }}
                    className="inline-flex h-12 min-w-[230px] items-center justify-center gap-3 rounded-lg border border-[#dce2ea] bg-white px-6 text-[15px] font-extrabold text-[#1d2738] hover:bg-[#f8fafc]"
                  >
                    Configurar manualmente
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </section>

            {(selectedMethod === "sdk" || integrations.length > 0) && (
              <section className="mt-6 rounded-lg border border-[#dce2ea] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
                <h2 className="text-[18px] font-extrabold text-[#08090c]">Configuración seleccionada</h2>
                {selectedMethod === "sdk" && (
                  <pre className="mt-4 overflow-x-auto rounded-lg bg-[#0f172a] p-4 text-[13px] font-semibold leading-6 text-[#dbeafe]">{sdkSnippet}</pre>
                )}
                {integrations.length > 0 && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {integrations.map((integration) => (
                      <div key={integration.id} className="rounded-lg border border-[#dce2ea] bg-[#fbfcfd] p-4">
                        <p className="truncate text-[16px] font-extrabold text-[#111827]">{integration.name}</p>
                        <p className="mt-1 text-[13px] font-bold uppercase text-[#52617b]">
                          {integration.provider} / {integration.serviceType}
                        </p>
                        <p className="mt-3 text-[13px] font-extrabold text-[#00951d]">{integration.connectionMethod}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          <aside className="rounded-lg border border-[#dce2ea] bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.05)] lg:sticky lg:top-6 lg:self-start xl:p-6">
            <h2 className="text-[21px] font-extrabold text-[#08090c]">¿Cómo funciona?</h2>
            <div className="mt-6 space-y-5">
              {[
                { title: "Conectas tu proyecto", description: "Usa el SDK o deteccion automatica. No necesitamos tus claves API.", Icon: PlugZap },
                { title: "Detectamos y entendemos", description: "Identificamos agentes, servicios, APIs y acciones críticas.", Icon: Search },
                { title: "Aplicamos protecciónes", description: "Tú defines las reglas. Oberyn evalúa cada acción en tiempo real.", Icon: ShieldCheck },
                { title: "Auditoría y control", description: "Todo queda registrado y puedes aprobar, bloquear o alertar.", Icon: TrendingUp },
              ].map(({ title, description, Icon }) => (
                <div key={title} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eaf7ee] text-[#00951d]">
                    <Icon className="h-5 w-5" strokeWidth={2.3} />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-extrabold text-[#111827]">{title}</h3>
                    <p className="mt-1 text-[13px] font-semibold leading-5 text-[#596783]">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-lg border border-[#dce2ea] bg-[#fbfcfd] p-5">
              <LockKeyhole className="h-7 w-7 text-[#111827]" strokeWidth={2.3} />
              <h3 className="mt-3 text-[16px] font-extrabold text-[#111827]">Seguridad ante todo</h3>
              <p className="mt-2 text-[13px] font-semibold leading-5 text-[#596783]">
                Oberyn nunca almacena ni accede a tus claves API, variables de entorno o datos sensibles. La integración es segura y privada.
              </p>
            </div>
          </aside>
        </div>

        <footer className="mt-7 flex flex-col-reverse gap-3 border-t border-[#dce2ea] bg-[#fbfcfd]/95 pt-5 sm:flex-row sm:justify-end sm:gap-5">
          <Link to={appRoutes.onboardingProject} className="inline-flex h-12 min-w-[150px] items-center justify-center rounded-lg border border-[#dce2ea] bg-white px-7 text-[16px] font-extrabold text-[#111827] hover:bg-[#f8fafc]">
            Volver
          </Link>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!activeProject}
            className="inline-flex h-12 min-w-[180px] items-center justify-center gap-5 rounded-lg bg-[#00951d] px-8 text-[16px] font-extrabold text-white shadow-[0_8px_16px_rgba(0,149,29,0.18)] hover:bg-[#007f18] disabled:opacity-60"
          >
            Continuar
            <ArrowRight className="h-6 w-6" />
          </button>
        </footer>
      </div>

      <ManualIntegrationModal open={isManualOpen} onClose={() => setManualOpen(false)} onSubmit={handleManualSubmit} isSubmitting={isSubmittingManual} />
      <DetectionAssistantModal
        open={isDetectionOpen}
        onClose={() => setDetectionOpen(false)}
        onAnalyze={handleAnalyze}
        onConfirm={handleConfirmDetected}
        isLoading={isLoading}
      />
    </OnboardingFrame>
  );
}




