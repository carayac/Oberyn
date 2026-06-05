import { useAuth } from "@clerk/react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Hash,
  Info,
  Link as LinkIcon,
  LockKeyhole,
  Mail,
  Play,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useOrganizations } from "../../hooks/useOrganizations";
import { useProjects } from "../../hooks/useProjects";
import { apiClient } from "../../lib/api/client";
import { getProjectAuditRoute } from "../../lib/constants/routes";
import type { EvidenceProof, EvidenceVerification } from "../../types/evidence";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

function formatDate(value?: string | null) {
  if (!value) return "Pendiente";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pendiente";
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function decisionLabel(value: string) {
  if (value === "blocked") return "Bloqueada";
  if (value === "approval_required" || value === "requires_approval") return "Requiere aprobación";
  if (value === "approved") return "Permitida";
  return value;
}

function riskLabel(value: string) {
  if (value === "critical") return "Crítico";
  if (value === "high") return "Alto";
  if (value === "medium") return "Medio";
  return "Bajo";
}

function shortValue(value?: string | null, size = 12) {
  if (!value) return "Pendiente";
  if (value.length <= size * 2 + 3) return value;
  return `${value.slice(0, size)}...${value.slice(-size)}`;
}

function metadataText(metadata: Record<string, unknown> | undefined, keys: string[], fallback = "No disponible") {
  if (!metadata) return fallback;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return fallback;
}

function inferSource(eventType: string, metadata?: Record<string, unknown>) {
  const source = metadataText(metadata, ["source"], "");
  if (source) return source;
  if (eventType.startsWith("gateway")) return "gateway";
  if (eventType.startsWith("sdk")) return "sdk";
  return "api";
}

let logoDataUrlPromise: Promise<string | null> | null = null;

async function getOberynLogoDataUrl() {
  if (logoDataUrlPromise) return logoDataUrlPromise;

  logoDataUrlPromise = (async () => {
    try {
      const response = await fetch("/assets/oberyn-logo.svg");
      const svg = await response.text();
      const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      const image = new Image();
      image.decoding = "async";
      const loaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("No se pudo cargar el logo de Oberyn."));
      });
      image.src = svgUrl;
      await loaded;

      const canvas = document.createElement("canvas");
      canvas.width = 1500;
      canvas.height = 420;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No se pudo preparar el logo para el PDF.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  })();

  return logoDataUrlPromise;
}

function DetailRow({ Icon, label, value, badge }: { Icon: typeof FileText; label: string; value?: string | number | null; badge?: boolean }) {
  return (
    <div className="grid min-w-0 grid-cols-[26px_180px_minmax(0,1fr)] items-center gap-3 border-b border-slate-100 py-3 text-sm">
      <Icon className="h-4 w-4 text-slate-500" />
      <p className="font-semibold text-slate-500">{label}</p>
      {badge ? (
        <span className="w-fit rounded-md bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">{value ?? "Pendiente"}</span>
      ) : (
        <p className="min-w-0 truncate font-semibold text-slate-950" title={String(value ?? "")}>{value ?? "Pendiente"}</p>
      )}
    </div>
  );
}

function ProofRow({ label, value, canCopy, onCopy }: { label: string; value?: string | number | null; canCopy?: boolean; onCopy?: () => void }) {
  return (
    <div className="grid min-w-0 grid-cols-[210px_minmax(0,1fr)_32px] items-center gap-3 border-b border-slate-100 py-3 text-sm">
      <p className="font-semibold text-slate-500">{label}</p>
      <p className="min-w-0 truncate font-mono text-xs font-semibold text-slate-900" title={String(value ?? "")}>{value ?? "Pendiente"}</p>
      {canCopy ? (
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" onClick={onCopy} type="button">
          <Copy className="h-4 w-4" />
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

function TimelineStep({ Icon, title, detail, done }: { Icon: typeof FileText; title: string; detail: string; done: boolean }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
        <Icon className="h-7 w-7" />
      </div>
      <div className="mx-auto mt-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#008f1f] text-white">
        <Check className="h-4 w-4" />
      </div>
      <p className="mt-2 text-sm font-extrabold text-slate-950">{title}</p>
      <p className="mt-1 truncate text-xs font-semibold text-slate-500" title={detail}>{done ? detail : "Pendiente"}</p>
    </div>
  );
}

export function ProjectEvidencePage() {
  const { projectId = "", eventId = "" } = useParams();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { activeOrganization, activeOrganizationId, isLoading: isLoadingOrganizations } = useOrganizations();
  const { projects } = useProjects(activeOrganizationId);
  const [evidence, setEvidence] = useState<EvidenceProof | null>(null);
  const [verification, setVerification] = useState<EvidenceVerification | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isVerifying, setVerifying] = useState(false);
  const [isGeneratingPdf, setGeneratingPdf] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const currentProject = projects.find((project) => project.id === projectId) ?? null;

  const loadEvidence = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !projectId || !eventId || isLoadingOrganizations) return;
    if (!activeOrganizationId) {
      setEvidence(null);
      setLoading(false);
      setMessage("Selecciona o crea una organización para consultar la evidencia.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const token = await getToken();
      const response = await apiClient.get<ApiResponse<EvidenceProof>>(`/projects/${projectId}/evidence/${eventId}`, token, activeOrganizationId);
      setEvidence(response.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la evidencia.");
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId, eventId, getToken, isLoaded, isLoadingOrganizations, isSignedIn, projectId]);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  async function verifyEvidence() {
    if (!activeOrganizationId) {
      setMessage("Selecciona o crea una organización para verificar la evidencia.");
      return;
    }
    setVerifying(true);
    setMessage(null);
    try {
      const token = await getToken();
      const response = await apiClient.post<ApiResponse<EvidenceVerification>>(`/projects/${projectId}/evidence/${eventId}/verify`, {}, token, activeOrganizationId);
      setVerification(response.data);
      setMessage(response.data.verified ? "La evidencia coincide con el evento y el anclaje registrado." : "La evidencia todavía no está completamente verificada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo verificar la evidencia.");
    } finally {
      setVerifying(false);
    }
  }

  async function copyValue(value?: string | null) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setMessage("Valor copiado.");
  }

  async function copyTransparencyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setMessage("Enlace de evidencia copiado.");
  }

  async function downloadEvidencePdf() {
    if (!evidence) return;

    setGeneratingPdf(true);
    setMessage(null);
    try {
      const verified = verification?.verified ?? Boolean(evidence.stellarTxHash);
      const [{ pdf }, { EvidenceReceiptPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../../components/evidence/EvidenceReceiptPdf"),
      ]);
      const logoSrc = await getOberynLogoDataUrl();
      const blob = await pdf(
        <EvidenceReceiptPdf
          generatedAt={new Date().toISOString()}
          logoSrc={logoSrc}
          organization={{
            id: activeOrganization?.id ?? activeOrganizationId ?? "No disponible",
            name: activeOrganization?.name ?? "Organización activa",
            slug: activeOrganization?.slug ?? null,
          }}
          project={{
            id: evidence.projectId,
            name: currentProject?.name ?? evidence.projectId,
            slug: currentProject?.slug ?? null,
            environment: currentProject?.environment ?? metadataText(evidence.metadata, ["environment", "env"], "No especificado"),
          }}
          event={{
            id: evidence.eventId,
            eventType: evidence.eventType,
            actionName: evidence.actionName,
            decision: evidence.decision,
            riskLevel: evidence.riskLevel,
            source: inferSource(evidence.eventType, evidence.metadata),
            serviceName: metadataText(evidence.metadata, ["serviceName", "service", "provider", "serviceProvider"], "Servicio auditado"),
            serviceProvider: metadataText(evidence.metadata, ["serviceProvider", "provider"], "No especificado"),
            actorLabel: metadataText(evidence.metadata, ["actorLabel", "actor", "bot", "agent", "user"], "Agente / SDK"),
            createdAt: evidence.createdAt,
          }}
          evidence={{
            eventHash: evidence.eventHash,
            merkleRoot: evidence.merkleRoot,
            stellarTxHash: evidence.stellarTxHash,
            stellarNetwork: evidence.stellarNetwork ?? "testnet",
            ledger: evidence.ledger,
            batchId: evidence.batchId,
            batchPosition: evidence.batchPosition,
            anchoredAt: evidence.anchoredAt,
            explorerUrl: evidence.explorerUrl,
            verified,
            verifiedAt: verification?.checkedAt ?? null,
            sensitiveDataStoredOnChain: evidence.sensitiveDataStoredOnChain,
          }}
          verification={{
            statusLabel: verified ? "Evento verificado" : "Pendiente de verificación",
            integrityMessage: verified
              ? "El hash del evento coincide con la evidencia registrada y el anclaje disponible."
              : "El evento tiene evidencia criptográfica, pero todavía no se confirmó una verificación completa.",
            publicVerificationUrl: window.location.href,
          }}
        />,
      ).toBlob();

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `oberyn-evidencia-${shortValue(evidence.eventId, 8).replace("...", "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage("Comprobante PDF generado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar el PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5">
      <Link className="inline-flex w-fit items-center gap-2 text-sm font-extrabold text-slate-700 hover:text-[#008f1f]" to={getProjectAuditRoute(projectId)}>
        <ArrowLeft className="h-4 w-4" />
        Volver a auditoría
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_620px]">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-normal text-slate-950">Evidencia verificable</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              Oberyn prueba criptográficamente que los registros de auditoría no han sido alterados desde el momento en que fueron generados.
            </p>
          </div>
          {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</div> : null}
        </div>

        {isLoading ? <p className="mt-6 font-semibold text-slate-500">Cargando evidencia...</p> : null}

        {!isLoading && evidence ? (
          <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_620px]">
            <div className="flex min-w-0 flex-col gap-5">
              <Card className="shadow-none">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
                    <FileText className="h-6 w-6" />
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-950">Detalle del evento</h2>
                </div>
                <div className="mt-4 min-w-0">
                  <DetailRow Icon={Hash} label="ID del evento" value={evidence.eventId} />
                  <DetailRow Icon={Database} label="Proyecto" value={evidence.projectId} />
                  <DetailRow Icon={UserRound} label="Fuente" value={String(evidence.metadata?.bot ?? evidence.metadata?.agent ?? "Agente / SDK")} />
                  <DetailRow Icon={ShieldCheck} label="Servicio" value={String(evidence.metadata?.service ?? evidence.metadata?.provider ?? "Servicio auditado")} />
                  <DetailRow Icon={Play} label="Acción" value={evidence.actionName} />
                  <DetailRow Icon={CheckCircle2} label="Decisión" value={decisionLabel(evidence.decision)} badge />
                  <DetailRow Icon={Clock3} label="Fecha y hora" value={formatDate(evidence.createdAt)} />
                </div>
              </Card>

              <Card className="shadow-none">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
                    <ShieldCheck className="h-6 w-6" />
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-950">Pruebas criptográficas</h2>
                </div>
                <div className="mt-4 min-w-0">
                  <ProofRow label="Hash del evento" value={evidence.eventHash} canCopy onCopy={() => copyValue(evidence.eventHash)} />
                  <ProofRow label="Hash raíz / Merkle Root" value={evidence.merkleRoot} canCopy onCopy={() => copyValue(evidence.merkleRoot)} />
                  <ProofRow label="Estado de verificación" value={evidence.stellarTxHash ? "Verificado en blockchain" : "Pendiente de anclaje"} />
                  <ProofRow label="Red" value={evidence.stellarNetwork ?? "testnet"} />
                  <ProofRow label="Tx hash" value={evidence.stellarTxHash} canCopy onCopy={() => copyValue(evidence.stellarTxHash)} />
                  <ProofRow label="Fecha de anclaje" value={formatDate(evidence.anchoredAt)} />
                </div>

                <div className="mt-6 grid gap-4 rounded-lg border border-emerald-100 bg-white p-4 sm:grid-cols-4">
                  <TimelineStep Icon={FileText} title="Evento generado" detail={formatDate(evidence.createdAt)} done />
                  <TimelineStep Icon={Hash} title="Hash calculado" detail={shortValue(evidence.eventHash, 8)} done={Boolean(evidence.eventHash)} />
                  <TimelineStep Icon={LinkIcon} title="Anclado en Stellar" detail={formatDate(evidence.anchoredAt)} done={Boolean(evidence.stellarTxHash)} />
                  <TimelineStep Icon={ShieldCheck} title="Verificado" detail={verification?.verified ? "Válido" : "Listo para verificar"} done={Boolean(verification?.verified)} />
                </div>
              </Card>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-slate-700">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#008f1f]" />
                  <p>Oberyn utiliza criptografía y Stellar para garantizar la integridad, inmutabilidad y trazabilidad de cada evento de auditoría.</p>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-5">
              <Card className="shadow-none">
                <h2 className="text-xl font-extrabold text-slate-950">Comprobante de auditoría</h2>
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-5">
                  <div className="flex items-start gap-4">
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-[#008f1f] bg-white text-[#008f1f]">
                      <CheckCircle2 className="h-9 w-9" />
                    </span>
                    <div>
                      <p className="text-lg font-extrabold text-[#008f1f]">{evidence.stellarTxHash ? "Evento verificado" : "Pendiente de anclaje"}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        {evidence.stellarTxHash ? "Este registro fue anclado en blockchain y no ha sido alterado." : "Este registro ya tiene hash, pero aún no se ha anclado en Stellar."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-col gap-3">
                    {evidence.explorerUrl ? (
                      <a className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[#008f1f] px-4 text-sm font-extrabold text-white" href={evidence.explorerUrl} target="_blank" rel="noreferrer">
                        Ver en Stellar
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                    <Button variant="secondary" className="h-11 gap-2 font-extrabold" onClick={verifyEvidence} disabled={isVerifying}>
                      <RefreshCw className={isVerifying ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                      Verificar integridad
                    </Button>
                    <Button variant="secondary" className="h-11 gap-2 font-extrabold" onClick={downloadEvidencePdf} disabled={isGeneratingPdf}>
                      <Download className="h-4 w-4" />
                      {isGeneratingPdf ? "Generando PDF..." : "Descargar comprobante PDF"}
                    </Button>
                    <Button variant="secondary" className="h-11 gap-2 font-extrabold" onClick={copyTransparencyLink}>
                      <Clipboard className="h-4 w-4" />
                      Copiar enlace de transparencia
                    </Button>
                  </div>
                  <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <Info className="h-4 w-4 text-[#008f1f]" />
                    No se exponen prompts ni datos sensibles en blockchain.
                  </p>
                </div>
              </Card>

              <Card className="shadow-none">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-extrabold text-slate-950">Opciones de transparencia</h2>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-[#008f1f]">Listo para compartir</span>
                </div>
                <div className="mt-4 divide-y divide-slate-100 text-sm">
                  {[
                    ["Enlace público seguro", "Genera una vista verificable para cualquier persona."],
                    ["Vista solo lectura", "El receptor solo puede ver la evidencia, no modificarla."],
                    ["Ocultar metadatos sensibles", "Se ocultan datos sensibles al compartir públicamente."],
                  ].map(([title, detail]) => (
                    <div key={title} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-950">{title}</p>
                        <p className="truncate font-semibold text-slate-500">{detail}</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#008f1f]" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <Button variant="secondary" className="h-11 gap-2 font-extrabold" onClick={copyTransparencyLink}><LinkIcon className="h-4 w-4" />Por enlace</Button>
                  <Button variant="secondary" className="h-11 gap-2 font-extrabold" onClick={downloadEvidencePdf} disabled={isGeneratingPdf}><FileText className="h-4 w-4" />Exportar PDF</Button>
                  <Button variant="secondary" className="h-11 gap-2 font-extrabold" disabled><Mail className="h-4 w-4" />Enviar</Button>
                </div>
              </Card>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
                <Card className="shadow-none">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
                      <LockKeyhole className="h-5 w-5" />
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-950">Metadatos protegidos</h2>
                  </div>
                  <div className="mt-4 space-y-3 text-xs font-semibold text-slate-700">
                    <div className="flex justify-between gap-4"><span>Contenido de la solicitud</span><span className="text-[#008f1f]">No expuesto</span></div>
                    <div className="flex justify-between gap-4"><span>Respuesta del modelo</span><span className="text-[#008f1f]">No expuesta</span></div>
                    <div className="flex justify-between gap-4"><span>Datos personales</span><span className="text-[#008f1f]">No expuestos</span></div>
                  </div>
                </Card>

                <Card className="shadow-none">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
                      <Database className="h-5 w-5" />
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-950">Vista rápida</h2>
                  </div>
                  <div className="mt-4 space-y-3 text-xs font-semibold text-slate-700">
                    <div className="flex justify-between gap-4"><span>Red</span><span>{evidence.stellarNetwork ?? "testnet"}</span></div>
                    <div className="flex justify-between gap-4"><span>Operación</span><span>manage_data</span></div>
                    <div className="flex justify-between gap-4"><span>Ledger</span><span>{evidence.ledger ?? "Pendiente"}</span></div>
                    <div className="flex justify-between gap-4"><span>Índice</span><span>{evidence.batchPosition ?? "Pendiente"}</span></div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
