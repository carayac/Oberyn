import { useAuth } from "@clerk/react";
import { ArrowRight, CheckCircle2, Cloud, Copy, Eye, EyeOff, Link2, Network, RefreshCcw, Save, Shield, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useOrganizations } from "../../hooks/useOrganizations";
import { apiClient } from "../../lib/api/client";

type ApiResponse<T> = { success: boolean; data: T };

type GatewayConfig = {
  projectId: string;
  upstreamBaseUrl: string;
  gatewayEndpoint: string;
  gatewayToken: string;
  environment: string;
  inspectPrompts: boolean;
  blockSensitiveData: boolean;
  auditEnabled: boolean;
  applyProjectRules: boolean;
  status: string;
  storesClientSecrets: boolean;
  lastRequestAt?: string | null;
  detectedServices: Array<{ id: string; name: string; provider: string; serviceType: string; status: string; coverage: number }>;
  lastRequest?: Record<string, unknown> | null;
  metrics: { latencyMs: number; processedToday: number; activeRules: number };
};

const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

function useGatewayAuth() {
  if (!hasClerkKey) return { getToken: async () => null, isLoaded: true, isSignedIn: false };
  return useAuth();
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={checked ? "flex h-7 w-12 items-center justify-end rounded-full bg-[#258c2f] px-1" : "flex h-7 w-12 items-center justify-start rounded-full bg-slate-300 px-1"} aria-pressed={checked}>
      <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
    </button>
  );
}

function CopyButton({ value }: { value: string }) {
  async function copy() {
    await navigator.clipboard?.writeText(value);
  }

  return (
    <button type="button" onClick={copy} className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Copiar">
      <Copy className="h-5 w-5" />
    </button>
  );
}

function ServiceIcon({ name }: { name: string }) {
  return <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-sm font-bold text-[#008f1f]">{name.slice(0, 2).toUpperCase()}</span>;
}

function maskToken(token: string) {
  if (!token) return "";
  return `${token.slice(0, 8)}${"*".repeat(18)}${token.slice(-4)}`;
}

export function ProjectGatewayPage() {
  const { projectId = "" } = useParams();
  const { getToken, isLoaded, isSignedIn } = useGatewayAuth();
  const { activeOrganization } = useOrganizations();
  const [config, setConfig] = useState<GatewayConfig | null>(null);
  const [form, setForm] = useState({
    upstreamBaseUrl: "https://api.openai.com",
    environment: "production",
    inspectPrompts: true,
    blockSensitiveData: true,
    auditEnabled: true,
    applyProjectRules: true,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [showGatewayToken, setShowGatewayToken] = useState(false);

  async function getAuthToken() {
    if (!hasClerkKey) return null;
    return getToken();
  }

  async function loadConfig() {
    try {
      if (!hasClerkKey) {
        const preview: GatewayConfig = {
          projectId,
          upstreamBaseUrl: form.upstreamBaseUrl,
          gatewayEndpoint: `/api/gateway/${projectId}/v1/chat/completions`,
          gatewayToken: `gw_${projectId}_preview`,
          environment: form.environment,
          inspectPrompts: form.inspectPrompts,
          blockSensitiveData: form.blockSensitiveData,
          auditEnabled: form.auditEnabled,
          applyProjectRules: form.applyProjectRules,
          status: "operative",
          storesClientSecrets: false,
          detectedServices: [],
          lastRequest: null,
          metrics: { latencyMs: 0, processedToday: 0, activeRules: 0 },
        };
        setConfig(preview);
        return;
      }

      if (!isLoaded || !isSignedIn) return;
      const token = await getAuthToken();
      const response = await apiClient.get<ApiResponse<GatewayConfig>>(`/projects/${projectId}/gateway/config`, token, activeOrganization?.id);
      setConfig(response.data);
      setForm({
        upstreamBaseUrl: response.data.upstreamBaseUrl,
        environment: response.data.environment,
        inspectPrompts: response.data.inspectPrompts,
        blockSensitiveData: response.data.blockSensitiveData,
        auditEnabled: response.data.auditEnabled,
        applyProjectRules: response.data.applyProjectRules,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar Gateway.");
    }
  }

  useEffect(() => {
    void loadConfig();
  }, [activeOrganization?.id, isLoaded, isSignedIn, projectId]);

  async function saveConfig() {
    setMessage(null);
    try {
      if (!hasClerkKey) {
        setMessage("Cambios guardados en preview local.");
        setConfig((current) => (current ? { ...current, ...form } : current));
        return;
      }
      const token = await getAuthToken();
      const response = await apiClient.patch<ApiResponse<GatewayConfig>>(`/projects/${projectId}/gateway/config`, form, token, activeOrganization?.id);
      setConfig(response.data);
      setMessage("Configuracion guardada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron guardar los cambios.");
    }
  }

  async function sendTest() {
    setMessage(null);
    try {
      if (!hasClerkKey) {
        setMessage("Prueba de Gateway simulada en preview local.");
        return;
      }
      const token = await getAuthToken();
      const response = await apiClient.post<ApiResponse<{ ok: boolean; message: string }>>(`/projects/${projectId}/gateway/test`, {}, token, activeOrganization?.id);
      setMessage(response.data.message);
      await loadConfig();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo probar Gateway.");
    }
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
  const gatewayUrl = `${apiBase.replace(/\/$/, "")}${config?.gatewayEndpoint ?? `/api/gateway/${projectId}/v1/chat/completions`}`.replace("/api/api/", "/api/");
  const currentEndpoint = `${form.upstreamBaseUrl.replace(/\/$/, "")}/v1/chat/completions`;
  const curl = `curl -X POST ${gatewayUrl} \\
  -H "Authorization: Bearer ${config?.gatewayToken ?? "gw_..."}" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hola, como estas?"}]}'`;

  return (
    <div className="space-y-6 text-slate-950">
      <section className="rounded-lg border border-slate-200 bg-white/70 p-7 shadow-soft 2xl:p-8">
        <header>
          <h1 className="text-3xl font-bold tracking-normal text-slate-950">Gateway de Oberyn</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Rutea solicitudes a modelos y APIs externas a traves de Oberyn para inspeccion, control y auditoria.</p>
        </header>

        {message ? <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p> : null}

        <div className="mt-6 grid gap-7 xl:grid-cols-[minmax(0,1fr)_430px] 2xl:grid-cols-[minmax(0,1fr)_500px]">
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]"><Link2 className="h-6 w-6" /></span>
                <h2 className="text-xl font-bold">Configuracion de conexion</h2>
              </div>

              <div className="mt-7 grid gap-6 lg:grid-cols-2">
                <label>
                  <span className="text-sm font-bold">Endpoint actual (directo al proveedor)</span>
                  <div className="mt-3 flex h-14 items-center rounded-lg border border-slate-200 bg-white px-4">
                    <input value={currentEndpoint} readOnly className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                    <CopyButton value={currentEndpoint} />
                  </div>
                </label>
                <label>
                  <span className="text-sm font-bold">Nuevo endpoint via Gateway de Oberyn</span>
                  <div className="mt-3 flex h-14 items-center rounded-lg border border-slate-200 bg-white px-4">
                    <input value={gatewayUrl} readOnly className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                    <CopyButton value={gatewayUrl} />
                  </div>
                </label>
                <label>
                  <span className="text-sm font-bold">Token del proyecto</span>
                  <div className="mt-3 flex h-14 items-center rounded-lg border border-slate-200 bg-white px-4">
                    <input value={showGatewayToken ? config?.gatewayToken ?? "" : maskToken(config?.gatewayToken ?? "")} readOnly className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                    <button
                      type="button"
                      onClick={() => setShowGatewayToken((current) => !current)}
                      className="mr-1 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                      aria-label={showGatewayToken ? "Ocultar token" : "Mostrar token"}
                      title={showGatewayToken ? "Ocultar token" : "Mostrar token"}
                    >
                      {showGatewayToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                    <CopyButton value={config?.gatewayToken ?? ""} />
                  </div>
                </label>
                <label>
                  <span className="text-sm font-bold">Entorno</span>
                  <select value={form.environment} onChange={(event) => setForm((current) => ({ ...current, environment: event.target.value }))} className="mt-3 h-14 w-full rounded-lg border border-slate-200 bg-white px-4 text-base font-semibold outline-none focus:border-[#008f1f]">
                    <option value="production">Produccion</option>
                    <option value="staging">Staging</option>
                    <option value="sandbox">Sandbox</option>
                  </select>
                </label>
              </div>

              <div className="mt-7 border-t border-slate-200 pt-6">
                <h3 className="text-lg font-bold">Controles del Gateway</h3>
                <div className="mt-5 grid gap-6 lg:grid-cols-2">
                  {[
                    { key: "inspectPrompts", title: "Inspeccionar prompts", text: "Analiza y clasifica cada solicitud.", Icon: Shield },
                    { key: "applyProjectRules", title: "Aplicar reglas del proyecto", text: "Aplica politicas y reglas configuradas.", Icon: Network },
                    { key: "blockSensitiveData", title: "Bloquear datos sensibles", text: "Evita el envio de PII, secretos y confidenciales.", Icon: ShieldCheck },
                    { key: "auditEnabled", title: "Registrar auditoria", text: "Guarda solicitudes y respuestas para auditoria.", Icon: Cloud },
                  ].map(({ key, title, text, Icon }) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <div className="flex gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]"><Icon className="h-6 w-6" /></span>
                        <div>
                          <p className="font-bold">{title}</p>
                          <p className="mt-1 text-sm text-slate-600">{text}</p>
                        </div>
                      </div>
                      <Toggle checked={Boolean(form[key as keyof typeof form])} onChange={(checked) => setForm((current) => ({ ...current, [key]: checked }))} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 rounded-lg border border-slate-200 p-5">
                <div className="grid items-center gap-5 lg:grid-cols-[1fr_1fr]">
                  <div className="text-center">
                    <p className="font-bold">Antes: app -&gt; proveedor</p>
                    <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                      <span className="rounded-lg border border-slate-200 p-4">Tu aplicacion</span>
                      <span className="text-slate-400">-----&gt;</span>
                      <span className="rounded-lg border border-slate-200 p-4">Proveedor</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">Ahora: app -&gt; Gateway de Oberyn -&gt; proveedor</p>
                    <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                      <span className="rounded-lg border border-slate-200 p-4">Tu aplicacion</span>
                      <ArrowRight className="h-5 w-5 text-[#008f1f]" />
                      <span className="rounded-lg border border-[#258c2f] bg-emerald-50 p-4 font-bold text-[#008f1f]">Gateway de Oberyn</span>
                      <ArrowRight className="h-5 w-5 text-[#008f1f]" />
                      <span className="rounded-lg border border-slate-200 p-4">Proveedor</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-bold">Ejemplo de uso (cURL)</h3>
                <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800"><code>{curl}</code></pre>
              </div>
            </Card>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-[#258c2f]">
              <CheckCircle2 className="mr-2 inline h-5 w-5" />
              Puedes combinar Gateway con SDK para mayor cobertura.
            </div>
          </div>

          <aside className="space-y-5">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]"><Network className="h-6 w-6" /></span>
                <h2 className="text-lg font-bold">Servicios detectados por trafico</h2>
              </div>
              <div className="mt-5 space-y-2">
                {(config?.detectedServices.length ? config.detectedServices : []).map((service) => (
                  <div key={service.id} className="flex h-12 items-center gap-3 rounded-lg border border-slate-200 px-3">
                    <ServiceIcon name={service.name} />
                    <span className="flex-1 font-bold">{service.name}</span>
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-[#008f1f]">Activo</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                ))}
                {!config?.detectedServices.length ? <p className="rounded-lg border border-slate-200 px-3 py-5 text-sm text-slate-500">Aun no hay servicios detectados. Usa Probar conexion o envia trafico al Gateway.</p> : null}
              </div>
              <button type="button" className="mt-5 flex items-center gap-2 text-sm font-bold text-[#008f1f]">Ver todos los servicios <ArrowRight className="h-4 w-4" /></button>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]"><RefreshCcw className="h-6 w-6" /></span>
                <h2 className="text-lg font-bold">Ultima solicitud detectada</h2>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                {[
                  ["Servicio", String(config?.lastRequest?.service ?? "Sin actividad")],
                  ["Modelo", String(config?.lastRequest?.model ?? "N/A")],
                  ["Metodo", String(config?.lastRequest?.method ?? "N/A")],
                  ["Estado", String(config?.lastRequest?.decision ?? "N/A")],
                  ["Fecha y hora", config?.lastRequest?.createdAt ? new Date(String(config.lastRequest.createdAt)).toLocaleString() : "Sin actividad"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="text-right font-bold">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]"><Shield className="h-6 w-6" /></span>
                <h2 className="text-lg font-bold">Estado del Gateway</h2>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt>Estado</dt>
                  <dd className="flex items-center gap-2 font-bold text-[#008f1f]">
                    <span className="h-2 w-2 rounded-full bg-[#008f1f]" />
                    {config?.status === "operative" ? "Operativo" : config?.status ?? "Cargando"}
                  </dd>
                </div>
                <div className="flex justify-between"><dt>Latencia promedio</dt><dd className="font-bold">{config?.metrics.latencyMs ?? 0} ms</dd></div>
                <div className="flex justify-between"><dt>Solicitudes procesadas (hoy)</dt><dd className="font-bold">{config?.metrics.processedToday ?? 0}</dd></div>
                <div className="flex justify-between"><dt>Reglas activas</dt><dd className="font-bold">{config?.metrics.activeRules ?? 0}</dd></div>
              </dl>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" onClick={sendTest}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Probar conexion
              </Button>
              <Button onClick={saveConfig}>
                <Save className="mr-2 h-4 w-4" />
                Guardar cambios
              </Button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
