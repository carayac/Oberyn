import {
  AlertTriangle,
  Ban,
  Banknote,
  Bot,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useOrganizations } from "../../hooks/useOrganizations";
import { usePayGuard } from "../../hooks/usePayGuard";
import { useProjects } from "../../hooks/useProjects";
import type { CreatePaymentAgentPayload, CreatePaymentRequestPayload, PaymentAgent, PaymentAuditLog, PaymentRequest, PaymentRequestStatus, PaymentRiskLevel, UpsertTrustedWalletPayload } from "../../types/payguard";

const ACTIVE_PROJECT_KEY = "oberyn.activeProjectId";
const ACTIVE_PROJECT_EVENT = "oberyn:active-project-change";
const PAYMENT_REQUESTS_PAGE_SIZE = 6;
const PAYMENT_AUDIT_PAGE_SIZE = 5;

function formatMoney(amount: number, token: string) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} ${token}`;
}

function formatNumber(amount: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function shortValue(value?: string | null) {
  if (!value) return "Pendiente";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function riskLabel(risk: PaymentRiskLevel) {
  if (risk === "high") return "Alto";
  if (risk === "medium") return "Medio";
  return "Bajo";
}

function riskClass(risk: PaymentRiskLevel) {
  if (risk === "high") return "bg-red-50 text-red-700";
  if (risk === "medium") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function statusLabel(status: PaymentRequestStatus) {
  const labels: Record<PaymentRequestStatus, string> = {
    draft: "Borrador",
    pending_approval: "Pendiente",
    requires_multi_approval: "Requiere revisión",
    approved: "Aprobada",
    rejected: "Rechazada",
    blocked: "Bloqueada",
    escrow_created: "Pago preparado",
    funded: "Fondos reservados",
    released: "Pago enviado",
    failed: "Fallida",
  };
  return labels[status];
}

function statusClass(status: PaymentRequestStatus) {
  if (status === "blocked" || status === "failed") return "bg-red-50 text-red-700";
  if (status === "rejected") return "bg-slate-100 text-slate-700";
  if (status === "pending_approval" || status === "requires_multi_approval") return "bg-amber-50 text-amber-700";
  if (status === "released" || status === "funded" || status === "escrow_created" || status === "approved") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-50 text-slate-700";
}

function clampPage(page: number, totalItems: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return Math.min(Math.max(1, page), totalPages);
}

function PaginationControls({
  page,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= pageSize) return null;

  const totalPages = Math.ceil(totalItems / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span>
        {start}-{end} de {totalItems}
      </span>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="h-9 px-3" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <Button type="button" variant="secondary" className="h-9 px-3" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}

function PermissionPill({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span className={enabled ? "inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700" : "inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600"}>
      {enabled ? "Si" : "No"} - {label}
    </span>
  );
}

function StatCard({ label, value, detail, Icon }: { label: string; value: string | number; detail: string; Icon: typeof ShieldCheck }) {
  return (
    <Card className="p-5">
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]">
          <Icon className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-extrabold leading-tight text-slate-950">{value}</p>
          <p className="truncate text-sm font-semibold text-slate-500">{detail}</p>
        </div>
      </div>
    </Card>
  );
}

function AgentList({ agents }: { agents: PaymentAgent[] }) {
  return (
    <Card className="p-0">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-extrabold text-slate-950">Agentes de pago</h2>
      </div>
      <div className="grid gap-4 p-4 xl:grid-cols-3">
        {agents.map((agent) => (
          <div key={agent.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <span className={agent.status === "blocked" ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600" : "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#008f1f]"}>
                  <Bot className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-slate-950" title={agent.name}>{agent.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Max {formatNumber(agent.maxAmount)}</p>
                </div>
              </div>
              <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${agent.status === "blocked" ? "bg-red-50 text-red-700" : agent.status === "paused" ? "bg-slate-100 text-slate-700" : "bg-emerald-50 text-emerald-700"}`}>
                {agent.status}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-md px-2 py-1 text-xs font-bold ${riskClass(agent.riskLevel)}`}>Riesgo {riskLabel(agent.riskLevel)}</span>
              <PermissionPill enabled={agent.canCreatePaymentRequest} label="crear" />
              <PermissionPill enabled={agent.canApprovePayment} label="aprobar" />
              <PermissionPill enabled={agent.canExecutePayment} label="ejecutar" />
            </div>
          </div>
        ))}
        {!agents.length ? <p className="p-4 text-sm font-semibold text-slate-500">No hay agentes de pago configurados.</p> : null}
      </div>
    </Card>
  );
}

function TrustlessWorkPanel({ isMockMode, message, baseUrl, network, docsUrl }: { isMockMode: boolean; message: string; baseUrl: string; network: string; docsUrl: string }) {
  return (
    <Card className={isMockMode ? "border-amber-200 bg-amber-50/50 p-5" : "border-emerald-200 bg-emerald-50/40 p-5"}>
      <div className="flex gap-4">
        <span className={isMockMode ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700" : "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#008f1f]"}>
          <Link2 className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-extrabold text-slate-950">Trustless Work</h2>
            {isMockMode ? <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-extrabold text-amber-800">Trustless Work Mock Mode</span> : <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-extrabold text-emerald-800">Live</span>}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2">
            <span className="truncate">Network: {network}</span>
            <span className="truncate" title={baseUrl}>Base URL: {baseUrl || "mock"}</span>
          </div>
          <a href={docsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#008f1f]">
            Ver docs Trustless Work
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </Card>
  );
}

function PayGuardConfigPanel({
  onCreateAgent,
  onUpsertWallet,
  disabled,
}: {
  onCreateAgent: (payload: CreatePaymentAgentPayload) => Promise<void>;
  onUpsertWallet: (payload: UpsertTrustedWalletPayload) => Promise<void>;
  disabled?: boolean;
}) {
  const [agentForm, setAgentForm] = useState<CreatePaymentAgentPayload>({
    name: "",
    maxAmount: 0,
    riskLevel: "low",
    status: "active",
    canCreatePaymentRequest: true,
  });
  const [walletForm, setWalletForm] = useState<UpsertTrustedWalletPayload>({
    recipientName: "",
    walletAddress: "",
    token: "",
    isVerified: true,
  });

  const canCreateAgent = Boolean(agentForm.name.trim() && agentForm.maxAmount > 0);
  const canSaveWallet = Boolean(walletForm.recipientName.trim() && walletForm.walletAddress.trim() && walletForm.token.trim());

  return (
    <Card className="p-5">
      <h2 className="text-lg font-extrabold text-slate-950">Configuracion PayGuard</h2>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <form
          className="grid gap-4 rounded-lg border border-slate-200 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onCreateAgent(agentForm).then(() => setAgentForm({ name: "", maxAmount: 0, riskLevel: "low", status: "active", canCreatePaymentRequest: true }));
          }}
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
            <label className="text-sm font-bold text-slate-700">
              Agente
              <Input className="mt-2" required value={agentForm.name} onChange={(event) => setAgentForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Maximo
              <Input className="mt-2" min="1" required step="0.01" type="number" value={agentForm.maxAmount} onChange={(event) => setAgentForm((current) => ({ ...current, maxAmount: Number(event.target.value) }))} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">
              Riesgo
              <Select className="mt-2" value={agentForm.riskLevel} onChange={(event) => setAgentForm((current) => ({ ...current, riskLevel: event.target.value as PaymentRiskLevel }))}>
                <option value="low">Bajo</option>
                <option value="medium">Medio</option>
                <option value="high">Alto</option>
              </Select>
            </label>
            <label className="text-sm font-bold text-slate-700">
              Estado
              <Select className="mt-2" value={agentForm.status} onChange={(event) => setAgentForm((current) => ({ ...current, status: event.target.value as CreatePaymentAgentPayload["status"] }))}>
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
                <option value="blocked">Bloqueado</option>
              </Select>
            </label>
          </div>
          <Button type="submit" disabled={disabled || !canCreateAgent} className="h-11 gap-2">
            <PlusCircle className="h-4 w-4" />
            Guardar agente
          </Button>
        </form>

        <form
          className="grid gap-4 rounded-lg border border-slate-200 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onUpsertWallet(walletForm).then(() => setWalletForm({ recipientName: "", walletAddress: "", token: "", isVerified: true }));
          }}
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
            <label className="text-sm font-bold text-slate-700">
              Destinatario
              <Input className="mt-2" required value={walletForm.recipientName} onChange={(event) => setWalletForm((current) => ({ ...current, recipientName: event.target.value }))} />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Token
              <Input className="mt-2" required value={walletForm.token} onChange={(event) => setWalletForm((current) => ({ ...current, token: event.target.value.toUpperCase() }))} />
            </label>
          </div>
          <label className="text-sm font-bold text-slate-700">
            Wallet Stellar
            <Input className="mt-2 font-mono text-xs" required value={walletForm.walletAddress} onChange={(event) => setWalletForm((current) => ({ ...current, walletAddress: event.target.value.trim() }))} />
          </label>
          <Button type="submit" disabled={disabled || !canSaveWallet} className="h-11 gap-2">
            <Wallet className="h-4 w-4" />
            Guardar wallet
          </Button>
        </form>
      </div>
    </Card>
  );
}

function RequestForm({
  agents,
  trustedWallets,
  onSubmit,
  disabled,
}: {
  agents: PaymentAgent[];
  trustedWallets: Array<{ recipientName: string; walletAddress: string; token: string }>;
  onSubmit: (payload: CreatePaymentRequestPayload) => Promise<void>;
  disabled?: boolean;
}) {
  const firstAgent = agents.find((agent) => agent.status === "active" && agent.canCreatePaymentRequest) ?? agents[0];
  const firstWallet = trustedWallets[0];
  const [form, setForm] = useState<CreatePaymentRequestPayload>({
    agentId: firstAgent?.id ?? "",
    recipientName: firstWallet?.recipientName ?? "",
    recipientWallet: firstWallet?.walletAddress ?? "",
    amount: 0,
    token: firstWallet?.token ?? "",
    reason: "",
    riskLevel: "low",
  });

  useEffect(() => {
    setForm((current) => {
      const currentAgentExists = agents.some((agent) => agent.id === current.agentId);
      const currentWallet = trustedWallets.find((wallet) => wallet.walletAddress === current.recipientWallet);
      const selectedWallet = currentWallet ?? firstWallet;

      return {
        ...current,
        agentId: currentAgentExists ? current.agentId : firstAgent?.id ?? "",
        recipientName: selectedWallet?.recipientName ?? "",
        recipientWallet: selectedWallet?.walletAddress ?? "",
        token: selectedWallet?.token ?? "",
        amount: currentAgentExists && currentWallet ? current.amount : 0,
        reason: currentAgentExists && currentWallet ? current.reason : "",
      };
    });
  }, [agents, firstAgent?.id, firstWallet, trustedWallets]);

  const isFormReady = Boolean(form.agentId && form.recipientName && form.recipientWallet && form.token && form.reason && form.amount > 0);

  return (
    <Card className="p-5">
      <h2 className="text-lg font-extrabold text-slate-950">Nueva solicitud de pago</h2>
      <form
        className="mt-5 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(form);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">
            Agente
            <Select className="mt-2" disabled={!agents.length} value={form.agentId} onChange={(event) => setForm((current) => ({ ...current, agentId: event.target.value }))}>
              {!agents.length ? <option value="">Sin agentes configurados</option> : null}
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            Riesgo declarado
            <Select className="mt-2" value={form.riskLevel} onChange={(event) => setForm((current) => ({ ...current, riskLevel: event.target.value as PaymentRiskLevel }))}>
              <option value="low">Bajo</option>
              <option value="medium">Medio</option>
              <option value="high">Alto</option>
            </Select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
          <label className="text-sm font-bold text-slate-700">
            Destinatario
            <Input className="mt-2" required value={form.recipientName} onChange={(event) => setForm((current) => ({ ...current, recipientName: event.target.value }))} />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Token
            <Input className="mt-2" required value={form.token} onChange={(event) => setForm((current) => ({ ...current, token: event.target.value.toUpperCase() }))} />
          </label>
        </div>
        <label className="text-sm font-bold text-slate-700">
          Wallet destino
          <Input className="mt-2 font-mono text-xs" required value={form.recipientWallet} onChange={(event) => setForm((current) => ({ ...current, recipientWallet: event.target.value }))} />
        </label>
        <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
          <label className="text-sm font-bold text-slate-700">
            Monto
            <Input className="mt-2" min="1" required step="0.01" type="number" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value) }))} />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Motivo
            <Input className="mt-2" required value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
          </label>
        </div>
        <Button type="submit" disabled={disabled || !agents.length || !trustedWallets.length || !isFormReady} className="h-11 gap-2">
          <Banknote className="h-4 w-4" />
          Crear solicitud
        </Button>
      </form>
    </Card>
  );
}

function RequestsTable({
  requests,
  selectedId,
  onSelect,
}: {
  requests: PaymentRequest[];
  selectedId?: string | null;
  onSelect: (requestId: string) => void;
}) {
  const [page, setPage] = useState(1);
  const safePage = clampPage(page, requests.length, PAYMENT_REQUESTS_PAGE_SIZE);
  const visibleRequests = requests.slice((safePage - 1) * PAYMENT_REQUESTS_PAGE_SIZE, safePage * PAYMENT_REQUESTS_PAGE_SIZE);

  useEffect(() => {
    setPage((current) => clampPage(current, requests.length, PAYMENT_REQUESTS_PAGE_SIZE));
  }, [requests.length]);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-extrabold text-slate-950">Solicitudes de pago</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[160px]" />
            <col />
            <col className="w-[140px]" />
            <col className="w-[120px]" />
            <col className="w-[150px]" />
            <col className="w-[155px]" />
          </colgroup>
          <thead className="bg-slate-50 text-xs font-extrabold text-slate-500">
            <tr>
              <th className="px-4 py-3">Solicitud</th>
              <th className="px-4 py-3">Destinatario</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Riesgo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Comprobante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRequests.map((request) => (
              <tr key={request.id} className={selectedId === request.id ? "cursor-pointer bg-emerald-50/70" : "cursor-pointer hover:bg-slate-50"} onClick={() => onSelect(request.id)}>
                <td className="px-4 py-4">
                  <p className="font-mono text-xs font-bold text-slate-700">{shortValue(request.id)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{formatDate(request.createdAt)}</p>
                </td>
                <td className="min-w-0 px-4 py-4">
                  <p className="truncate font-extrabold text-slate-950" title={request.recipientName}>{request.recipientName}</p>
                  <p className="mt-1 truncate font-mono text-xs text-slate-500" title={request.recipientWallet}>{shortValue(request.recipientWallet)}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-4 font-bold text-slate-900">{formatMoney(request.amount, request.token)}</td>
                <td className="px-4 py-4">
                  <span className={`rounded-md px-2.5 py-1 text-xs font-extrabold ${riskClass(request.riskLevel)}`}>{riskLabel(request.riskLevel)}</span>
                </td>
                <td className="px-4 py-4">
                  <span className={`rounded-md px-2.5 py-1 text-xs font-extrabold ${statusClass(request.status)}`}>{statusLabel(request.status)}</span>
                </td>
                <td className="px-4 py-4">
                  <p className="truncate font-mono text-xs text-slate-700" title={request.txHash ?? request.escrowId ?? ""}>{shortValue(request.txHash ?? request.escrowId)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{request.status === "released" ? "Transferido" : request.escrowId ? "En proceso" : "Pendiente"}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!requests.length ? <p className="px-5 py-8 text-sm font-semibold text-slate-500">Aun no hay solicitudes de PayGuard.</p> : null}
      <PaginationControls page={safePage} totalItems={requests.length} pageSize={PAYMENT_REQUESTS_PAGE_SIZE} onPageChange={setPage} />
    </Card>
  );
}

function AuditPanel({ request, logs }: { request: PaymentRequest | null; logs: PaymentAuditLog[] }) {
  const [page, setPage] = useState(1);
  const filteredLogs = request ? logs.filter((log) => log.paymentRequestId === request.id) : logs;
  const safePage = clampPage(page, filteredLogs.length, PAYMENT_AUDIT_PAGE_SIZE);
  const visibleLogs = filteredLogs.slice((safePage - 1) * PAYMENT_AUDIT_PAGE_SIZE, safePage * PAYMENT_AUDIT_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [request?.id]);

  useEffect(() => {
    setPage((current) => clampPage(current, filteredLogs.length, PAYMENT_AUDIT_PAGE_SIZE));
  }, [filteredLogs.length]);

  return (
    <Card className="p-5">
      <h2 className="text-lg font-extrabold text-slate-950">Panel de auditoria</h2>
      {request ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Action hash</p>
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <p className="min-w-0 flex-1 break-all font-mono text-xs font-semibold text-slate-800">{request.auditHash}</p>
            <Copy className="h-4 w-4 shrink-0 text-slate-500" />
          </div>
        </div>
      ) : null}
      <div className="mt-5 space-y-3">
        {visibleLogs.map((log) => (
          <div key={log.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-slate-950">{log.action}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{log.actorType} - {formatDate(log.timestamp)}</p>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${statusClass(log.newStatus)}`}>{statusLabel(log.newStatus)}</span>
            </div>
            <p className="mt-3 break-all font-mono text-xs text-slate-600">{shortValue(log.actionHash)}</p>
          </div>
        ))}
        {!visibleLogs.length ? <p className="text-sm font-semibold text-slate-500">Selecciona una solicitud para ver su historial.</p> : null}
      </div>
      <PaginationControls page={safePage} totalItems={filteredLogs.length} pageSize={PAYMENT_AUDIT_PAGE_SIZE} onPageChange={setPage} />
    </Card>
  );
}

function RequestActions({
  request,
  approvalsCount,
  onApproveAndPay,
  onReject,
  onBlock,
  canSubmitTransactions,
  disabled,
}: {
  request: PaymentRequest | null;
  approvalsCount: number;
  onApproveAndPay: () => void;
  onReject: () => void;
  onBlock: () => void;
  canSubmitTransactions: boolean;
  disabled?: boolean;
}) {
  if (!request) {
    return (
      <Card className="p-5">
        <h2 className="text-lg font-extrabold text-slate-950">Acciones humanas</h2>
        <p className="mt-3 text-sm font-semibold text-slate-500">Selecciona una solicitud para decidir si el pago se envía o se bloquea.</p>
      </Card>
    );
  }

  const canApproveAndPay = canSubmitTransactions && (request.status === "pending_approval" || request.status === "requires_multi_approval" || request.status === "approved" || request.status === "escrow_created" || request.status === "funded");
  const canReject = ["pending_approval", "requires_multi_approval", "approved"].includes(request.status);
  const canBlock = ["pending_approval", "requires_multi_approval", "approved", "escrow_created"].includes(request.status);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-950">Acciones humanas</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Aprobaciones registradas: {approvalsCount}</p>
        </div>
        <span className={`rounded-md px-2.5 py-1 text-xs font-extrabold ${statusClass(request.status)}`}>{statusLabel(request.status)}</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_160px]">
        <Button type="button" disabled={disabled || !canApproveAndPay} onClick={onApproveAndPay} className="min-h-11 gap-2 whitespace-normal text-center leading-tight">
          <CheckCircle2 className="h-4 w-4" />
          Aprobar y enviar pago
        </Button>
        <Button type="button" variant="secondary" disabled={disabled || !canReject} onClick={onReject} className="gap-2 text-red-600">
          <XCircle className="h-4 w-4" />
          Rechazar
        </Button>
        <Button type="button" variant="secondary" disabled={disabled || !canBlock} onClick={onBlock} className="gap-2">
          <Ban className="h-4 w-4" />
          Bloquear
        </Button>
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-extrabold text-slate-950">Proceso protegido</p>
        <div className="mt-3 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-3">
          <span className={request.escrowId ? "text-emerald-700" : ""}>1. Reserva segura</span>
          <span className={request.status === "funded" || request.status === "released" ? "text-emerald-700" : ""}>2. Fondos reservados</span>
          <span className={request.status === "released" ? "text-emerald-700" : ""}>3. Pago enviado</span>
        </div>
        {request.escrowId ? <p className="mt-3 break-all font-mono text-xs text-slate-500">Referencia Trustless Work: {request.escrowId}</p> : null}
        {request.txHash ? <p className="mt-2 break-all font-mono text-xs text-slate-500">Última transacción: {request.txHash}</p> : null}
      </div>
      {!canSubmitTransactions ? <p className="mt-3 text-xs font-semibold text-slate-500">Trustless Work debe estar en live para enviar pagos reales.</p> : null}
    </Card>
  );
}

export function ProjectPayGuardPage() {
  const { projectId = "" } = useParams();
  const { activeOrganization } = useOrganizations();
  const { projects } = useProjects(activeOrganization?.id);
  const selectedProject = projects.find((project) => project.id === projectId) ?? projects[0] ?? null;
  const payguard = usePayGuard(selectedProject?.id, activeOrganization?.id);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isWorking, setWorking] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
    window.dispatchEvent(new CustomEvent(ACTIVE_PROJECT_EVENT, { detail: { projectId } }));
  }, [projectId]);

  useEffect(() => {
    if (selectedRequestId && payguard.requests.some((request) => request.id === selectedRequestId)) return;
    setSelectedRequestId(payguard.requests[0]?.id ?? null);
  }, [payguard.requests, selectedRequestId]);

  const selectedRequest = payguard.requests.find((request) => request.id === selectedRequestId) ?? payguard.requests[0] ?? null;
  const approvalsCount = selectedRequest ? payguard.approvals.filter((approval) => approval.paymentRequestId === selectedRequest.id && approval.status === "approved").length : 0;

  const stats = useMemo(() => {
    const pending = payguard.requests.filter((request) => request.status === "pending_approval" || request.status === "requires_multi_approval").length;
    const blocked = payguard.requests.filter((request) => request.status === "blocked").length;
    const onChain = payguard.requests.filter((request) => ["escrow_created", "funded", "released"].includes(request.status)).length;
    return { pending, blocked, onChain };
  }, [payguard.requests]);

  const payguardFormKey = useMemo(
    () => `${payguard.agents.map((agent) => agent.id).join(",")}|${payguard.trustedWallets.map((wallet) => wallet.walletAddress).join(",")}`,
    [payguard.agents, payguard.trustedWallets],
  );

  async function runAction(action: () => Promise<unknown>, success: string) {
    setWorking(true);
    setMessage(null);
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la accion.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-6">
      <section className="rounded-lg border border-slate-200 bg-white/70 p-7 shadow-soft sm:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-extrabold tracking-normal text-slate-950">PayGuard</h1>
              {payguard.trustlessWork.isMockMode ? <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-800">Trustless Work Mock Mode</span> : null}
            </div>
            <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-slate-600">
              El agente propone. La persona aprueba. Oberyn ejecuta el pago en blockchain.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void runAction(payguard.reloadPayGuard, "PayGuard actualizado.")} disabled={payguard.isLoading || isWorking} className="h-11 gap-2">
            <RefreshCw className={payguard.isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Actualizar
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Agentes activos" value={payguard.agents.filter((agent) => agent.status === "active").length} detail="Pueden proponer pagos" Icon={Bot} />
          <StatCard label="Pendientes" value={stats.pending} detail="Esperan humano" Icon={Clock3} />
          <StatCard label="Bloqueadas" value={stats.blocked} detail="Politica aplicada" Icon={AlertTriangle} />
          <StatCard label="On-chain" value={stats.onChain} detail="Escrow/fund/release" Icon={ShieldCheck} />
        </div>

        {message ? <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
        {payguard.error ? <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{payguard.error}</p> : null}
      </section>

      <PayGuardConfigPanel
        disabled={isWorking}
        onCreateAgent={(payload) => runAction(() => payguard.createAgent(payload), "Agente PayGuard guardado.")}
        onUpsertWallet={(payload) => runAction(() => payguard.upsertTrustedWallet(payload), "Wallet verificada guardada.")}
      />

      <AgentList agents={payguard.agents} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <RequestForm
          key={payguardFormKey}
          agents={payguard.agents}
          trustedWallets={payguard.trustedWallets}
          disabled={isWorking}
          onSubmit={(payload) => runAction(() => payguard.createPaymentRequest(payload), "Solicitud creada y evaluada por politicas.")}
        />
        <TrustlessWorkPanel {...payguard.trustlessWork} />
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.4fr)_minmax(380px,0.75fr)]">
        <RequestsTable requests={payguard.requests} selectedId={selectedRequest?.id} onSelect={setSelectedRequestId} />
        <RequestActions
          request={selectedRequest}
          approvalsCount={approvalsCount}
          disabled={isWorking}
          onApproveAndPay={() => selectedRequest && void runAction(() => payguard.approveAndPay(selectedRequest.id), "Pago aprobado y enviado correctamente.")}
          onReject={() => selectedRequest && void runAction(() => payguard.reject(selectedRequest.id), "Solicitud rechazada.")}
          onBlock={() => selectedRequest && void runAction(() => payguard.block(selectedRequest.id), "Solicitud bloqueada.")}
          canSubmitTransactions={payguard.trustlessWork.canSubmitTransactions}
        />
      </div>

      <AuditPanel request={selectedRequest} logs={payguard.auditLogs} />

      <Card className="border-emerald-200 bg-emerald-50/40 p-5">
        <div className="flex gap-4">
          <FileText className="h-6 w-6 shrink-0 text-[#008f1f]" />
          <p className="text-sm font-semibold leading-6 text-slate-700">
            Un agente puede crear solicitudes, pero no puede mover fondos directamente. La persona responsable aprueba el pago y Oberyn ejecuta la reserva segura, el fondeo y la liberación con Trustless Work por debajo.
          </p>
        </div>
      </Card>
    </div>
  );
}
