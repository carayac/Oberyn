import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AuthBrandLogo } from "../../components/auth/AuthBrandLogo";
import { Card } from "../../components/ui/Card";
import { getDocsRedirectUrl } from "../../lib/api/docs";

type DocSection = {
  title: string;
  body: string[];
  code?: string;
};

const docs: Record<string, { title: string; description: string; sections: DocSection[] }> = {
  sdk: {
    title: "Oberyn SDK",
    description: "Guia tecnica para conectar una aplicacion, capturar actividad y enviar eventos al dashboard del proyecto.",
    sections: [
      {
        title: "Endpoint de ingesta",
        body: ["El SDK envia eventos usando una clave publica del proyecto en el header x-oberyn-key."],
        code: "POST /api/sdk/events\nPOST /api/sdk/events/batch\nPOST /api/sdk/heartbeat",
      },
      {
        title: "Inicializacion",
        body: ["Instala el paquete local oberyn e inicializalo con la clave del proyecto."],
        code: `import { createOberyn } from "oberyn";

export const oberyn = createOberyn({
  apiKey: "ob_pk_...",
  endpoint: "http://localhost:4000/api/sdk/events",
  service: { name: "mi-app", provider: "custom", type: "app" },
  environment: "production",
  captureFetch: true
});`,
      },
      {
        title: "Acciones criticas",
        body: ["Usa protect para acciones sensibles. Los eventos de alto riesgo crean solicitudes de aprobacion."],
        code: `await oberyn.protect("crear_reembolso", async () => {
  return stripe.refunds.create({ payment_intent: paymentIntentId });
}, {
  riskLevel: "high",
  service: { name: "Stripe", provider: "stripe", type: "payments" }
});`,
      },
      {
        title: "Mantenimiento",
        body: ["Cada cambio relacionado a inicializacion, evento, auth, batch, fetch capture, aprobaciones o auditoria debe actualizar docs/sdk.md."],
      },
    ],
  },
  gateway: {
    title: "Oberyn Gateway",
    description: "Guia tecnica para enrutar trafico por proxy, aplicar politicas y registrar actividad auditable.",
    sections: [
      {
        title: "Endpoints administrativos",
        body: ["Estos endpoints requieren Clerk y x-organization-id. Sirven para obtener configuracion y probar el gateway del proyecto."],
        code: "GET /api/projects/:projectId/gateway/config\nPOST /api/projects/:projectId/gateway/test",
      },
      {
        title: "Comportamiento esperado",
        body: ["El gateway debe registrar proveedor, ruta, decision, riesgo, estado HTTP, duracion, hash del evento y payload sanitizado."],
        code: `{
  "eventType": "gateway_request",
  "actionName": "POST api.openai.com/v1/chat/completions",
  "decision": "approved",
  "riskLevel": "medium"
}`,
      },
      {
        title: "Seguridad",
        body: ["No almacenar API keys de proveedores, cookies, tokens ni secretos en metadata. Todo payload debe pasar por redaccion antes de auditarse."],
      },
      {
        title: "Mantenimiento",
        body: ["Cada cambio de config, proxy, redaccion, eventos, politicas, aprobaciones o auditoria debe actualizar docs/gateway.md."],
      },
    ],
  },
};

export function TechnicalDocsPage() {
  const { topic = "sdk" } = useParams();
  const doc = docs[topic] ?? docs.sdk;

  return (
    <main className="min-h-[100dvh] bg-[#fbfcfd] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <AuthBrandLogo />
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#008f1f]">
            <ArrowLeft className="h-4 w-4" />
            Volver al dashboard
          </Link>
        </div>

        <Card className="p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
              <BookOpen className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-3xl font-bold text-slate-950">{doc.title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{doc.description}</p>
              <a href={topic === "gateway" ? getDocsRedirectUrl("gateway") : getDocsRedirectUrl("sdk")} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#008f1f]">
                Endpoint de redirect
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </Card>

        <div className="mt-6 space-y-5">
          {doc.sections.map((section) => (
            <Card key={section.title} className="p-6">
              <h2 className="text-xl font-bold text-slate-950">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-6 text-slate-600">
                  {paragraph}
                </p>
              ))}
              {section.code ? (
                <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                  <code>{section.code}</code>
                </pre>
              ) : null}
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
