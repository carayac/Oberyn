import { ArrowRight, Globe2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthFormMessage } from "../../components/auth/AuthFormMessage";
import { OnboardingFrame } from "../../components/onboarding/OnboardingFrame";
import { useOrganizations } from "../../hooks/useOrganizations";
import { appRoutes } from "../../routes/routes";

const ACTIVE_ORGANIZATION_KEY = "oberyn.onboardingOrganizationId";

const regionOptions = [
  ["latam", "Am?rica Latina"],
  ["north_america", "Norteam?rica"],
  ["europe", "Europa"],
  ["global", "Global"],
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function OrganizationPage() {
  const navigate = useNavigate();
  const { createOrganization } = useOrganizations();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatedSlug = useMemo(() => slugify(name), [name]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const organization = await createOrganization({
        name,
        slug: generatedSlug,
        organizationType: "workspace",
        region,
        description: String(formData.get("description") ?? "").trim(),
      });
      localStorage.setItem(ACTIVE_ORGANIZATION_KEY, organization.id);
      navigate(appRoutes.onboardingProject);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear la organización.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OnboardingFrame activeStep={1} backTo={appRoutes.onboardingSuccess}>
      <form onSubmit={handleSubmit} className="w-full max-w-[1030px] rounded-xl border border-[#dce2ea] bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-8 lg:px-10 lg:py-6 xl:px-12">
        <h1 className="text-[28px] font-extrabold leading-tight text-[#050505] sm:text-[32px] lg:text-[34px]">Crea tu organización</h1>
        <p className="mt-1 text-[15px] font-medium text-[#596783] sm:text-[16px]">La organización agrupa tus proyectos, APIs y configuración.</p>

        {error && (
          <div className="mt-8">
            <AuthFormMessage id="organization-form-error" tone="error">
              {error}
            </AuthFormMessage>
          </div>
        )}

        <div className="mt-5 space-y-3 lg:space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[15px] font-extrabold text-[#111827] sm:text-[16px]">Nombre de la organización</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Ej. Mi empresa" className="h-12 w-full rounded-lg border border-[#dce2ea] px-5 text-[16px] outline-none placeholder:text-[#8796b0] focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[15px] font-extrabold text-[#111827] sm:text-[16px]">Descripcion (opcional)</span>
            <textarea name="description" placeholder="Describe el prop?sito o alcance de tu organización." className="min-h-[62px] w-full rounded-lg border border-[#dce2ea] px-5 py-3 text-[16px] outline-none placeholder:text-[#8796b0] focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10 sm:min-h-[72px]" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[15px] font-extrabold text-[#111827] sm:text-[16px]">Region operativa</span>
            <div className="relative">
              <Globe2 className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#52617b] sm:h-6 sm:w-6" />
              <select value={region} onChange={(event) => setRegion(event.target.value)} required className="h-12 w-full appearance-none rounded-lg border border-[#dce2ea] bg-white px-14 text-[16px] font-medium text-[#596783] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10">
                <option value="">Selecciona una region</option>
                {regionOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>

        <footer className="mt-5 flex flex-col-reverse gap-3 border-t border-[#dce2ea] pt-4 sm:flex-row sm:justify-end sm:gap-5">
          <Link to={appRoutes.onboardingSuccess} className="inline-flex h-11 min-w-[150px] items-center justify-center rounded-lg border border-[#dce2ea] px-7 text-[16px] font-extrabold text-[#111827] hover:bg-[#f8fafc] sm:h-12">
            Cancelar
          </Link>
          <button disabled={isSubmitting} type="submit" className="inline-flex h-11 min-w-[190px] items-center justify-center gap-5 rounded-lg bg-[#00951d] px-8 text-[16px] font-extrabold text-white shadow-[0_8px_16px_rgba(0,149,29,0.18)] hover:bg-[#007f18] disabled:opacity-60 sm:h-12">
            {isSubmitting ? "Creando..." : "Continuar"}
            <ArrowRight className="h-6 w-6" />
          </button>
        </footer>
      </form>
    </OnboardingFrame>
  );
}
