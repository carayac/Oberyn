import { ArrowRight, BarChart3, Grid2X2, Headphones, Settings, ShoppingCart } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthFormMessage } from "../../components/auth/AuthFormMessage";
import { OnboardingFrame } from "../../components/onboarding/OnboardingFrame";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";
import { appRoutes } from "../../routes/routes";

const projectTypeOptions = [
  { value: "support", label: "Soporte al cliente", description: "Atencion y resolucion de consultas de clientes.", Icon: Headphones },
  { value: "ecommerce", label: "E-commerce", description: "Ventas, pedidos y gestion de clientes.", Icon: ShoppingCart },
  { value: "operations", label: "Operaciones", description: "Procesos internos y optimizacion.", Icon: Settings },
  { value: "finance", label: "Finanzas", description: "Analisis financiero y reportes.", Icon: BarChart3 },
  { value: "custom", label: "Otro", description: "Otro tipo de proyecto personalizado.", Icon: Grid2X2 },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ProjectPage() {
  const navigate = useNavigate();
  const { activeOrganization, isLoading: isLoadingOrganizations } = useOrganizations();
  const { createProject } = useProjects(activeOrganization?.id);
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState("support");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatedSlug = useMemo(() => slugify(name), [name]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!activeOrganization) {
      setError("Primero crea una organizacion.");
      setSubmitting(false);
      return;
    }

    const formData = new FormData(event.currentTarget);

    try {
      await createProject({
        name,
        slug: generatedSlug,
        description: String(formData.get("description") ?? "").trim(),
        projectType,
        environment: "development",
        connectionMode: "sdk",
        riskProfile: "medium",
        defaultPolicyMode: "balanced",
      });
      navigate(appRoutes.onboardingConnection);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el proyecto.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OnboardingFrame activeStep={2} backTo={appRoutes.onboardingOrganization}>
      <form onSubmit={handleSubmit} className="w-full max-w-[1030px] rounded-xl border border-[#dce2ea] bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-8 lg:px-10 lg:py-6 xl:px-12">
        <h1 className="text-[28px] font-extrabold leading-tight text-[#050505] sm:text-[32px] lg:text-[34px]">Crea tu primer proyecto</h1>
        <p className="mt-1 text-[15px] font-medium text-[#596783] sm:text-[16px]">Cada proyecto puede tener sus propias reglas, permisos y auditoria.</p>

        {error && (
          <div className="mt-7">
            <AuthFormMessage id="project-form-error" tone="error">
              {error}
            </AuthFormMessage>
          </div>
        )}

        <div className="mt-5 space-y-3 lg:mt-5 lg:space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[15px] font-extrabold text-[#111827] sm:text-[16px]">Nombre del proyecto</span>
            <input disabled={isLoadingOrganizations} value={name} onChange={(event) => setName(event.target.value)} required placeholder="Ej. Asistente de Soporte" className="h-12 w-full rounded-lg border border-[#dce2ea] px-5 text-[16px] outline-none placeholder:text-[#8796b0] focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10 sm:h-[52px] sm:text-[17px]" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[15px] font-extrabold text-[#111827] sm:text-[16px]">Descripcion (opcional)</span>
            <textarea name="description" placeholder="Describe el proposito o alcance de tu proyecto." className="min-h-[60px] w-full rounded-lg border border-[#dce2ea] px-5 py-3 text-[16px] outline-none placeholder:text-[#8796b0] focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10 sm:min-h-[68px] sm:text-[17px]" />
          </label>

          <section>
            <h2 className="text-[15px] font-extrabold text-[#111827] sm:text-[16px]">Tipo de proyecto</h2>
            <div className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))]">
              {projectTypeOptions.map(({ value, label, description, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setProjectType(value)}
                  className={`flex min-h-[92px] min-w-0 items-center gap-4 rounded-lg border px-4 text-left transition ${
                    projectType === value ? "border-[#00951d] bg-[#f0fbf3] ring-4 ring-[#00951d]/10" : "border-[#dce2ea] bg-white hover:bg-[#f8fafc]"
                  }`}
                >
                  <Icon className="h-8 w-8 shrink-0 text-[#00951d]" strokeWidth={2.3} />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-extrabold leading-5 text-[#111827]">{label}</span>
                    <span className="mt-1 block text-[13px] font-medium leading-5 text-[#596783]">{description}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className="mt-5 flex flex-col-reverse gap-3 border-t border-[#dce2ea] pt-4 sm:flex-row sm:justify-end sm:gap-5">
          <Link to={appRoutes.onboardingOrganization} className="inline-flex h-11 min-w-[132px] items-center justify-center rounded-lg border border-[#dce2ea] px-7 text-[16px] font-extrabold text-[#111827] hover:bg-[#f8fafc] sm:h-12">
            Volver
          </Link>
          <button disabled={isSubmitting || isLoadingOrganizations} type="submit" className="inline-flex h-11 min-w-[180px] items-center justify-center gap-5 rounded-lg bg-[#00951d] px-8 text-[16px] font-extrabold text-white shadow-[0_8px_16px_rgba(0,149,29,0.18)] hover:bg-[#007f18] disabled:opacity-60 sm:h-12">
            {isSubmitting ? "Creando..." : "Continuar"}
            <ArrowRight className="h-6 w-6" />
          </button>
        </footer>
      </form>
    </OnboardingFrame>
  );
}
