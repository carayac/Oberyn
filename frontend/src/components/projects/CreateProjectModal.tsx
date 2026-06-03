import { X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { CreateProjectInput, Project } from "../../types/project";
import { connectionModeLabels, environmentLabels, projectTypeLabels } from "./projectLabels";

type CreateProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onCreateProject: (input: CreateProjectInput) => Project | Promise<Project>;
  onCreated: (project: Project) => void;
};

const riskOptions = [
  ["low", "Bajo"],
  ["medium", "Medio"],
  ["high", "Alto"],
  ["critical", "Crítico"],
] as const;

const ruleModeOptions = [
  ["strict", "Estricto"],
  ["balanced", "Balanceado"],
  ["flexible", "Flexible"],
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CreateProjectModal({ open, onClose, onCreateProject, onCreated }: CreateProjectModalProps) {
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      setError("El nombre del proyecto es obligatorio.");
      return;
    }

    const project = await onCreateProject({
      name,
      slug: slugify(name),
      description: String(formData.get("description") ?? "").trim(),
      projectType: String(formData.get("projectType") ?? "custom"),
      environment: String(formData.get("environment") ?? "development"),
      connectionMode: String(formData.get("connectionMode") ?? "sdk"),
      riskProfile: formData.get("riskProfile") as CreateProjectInput["riskProfile"],
      defaultPolicyMode: formData.get("defaultPolicyMode") as CreateProjectInput["defaultPolicyMode"],
    });

    setError(null);
    onCreated(project);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-6 py-8">
      <section className="w-full max-w-2xl rounded-xl border border-[#dce2ea] bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
        <header className="flex items-center justify-between gap-6">
          <div>
            <h2 className="text-[28px] font-extrabold text-[#050505]">Nuevo proyecto</h2>
            <p className="mt-2 text-[16px] font-medium text-[#64708a]">Configura una unidad independiente para reglas, integraciones y auditoría.</p>
          </div>
          <button id="create-project-close" type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#dce2ea] text-[#111827] hover:bg-[#f8fafc]" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </header>

        <form id="create-project-form" className="mt-7 space-y-5" onSubmit={handleSubmit}>
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

          <label className="block" htmlFor="create-project-name">
            <span className="mb-2 block text-sm font-extrabold text-[#111827]">Nombre</span>
            <input id="create-project-name" name="name" className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" placeholder="Bot de soporte al cliente" />
          </label>

          <label className="block" htmlFor="create-project-description">
            <span className="mb-2 block text-sm font-extrabold text-[#111827]">Descripcion</span>
            <input id="create-project-description" name="description" className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" placeholder="Qué protege este proyecto" />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block" htmlFor="create-project-type">
              <span className="mb-2 block text-sm font-extrabold text-[#111827]">Tipo</span>
              <select id="create-project-type" name="projectType" className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" defaultValue="custom">
                {Object.entries(projectTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block" htmlFor="create-project-environment">
              <span className="mb-2 block text-sm font-extrabold text-[#111827]">Ambiente</span>
              <select id="create-project-environment" name="environment" className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" defaultValue="development">
                {Object.entries(environmentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block" htmlFor="create-project-connection">
              <span className="mb-2 block text-sm font-extrabold text-[#111827]">Conexión</span>
              <select id="create-project-connection" name="connectionMode" className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" defaultValue="sdk">
                {Object.entries(connectionModeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block" htmlFor="create-project-risk">
              <span className="mb-2 block text-sm font-extrabold text-[#111827]">Riesgo</span>
              <select id="create-project-risk" name="riskProfile" className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" defaultValue="medium">
                {riskOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block" htmlFor="create-project-policy">
            <span className="mb-2 block text-sm font-extrabold text-[#111827]">Reglas iniciales</span>
            <select id="create-project-policy" name="defaultPolicyMode" className="h-12 w-full rounded-lg border border-[#dce2ea] px-4 text-[16px] outline-none focus:border-[#00951d] focus:ring-4 focus:ring-[#00951d]/10" defaultValue="balanced">
              {ruleModeOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-11 rounded-lg border border-[#dce2ea] px-5 text-[15px] font-extrabold text-[#111827] hover:bg-[#f8fafc]">
              Cancelar
            </button>
            <button type="submit" className="h-11 rounded-lg bg-[#00951d] px-5 text-[15px] font-extrabold text-white hover:bg-[#007f18]">
              Crear proyecto
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
