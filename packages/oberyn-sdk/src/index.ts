export type OberynRisk = "low" | "medium" | "high" | "critical";
export type OberynDecisionStatus = "allow" | "block" | "requires_approval";

export type OberynDecision = {
  id: string;
  decision: OberynDecisionStatus;
  reason: string;
  riskLevel: OberynRisk;
  matchedRules: Array<{ id: string; reason: string; action: OberynDecisionStatus }>;
  audit: { recorded: boolean };
};

export type GuardInput<TPayload, TResult> = {
  bot?: string;
  action: string;
  service: string;
  risk?: OberynRisk;
  payload?: TPayload;
  execute?: () => TResult | Promise<TResult>;
};

export type OberynClientOptions = {
  projectKey?: string;
  baseUrl?: string;
  failMode?: "closed" | "open";
  fetcher?: typeof fetch;
};

export class OberynBlockedError extends Error {
  constructor(public readonly decision: OberynDecision) {
    super(decision.reason);
    this.name = "OberynBlockedError";
  }
}

export class OberynApprovalRequiredError extends Error {
  constructor(public readonly decision: OberynDecision) {
    super(decision.reason);
    this.name = "OberynApprovalRequiredError";
  }
}

export class OberynClient {
  private readonly projectKey?: string;
  private readonly baseUrl: string;
  private readonly failMode: "closed" | "open";
  private readonly fetcher: typeof fetch;

  constructor(options: OberynClientOptions = {}) {
    this.projectKey = options.projectKey;
    this.baseUrl = (options.baseUrl ?? "http://localhost:4000").replace(/\/$/, "");
    this.failMode = options.failMode ?? "closed";
    this.fetcher = options.fetcher ?? fetch;
  }

  async evaluate<TPayload>(input: Omit<GuardInput<TPayload, unknown>, "execute">): Promise<OberynDecision> {
    return this.request<OberynDecision>("/sdk/v1/evaluate", input);
  }

  async audit<TPayload>(input: Omit<GuardInput<TPayload, unknown>, "execute"> & { status?: string; response?: unknown; error?: string }) {
    return this.request<{ recorded: boolean }>("/sdk/v1/audit", input);
  }

  async guard<TPayload = unknown, TResult = unknown>(input: GuardInput<TPayload, TResult>): Promise<TResult | OberynDecision> {
    let decision: OberynDecision;
    try {
      decision = await this.evaluate(input);
    } catch (error) {
      if (this.failMode === "open") {
        if (!input.execute) return { id: "local-fail-open", decision: "allow", reason: "Oberyn unreachable; failMode=open.", riskLevel: input.risk ?? "low", matchedRules: [], audit: { recorded: false } };
        return input.execute();
      }
      throw error;
    }

    if (decision.decision === "block") throw new OberynBlockedError(decision);
    if (decision.decision === "requires_approval") throw new OberynApprovalRequiredError(decision);
    if (!input.execute) return decision;

    try {
      const result = await input.execute();
      await this.audit({ ...input, status: "completed", response: result }).catch(() => undefined);
      return result;
    } catch (error) {
      await this.audit({ ...input, status: "failed", error: error instanceof Error ? error.message : "Unknown execution error" }).catch(() => undefined);
      throw error;
    }
  }

  gateway(provider: "openai" | "anthropic" = "openai") {
    return {
      baseURL: `${this.baseUrl}/gateway/v1/${provider}`,
      defaultHeaders: {
        "x-oberyn-key": this.projectKey ?? "",
      },
    };
  }

  private async request<T>(path: string, body: unknown): Promise<T> {
    if (!this.projectKey) throw new Error("Missing Oberyn project key.");
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-oberyn-key": this.projectKey,
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => null)) as { success?: boolean; data?: T; error?: { message?: string } } | null;
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error?.message ?? `Oberyn request failed with status ${response.status}`);
    }
    return payload.data as T;
  }
}
