import { useAuth } from "@clerk/react";
import { Activity, Cable, Plus, RadioTower } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SecurityPageFrame } from "../../components/projects/SecurityPageFrame";
import { useOrganizations } from "../../hooks/useOrganizations";
import { apiClient } from "../../lib/api/client";

type ApiResponse<T> = { success: boolean; data: T };
type Integration = {
  id: string;
  name: string;
  provider: string;
  serviceType: string;
  connectionMethod: string;
  status: string;
  coverage: number;
  lastActivityAt?: string | null;
  lastDetectedVia?: string | null;
};

export function ProjectIntegrationsPage() {
  const { projectId } = useParams();
  const { activeOrganization } = useOrganizations();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [items, setItems] = useState<Integration[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!projectId || !activeOrganization?.id || !isLoaded || !isSignedIn) return;
    try {
      const token = await getToken();
      const response = await apiClient.get<ApiResponse<Integration[]>>(`/projects/${projectId}/integrations`, token, activeOrganization.id);
      setItems(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las integraciones.");
    }
  }

  useEffect(() => {
    void load();
  }, [projectId, activeOrganization?.id, isLoaded, isSignedIn]);

  return (
    <SecurityPageFrame
      title="Integraciones"
      description="Servicios detectados por SDK y Gateway. Manual queda solo para preparar reglas antes de que exista trafico real."
    >
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-[#dce2ea] bg-white p-5">
          <Cable className="h-7 w-7 text-[#00951d]" />
          <p className="mt-3 text-sm font-bold text-[#596783]">Detectadas</p>
          <p className="text-3xl font-extrabold text-[#050505]">{items.length}</p>
        </article>
        <article className="rounded-xl border border-[#dce2ea] bg-white p-5">
          <RadioTower className="h-7 w-7 text-[#00951d]" />
          <p className="mt-3 text-sm font-bold text-[#596783]">Gateway</p>
          <p className="text-3xl font-extrabold text-[#050505]">{items.filter((item) => item.connectionMethod === "gateway").length}</p>
        </article>
        <article className="rounded-xl border border-[#dce2ea] bg-white p-5">
          <Activity className="h-7 w-7 text-[#00951d]" />
          <p className="mt-3 text-sm font-bold text-[#596783]">SDK</p>
          <p className="text-3xl font-extrabold text-[#050505]">{items.filter((item) => item.connectionMethod === "sdk").length}</p>
        </article>
        <article className="rounded-xl border border-dashed border-[#b9c3d1] bg-white p-5">
          <Plus className="h-7 w-7 text-[#596783]" />
          <p className="mt-3 text-sm font-bold text-[#596783]">Manual</p>
          <p className="mt-1 text-sm font-semibold text-[#596783]">Preparacion, no proteccion confirmada.</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dce2ea] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr] border-b border-[#edf1f5] px-5 py-4 text-sm font-extrabold text-[#050505]">
            <span>Servicio</span>
            <span>Metodo</span>
            <span>Tipo</span>
            <span>Actividad</span>
            <span>Cobertura</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="grid min-w-[760px] grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr] items-center border-b border-[#edf1f5] px-5 py-4 last:border-b-0">
              <div>
                <p className="font-extrabold text-[#111827]">{item.name}</p>
                <p className="text-sm font-semibold text-[#596783]">{item.provider}</p>
              </div>
              <span className="text-sm font-bold capitalize text-[#596783]">{item.connectionMethod}</span>
              <span className="text-sm font-bold uppercase text-[#596783]">{item.serviceType}</span>
              <span className="text-sm font-semibold text-[#596783]">{item.lastActivityAt ? new Date(item.lastActivityAt).toLocaleString() : "Sin actividad"}</span>
              <span className="rounded-full bg-[#eaf7ee] px-3 py-1 text-center text-sm font-extrabold text-[#008f1f]">{item.coverage}%</span>
            </div>
          ))}
          {!items.length && <p className="p-6 text-center text-sm font-bold text-[#596783]">Todavia no hay integraciones detectadas. Ejecuta una prueba desde SDK o Gateway.</p>}
        </div>
      </section>
    </SecurityPageFrame>
  );
}
