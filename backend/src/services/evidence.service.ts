import crypto from "node:crypto";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { stellarService } from "./stellar.service.js";

type AuditRow = Record<string, unknown>;
type BatchRow = Record<string, unknown>;

function now() {
  return new Date().toISOString();
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !["stellar_tx_hash", "stellar_network", "anchored_at", "merkle_root"].includes(key))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

function sha256(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function canonicalEventHash(event: AuditRow) {
  return sha256({
    id: event.id,
    project_id: event.project_id,
    bot_id: event.bot_id ?? null,
    integration_id: event.integration_id ?? null,
    event_type: event.event_type,
    action_name: event.action_name,
    decision: event.decision,
    risk_level: event.risk_level,
    metadata: event.metadata ?? {},
    created_at: event.created_at,
  });
}

function batchRoot(hashes: string[]) {
  if (!hashes.length) return sha256({ version: 1, hashes: [] });

  let level = hashes.map((hash) => hash.toLowerCase());
  while (level.length > 1) {
    const nextLevel: string[] = [];
    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] ?? left;
      nextLevel.push(crypto.createHash("sha256").update(Buffer.from(`${left}${right}`, "hex")).digest("hex"));
    }
    level = nextLevel;
  }

  return level[0];
}

function toEvidence(event: AuditRow, batchEvent?: BatchRow | null, batch?: BatchRow | null) {
  const eventHash = String(event.event_hash ?? canonicalEventHash(event));
  const rootHash = String(event.merkle_root ?? batch?.root_hash ?? "");
  const txHash = String(event.stellar_tx_hash ?? batch?.tx_hash ?? "");
  const network = String(event.stellar_network ?? batch?.network ?? env.STELLAR_NETWORK);

  return {
    projectId: String(event.project_id),
    eventId: String(event.id),
    eventType: String(event.event_type),
    actionName: String(event.action_name),
    decision: String(event.decision),
    riskLevel: String(event.risk_level),
    metadata: (event.metadata as Record<string, unknown>) ?? {},
    eventHash,
    merkleRoot: rootHash || null,
    stellarTxHash: txHash || null,
    stellarNetwork: network,
    ledger: batch?.ledger ?? null,
    explorerUrl: batch?.explorer_url ?? (txHash ? `${env.STELLAR_EXPLORER_BASE_URL}/${txHash}` : null),
    batchId: batch?.id ? String(batch.id) : null,
    batchStatus: batch?.status ? String(batch.status) : txHash ? "confirmed" : "pending",
    batchPosition: batchEvent?.position ?? null,
    anchoredAt: event.anchored_at ? new Date(String(event.anchored_at)).toISOString() : batch?.confirmed_at ? new Date(String(batch.confirmed_at)).toISOString() : null,
    createdAt: new Date(String(event.created_at)).toISOString(),
    sensitiveDataStoredOnChain: false,
  };
}

async function getAuditEvent(projectId: string, eventId: string) {
  const { data, error } = await supabaseAdmin.from("audit_events").select("*").eq("project_id", projectId).eq("id", eventId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("El evento de auditoría no existe.");
  return data as AuditRow;
}

async function getBatchForEvent(eventId: string) {
  const { data: batchEvent, error: batchEventError } = await supabaseAdmin
    .from("stellar_anchor_batch_events")
    .select("*")
    .eq("audit_event_id", eventId)
    .maybeSingle();
  if (batchEventError) throw batchEventError;
  if (!batchEvent) return { batchEvent: null, batch: null };

  const { data: batch, error: batchError } = await supabaseAdmin.from("stellar_anchor_batches").select("*").eq("id", String(batchEvent.batch_id)).maybeSingle();
  if (batchError) throw batchError;

  return { batchEvent: batchEvent as BatchRow, batch: (batch as BatchRow | null) ?? null };
}

export const evidenceService = {
  getByEventId: async (projectId: string, eventId: string) => {
    const event = await getAuditEvent(projectId, eventId);
    const { batchEvent, batch } = await getBatchForEvent(eventId);
    return toEvidence(event, batchEvent, batch);
  },

  share: async (projectId: string, eventId: string) => ({
    projectId,
    eventId,
    shareUrl: `${env.FRONTEND_URL}/projects/${projectId}/evidence/${eventId}`,
    expiresAt: null,
  }),

  verify: async (projectId: string, eventId: string) => {
    const event = await getAuditEvent(projectId, eventId);
    const { batchEvent, batch } = await getBatchForEvent(eventId);
    const recalculatedEventHash = canonicalEventHash(event);
    const storedEventHash = String(event.event_hash ?? "");
    const rootHash = String(event.merkle_root ?? batch?.root_hash ?? "");
    const anchored = Boolean(batch?.tx_hash || event.stellar_tx_hash);

    return {
      projectId,
      eventId,
      verified: Boolean(storedEventHash && storedEventHash === recalculatedEventHash && rootHash && anchored),
      checkedAt: now(),
      eventHash: storedEventHash || recalculatedEventHash,
      recalculatedEventHash,
      merkleRoot: rootHash || null,
      stellarTxHash: event.stellar_tx_hash ?? batch?.tx_hash ?? null,
      stellarNetwork: event.stellar_network ?? batch?.network ?? env.STELLAR_NETWORK,
      batchId: batch?.id ?? null,
      batchPosition: batchEvent?.position ?? null,
      sensitiveDataStoredOnChain: false,
    };
  },

  listAnchorBatches: async (projectId: string) => {
    const { data, error } = await supabaseAdmin
      .from("stellar_anchor_batches")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  },

  runAnchorBatch: async (projectId: string, limit = env.STELLAR_ANCHOR_BATCH_SIZE) => {
    const batchSize = Math.max(1, Math.min(100, limit));
    const { data: events, error } = await supabaseAdmin
      .from("audit_events")
      .select("*")
      .eq("project_id", projectId)
      .is("stellar_tx_hash", null)
      .order("created_at", { ascending: true })
      .limit(batchSize);
    if (error) throw error;

    const pendingEvents = (events ?? []) as AuditRow[];
    if (!pendingEvents.length) {
      return { status: "empty", projectId, anchoredEvents: 0, message: "No hay eventos pendientes de anclaje." };
    }

    const eventHashes = pendingEvents.map(canonicalEventHash);
    const rootHash = batchRoot(eventHashes);

    const { data: batch, error: batchError } = await supabaseAdmin
      .from("stellar_anchor_batches")
      .insert({
        project_id: projectId,
        root_hash: rootHash,
        event_count: pendingEvents.length,
        status: "pending",
        network: env.STELLAR_NETWORK,
        source_public_key: env.STELLAR_SOURCE_PUBLIC_KEY || null,
      })
      .select("*")
      .single();
    if (batchError) throw batchError;

    const batchId = String(batch.id);
    const eventLinks = pendingEvents.map((event, index) => ({
      batch_id: batchId,
      audit_event_id: String(event.id),
      event_hash: eventHashes[index],
      position: index,
    }));

    const { error: linkError } = await supabaseAdmin.from("stellar_anchor_batch_events").insert(eventLinks);
    if (linkError) throw linkError;

    for (let index = 0; index < pendingEvents.length; index += 1) {
      const event = pendingEvents[index];
      const { error: updateEventError } = await supabaseAdmin
        .from("audit_events")
        .update({ event_hash: eventHashes[index], merkle_root: rootHash })
        .eq("id", String(event.id));
      if (updateEventError) throw updateEventError;
    }

    try {
      const submitted = await stellarService.submitAnchor(batchId, rootHash);
      const confirmedAt = now();

      const { error: updateBatchError } = await supabaseAdmin
        .from("stellar_anchor_batches")
        .update({
          status: "confirmed",
          tx_hash: submitted.txHash,
          ledger: submitted.ledger ?? null,
          explorer_url: submitted.explorerUrl ?? null,
          source_public_key: submitted.sourcePublicKey,
          submitted_at: confirmedAt,
          confirmed_at: confirmedAt,
          updated_at: confirmedAt,
        })
        .eq("id", batchId);
      if (updateBatchError) throw updateBatchError;

      const { error: auditUpdateError } = await supabaseAdmin
        .from("audit_events")
        .update({
          stellar_tx_hash: submitted.txHash,
          stellar_network: submitted.network,
          anchored_at: confirmedAt,
        })
        .in("id", pendingEvents.map((event) => String(event.id)));
      if (auditUpdateError) throw auditUpdateError;

      await supabaseAdmin.from("stellar_anchor_attempts").insert({
        batch_id: batchId,
        status: "confirmed",
        tx_hash: submitted.txHash,
        ledger: submitted.ledger ?? null,
      });

      return {
        status: "confirmed",
        projectId,
        batchId,
        rootHash,
        anchoredEvents: pendingEvents.length,
        ...submitted,
      };
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "No se pudo anclar en Stellar.";
      const failedAt = now();
      await supabaseAdmin
        .from("stellar_anchor_batches")
        .update({ status: "failed", error_message: message, updated_at: failedAt })
        .eq("id", batchId);
      await supabaseAdmin.from("stellar_anchor_attempts").insert({ batch_id: batchId, status: "failed", error_message: message });
      throw submitError;
    }
  },
};
