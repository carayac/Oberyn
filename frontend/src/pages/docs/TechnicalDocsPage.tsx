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
    description: "Guía técnica para conectar una aplicación, proteger prompts, gobernar tool calls y enviar eventos al dashboard del proyecto.",
    sections: [
      {
        title: "Endpoints runtime",
        body: ["El SDK evalúa acciones antes de ejecutarlas y envía eventos usando una clave pública del proyecto en el header x-oberyn-key."],
        code: "POST /api/sdk/evaluate\nPOST /api/sdk/audit\nPOST /api/sdk/events\nPOST /api/sdk/events/batch\nPOST /api/sdk/heartbeat",
      },
      {
        title: "Inicialización",
        body: ["Instala el paquete local oberyn e inicialízalo con la clave del proyecto."],
        code: `import { createOberyn } from "oberyn";

export const oberyn = createOberyn({
  apiKey: "ob_pk_...",
  endpoint: "http://localhost:4000/api/sdk/events",
  service: { name: "mi-app", provider: "custom", type: "app" },
  environment: "production",
  captureFetch: true,
  failMode: "closed"
});`,
      },
      {
        title: "Prompts",
        body: ["Usa shield.protect para inspeccionar prompts, enmascarar datos sensibles comunes y auditar la llamada al modelo."],
        code: `const result = await oberyn.shield.protect({
  prompt: userInput,
  provider: "openai",
  model: "gpt-4o"
}, async (safePrompt) => callModel(safePrompt));`,
      },
      {
        title: "Acciones críticas",
        body: ["Usa protect para acciones sensibles. Oberyn puede aprobar, bloquear o crear una solicitud de aprobación antes de ejecutar tu función."],
        code: `await oberyn.proof.guard({
  name: "payment.refund",
  target: "stripe",
  riskLevel: "critical",
  arguments: { paymentIntentId }
}, async () => {
  return stripe.refunds.create({ payment_intent: paymentIntentId });
});`,
      },
      {
        title: "Mantenimiento",
        body: ["Cada cambio relacionado a inicialización, evento, auth, batch, fetch capture, decisiones, aprobaciones o auditoría debe actualizar docs/sdk.md."],
      },
    ],
  },
  gateway: {
    title: "Oberyn Gateway",
    description: "Modulo en desarrollo para futuras versiones de Oberyn. La configuracion, endpoints y pruebas runtime permanecen ocultas hasta que el Gateway este listo.",
    sections: [
      {
        title: "Estado",
        body: ["Gateway estara disponible en futuras versiones. Por ahora no se exponen tokens, endpoints, pruebas de trafico ni configuracion operativa desde la interfaz."],
      },
      {
        title: "Que se habilitara",
        body: ["El Gateway se planea como un proxy seguro para modelos y APIs externas, con inspeccion de trafico, politicas centralizadas y auditoria de requests."],
      },
      {
        title: "Mientras tanto",
        body: ["Usa el SDK de Oberyn para proteger prompts, guardar eventos de auditoria y controlar acciones sensibles dentro de tus aplicaciones."],
      },
      {
        title: "Mantenimiento",
        body: ["Cuando el modulo se reactive, la documentacion publica debera actualizarse antes de exponer configuracion o guias de conexion."],
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
              {topic === "gateway" ? null : (
                <a href={getDocsRedirectUrl("sdk")} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#008f1f]">
                  Endpoint de redirect
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
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



