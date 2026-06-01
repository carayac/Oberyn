import { CloudCog, Copy, Play, Route, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { SecurityPageFrame } from "../../components/projects/SecurityPageFrame";
import { useProjectSecurity } from "../../hooks/useProjectSecurity";

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="min-w-0 overflow-x-auto rounded-lg bg-[#0f172a] p-4 text-sm leading-6 text-slate-100">
      <code>{code}</code>
    </pre>
  );
}

export function ProjectGatewayPage() {
  const { projectId } = useParams();
  const { gatewayConfig, error, runGatewayTest } = useProjectSecurity(projectId);
  const [result, setResult] = useState<unknown>(null);

  const baseUrl = gatewayConfig?.examples.openaiBaseUrl ?? "http://localhost:4000/gateway/v1/openai/v1";
  const openAiExample = `import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "${baseUrl}",
  defaultHeaders: {
    "x-oberyn-key": process.env.OBERYN_PROJECT_KEY
  }
});`;

  const curlExample = `curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -H "x-oberyn-key: $OBERYN_PROJECT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-4.1-mini","messages":[{"role":"user","content":"Hola"}]}'`;

  return (
    <SecurityPageFrame
      title="Gateway"
      description="Inspecciona trafico hacia modelos y APIs externas. Tu app conserva las llaves del proveedor; Oberyn aplica reglas antes de enviar la solicitud."
    >
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="min-w-0 rounded-xl border border-[#dce2ea] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-extrabold uppercase tracking-wide text-[#00951d]">Endpoint local</p>
              <h2 className="mt-2 break-all text-2xl font-extrabold text-[#050505]">{baseUrl}</h2>
              <p className="mt-2 text-sm font-semibold text-[#596783]">Proveedores activos: {(gatewayConfig?.providers ?? ["openai", "anthropic"]).join(", ")}</p>
            </div>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(baseUrl)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#dce2ea] px-4 text-sm font-extrabold text-[#111827]"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </button>
          </div>

          <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-2">
            <div className="min-w-0">
              <h3 className="mb-3 text-base font-extrabold text-[#050505]">OpenAI compatible</h3>
              <CodeBlock code={openAiExample} />
            </div>
            <div className="min-w-0">
              <h3 className="mb-3 text-base font-extrabold text-[#050505]">cURL</h3>
              <CodeBlock code={curlExample} />
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-xl border border-[#dce2ea] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:p-6">
            <CloudCog className="h-8 w-8 text-[#00951d]" />
            <h2 className="mt-4 text-xl font-extrabold text-[#050505]">Que inspecciona</h2>
            <div className="mt-4 space-y-3 text-sm font-semibold leading-6 text-[#596783]">
              <p className="flex gap-2"><Route className="mt-1 h-4 w-4 shrink-0 text-[#00951d]" /> Prompts, modelos, rutas y proveedor usado.</p>
              <p className="flex gap-2"><ShieldAlert className="mt-1 h-4 w-4 shrink-0 text-[#00951d]" /> Secretos, datos sensibles y riesgo antes del upstream.</p>
            </div>
            <button
              type="button"
              onClick={() => void runGatewayTest().then(setResult)}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00951d] px-4 text-sm font-extrabold text-white"
            >
              <Play className="h-4 w-4" />
              Probar gateway
            </button>
          </article>
        </aside>
      </section>

      <article className="min-w-0 rounded-xl border border-[#dce2ea] bg-white p-4 sm:p-6">
        <h2 className="mb-4 text-xl font-extrabold text-[#050505]">Resultado de prueba</h2>
        <CodeBlock code={JSON.stringify(result ?? { status: "sin prueba" }, null, 2)} />
      </article>
    </SecurityPageFrame>
  );
}
