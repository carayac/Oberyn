export type OberynRiskLevel = "low" | "medium" | "high" | "critical";
export type OberynDecisionStatus = "approved" | "blocked" | "requires_approval";
export type OberynRiskScore = number;

export type OberynService = {
  name?: string;
  provider?: string;
  type?: string;
  method?: "sdk" | "gateway" | "manual" | "detected";
};

export type OberynEvent = {
  eventType?: string;
  actionName: string;
  decision?: OberynDecisionStatus;
  riskLevel?: OberynRiskLevel;
  reason?: string;
  service?: OberynService;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  method?: string;
  url?: string;
  statusCode?: number;
  outcome?: "success" | "failure" | "blocked" | "skipped";
};

export type OberynProtectOptions = Omit<OberynEvent, "actionName" | "decision"> & {
  actor?: Record<string, unknown>;
  resource?: Record<string, unknown>;
  permissions?: string[];
  dryRun?: () => Promise<unknown> | unknown;
};

export type OberynPromptInput = {
  prompt: string;
  actionName?: string;
  sessionId?: string;
  model?: string;
  provider?: string;
  riskLevel?: OberynRiskLevel;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  maskSensitiveData?: boolean;
};

export type OberynPromptResult = {
  prompt: string;
  maskedPrompt: string;
  maskedDataDetected: boolean;
  riskScore: OberynRiskScore;
  riskLevel: OberynRiskLevel;
  decision: OberynDecision;
};

export type OberynToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
  category?: string;
  target?: string;
  riskLevel?: OberynRiskLevel;
  actor?: Record<string, unknown>;
  resource?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type OberynApiOptions = {
  actionName?: string;
  service?: OberynService;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  actor?: Record<string, unknown>;
  resource?: Record<string, unknown>;
  permissions?: string[];
  protect?: boolean;
  parseAs?: "json" | "text" | "response";
};

export type OberynDecision = {
  id: string;
  decision: OberynDecisionStatus;
  reason: string;
  riskLevel: OberynRiskLevel;
  matchedRules: Array<{ id: string; name: string; action: string; reason: string }>;
  sensitiveDataDetected: boolean;
  approvalId?: string | null;
  auditEventId?: string | null;
  audit: { recorded: boolean };
};

export type OberynApprovalStatus = {
  projectId: string;
  decisionId?: string | null;
  approvalId?: string | null;
  status: "not_found" | "pending_approval" | "approved" | "rejected" | "context_requested" | string;
  approved: boolean;
  rejected: boolean;
  reason?: string | null;
  resolvedAt?: string | null;
};

export type OberynPayGuardRiskLevel = "low" | "medium" | "high";

export type OberynPayGuardPaymentStatus =
  | "draft"
  | "pending_approval"
  | "requires_multi_approval"
  | "approved"
  | "rejected"
  | "blocked"
  | "escrow_created"
  | "funded"
  | "released"
  | "failed";

export type OberynPayGuardPaymentRequestInput = {
  agentId: string;
  recipientName: string;
  recipientWallet: string;
  amount: number;
  token: string;
  reason: string;
  riskLevel?: OberynPayGuardRiskLevel;
};

export type OberynPayGuardPaymentRequest = {
  id: string;
  projectId: string;
  agentId: string;
  recipientName: string;
  recipientWallet: string;
  amount: number;
  token: string;
  reason: string;
  riskLevel: OberynPayGuardRiskLevel;
  status: OberynPayGuardPaymentStatus;
  policyApplied: string[];
  auditHash: string;
  escrowId?: string | null;
  txHash?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OberynPayGuardAgent = {
  id: string;
  name: string;
  status: "active" | "paused" | "blocked";
  riskLevel: OberynPayGuardRiskLevel;
  maxAmount: number;
  canCreatePaymentRequest: boolean;
  canApprovePayment: boolean;
  canExecutePayment: boolean;
};

export type OberynPayGuardTrustedWallet = {
  id: string;
  recipientName: string;
  walletAddress: string;
  token: string;
  isVerified: boolean;
};

export type OberynPayGuardConfig = {
  projectId: string;
  agents: OberynPayGuardAgent[];
  trustedWallets: OberynPayGuardTrustedWallet[];
  trustlessWork: {
    mode: "mock" | "live";
    isMockMode: boolean;
    configured: boolean;
    canSubmitTransactions: boolean;
    baseUrl: string;
    network: string;
    message: string;
    docsUrl: string;
  };
};

export type OberynConfig = {
  apiKey: string;
  endpoint?: string;
  service?: OberynService;
  environment?: string;
  flushIntervalMs?: number;
  batchSize?: number;
  captureFetch?: boolean;
  failMode?: "open" | "closed";
  approvalMode?: "throw" | "poll";
  approvalPollIntervalMs?: number;
  approvalTimeoutMs?: number;
  gatewayToken?: string;
  gatewayEndpoint?: string;
  fetchRisk?: (input: RequestInfo | URL, init?: RequestInit) => OberynRiskLevel;
};

export type OberynClient = {
  capture(event: OberynEvent): void;
  record(event: OberynEvent): Promise<{ accepted: boolean; projectId: string; eventId: string }>;
  evaluate(event: OberynEvent): Promise<OberynDecision>;
  audit(event: OberynEvent & { decisionId?: string; status?: "completed" | "failed"; response?: unknown; error?: string }): Promise<{ recorded: boolean; eventId: string; decisionId: string }>;
  approvalStatus(input: { decisionId?: string; approvalId?: string }): Promise<OberynApprovalStatus>;
  payguard: {
    config(): Promise<OberynPayGuardConfig>;
    getConfig(): Promise<OberynPayGuardConfig>;
    requestPayment(input: OberynPayGuardPaymentRequestInput): Promise<OberynPayGuardPaymentRequest>;
    createPaymentRequest(input: OberynPayGuardPaymentRequestInput): Promise<OberynPayGuardPaymentRequest>;
  };
  flush(): Promise<void>;
  track<T>(actionName: string, fn: () => Promise<T> | T, options?: Omit<OberynEvent, "actionName" | "decision">): Promise<T>;
  protect<T>(actionName: string, fn: () => Promise<T> | T, options?: OberynProtectOptions): Promise<T>;
  guard<T>(actionName: string, fn: () => Promise<T> | T, options?: OberynProtectOptions): Promise<T>;
  inspectPrompt(input: OberynPromptInput): Promise<OberynPromptResult>;
  protectPrompt<T>(input: OberynPromptInput, fn: (safePrompt: string) => Promise<T> | T): Promise<T>;
  guardTool<T>(toolCall: OberynToolCall, fn: () => Promise<T> | T, options?: Omit<OberynProtectOptions, "payload" | "riskLevel" | "metadata">): Promise<T>;
  shield: {
    inspect(input: OberynPromptInput): Promise<OberynPromptResult>;
    protect<T>(input: OberynPromptInput, fn: (safePrompt: string) => Promise<T> | T): Promise<T>;
  };
  proof: {
    guard<T>(toolCall: OberynToolCall, fn: () => Promise<T> | T, options?: Omit<OberynProtectOptions, "payload" | "riskLevel" | "metadata">): Promise<T>;
    protect<T>(actionName: string, fn: () => Promise<T> | T, options?: OberynProtectOptions): Promise<T>;
  };
  api: {
    fetch(input: RequestInfo | URL, init?: RequestInit, options?: OberynApiOptions): Promise<Response>;
    request<T = unknown>(input: RequestInfo | URL, init?: RequestInit, options?: OberynApiOptions): Promise<T>;
  };
  gateway(path?: string): { url: string; headers: Record<string, string> };
  stop(): Promise<void>;
};

export class OberynBlockedError extends Error {
  constructor(readonly decision: OberynDecision) {
    super(decision.reason);
    this.name = "OberynBlockedError";
  }
}

export class OberynApprovalRequiredError extends Error {
  constructor(readonly decision: OberynDecision) {
    super(decision.reason);
    this.name = "OberynApprovalRequiredError";
  }
}

const defaultEndpoint = "http://localhost:4000/api/sdk/events";

function randomHex(bytes: number) {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const data = new Uint8Array(bytes);
    cryptoApi.getRandomValues(data);
    return [...data].map((value) => value.toString(16).padStart(2, "0")).join("");
  }
  return Array.from({ length: bytes }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");
}

function createTraceparent() {
  return `00-${randomHex(16)}-${randomHex(8)}-01`;
}

function isWriteMethod(method?: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes((method ?? "GET").toUpperCase());
}

function inferFetchRisk(input: RequestInfo | URL, init?: RequestInit): OberynRiskLevel {
  const method = init?.method ?? (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET");
  const url = getUrl(input);
  return inferRiskLevel({ actionName: `${method} ${url}`, method, url, payload: sanitizePayload(init?.body) });
}

function getUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return "unknown";
}

function getHost(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "custom";
  }
}

function parsePayloadPreview(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : { preview: value.slice(0, 500) };
    } catch {
      return { preview: value.slice(0, 500) };
    }
  }
  if (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) {
    return Object.fromEntries([...value.entries()].slice(0, 25));
  }
  if (typeof FormData !== "undefined" && value instanceof FormData) {
    return Object.fromEntries([...value.entries()].slice(0, 25).map(([key, item]) => [key, typeof item === "string" ? item : "[FILE]"]));
  }
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function sanitizePayload(value: unknown): Record<string, unknown> {
  const source = parsePayloadPreview(value);
  const blocked = ["authorization", "cookie", "password", "secret", "token", "apiKey", "apikey", "key"];
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key]) => !blocked.some((blockedKey) => key.toLowerCase().includes(blockedKey)))
      .slice(0, 25),
  );
}

function providerFromHost(host: string) {
  return host
    .replace(/^www\./, "")
    .replace(/^api\./, "")
    .split(".")[0]
    ?.toLowerCase() || "custom";
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function compactActionName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function actionProvider(actionName: string) {
  const firstSegment = actionName.split(/[.:/\s]/).find(Boolean);
  return firstSegment?.toLowerCase() || "custom";
}

function containsSensitivePayload(payload?: Record<string, unknown>) {
  if (!payload) return false;
  return /api[_-]?key|secret|password|token|authorization|cookie|credit.?card|ssn|private.?key/i.test(JSON.stringify(payload).slice(0, 50_000));
}

function numericAmount(payload?: Record<string, unknown>) {
  if (!payload) return 0;
  const candidates = ["amount", "total", "value", "price", "paymentAmount", "refundAmount"];
  for (const key of candidates) {
    const value = payload[key];
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function inferEventType(event: Partial<OberynEvent>) {
  if (event.eventType) return event.eventType;
  const actionName = event.actionName ?? "";
  if (event.url || event.method || /^(GET|POST|PUT|PATCH|DELETE)\s/i.test(actionName)) return "http_request";
  if (/prompt|completion|chat|llm|model/i.test(actionName)) return "llm_call";
  if (/tool|function|guard/i.test(actionName)) return "tool_call";
  if (/completed|started|finished|failed/i.test(actionName)) return "application_event";
  return "sdk_event";
}

function inferService(event: Partial<OberynEvent>, defaultService?: OberynService): OberynService {
  const url = event.url ?? (typeof event.metadata?.url === "string" ? event.metadata.url : "");
  const host = url ? getHost(url) : "";
  const provider = event.service?.provider ?? defaultService?.provider ?? (host ? providerFromHost(host) : actionProvider(event.actionName ?? ""));
  const eventType = inferEventType(event);
  const serviceType =
    event.service?.type ??
    defaultService?.type ??
    (eventType === "http_request" ? "api" : eventType === "llm_call" ? "llm" : eventType === "tool_call" ? "tool" : "application");

  return {
    ...defaultService,
    ...event.service,
    provider,
    name: event.service?.name ?? defaultService?.name ?? (provider === "custom" ? "Aplicacion" : titleCase(provider)),
    type: serviceType,
    method: event.service?.method ?? defaultService?.method ?? "sdk",
  };
}

function inferRiskLevel(event: Partial<OberynEvent>): OberynRiskLevel {
  if (event.riskLevel) return event.riskLevel;

  const actionName = event.actionName ?? "";
  const method = (event.method ?? (typeof event.metadata?.method === "string" ? event.metadata.method : "")).toUpperCase();
  const text = `${actionName} ${method} ${event.url ?? ""} ${event.service?.provider ?? ""} ${event.service?.type ?? ""}`;
  const payload = event.payload ?? sanitizePayload(event.metadata?.payloadPreview);
  const amount = numericAmount(payload);

  if (containsSensitivePayload(payload)) return "critical";
  if (/delete|drop|truncate|destroy|admin|root|permission|credential|secret|password|token|api[_-]?key|private.?key/i.test(text)) return "critical";
  if (amount >= 10_000) return "critical";
  if (/refund|transfer|payout|payment|charge|withdraw|export|send.?email|invite|impersonate/i.test(text)) return "high";
  if (method === "DELETE") return "high";
  if (amount >= 1_000) return "high";
  if (isWriteMethod(method) || /create|update|write|post|patch|put|modify|publish|upload/i.test(text)) return "medium";
  if (/read|lookup|get|list|search|fetch|completed|health|heartbeat/i.test(text)) return "low";
  return "low";
}

function inferDecision(event: Partial<OberynEvent>): OberynDecisionStatus {
  if (event.decision) return event.decision;
  if (event.outcome === "blocked" || event.outcome === "failure") return "blocked";
  const status = event.statusCode ?? (typeof event.metadata?.status === "number" ? event.metadata.status : undefined);
  if (typeof status === "number" && status >= 400) return "blocked";
  if (typeof event.reason === "string" && event.reason) return "blocked";
  return "approved";
}

function sdkBase(endpoint: string) {
  return endpoint.replace(/\/events$/, "");
}

function gatewayBase(endpoint: string) {
  return endpoint.replace(/\/sdk\/events$/, "/gateway");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function riskScoreToLevel(score: number): OberynRiskLevel {
  if (score >= 76) return "critical";
  if (score >= 51) return "high";
  if (score >= 26) return "medium";
  return "low";
}

function levelToRiskScore(level: OberynRiskLevel) {
  return ({ low: 15, medium: 40, high: 65, critical: 85 })[level];
}

function scorePromptRisk(prompt: string) {
  const patterns = [
    /ignore (all )?(previous|prior|above) instructions/i,
    /jailbreak|DAN|developer mode|roleplay/i,
    /base64|decode this|system prompt/i,
    /api[_-]?key|secret|password|token|authorization|cookie/i,
    /\b\d{13,19}\b/,
    /(?:\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/i,
  ];
  const hits = patterns.filter((pattern) => pattern.test(prompt)).length;
  return Math.min(100, hits * 18 + (prompt.length > 4000 ? 10 : 0));
}

function maskSensitiveText(prompt: string) {
  const replacements: Array<[RegExp, string]> = [
    [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]"],
    [/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, "[PHONE]"],
    [/\b\d{13,19}\b/g, "[CARD_OR_ID]"],
    [/(sk-[a-z0-9_-]{12,})/gi, "[API_KEY]"],
    [/\b(api[_-]?key|secret|password|token)\s*[:=]\s*["']?[^"'\s,;]+/gi, "$1=[REDACTED]"],
  ];
  let masked = prompt;
  for (const [pattern, replacement] of replacements) masked = masked.replace(pattern, replacement);
  return { masked, detected: masked !== prompt };
}

export function createOberyn(config: OberynConfig): OberynClient {
  const endpoint = config.endpoint ?? defaultEndpoint;
  const queue: Array<OberynEvent & { traceparent: string; capturedAt: string }> = [];
  const batchSize = config.batchSize ?? 10;
  const failMode = config.failMode ?? "closed";
  const approvalMode = config.approvalMode ?? "throw";
  const approvalPollIntervalMs = config.approvalPollIntervalMs ?? 2500;
  const approvalTimeoutMs = config.approvalTimeoutMs ?? 120_000;
  let timer: ReturnType<typeof setInterval> | null = null;
  let originalFetch: typeof fetch | null = null;
  let stopped = false;

  function enrichEvent(event: OberynEvent): OberynEvent & { traceparent: string; capturedAt: string } {
    const url = event.url ?? (typeof event.metadata?.url === "string" ? event.metadata.url : undefined);
    const method = event.method ?? (typeof event.metadata?.method === "string" ? event.metadata.method : undefined);
    const payload = sanitizePayload(event.payload ?? event.metadata?.payloadPreview);
    const service = inferService({ ...event, url, method, payload }, config.service);
    const riskLevel = inferRiskLevel({ ...event, service, url, method, payload });
    const decision = inferDecision(event);
    const eventType = inferEventType({ ...event, url, method });

    return {
      ...event,
      eventType,
      decision,
      riskLevel,
      service,
      payload: Object.keys(payload).length ? payload : event.payload,
      method,
      url,
      metadata: {
        environment: config.environment,
        ...(event.metadata ?? {}),
        oberyn: {
          inferred: true,
          sdkVersion: "0.1.0",
          eventType,
          decision,
          riskLevel,
          serviceProvider: service.provider,
        },
      },
      traceparent: createTraceparent(),
      capturedAt: new Date().toISOString(),
    };
  }

  async function request<T>(path: string, body: unknown): Promise<T> {
    const url = `${sdkBase(endpoint)}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-oberyn-key": config.apiKey,
        },
        body: JSON.stringify(body),
        keepalive: true,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "fetch failed";
      throw new Error(`Oberyn SDK could not reach ${url}. Check that the backend is running and OBERYN_SDK_ENDPOINT is correct. ${reason}`);
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? `Oberyn request failed with status ${response.status}`);
    return payload.data as T;
  }

  async function send(events: typeof queue) {
    if (!events.length) return;

    if (events.length === 1) {
      await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-oberyn-key": config.apiKey,
        },
        body: JSON.stringify(events[0]),
        keepalive: true,
      });
      return;
    }

    await fetch(endpoint.replace(/\/events$/, "/events/batch"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-oberyn-key": config.apiKey,
      },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  }

  async function flush() {
    const events = queue.splice(0, queue.length);
    try {
      await send(events);
    } catch {
      queue.unshift(...events.slice(0, batchSize));
    }
  }

  function capture(event: OberynEvent) {
    if (stopped) return;
    queue.push(enrichEvent(event));

    if (queue.length >= batchSize) void flush();
  }

  async function record(event: OberynEvent) {
    return request<{ accepted: boolean; projectId: string; eventId: string }>("/events", enrichEvent(event));
  }

  async function evaluate(event: OberynEvent) {
    const payload = sanitizePayload(event.payload ?? event.metadata?.payloadPreview);
    const service = inferService({ ...event, payload }, config.service);
    return request<OberynDecision>("/evaluate", {
      ...event,
      eventType: inferEventType(event),
      riskLevel: inferRiskLevel({ ...event, service, payload }),
      service,
      payload: Object.keys(payload).length ? payload : event.payload,
      metadata: { environment: config.environment, ...(event.metadata ?? {}) },
    });
  }

  async function audit(event: OberynEvent & { decisionId?: string; status?: "completed" | "failed"; response?: unknown; error?: string }) {
    const payload = sanitizePayload(event.payload ?? event.metadata?.payloadPreview);
    const service = inferService({ ...event, payload }, config.service);
    return request<{ recorded: boolean; eventId: string; decisionId: string }>("/audit", {
      ...event,
      eventType: inferEventType(event),
      decision: event.decision ?? (event.status === "failed" ? "blocked" : "approved"),
      riskLevel: inferRiskLevel({ ...event, service, payload }),
      service,
      payload: Object.keys(payload).length ? payload : event.payload,
      metadata: { environment: config.environment, ...(event.metadata ?? {}) },
    });
  }

  async function approvalStatus(input: { decisionId?: string; approvalId?: string }) {
    return request<OberynApprovalStatus>("/approval-status", input);
  }

  async function requestPayment(input: OberynPayGuardPaymentRequestInput) {
    return request<OberynPayGuardPaymentRequest>("/payguard/payment-requests", input);
  }

  async function payguardConfig() {
    return request<OberynPayGuardConfig>("/payguard/config", {});
  }

  async function ensureDecisionAllows(decision: OberynDecision) {
    if (decision.decision === "blocked") throw new OberynBlockedError(decision);
    if (decision.decision !== "requires_approval") return;

    if (approvalMode !== "poll") throw new OberynApprovalRequiredError(decision);

    const startedAt = Date.now();
    while (Date.now() - startedAt < approvalTimeoutMs) {
      const status = await approvalStatus({ decisionId: decision.id, approvalId: decision.approvalId ?? undefined });
      if (status.approved) return;
      if (status.rejected) throw new OberynBlockedError({ ...decision, reason: status.reason ?? "La aprobacion fue rechazada." });
      await sleep(approvalPollIntervalMs);
    }

    throw new OberynApprovalRequiredError(decision);
  }

  function httpActionName(input: RequestInfo | URL, init?: RequestInit, options: OberynApiOptions = {}) {
    if (options.actionName) return options.actionName;
    const url = getUrl(input);
    const method = init?.method ?? (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET");
    try {
      const parsed = new URL(url);
      const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/\d+(\b|\/)/g, "/:id$1");
      return compactActionName(`${method.toUpperCase()} ${parsed.hostname}${path}`);
    } catch {
      return compactActionName(`${method.toUpperCase()} ${url}`);
    }
  }

  function httpEvent(input: RequestInfo | URL, init?: RequestInit, options: OberynApiOptions = {}): OberynEvent {
    const url = getUrl(input);
    const method = init?.method ?? (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET");
    const payload = { ...sanitizePayload(init?.body), ...(options.payload ?? {}) };
    const service = inferService(
      {
        actionName: options.actionName ?? httpActionName(input, init, options),
        eventType: "http_request",
        method,
        url,
        payload,
        service: options.service,
      },
      config.service,
    );

    return {
      eventType: "http_request",
      actionName: httpActionName(input, init, options),
      method,
      url,
      service,
      riskLevel: inferRiskLevel({ actionName: options.actionName ?? httpActionName(input, init, options), method, url, service, payload }),
      payload,
      metadata: {
        ...(options.metadata ?? {}),
        actor: options.actor,
        resource: options.resource,
        permissions: options.permissions,
      },
    };
  }

  async function apiFetch(input: RequestInfo | URL, init?: RequestInit, options: OberynApiOptions = {}) {
    const event = httpEvent(input, init, options);
    const startedAt = performance.now();
    let decision: OberynDecision | null = null;

    if (options.protect !== false) {
      try {
        decision = await evaluate(event);
        await ensureDecisionAllows(decision);
      } catch (error) {
        if (error instanceof OberynBlockedError || error instanceof OberynApprovalRequiredError) {
          throw error;
        }
        if (failMode === "open") {
          capture({ ...event, outcome: "failure", reason: error instanceof Error ? error.message : "Oberyn evaluation failed", metadata: { ...(event.metadata ?? {}), failMode: "open" } });
        } else {
          throw error;
        }
      }
    }

    const fetchImpl = originalFetch ?? fetch.bind(globalThis);
    try {
      const response = await fetchImpl(input, init);
      await audit({
        ...event,
        decisionId: decision?.id,
        decision: response.ok ? decision?.decision ?? "approved" : "blocked",
        status: response.ok ? "completed" : "failed",
        response: { status: response.status, statusText: response.statusText, url: response.url },
        metadata: {
          ...(event.metadata ?? {}),
          status: response.status,
          durationMs: Math.round(performance.now() - startedAt),
        },
      }).catch(() => undefined);
      return response;
    } catch (error) {
      await audit({
        ...event,
        decisionId: decision?.id,
        decision: "blocked",
        status: "failed",
        error: error instanceof Error ? error.message : "HTTP request failed",
        metadata: { ...(event.metadata ?? {}), durationMs: Math.round(performance.now() - startedAt) },
      }).catch(() => undefined);
      throw error;
    }
  }

  async function apiRequest<T = unknown>(input: RequestInfo | URL, init?: RequestInit, options: OberynApiOptions = {}) {
    const response = await apiFetch(input, init, options);
    const parseAs = options.parseAs ?? "json";
    if (parseAs === "response") return response as T;
    if (!response.ok) {
      const errorPayload = await response.clone().json().catch(async () => response.clone().text().catch(() => ""));
      const message =
        typeof errorPayload === "object" && errorPayload && "error" in errorPayload
          ? JSON.stringify((errorPayload as Record<string, unknown>).error)
          : typeof errorPayload === "string" && errorPayload
            ? errorPayload
            : `Provider request failed with status ${response.status}`;
      throw new Error(message);
    }
    if (parseAs === "text") return (await response.text()) as T;
    return (await response.json()) as T;
  }

  async function track<T>(actionName: string, fn: () => Promise<T> | T, options: Omit<OberynEvent, "actionName" | "decision"> = {}) {
    const startedAt = performance.now();
    try {
      const result = await fn();
      capture({ ...options, actionName, outcome: "success", metadata: { ...(options.metadata ?? {}), durationMs: Math.round(performance.now() - startedAt) } });
      return result;
    } catch (error) {
      capture({
        ...options,
        actionName,
        outcome: "failure",
        reason: error instanceof Error ? error.message : "Action failed",
        metadata: { ...(options.metadata ?? {}), durationMs: Math.round(performance.now() - startedAt) },
      });
      throw error;
    }
  }

  async function protect<T>(actionName: string, fn: () => Promise<T> | T, options: OberynProtectOptions = {}) {
    const { dryRun, actor, resource, permissions, metadata, ...eventOptions } = options;
    const event = {
      eventType: "sdk_guard",
      ...eventOptions,
      actionName,
      riskLevel: eventOptions.riskLevel ?? inferRiskLevel({ ...eventOptions, actionName, payload: eventOptions.payload }),
      metadata: { ...(metadata ?? {}), actor, resource, permissions },
    };
    let decision: OberynDecision;

    try {
      decision = await evaluate(event);
    } catch (error) {
      if (failMode === "open") return fn();
      throw error;
    }

    await ensureDecisionAllows(decision);

    try {
      let dryRunResult: unknown;
      if (dryRun) {
        dryRunResult = await dryRun();
        await audit({ ...event, decision: "approved", decisionId: decision.id, status: "completed", metadata: { ...event.metadata, dryRun: true }, response: dryRunResult }).catch(() => undefined);
      }

      const result = await fn();
      await audit({ ...event, decision: "approved", decisionId: decision.id, status: "completed", response: result, metadata: { ...event.metadata, dryRunExecuted: Boolean(dryRun), dryRunResult } }).catch(() => undefined);
      return result;
    } catch (error) {
      await audit({ ...event, decision: "blocked", decisionId: decision.id, status: "failed", error: error instanceof Error ? error.message : "Unknown execution error" }).catch(() => undefined);
      throw error;
    }
  }

  async function inspectPrompt(input: OberynPromptInput): Promise<OberynPromptResult> {
    const mask = input.maskSensitiveData ?? true;
    const masked = mask ? maskSensitiveText(input.prompt) : { masked: input.prompt, detected: false };
    const localScore = scorePromptRisk(input.prompt);
    const riskLevel = input.riskLevel ?? riskScoreToLevel(localScore);
    const decision = await evaluate({
      eventType: "oberyn_prompt",
      actionName: input.actionName ?? "prompt.inspect",
      riskLevel,
      service: { name: input.model ?? "LLM", provider: input.provider ?? "custom", type: "llm", method: "sdk" },
      metadata: { sessionId: input.sessionId, model: input.model, riskScore: localScore, maskedDataDetected: masked.detected, ...(input.metadata ?? {}) },
      payload: { prompt: masked.masked, ...(input.payload ?? {}) },
    });

    return {
      prompt: input.prompt,
      maskedPrompt: masked.masked,
      maskedDataDetected: masked.detected || decision.sensitiveDataDetected,
      riskScore: Math.max(localScore, levelToRiskScore(decision.riskLevel)),
      riskLevel: decision.riskLevel,
      decision,
    };
  }

  async function protectPrompt<T>(input: OberynPromptInput, fn: (safePrompt: string) => Promise<T> | T) {
    const inspection = await inspectPrompt(input);
    await ensureDecisionAllows(inspection.decision);

    try {
      const result = await fn(inspection.maskedPrompt);
      await audit({
        eventType: "oberyn_prompt_result",
        actionName: input.actionName ?? "prompt.protect",
        decision: "approved",
        riskLevel: inspection.riskLevel,
        decisionId: inspection.decision.id,
        service: { name: input.model ?? "LLM", provider: input.provider ?? "custom", type: "llm", method: "sdk" },
        metadata: { sessionId: input.sessionId, model: input.model, riskScore: inspection.riskScore, maskedDataDetected: inspection.maskedDataDetected, ...(input.metadata ?? {}) },
        response: result,
      }).catch(() => undefined);
      return result;
    } catch (error) {
      await audit({
        eventType: "oberyn_prompt_result",
        actionName: input.actionName ?? "prompt.protect",
        decision: "blocked",
        riskLevel: "high",
        decisionId: inspection.decision.id,
        error: error instanceof Error ? error.message : "Model call failed",
      }).catch(() => undefined);
      throw error;
    }
  }

  async function guardTool<T>(toolCall: OberynToolCall, fn: () => Promise<T> | T, options: Omit<OberynProtectOptions, "payload" | "riskLevel" | "metadata"> = {}) {
    const service = { name: toolCall.target ?? "Tool", provider: toolCall.target ?? "custom", type: toolCall.category ?? "tool", method: "sdk" as const };
    return protect(toolCall.name, fn, {
      ...options,
      eventType: "oberyn_tool_call",
      riskLevel: toolCall.riskLevel ?? inferRiskLevel({ actionName: toolCall.name, service, payload: toolCall.arguments }),
      service,
      actor: toolCall.actor,
      resource: toolCall.resource,
      metadata: { toolCategory: toolCall.category, target: toolCall.target, ...(toolCall.metadata ?? {}) },
      payload: toolCall.arguments,
    });
  }

  function gateway(path = "") {
    const baseUrl = config.gatewayEndpoint ?? gatewayBase(endpoint);
    if (!config.gatewayToken) {
      throw new Error("Missing Oberyn gatewayToken. Copy it from the project Gateway page before routing provider traffic.");
    }

    return {
      url: `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`,
      headers: {
        authorization: `Bearer ${config.gatewayToken}`,
      },
    };
  }

  function installFetchCapture() {
    if (!config.captureFetch || typeof fetch === "undefined" || originalFetch) return;
    originalFetch = fetch.bind(globalThis);

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = getUrl(input);
      const method = init?.method ?? (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET");
      const serviceProvider = getHost(url);
      const startedAt = performance.now();

      try {
        const response = await originalFetch?.(input, init);
        capture({
          eventType: "http_request",
          actionName: `${method.toUpperCase()} ${serviceProvider}`,
          riskLevel: config.fetchRisk?.(input, init),
          method,
          url,
          statusCode: response?.status,
          metadata: {
            url,
            method,
            status: response?.status,
            durationMs: Math.round(performance.now() - startedAt),
          },
          payload: sanitizePayload(init?.body),
        });
        return response;
      } catch (error) {
        capture({
          eventType: "http_request",
          actionName: `${method.toUpperCase()} ${serviceProvider}`,
          outcome: "failure",
          reason: error instanceof Error ? error.message : "Fetch failed",
          method,
          url,
          metadata: { url, method, durationMs: Math.round(performance.now() - startedAt) },
        });
        throw error;
      }
    }) as typeof fetch;
  }

  installFetchCapture();
  timer = setInterval(() => void flush(), config.flushIntervalMs ?? 5000);

  return {
    capture,
    record,
    evaluate,
    audit,
    approvalStatus,
    payguard: {
      config: payguardConfig,
      getConfig: payguardConfig,
      requestPayment,
      createPaymentRequest: requestPayment,
    },
    flush,
    track,
    protect,
    guard: protect,
    inspectPrompt,
    protectPrompt,
    guardTool,
    shield: {
      inspect: inspectPrompt,
      protect: protectPrompt,
    },
    proof: {
      guard: guardTool,
      protect,
    },
    api: {
      fetch: apiFetch,
      request: apiRequest,
    },
    gateway,
    async stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      if (originalFetch) globalThis.fetch = originalFetch;
      await flush();
    },
  };
}

export const Oberyn = { create: createOberyn };
