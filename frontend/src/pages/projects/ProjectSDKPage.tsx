import { useAuth } from "@clerk/react";
import { BookOpen, CheckCircle2, Code2, Copy, Play, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useOrganizations } from "../../hooks/useOrganizations";
import { apiClient } from "../../lib/api/client";
import { getDocsRedirectUrl } from "../../lib/api/docs";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

type SdkConfig = {
  projectId: string;
  publicKey: string;
  endpoint: string;
  packageName: string;
  storesClientSecrets: boolean;
};

function CodeBlock({ code }: { code: string }) {
  async function copyCode() {
    await navigator.clipboard?.writeText(code);
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
      <button type="button" onClick={copyCode} className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20" aria-label="Copiar código">
        <Copy className="h-4 w-4" />
      </button>
      <pre className="overflow-x-auto p-5 pr-14 text-sm leading-6 text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function ProjectSDKPage() {
  const { projectId = "" } = useParams();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { activeOrganizationId, isLoading: isLoadingOrganizations } = useOrganizations();
  const [config, setConfig] = useState<SdkConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      if (!isLoaded || !isSignedIn || isLoadingOrganizations) return;
      if (!activeOrganizationId) {
        setConfig(null);
        setIsLoading(false);
        setMessage("Selecciona o crea una organización para consultar la configuración del SDK.");
        return;
      }

      setIsLoading(true);
      setMessage(null);
      try {
        const token = await getToken();
        const response = await apiClient.get<ApiResponse<SdkConfig>>(`/projects/${projectId}/sdk/config`, token, activeOrganizationId);
        setConfig(response.data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No se pudo cargar la configuración del SDK.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadConfig();
  }, [activeOrganizationId, getToken, isLoaded, isLoadingOrganizations, isSignedIn, projectId]);

  async function sendTestEvent() {
    if (!activeOrganizationId) {
      setMessage("Selecciona o crea una organización para enviar eventos de prueba.");
      return;
    }

    setMessage(null);
    try {
      const token = await getToken();
      const response = await apiClient.post<ApiResponse<{ accepted: boolean; eventId: string }>>(
        `/projects/${projectId}/sdk/test-event`,
        { source: "sdk-page", sentAt: new Date().toISOString() },
        token,
        activeOrganizationId,
      );
      setMessage(`Evento recibido: ${response.data.eventId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar el evento de prueba.");
    }
  }

  const endpoint = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api"}/sdk/events`;
  const installSnippet = "npm install oberyn";
  const initSnippet = config
    ? `import { createOberyn } from "oberyn";

export const oberyn = createOberyn({
  apiKey: "${config.publicKey}",
  endpoint: "${endpoint}",
  service: {
    name: "mi-aplicación",
    provider: "custom",
    type: "app"
  },
  environment: "production",
  captureFetch: true,
  approvalMode: "poll",
  approvalTimeoutMs: 120000
});`
    : "";

  const actionSnippet = `await oberyn.protect("crear_reembolso", async () => {
  return stripe.refunds.create({ payment_intent: paymentIntentId });
}, {
  riskLevel: "high",
  service: { name: "Stripe", provider: "stripe", type: "payments" },
  payload: { paymentIntentId }
});`;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#008f1f]">SDK</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Conecta tu proyecto con Oberyn</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Instala el SDK en tu aplicación para detectar actividad, servicios usados, acciones críticas, solicitudes de aprobación y eventos auditables.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={getDocsRedirectUrl("sdk")}>
            <Button variant="secondary">
              <BookOpen className="mr-2 h-4 w-4" />
              Documentación técnica
            </Button>
          </a>
          <Button onClick={sendTestEvent} disabled={!config || isLoading}>
            <Play className="mr-2 h-4 w-4" />
            Enviar evento de prueba
          </Button>
        </div>
      </header>

      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-6">
          <Card>
            <div className="flex items-center gap-3">
              <Code2 className="h-6 w-6 text-[#008f1f]" />
              <h2 className="text-lg font-bold text-slate-950">1. Instala el paquete</h2>
            </div>
            <div className="mt-4">
              <CodeBlock code={installSnippet} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-[#008f1f]" />
              <h2 className="text-lg font-bold text-slate-950">2. Inicializa Oberyn</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">La clave es pública y solo permite enviar eventos a este proyecto. No guarda ni expone secretos de tus proveedores.</p>
            <div className="mt-4">
              <CodeBlock code={isLoading ? "Cargando configuración..." : initSnippet} />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-950">3. Protege acciones críticas</h2>
            <p className="mt-2 text-sm text-slate-600">Usa `protect` para evaluar acciones sensibles antes de ejecutarlas. Con `approvalMode: "poll"` el SDK espera la aprobación y continúa cuando se aprueba.</p>
            <div className="mt-4">
              <CodeBlock code={actionSnippet} />
            </div>
          </Card>
        </section>

        <aside className="space-y-5">
          <Card>
            <h2 className="text-lg font-bold text-slate-950">Qué detecta</h2>
            <div className="mt-4 space-y-4">
              {["HTTP fetch y APIs externas", "Acciones permitidas o bloqueadas", "Riesgo por acción", "Servicios e integraciones usadas", "Flujos por actionName", "Eventos auditables con hash"].map((item) => (
                <div key={item} className="flex gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#008f1f]" />
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-950">Clave del proyecto</h2>
            <p className="mt-2 break-all rounded-lg bg-slate-50 p-3 font-mono text-sm text-slate-700">{config?.publicKey ?? "Cargando..."}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">Esta clave identifica el proyecto y permite recibir eventos. Puedes rotarla más adelante desde esta misma sección.</p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
