export type OberynRiskLevel = "low" | "medium" | "high" | "critical";
export type OberynDecisionStatus = "approved" | "blocked" | "requires_approval";

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
  evaluate(event: OberynEvent): Promise<OberynDecision>;
  audit(event: OberynEvent & { decisionId?: string; status?: "completed" | "failed"; response?: unknown; error?: string }): Promise<{ recorded: boolean; eventId: string; decisionId: string }>;
  approvalStatus(input: { decisionId?: string; approvalId?: string }): Promise<OberynApprovalStatus>;
  flush(): Promise<void>;
  track<T>(actionName: string, fn: () => Promise<T> | T, options?: Omit<OberynEvent, "actionName" | "decision">): Promise<T>;
  protect<T>(actionName: string, fn: () => Promise<T> | T, options?: Omit<OberynEvent, "actionName" | "decision">): Promise<T>;
  guard<T>(actionName: string, fn: () => Promise<T> | T, options?: Omit<OberynEvent, "actionName" | "decision">): Promise<T>;
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
  return isWriteMethod(method) ? "medium" : "low";
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

function sanitizePayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const blocked = ["authorization", "cookie", "password", "secret", "token", "apiKey", "apikey", "key"];
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key]) => !blocked.some((blockedKey) => key.toLowerCase().includes(blockedKey)))
      .slice(0, 25),
  );
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

  async function request<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${sdkBase(endpoint)}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-oberyn-key": config.apiKey,
      },
      body: JSON.stringify(body),
      keepalive: true,
    });
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
    queue.push({
      ...event,
      eventType: event.eventType ?? "sdk_event",
      decision: event.decision ?? "approved",
      riskLevel: event.riskLevel ?? "low",
      service: { ...config.service, ...event.service },
      metadata: { environment: config.environment, ...(event.metadata ?? {}) },
      traceparent: createTraceparent(),
      capturedAt: new Date().toISOString(),
    });

    if (queue.length >= batchSize) void flush();
  }

  async function evaluate(event: OberynEvent) {
    return request<OberynDecision>("/evaluate", {
      ...event,
      service: { ...config.service, ...event.service },
      metadata: { environment: config.environment, ...(event.metadata ?? {}) },
    });
  }

  async function audit(event: OberynEvent & { decisionId?: string; status?: "completed" | "failed"; response?: unknown; error?: string }) {
    return request<{ recorded: boolean; eventId: string; decisionId: string }>("/audit", {
      ...event,
      service: { ...config.service, ...event.service },
      metadata: { environment: config.environment, ...(event.metadata ?? {}) },
    });
  }

  async function approvalStatus(input: { decisionId?: string; approvalId?: string }) {
    return request<OberynApprovalStatus>("/approval-status", input);
  }

  async function track<T>(actionName: string, fn: () => Promise<T> | T, options: Omit<OberynEvent, "actionName" | "decision"> = {}) {
    const startedAt = performance.now();
    try {
      const result = await fn();
      capture({ ...options, actionName, decision: "approved", metadata: { ...(options.metadata ?? {}), durationMs: Math.round(performance.now() - startedAt) } });
      return result;
    } catch (error) {
      capture({
        ...options,
        actionName,
        decision: "blocked",
        riskLevel: options.riskLevel ?? "high",
        reason: error instanceof Error ? error.message : "Action failed",
        metadata: { ...(options.metadata ?? {}), durationMs: Math.round(performance.now() - startedAt) },
      });
      throw error;
    }
  }

  async function protect<T>(actionName: string, fn: () => Promise<T> | T, options: Omit<OberynEvent, "actionName" | "decision"> = {}) {
    const event = { eventType: "sdk_guard", riskLevel: "high" as OberynRiskLevel, ...options, actionName };
    let decision: OberynDecision;

    try {
      decision = await evaluate(event);
    } catch (error) {
      if (failMode === "open") return fn();
      throw error;
    }

    if (decision.decision === "blocked") throw new OberynBlockedError(decision);
    if (decision.decision === "requires_approval") {
      if (approvalMode !== "poll") throw new OberynApprovalRequiredError(decision);

      const startedAt = Date.now();
      while (Date.now() - startedAt < approvalTimeoutMs) {
        const status = await approvalStatus({ decisionId: decision.id, approvalId: decision.approvalId ?? undefined });
        if (status.approved) break;
        if (status.rejected) throw new OberynBlockedError({ ...decision, reason: status.reason ?? "La aprobación fue rechazada." });
        await sleep(approvalPollIntervalMs);
      }

      const finalStatus = await approvalStatus({ decisionId: decision.id, approvalId: decision.approvalId ?? undefined });
      if (!finalStatus.approved) throw new OberynApprovalRequiredError(decision);
    }

    try {
      const result = await fn();
      await audit({ ...event, decision: "approved", decisionId: decision.id, status: "completed", response: result }).catch(() => undefined);
      return result;
    } catch (error) {
      await audit({ ...event, decision: "blocked", decisionId: decision.id, status: "failed", error: error instanceof Error ? error.message : "Unknown execution error" }).catch(() => undefined);
      throw error;
    }
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
          decision: response && response.ok ? "approved" : "blocked",
          riskLevel: config.fetchRisk?.(input, init) ?? inferFetchRisk(input, init),
          service: { name: serviceProvider, provider: serviceProvider, type: "api", method: "sdk" },
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
          decision: "blocked",
          riskLevel: "high",
          reason: error instanceof Error ? error.message : "Fetch failed",
          service: { name: serviceProvider, provider: serviceProvider, type: "api", method: "sdk" },
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
    evaluate,
    audit,
    approvalStatus,
    flush,
    track,
    protect,
    guard: protect,
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
