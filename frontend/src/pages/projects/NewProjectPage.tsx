import { useAuth } from "@clerk/react";
import { Box, CheckCircle2, FileText, Info, Link2, Lock, SearchCode, ShieldCheck, Sparkles, UserCheck, type LucideIcon } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { connectionModeLabels, environmentLabels, projectTypeLabels } from "../../components/projects/projectLabels";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";
import { apiClient } from "../../lib/api/client";
import { appRoutes } from "../../routes/routes";
import type { CreateProjectInput } from "../../types/project";

type DetectionFileInput = {
  name: string;
  content: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

type DetectionResult = {
  findings: Array<{ id: string; name: string; provider: string; serviceType: string; confidence: number }>;
  integrations: Array<{ id: string; name: string; provider: string }>;
};

const connectionOptions = [
  { value: "sdk", label: "SDK", description: "Integra usando nuestro SDK oficial.", Icon: Box },
  { value: "manual", label: "Manual", description: "Configura manualmente tus integraciones.", Icon: FileText },
];

const tagOptions = [
  { value: "support", label: "Chatbot", className: "border-sky-200 bg-sky-50 text-sky-700" },
  { value: "internal_automation", label: "Automatización", className: "border-violet-200 bg-violet-50 text-violet-700" },
  { value: "operations", label: "Agente", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "finance", label: "Análisis", className: "border-amber-200 bg-amber-50 text-amber-700" },
];

const protectionOptions: Array<{ label: string; description: string; Icon: LucideIcon }> = [
  { label: "Auditoría habilitada", description: "Todas las acciones serán registradas.", Icon: ShieldCheck },
  { label: "Aprobación humana desde riesgo", description: "Requiere aprobación humana en riesgos altos.", Icon: UserCheck },
  { label: "Anclar evidencia en Stellar", description: "Almacena evidencia de acciones en Stellar.", Icon: Link2 },
  { label: "Protección de datos sensibles", description: "Aplica enmáscaramiento automático de PII.", Icon: Lock },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function NewProjectPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { activeOrganization, isLoading: isLoadingOrganizations } = useOrganizations();
  const { createProject } = useProjects(activeOrganization?.id);
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState("support");
  const [environment, setEnvironment] = useState("");
  const [connectionMode, setConnectionMode] = useState("sdk");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [analysisFiles, setAnalysisFiles] = useState<DetectionFileInput[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);

  const generatedSlug = useMemo(() => slug || slugify(name), [name, slug]);

  async function readAnalysisFiles(fileList: FileList | null) {
    if (!fileList) return;
    const selectedFiles = Array.from(fileList).slice(0, 40);
    const files = await Promise.all(
      selectedFiles.map(async (file) => ({
        name: file.name,
        content: (await file.text()).slice(0, 160_000),
      })),
    );
    setAnalysisFiles(files.filter((file) => file.content.trim().length > 0));
  }

  async function runInitialAnalysis(projectId: string) {
    if (!activeOrganization?.id) return null;
    if (!repositoryUrl.trim() && analysisFiles.length === 0) return null;

    const token = await getToken();
    const response = await apiClient.post<ApiResponse<DetectionResult>>(
      `/projects/${projectId}/integrations/detect`,
      {
        repositoryUrl: repositoryUrl.trim(),
        files: analysisFiles,
        commit: true,
      },
      token,
      activeOrganization.id,
    );
    return response.data;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const project = await createProject({
        name,
        slug: generatedSlug,
        description: String(new FormData(event.currentTarget).get("description") ?? ""),
        projectType,
        environment,
        connectionMode,
        riskProfile: "medium",
        defaultPolicyMode: "balanced",
      } satisfies CreateProjectInput);
      let analysis: DetectionResult | null = null;
      try {
        analysis = await runInitialAnalysis(project.id);
      } catch (analysisError) {
        setAnalysisSummary(analysisError instanceof Error ? analysisError.message : "El proyecto se creo, pero no se pudo completar el analisis inicial.");
        navigate(`/projects/${project.id}/integrations`);
        return;
      }
      if (analysis) {
        const detected = analysis.integrations.length;
        setAnalysisSummary(`${detected} integraciones creadas desde el analisis inicial.`);
        navigate(`/projects/${project.id}/integrations`);
      } else {
        navigate(`/projects/${project.id}`);
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el proyecto.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6 pb-10 sm:space-y-8">
      {!isLoadingOrganizations && !activeOrganization && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-7 py-6">
          <h1 className="text-[24px] font-extrabold text-[#111827]">Primero crea una organización</h1>
          <p className="mt-2 max-w-3xl text-[16px] font-medium leading-7 text-[#596783]">
            Cada proyecto debe pertenecer a una organización para separar permisos, configuración y auditoría.
          </p>
          <Link to={appRoutes.onboardingOrganization} className="mt-5 inline-flex h-11 items-center rounded-lg bg-[#00951d] px-6 text-[15px] font-extrabold text-white hover:bg-[#007f18]">
            Crear organización
          </Link>
        </section>
      )}

      <div>
        <div className="text-sm font-semibold text-[#596783]">
          <Link to="/projects" className="text-[#3f5f9f]">
            Mis proyectos
          </Link>{" "}
          / Nuevo proyecto
        </div>
        <h1 className="mt-5 text-[clamp(2rem,5vw,2.625rem)] font-extrabold leading-tight text-[#050505]">Nuevo proyecto</h1>
        <p className="mt-3 text-[clamp(1rem,2vw,1.125rem)] font-medium text-[#596783]">Configura un nuevo proyecto de forma independiente dentro de tu organización.</p>
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <form id="new-project-form" onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-[#dce2ea] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          {error && <div className="border-b border-rose-200 bg-rose-50 px-6 py-4 text-sm font-bold text-rose-700">{error}</div>}

          <section className="border-b border-[#e5e9ef] p-4 sm:p-6">
            <h2 className="flex min-w-0 items-center gap-3 text-[17px] font-extrabold text-[#111827] sm:gap-4 sm:text-[18px]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00951d] text-sm text-white">1</span>
              Informacion general
            </h2>
            <div className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-[#111827]">Nombre del proyecto *</span>
                <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Ej. Bot de soporte al cliente" className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-[#111827]">Descripcion</span>
                <textarea name="description" placeholder="Describe brevemente el propósito del proyecto" className="min-h-12 w-full rounded-lg border border-[#dce2ea] px-4 py-3 outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-[#111827]">Tipo de proyecto *</span>
                <select value={projectType} onChange={(event) => setProjectType(event.target.value)} className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10">
                  {Object.entries(projectTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-[#111827]">Entorno *</span>
                <select value={environment} onChange={(event) => setEnvironment(event.target.value)} required className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10">
                  <option value="">Selecciona un entorno</option>
                  {Object.entries(environmentLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block lg:col-span-full">
                <span className="mb-2 block text-sm font-extrabold text-[#111827]">Slug o identificador *</span>
                <input value={generatedSlug} onChange={(event) => setSlug(event.target.value)} required placeholder="Ej. bot-soporte-cliente" className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" />
              </label>
            </div>
          </section>

          <section className="border-b border-[#e5e9ef] p-4 sm:p-6">
            <h2 className="flex min-w-0 items-center gap-3 text-[17px] font-extrabold text-[#111827] sm:gap-4 sm:text-[18px]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00951d] text-sm text-white">2</span>
              Método de conexión
            </h2>
            <p className="mt-2 text-sm font-medium text-[#596783]">Selecciona como se conectara tu proyecto con Oberyn.</p>
            <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))]">
              {connectionOptions.map(({ value, label, description, Icon }) => (
                <button key={value} type="button" onClick={() => setConnectionMode(value)} className={`min-w-0 rounded-lg border p-4 text-left transition ${connectionMode === value ? "border-[#00951d] bg-[#eaf7ee]" : "border-[#dce2ea] bg-white hover:bg-[#f8fafc]"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <Icon className="h-8 w-8 text-[#00951d]" />
                    <span className={`h-5 w-5 rounded-full border ${connectionMode === value ? "border-[#00951d] bg-[#00951d]" : "border-[#9aa8ba]"}`} />
                  </div>
                  <p className="mt-3 text-[16px] font-extrabold text-[#111827]">{label}</p>
                  <p className="mt-1 text-sm font-medium text-[#596783]">{description}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="border-b border-[#e5e9ef] p-4 sm:p-6">
            <h2 className="flex min-w-0 items-center gap-3 text-[17px] font-extrabold text-[#111827] sm:gap-4 sm:text-[18px]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00951d] text-sm text-white">3</span>
              Analisis inicial de APIs
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#596783]">
              Pega el repositorio publico o sube archivos clave para que Oberyn detecte proveedores, modelos, endpoints, variables de entorno y senales de riesgo antes del primer evento del SDK.
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-[#111827]">Repositorio publico</span>
                <span className="relative block">
                  <SearchCode className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#596783]" />
                  <input
                    value={repositoryUrl}
                    onChange={(event) => setRepositoryUrl(event.target.value)}
                    placeholder="https://github.com/tu-org/tu-repo"
                    className="h-12 w-full rounded-lg border border-[#dce2ea] pl-12 pr-4 outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10"
                  />
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-extrabold text-[#111827]">Archivos clave</span>
                <input
                  type="file"
                  multiple
                  onChange={(event) => void readAnalysisFiles(event.currentTarget.files)}
                  className="block w-full rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#596783] file:mr-4 file:rounded-md file:border-0 file:bg-[#00951d] file:px-4 file:py-2 file:text-sm file:font-extrabold file:text-white"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-[#596783]">
              <span className="rounded-md bg-emerald-50 px-3 py-1 text-emerald-700">{analysisFiles.length} archivos preparados</span>
              <span className="rounded-md bg-slate-100 px-3 py-1">package.json</span>
              <span className="rounded-md bg-slate-100 px-3 py-1">.env.example</span>
              <span className="rounded-md bg-slate-100 px-3 py-1">src/services/*</span>
              <span className="rounded-md bg-slate-100 px-3 py-1">README.md</span>
            </div>
            {analysisSummary ? <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">{analysisSummary}</p> : null}
          </section>

          <section className="border-b border-[#e5e9ef] p-4 sm:p-6">
            <h2 className="flex min-w-0 items-center gap-3 text-[17px] font-extrabold text-[#111827] sm:gap-4 sm:text-[18px]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00951d] text-sm text-white">4</span>
              Configuración inicial
            </h2>
            <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr))]">
              {protectionOptions.map(({ label, description, Icon }) => (
                <div key={label} className="flex min-w-0 gap-4 rounded-lg border border-[#e5e9ef] p-4">
                  <Icon className="h-8 w-8 shrink-0 text-[#00951d]" />
                  <div>
                    <p className="text-sm font-extrabold text-[#111827]">{label}</p>
                    <p className="mt-1 text-sm font-medium text-[#596783]">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="p-4 sm:p-6">
            <h2 className="flex min-w-0 items-center gap-3 text-[17px] font-extrabold text-[#111827] sm:gap-4 sm:text-[18px]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00951d] text-sm text-white">5</span>
              Etiquetas o categoria
            </h2>
            <div className="mt-5 flex flex-wrap gap-4">
              {tagOptions.map((tag) => (
                <button key={tag.value} type="button" onClick={() => setProjectType(tag.value)} className={`rounded-lg border px-6 py-3 text-[15px] font-extrabold ${projectType === tag.value ? tag.className : "border-[#dce2ea] bg-white text-[#596783]"}`}>
                  {tag.label}
                </button>
              ))}
            </div>
          </section>

          <footer className="flex flex-col-reverse gap-3 border-t border-[#e5e9ef] p-4 sm:flex-row sm:justify-end sm:p-6">
            <Link to="/projects" className="inline-flex h-11 items-center justify-center rounded-lg border border-[#dce2ea] px-6 text-[15px] font-extrabold text-[#111827] hover:bg-[#f8fafc]">
              Cancelar
            </Link>
            <button disabled={isSubmitting} type="submit" className="h-11 rounded-lg bg-[#00951d] px-6 text-[15px] font-extrabold text-white hover:bg-[#007f18] disabled:opacity-60">
              {isSubmitting ? "Creando..." : "Crear proyecto"}
            </button>
          </footer>
        </form>

        <aside className="space-y-5">
          <section className="rounded-xl border border-[#dce2ea] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
            <h2 className="flex items-center gap-3 text-[18px] font-extrabold text-[#111827]">
              <Sparkles className="h-7 w-7 text-[#00951d]" />
              Resumen del proyecto
            </h2>
            <dl className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="font-semibold text-[#596783]">Estado</dt>
                <dd className="rounded-full bg-amber-50 px-3 py-1 font-bold text-amber-700">Pendiente de configuración</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-semibold text-[#596783]">Entorno</dt>
                <dd className="font-bold text-[#111827]">{environment ? environmentLabels[environment] : "-"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-semibold text-[#596783]">Tipo</dt>
                <dd className="font-bold text-[#111827]">{projectTypeLabels[projectType] ?? "-"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-semibold text-[#596783]">Conexión</dt>
                <dd className="font-bold text-[#111827]">{connectionModeLabels[connectionMode]}</dd>
              </div>
            </dl>
            <h3 className="mt-6 text-sm font-extrabold text-[#111827]">Protecciónes incluidas</h3>
            <ul className="mt-3 space-y-2 text-sm font-medium text-[#596783]">
              {["Auditoría habilitada", "Aprobación humana desde riesgo", "Anclar evidencia en Stellar", "Protección de datos sensibles"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#00951d]" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-[#dce2ea] bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
            <h2 className="flex items-center gap-3 text-[18px] font-extrabold text-[#111827]">
              <Sparkles className="h-7 w-7 text-sky-600" />
              Que se creara
            </h2>
            <ul className="mt-4 space-y-2 text-sm font-medium text-[#596783]">
              {["Integraciones", "Reglas", "Bots y agentes", "Flujos y workflows", "Aprobaciones", "Auditoría y registros"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#00951d]" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-sky-200 bg-sky-50 p-6">
            <h2 className="flex items-center gap-3 text-[17px] font-extrabold text-[#111827]">
              <Info className="h-7 w-7 text-sky-700" />
              Puedes configurarlo más adelante
            </h2>
            <p className="mt-3 text-sm font-medium leading-6 text-[#596783]">Podrás editar campos y ajustar configuración desde los ajustes del proyecto.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

