import { Building2, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { AuthBrandLogo } from "../../components/auth/AuthBrandLogo";
import { useOrganizations } from "../../hooks/useOrganizations";
import { appRoutes } from "../../routes/routes";

export function OrganizationsPage() {
  const { organizations, activeOrganizationId, setActiveOrganizationId, isLoading, error } = useOrganizations();

  return (
    <div className="space-y-8 pb-10">
      <AuthBrandLogo className="justify-center" markSize="sm" />
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-[42px] font-extrabold leading-tight text-[#050505]">Organizaciones</h1>
          <p className="mt-4 text-[18px] font-medium text-[#596783]">Administra los espacios donde viven tus proyectos, usuarios y permisos.</p>
        </div>
        <Link to={appRoutes.onboardingOrganization} className="inline-flex h-14 items-center justify-center gap-4 rounded-lg bg-[#00951d] px-8 text-[18px] font-extrabold text-white shadow-[0_8px_16px_rgba(0,149,29,0.18)] transition hover:bg-[#007f18]">
          Crear organización
          <Plus className="h-6 w-6" />
        </Link>
      </header>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">{error}</div>}

      {isLoading ? (
        <div className="rounded-lg border border-[#dce2ea] bg-white px-8 py-12 text-center font-semibold text-[#64708a]">Cargando organizaciones...</div>
      ) : (
        <section className="grid gap-5 lg:grid-cols-2">
          {organizations.map((organization) => (
            <button
              key={organization.id}
              type="button"
              onClick={() => setActiveOrganizationId(organization.id)}
              className={`rounded-xl border bg-white p-6 text-left shadow-[0_10px_28px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 ${
                activeOrganizationId === organization.id ? "border-[#00951d] ring-4 ring-[#00951d]/10" : "border-[#dce2ea]"
              }`}
            >
              <Building2 className="h-8 w-8 text-[#00951d]" />
              <h2 className="mt-5 text-[24px] font-extrabold text-[#111827]">{organization.name}</h2>
              <p className="mt-2 text-sm font-semibold text-[#596783]">{organization.slug}</p>
              {organization.description && <p className="mt-4 text-[15px] font-medium leading-6 text-[#596783]">{organization.description}</p>}
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
                <span className="rounded-full bg-[#eaf7ee] px-3 py-1 text-[#008f1f]">{organization.status}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[#596783]">{organization.region}</span>
              </div>
            </button>
          ))}
          {organizations.length === 0 && (
            <div className="rounded-xl border border-[#dce2ea] bg-white px-8 py-12 text-center">
              <h2 className="text-[24px] font-extrabold text-[#111827]">Aún no tienes organizaciones</h2>
              <Link to={appRoutes.onboardingOrganization} className="mt-5 inline-flex h-11 items-center rounded-lg bg-[#00951d] px-6 text-[15px] font-extrabold text-white hover:bg-[#007f18]">
                Crear organización
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
