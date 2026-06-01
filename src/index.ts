export type OberynRiskLevel = "low" | "medium" | "high" | "critical";
export type OberynDecision = "approved" | "blocked" | "requires_approval";

export type OberynService = {
  name?: string;
  provider?: string;
  type?: string;
  method?: "sdk" | "gateway" | "manual" | "detected";
};

export type OberynEvent = {
  eventType?: string;
  actionName: string;
  decision?: OberynDecision;
  riskLevel?: OberynRiskLevel;
  reason?: string;
  service?: OberynService;
  metadata?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

export type OberynConfig = {
  apiKey: string;
  endpoint?: string;
  service?: OberynService;
  environment?: string;
  flushIntervalMs?: number;
  batchSize?: number;
  captureFetch?: boolean;
  fetchRisk?: (input: RequestInfo | URL, init?: RequestInit) => OberynRiskLevel;
};

export type OberynClient = {
  capture(event: OberynEvent): void;
  flush(): Promise<void>;
  track<T>(actionName: string, fn: () => Promise<T> | T, options?: Omit<OberynEvent, "actionName" | "decision">): Promise<T>;
  protect<T>(actionName: string, fn: () => Promise<T> | T, options?: Omit<OberynEvent, "actionName" | "decision">): Promise<T>;
  stop(): Promise<void>;
};

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

export function createOberyn(config: OberynConfig): OberynClient {
  const endpoint = config.endpoint ?? defaultEndpoint;
  const queue: Array<OberynEvent & { traceparent: string; capturedAt: string }> = [];
  const batchSize = config.batchSize ?? 10;
  let timer: ReturnType<typeof setInterval> | null = null;
  let originalFetch: typeof fetch | null = null;
  let stopped = false;

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
    return track(actionName, fn, { riskLevel: "high", ...options });
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
    flush,
    track,
    protect,
    async stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      if (originalFetch) globalThis.fetch = originalFetch;
      await flush();
    },
  };
}

export const Oberyn = { create: createOberyn };
