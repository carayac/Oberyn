import { CheckCircle2, Clipboard, KeyRound, LockKeyhole, Play, ShieldCheck, Trash2 } from "lucide-react";
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

export function ProjectSDKPage() {
  const { projectId } = useParams();
  const { sdkConfig, secretKey, isLoading, isMutating, error, createKey, revokeKey, runSdkTest } = useProjectSecurity(projectId);
  const [testResult, setTestResult] = useState<unknown>(null);

  async function handleTest() {
    setTestResult(await runSdkTest());
  }

  const guardExample = `import { OberynClient } from "@oberyn/sdk";

const oberyn = new OberynClient({
  projectKey: process.env.OBERYN_PROJECT_KEY
});

await oberyn.guard({
  bot: "bot-soporte",
  action: "send_email",
  service: "gmail",
  risk: "medium",
  payload,
  execute: () => sendEmail(payload)
});`;

  return (
    <SecurityPageFrame
      title="SDK"
      description="Protege acciones criticas desde tu codigo sin entregar credenciales privadas. Oberyn decide, bloquea o pide aprobacion antes de ejecutar."
    >
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <article className="min-w-0 rounded-xl border border-[#dce2ea] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wide text-[#00951d]">Llaves de proyecto</p>
              <h2 className="mt-2 text-2xl font-extrabold text-[#050505]">Conecta tu codigo</h2>
            </div>
            <button
              type="button"
              onClick={() => void createKey("SDK + Gateway")}
              disabled={isMutating}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#00951d] px-4 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(0,149,29,0.18)] disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" />
              Crear llave
            </button>
          </div>

          {secretKey && (
            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Copia esta llave ahora. Luego solo veras el prefijo.
              </div>
              <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row">
                <code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-white px-3 py-2 text-sm font-bold text-slate-900">{secretKey}</code>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(secretKey)}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-extrabold text-emerald-800"
                >
                  <Clipboard className="h-4 w-4" />
                  Copiar
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 overflow-hidden rounded-lg border border-[#dce2ea]">
            {(sdkConfig?.apiKeys ?? []).map((apiKey) => (
              <div key={apiKey.id} className="flex flex-col gap-3 border-b border-[#edf1f5] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold text-slate-950">{apiKey.name}</p>
                  <p className="mt-1 text-sm font-semibold text-[#596783]">{apiKey.keyPrefix}... · {apiKey.status}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void revokeKey(apiKey.id)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose-200 px-3 text-sm font-extrabold text-rose-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Revocar
                </button>
              </div>
            ))}
            {!isLoading && !sdkConfig?.apiKeys.length && <p className="p-4 text-sm font-bold text-[#596783]">Aun no hay llaves. Crea una para empezar a proteger acciones.</p>}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-xl border border-[#dce2ea] bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] sm:p-6">
            <ShieldCheck className="h-8 w-8 text-[#00951d]" />
            <h2 className="mt-4 text-xl font-extrabold text-[#050505]">Como decide Oberyn</h2>
            <ul className="mt-4 space-y-3 text-sm font-semibold leading-6 text-[#596783]">
              <li>Valida reglas del proyecto antes de ejecutar.</li>
              <li>Bloquea secretos, datos sensibles y riesgo critico.</li>
              <li>Registra auditoria aunque la accion sea bloqueada.</li>
              <li>Marca integraciones detectadas por trafico real.</li>
            </ul>
            <button
              type="button"
              onClick={() => void handleTest()}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#dce2ea] bg-white px-4 text-sm font-extrabold text-[#111827]"
            >
              <Play className="h-4 w-4" />
              Probar decision SDK
            </button>
          </article>
        </aside>
      </section>

      <section className="grid min-w-0 gap-4 xl:grid-cols-2">
        <article className="min-w-0 rounded-xl border border-[#dce2ea] bg-white p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-[#050505]">
            <LockKeyhole className="h-5 w-5 text-[#00951d]" />
            Ejemplo de guard
          </h2>
          <CodeBlock code={guardExample} />
        </article>
        <article className="min-w-0 rounded-xl border border-[#dce2ea] bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-xl font-extrabold text-[#050505]">Resultado de prueba</h2>
          <CodeBlock code={JSON.stringify(testResult ?? { status: "sin prueba" }, null, 2)} />
        </article>
      </section>
    </SecurityPageFrame>
  );
}
